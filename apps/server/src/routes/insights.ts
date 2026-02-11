import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";

type IdeaCardContent = {
  problem?: string;
  proposal?: string;
  impact?: string;
  constraints?: string;
  owners?: string[]; // 후보자 목록 (자유 텍스트)
  evidence?: string[]; // 링크/발췌 등
};

type IdeaCardGraph = {
  issues?: string[];
  systems?: string[];
  decisions?: string[];
};

function clampTake(v: any, fallback = 60) {
  const n = Number(v ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

function toWeekStartUtc(input?: string) {
  // Week start = Monday 00:00:00 UTC
  const base = input ? new Date(input) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0, 0));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function shortTitleFromText(text: string) {
  const t = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "아이디어 카드";
  return t.length > 60 ? `${t.slice(0, 60)}…` : t;
}

async function ensureMembership(userId: string, roomId: string) {
  return await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
}

export async function insightsRoutes(app: FastifyInstance) {
  // List cards
  app.get("/rooms/:roomId/cards", { preHandler: app.authenticate }, async (req: any) => {
    const roomId = req.params.roomId as string;
    const userId = req.user.sub as string;
    const take = clampTake(req.query.take, 80);

    const membership = await ensureMembership(userId, roomId);
    if (!membership) return [];

    const cards = await prisma.ideaCard.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take
    });

    return cards.map((c) => ({
      id: c.id,
      roomId: c.roomId,
      createdBy: c.createdBy ?? null,
      sourceMessageId: c.sourceMessageId ?? null,
      kind: c.kind,
      weekStart: c.weekStart ? c.weekStart.toISOString() : null,
      title: c.title,
      content: c.content,
      graph: c.graph ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString()
    }));
  });

  // Create card (manual). If sourceMessageId is provided, use that message content as default.
  app.post("/rooms/:roomId/cards", { preHandler: app.authenticate }, async (req: any, reply) => {
    try {
      const roomId = req.params.roomId as string;
      const userId = req.user.sub as string;
      const body = (req.body ?? {}) as {
        title?: string;
        content?: IdeaCardContent;
        graph?: IdeaCardGraph | null;
        sourceMessageId?: string | null;
      };

      const membership = await ensureMembership(userId, roomId);
      if (!membership) return reply.code(403).send({ error: "FORBIDDEN" });

      let sourceMessageId = (body.sourceMessageId ?? null) as string | null;
      let title = String(body.title ?? "").trim();
      let content: IdeaCardContent = (body.content ?? {}) as any;
      let graph: IdeaCardGraph | null = (body.graph ?? null) as any;

      // Only resolve source message if id looks like a DB id (uuid), not a client stub (e.g. stream:xxx)
      if (sourceMessageId && !sourceMessageId.startsWith("stream:")) {
        const msg = await prisma.message.findUnique({ where: { id: sourceMessageId } });
        if (!msg || msg.roomId !== roomId) return reply.code(400).send({ error: "BAD_SOURCE_MESSAGE" });

        if (!title) title = shortTitleFromText(msg.content);
        if (!content || Object.keys(content).length === 0) {
          const problemRaw = String(msg.content ?? "").trim();
          const problemMaxLen = 50_000;
          content = {
            problem: problemRaw.length > problemMaxLen ? problemRaw.slice(0, problemMaxLen) + "…" : problemRaw,
            proposal: "",
            impact: "",
            constraints: "",
            owners: [],
            evidence: [`message:${msg.id}`]
          };
        }
      } else if (sourceMessageId && sourceMessageId.startsWith("stream:")) {
        // Client sent a streaming-stub id; treat as no source message
        sourceMessageId = null;
      }

      if (!title) title = "아이디어 카드";
      if (!content) content = {};

      // createdBy FK: only set if user exists (avoid 500 on stale token / deleted user)
      let createdBy: string | null = userId;
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!userExists) createdBy = null;

      const created = await prisma.ideaCard.create({
        data: {
          roomId,
          createdBy,
          sourceMessageId,
          kind: "manual",
          title,
          content: content as any,
          graph: graph ?? undefined
        }
      });

      return reply.send({
        id: created.id,
        roomId: created.roomId,
        createdBy: created.createdBy ?? null,
        sourceMessageId: created.sourceMessageId ?? null,
        kind: created.kind,
        weekStart: created.weekStart ? created.weekStart.toISOString() : null,
        title: created.title,
        content: created.content ?? {},
        graph: created.graph ?? null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
      });
    } catch (err: any) {
      const message = err?.message ?? String(err);
      req.log?.error?.(err, "Create card failed");
      console.error("[POST /rooms/:roomId/cards] 500", message, err);
      return reply.code(500).send({ error: "CREATE_CARD_FAILED", message });
    }
  });

  // Delete card (creator or room owner)
  app.delete("/rooms/:roomId/cards/:cardId", { preHandler: app.authenticate }, async (req: any, reply) => {
    const roomId = req.params.roomId as string;
    const cardId = req.params.cardId as string;
    const userId = req.user.sub as string;

    const membership = await ensureMembership(userId, roomId);
    if (!membership) return reply.code(403).send({ error: "FORBIDDEN" });

    const card = await prisma.ideaCard.findUnique({ where: { id: cardId } });
    if (!card || card.roomId !== roomId) return reply.code(404).send({ error: "NOT_FOUND" });

    const isOwner = membership.role === "owner";
    const isCreator = card.createdBy && card.createdBy === userId;
    if (!isOwner && !isCreator) return reply.code(403).send({ error: "FORBIDDEN" });

    await prisma.ideaCard.delete({ where: { id: cardId } });
    return { ok: true };
  });

  // Build simple graph from cards (room center + cards + tag nodes)
  app.get("/rooms/:roomId/graph", { preHandler: app.authenticate }, async (req: any, reply) => {
    const roomId = req.params.roomId as string;
    const userId = req.user.sub as string;
    const weekStartRaw = (req.query.weekStart as string | undefined) ?? "";

    const membership = await ensureMembership(userId, roomId);
    if (!membership) return reply.code(403).send({ error: "FORBIDDEN" });

    const weekStart = weekStartRaw ? toWeekStartUtc(weekStartRaw) : null;
    const where: any = { roomId };
    // 해당 주의 주간 AI 카드 + weekStart 없는 수동 저장 카드 모두 그래프에 포함
    if (weekStart) {
      where.OR = [{ weekStart }, { weekStart: null }];
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    const cards = await prisma.ideaCard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200
    });

    const nodes: Array<{ id: string; label: string; type: string }> = [];
    const edges: Array<{ id: string; source: string; target: string; type: string }> = [];

    const roomNodeId = `room:${roomId}`;
    nodes.push({ id: roomNodeId, label: room?.title ?? "Room", type: "room" });

    const tagToId = new Map<string, string>();
    function ensureTagNode(type: "issue" | "system" | "decision", label: string) {
      const key = `${type}:${label}`;
      const existing = tagToId.get(key);
      if (existing) return existing;
      const id = `${type}:${label}`;
      tagToId.set(key, id);
      nodes.push({ id, label, type });
      edges.push({ id: `e:${roomNodeId}->${id}`, source: roomNodeId, target: id, type: "rel" });
      return id;
    }

    for (const c of cards) {
      const cardNodeId = `card:${c.id}`;
      nodes.push({ id: cardNodeId, label: c.title, type: "card" });
      edges.push({ id: `e:${roomNodeId}->${cardNodeId}`, source: roomNodeId, target: cardNodeId, type: "has" });

      const g = (c.graph ?? null) as any as IdeaCardGraph | null;
      const issues = Array.isArray(g?.issues) ? g!.issues! : [];
      const systems = Array.isArray(g?.systems) ? g!.systems! : [];
      const decisions = Array.isArray(g?.decisions) ? g!.decisions! : [];

      for (const label of issues) {
        const id = ensureTagNode("issue", String(label));
        edges.push({ id: `e:${cardNodeId}->${id}`, source: cardNodeId, target: id, type: "tag" });
      }
      for (const label of systems) {
        const id = ensureTagNode("system", String(label));
        edges.push({ id: `e:${cardNodeId}->${id}`, source: cardNodeId, target: id, type: "tag" });
      }
      for (const label of decisions) {
        const id = ensureTagNode("decision", String(label));
        edges.push({ id: `e:${cardNodeId}->${id}`, source: cardNodeId, target: id, type: "tag" });
      }
    }

    return reply.send({ roomId, weekStart: weekStart ? weekStart.toISOString() : null, nodes, edges });
  });

  // Generate weekly AI idea cards (manual trigger; can be called by a scheduler later)
  app.post("/rooms/:roomId/cards/generate-weekly", { preHandler: app.authenticate }, async (req: any, reply) => {
    const roomId = req.params.roomId as string;
    const userId = req.user.sub as string;
    const body = (req.body ?? {}) as { weekStart?: string };

    const membership = await ensureMembership(userId, roomId);
    if (!membership) return reply.code(403).send({ error: "FORBIDDEN" });

    const weekStart = toWeekStartUtc(body.weekStart);
    if (!weekStart) return reply.code(400).send({ error: "BAD_WEEK_START" });

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        createdAt: { gte: weekStart, lt: weekEnd },
        NOT: { content: "(삭제된 메시지)" }
      },
      orderBy: { createdAt: "asc" },
      take: 400
    });

    if (!messages.length) return reply.send({ ok: true, created: 0, reason: "NO_MESSAGES" });
    if (!env.openaiApiKey) return reply.code(501).send({ error: "OPENAI_NOT_CONFIGURED" });

    // Keep prompt bounded
    const transcript = messages
      .map((m) => `[${m.createdAt.toISOString()}] ${m.senderType}${m.senderUserId ? `:${m.senderUserId}` : ""}: ${m.content}`)
      .join("\n")
      .slice(0, 120_000);

    const system =
      "You are a product discovery assistant.\n" +
      "Given a chat transcript for a single week, extract actionable ideas.\n" +
      "Return ONLY valid JSON (no markdown) with shape: {\"cards\": Card[]}.\n" +
      "Each Card MUST include these keys:\n" +
      "- title (string)\n" +
      "- content (object) with keys: problem, proposal, impact, constraints, owners (array of strings), evidence (array of strings)\n" +
      "- graph (object) with keys: issues, systems, decisions (arrays of strings)\n" +
      "Write content in Korean.\n" +
      "If transcript lacks enough info, return {\"cards\": []}.\n";

    const upstream = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.openaiIdeaModel,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `WeekStart(UTC): ${weekStart.toISOString()}\n\nChat transcript:\n${transcript}`
          }
        ]
      })
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return reply.code(502).send({
        error: "IDEA_UPSTREAM_ERROR",
        status: upstream.status,
        details: details.slice(0, 2000)
      });
    }

    const data: any = await upstream.json();
    const raw = String(data?.choices?.[0]?.message?.content ?? "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return reply.code(502).send({ error: "IDEA_BAD_JSON", sample: raw.slice(0, 400) });
    }

    const cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
    if (!cards.length) {
      // Clear any previous AI cards for the week to keep it deterministic
      await prisma.ideaCard.deleteMany({ where: { roomId, kind: "weekly_ai", weekStart } });
      return reply.send({ ok: true, created: 0 });
    }

    // Replace existing AI cards for the same weekStart
    await prisma.ideaCard.deleteMany({ where: { roomId, kind: "weekly_ai", weekStart } });

    let createdCount = 0;
    for (const c of cards.slice(0, 12)) {
      const title = String(c?.title ?? "").trim() || "주간 아이디어";
      const content = (c?.content ?? {}) as any;
      const graph = (c?.graph ?? null) as any;

      await prisma.ideaCard.create({
        data: {
          roomId,
          createdBy: null, // AI
          sourceMessageId: null,
          kind: "weekly_ai",
          weekStart,
          title,
          content,
          graph: graph ?? undefined
        }
      });
      createdCount += 1;
    }

    return reply.send({ ok: true, created: createdCount });
  });

  // Brain Pulse 리포트: 카드+그래프+채팅 기반 1개 보고서 + AI 인텔리전스 제안 (방당 1개 저장, 1주 자동 업데이트 전까지 유지)
  type PulseReportSections = {
    people?: string;
    chat?: string;
    documents?: string;
    tasks?: string;
    ideas?: string;
    problems?: string;
    complaints?: string;
    techIssues?: string;
    decisions?: string;
  };
  type PulseReportPayload = {
    summary: string;
    sections: PulseReportSections;
    aiSuggestions: string[];
    generatedAt: string;
  };

  /** 저장된 Brain Pulse 리포트 조회 (없으면 404) */
  app.get("/rooms/:roomId/pulse-report", { preHandler: app.authenticate }, async (req: any, reply) => {
    const roomId = req.params.roomId as string;
    const userId = req.user.sub as string;
    const membership = await ensureMembership(userId, roomId);
    if (!membership) return reply.code(403).send({ error: "FORBIDDEN" });
    const report = await prisma.pulseReport.findUnique({ where: { roomId } });
    if (!report) return reply.code(404).send({ error: "NOT_FOUND" });
    return reply.send({
      summary: report.summary,
      sections: report.sections as PulseReportSections,
      aiSuggestions: (report.aiSuggestions as string[]) ?? [],
      generatedAt: report.generatedAt.toISOString()
    });
  });

  app.post("/rooms/:roomId/pulse-report", { preHandler: app.authenticate }, async (req: any, reply) => {
    const roomId = req.params.roomId as string;
    const userId = req.user.sub as string;

    const membership = await ensureMembership(userId, roomId);
    if (!membership) return reply.code(403).send({ error: "FORBIDDEN" });

    if (!env.openaiApiKey) return reply.code(501).send({ error: "OPENAI_NOT_CONFIGURED" });

    const [room, messages, cards] = await Promise.all([
      prisma.room.findUnique({ where: { id: roomId } }),
      prisma.message.findMany({
        where: { roomId, NOT: { content: "(삭제된 메시지)" } },
        orderBy: { createdAt: "asc" },
        take: 500
      }),
      prisma.ideaCard.findMany({
        where: { roomId },
        orderBy: { createdAt: "desc" },
        take: 120
      })
    ]);

    const transcript = messages
      .map((m) => `[${m.createdAt.toISOString()}] ${m.senderType}${m.senderUserId ? `:${m.senderUserId}` : ""}: ${m.content}`)
      .join("\n")
      .slice(0, 100_000);

    const cardsSummary = cards
      .map((c) => {
        const content = (c.content ?? {}) as any;
        const g = (c.graph ?? null) as any;
        const parts = [`제목: ${c.title}`];
        if (content.problem) parts.push(`Problem: ${content.problem}`);
        if (content.proposal) parts.push(`Proposal: ${content.proposal}`);
        if (content.impact) parts.push(`Impact: ${content.impact}`);
        if (Array.isArray(g?.issues) && g.issues.length) parts.push(`Issues: ${g.issues.join(", ")}`);
        if (Array.isArray(g?.systems) && g.systems.length) parts.push(`Systems: ${g.systems.join(", ")}`);
        if (Array.isArray(g?.decisions) && g.decisions.length) parts.push(`Decisions: ${g.decisions.join(", ")}`);
        return parts.join("\n");
      })
      .join("\n\n---\n\n")
      .slice(0, 30_000);

    const system =
      "You are a meeting intelligence assistant. Given chat transcript and idea cards (with knowledge-graph tags), produce ONE consolidated report in Korean.\n" +
      "Return ONLY valid JSON (no markdown, no code block) with this exact shape:\n" +
      '{"summary":"한 줄 요약","sections":{"people":"참여자/역할 요약","chat":"채팅 흐름 요약","documents":"언급된 문서","tasks":"태스크/할일","ideas":"아이디어","problems":"문제 제기","complaints":"불만/우려","techIssues":"기술 이슈","decisions":"결정 사항"},"aiSuggestions":["제안1","제안2",...]}\n' +
      "Omit section keys when no content. aiSuggestions: 3~7 actionable recommendations based on the report. Write all text in Korean.";

    const userContent =
      `Room: ${room?.title ?? roomId}\n\n` +
      "=== 채팅 기록 (일부) ===\n" +
      (transcript || "(없음)") +
      "\n\n=== 아이디어 카드 및 지식 그래프 요약 ===\n" +
      (cardsSummary || "(없음)");

    const upstream = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.openaiIdeaModel,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent }
        ]
      })
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return reply.code(502).send({
        error: "PULSE_UPSTREAM_ERROR",
        status: upstream.status,
        details: details.slice(0, 2000)
      });
    }

    const data: any = await upstream.json();
    const raw = String(data?.choices?.[0]?.message?.content ?? "").trim();
    const cleaned = raw.replace(/^```\w*\n?|\n?```$/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return reply.code(502).send({ error: "PULSE_BAD_JSON", sample: raw.slice(0, 400) });
    }

    const summary = String(parsed?.summary ?? "").trim() || "요약 없음";
    const sections: PulseReportSections = (parsed?.sections && typeof parsed.sections === "object") ? parsed.sections : {};
    const aiSuggestions = Array.isArray(parsed?.aiSuggestions) ? parsed.aiSuggestions.map((s: any) => String(s)) : [];
    const generatedAt = new Date();

    const payload: PulseReportPayload = {
      summary,
      sections,
      aiSuggestions,
      generatedAt: generatedAt.toISOString()
    };

    try {
      await prisma.pulseReport.upsert({
        where: { roomId },
        create: { roomId, summary, sections, aiSuggestions, generatedAt },
        update: { summary, sections, aiSuggestions, generatedAt }
      });
    } catch (err) {
      req.log?.error?.(err, "PulseReport save failed (table may not exist yet); returning report anyway");
      // DB 저장 실패해도 생성된 리포트는 반환 (마이그레이션 미적용 시에도 동작)
    }

    return reply.send(payload);
  });
}


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

      // 동일 sourceMessageId 카드가 이미 있으면 중복 생성 방지 → 기존 카드 반환
      if (sourceMessageId) {
        const existing = await prisma.ideaCard.findFirst({
          where: { roomId, sourceMessageId }
        });
        if (existing) {
          return reply.send({
            id: existing.id,
            roomId: existing.roomId,
            createdBy: existing.createdBy ?? null,
            sourceMessageId: existing.sourceMessageId ?? null,
            kind: existing.kind,
            weekStart: existing.weekStart ? existing.weekStart.toISOString() : null,
            title: existing.title,
            content: (existing.content as object) ?? {},
            graph: existing.graph ?? null,
            createdAt: existing.createdAt.toISOString(),
            updatedAt: existing.updatedAt.toISOString()
          });
        }
      }

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

    /** 방 내 동일 내용 카드 여부 확인용: title + content.problem 정규화 */
    function contentKey(t: string, cont: any): string {
      const p = String((cont?.problem ?? "") ?? "").trim().replace(/\s+/g, " ");
      return `${String(t).trim()}\n${p}`.trim() || t || "주간 아이디어";
    }
    const existingKeys = new Set<string>();
    const roomCards = await prisma.ideaCard.findMany({
      where: { roomId },
      select: { title: true, content: true }
    });
    for (const rc of roomCards) {
      const c = rc.content as any;
      existingKeys.add(contentKey(rc.title, c));
    }

    let createdCount = 0;
    for (const c of cards.slice(0, 12)) {
      const title = String(c?.title ?? "").trim() || "주간 아이디어";
      const content = (c?.content ?? {}) as any;
      const graph = (c?.graph ?? null) as any;
      const key = contentKey(title, content);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

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

  // Brain Pulse 리포트: 카드+그래프+채팅 기반 전문 분석 리포트 (방당 1개 저장, 1주 자동 업데이트 전까지 유지)
  type PulseReportSections = {
    executiveInsight?: string;
    problemDefinition?: string;
    causalAnalysis?: string;
    impactMatrix?: string;
    opportunities?: string;
    actionItems?: string;
    techConsiderations?: string;
    orgConsiderations?: string;
    riskAnalysis?: string;
    nextSteps?: string;
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
      "You are a senior strategy/consulting analyst. Given chat transcript and idea cards, produce ONE professional analysis report in Korean.\n" +
      "Do NOT simply summarize or paraphrase the input. Reconstruct hidden problems, root causes, opportunities, and strategies by inferring from context. Write in a consulting-style, data-driven tone. Depth: at least 2–3x substance vs. simple summary; avoid fluff.\n\n" +
      "Return ONLY valid JSON (no markdown, no code block). Use this exact shape (omit section keys only when truly no content):\n" +
      '{"summary":"한 문장 핵심 요약","sections":{' +
      '"executiveInsight":"핵심 인사이트 3~5개 (불릿 또는 번호, 각 1~2문장)",' +
      '"problemDefinition":"문제 정의 — 왜 지금 중요한가? (배경·시의성·스테이크홀더)",' +
      '"causalAnalysis":"원인 분석 — Causal Chain 방식 (원인→결과→연쇄)",' +
      '"impactMatrix":"영향도 매트릭스 — 사람/조직/비용/고객/기술/리스크 관점으로 정리",' +
      '"opportunities":"기회 발굴 — AI·자동화·서비스 관점의 기회",' +
      '"actionItems":"액션 아이템 — 즉시·단기·중기·장기 실행 단계별로 구분",' +
      '"techConsiderations":"기술적 고려사항 — AI·시스템·데이터 관점",' +
      '"orgConsiderations":"조직적 고려사항 — 프로세스·협업·역할",' +
      '"riskAnalysis":"리스크 분석 및 대응전략",' +
      '"nextSteps":"미해결 질문 / 다음 단계(Next Step)"' +
      '},"aiSuggestions":["연구/실험/제품화 아이디어 1","...","..."]}\n' +
      "Rules: (1) All text in Korean. (2) executiveInsight, problemDefinition, causalAnalysis, impactMatrix, opportunities, actionItems, techConsiderations, orgConsiderations, riskAnalysis, nextSteps must be filled with inferred/analytical content, not raw copy of chat. (3) aiSuggestions: 3~7 actionable items (research/experiment/productization). (4) Optional: include 'people' in sections as one-line participant/role summary if useful for Spec.";

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


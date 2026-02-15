/**
 * 에이전트가 사용할 수 있는 도구들 정의
 * OpenAI Function Calling 형식으로 정의합니다.
 */

import { env } from "./env.js";
import { pub } from "./redis.js";

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
};

export type ToolResult = {
  toolCallId: string;
  result: any;
  error?: string;
};

/**
 * 사용 가능한 도구들 정의
 */
export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_room_messages",
      description: "채팅방의 과거 메시지를 검색합니다. 특정 키워드나 주제와 관련된 메시지를 찾을 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "검색할 키워드나 질문"
          },
          limit: {
            type: "number",
            description: "반환할 최대 메시지 수 (기본값: 5)",
            default: 5
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_summary",
      description: "채팅방의 최근 대화 요약을 가져옵니다. 방의 전체적인 맥락을 파악할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "요약할 기간(일) (기본값: 7)",
            default: 7
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "수학 계산을 수행합니다. 숫자 연산이나 통계 계산이 필요할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "계산할 수식 (예: '2 + 2', 'sqrt(16)', '10 * 5')"
          }
        },
        required: ["expression"]
      }
    }
  }
  ,
  {
    type: "function",
    function: {
      name: "search_room_messages_text",
      description:
        "채팅방 메시지 DB에서 텍스트(키워드)로 직접 검색합니다. 사용자가 '채팅에서 ~ 내용 찾아줘'라고 요청할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "검색할 키워드/문장" },
          limit: { type: "number", description: "반환할 최대 메시지 수 (기본값: 8)", default: 8 },
          days: { type: "number", description: "최근 N일 범위에서 검색 (기본값: 30)", default: 30 }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calendar_list_events",
      description: "내 캘린더 일정 목록을 조회합니다.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "조회 시작(ISO datetime). 비우면 오늘-30일부터." },
          to: { type: "string", description: "조회 종료(ISO datetime). 비우면 오늘+90일까지." },
          limit: { type: "number", description: "최대 개수(기본값: 50)", default: 50 }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calendar_create_event",
      description: "내 캘린더에 일정을 생성합니다.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "일정 제목" },
          start: { type: "string", description: "시작(ISO datetime, 예: 2026-03-02T18:00:00+09:00)" },
          end: { type: "string", description: "종료(ISO datetime, 예: 2026-03-02T20:00:00+09:00)" },
          color: { type: "string", description: "색상(hex). 비우면 기본색." }
        },
        required: ["title", "start", "end"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calendar_find_events",
      description: "제목/기간 조건으로 일정을 검색해서 eventId를 찾습니다. 수정/삭제 전 대상 찾기에 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "제목 검색어 (contains, optional)" },
          from: { type: "string", description: "조회 시작(ISO datetime, optional)" },
          to: { type: "string", description: "조회 종료(ISO datetime, optional)" },
          limit: { type: "number", description: "최대 개수(기본값: 20)", default: 20 }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calendar_update_event",
      description: "일정을 수정합니다. 먼저 calendar_find_events로 eventId를 찾는 것을 권장합니다.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "수정할 event id" },
          title: { type: "string", description: "새 제목(optional)" },
          start: { type: "string", description: "새 시작(ISO datetime, optional)" },
          end: { type: "string", description: "새 종료(ISO datetime, optional)" },
          color: { type: "string", description: "새 색상(hex, optional)" }
        },
        required: ["eventId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calendar_delete_event",
      description: "일정을 삭제합니다. 먼저 calendar_find_events로 eventId를 찾는 것을 권장합니다.",
      parameters: {
        type: "object",
        properties: { eventId: { type: "string", description: "삭제할 event id" } },
        required: ["eventId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "room_add_user",
      description:
        "현재 채팅방에 사용자를 추가(초대)합니다. identifier(이름/이메일)로 유저를 찾고, 찾으면 멤버로 추가합니다. 유저 생성은 email+name이 모두 있을 때만 수행합니다.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "이름 또는 이메일(부분도 가능)" },
          email: { type: "string", description: "생성/정확 매칭용 이메일(optional)" },
          name: { type: "string", description: "생성용 이름(optional)" }
        },
        required: ["identifier"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_news_search_popup",
      description:
        "뉴스 검색 팝업을 자동으로 띄웁니다. 클라이언트가 query로 뉴스 API를 호출해 검색 결과를 보여줍니다.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "뉴스 검색어" }
        },
        required: ["query"]
      }
    }
  }
  ,
  {
    type: "function",
    function: {
      name: "create_room",
      description:
        "새 채팅방을 생성하고(기본 group), 요청에 따라 멤버를 초대합니다. 멤버는 이름/이메일(identifier)로 찾으며, email+name이 모두 제공된 경우에만 신규 유저를 생성할 수 있습니다.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "채팅방 제목" },
          type: { type: "string", description: "방 타입(optional, 기본 group)" },
          members: {
            type: "array",
            description:
              "초대할 사람들(0명 이상). identifier는 이름/이메일. 유저 생성이 필요하면 email+name을 함께 제공해야 함.",
            items: {
              type: "object",
              properties: {
                identifier: { type: "string", description: "이름 또는 이메일(부분도 가능)" },
                email: { type: "string", description: "정확 매칭/생성용 이메일(optional)" },
                name: { type: "string", description: "생성용 이름(optional)" }
              },
              required: ["identifier"]
            }
          }
        },
        required: ["title"]
      }
    }
  }
];

/**
 * 도구 실행 함수
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: {
    roomId: string;
    requestedBy: string;
    prisma: any;
    generateEmbedding?: (text: string) => Promise<number[]>;
    searchSimilarMessages?: (embedding: number[], roomId: string, limit: number) => Promise<any[]>;
  }
): Promise<any> {
  async function publishRoomEvent(type: string, payload: any) {
    await pub.publish(env.pubsubChannel, JSON.stringify({ roomId: context.roomId, type, payload }));
  }

  async function publishUserEvent(targetUserId: string, type: string, payload: any) {
    await pub.publish(env.pubsubChannel, JSON.stringify({ targetUserId, type, payload }));
  }

  switch (toolName) {
    case "search_room_messages": {
      if (!context.generateEmbedding || !context.searchSimilarMessages) {
        throw new Error("Embedding functions not available");
      }
      const query = args.query as string;
      const limit = args.limit ?? 5;
      const embedding = await context.generateEmbedding(query);
      const results = await context.searchSimilarMessages(embedding, context.roomId, limit);
      return {
        messages: results.map((r) => ({
          content: r.content,
          similarity: r.similarity,
          createdAt: r.createdAt.toISOString()
        }))
      };
    }

    case "get_room_summary": {
      const days = args.days ?? 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const messages = await context.prisma.message.findMany({
        where: {
          roomId: context.roomId,
          createdAt: { gte: since },
          senderType: { not: "bot" },
          content: { not: "(삭제된 메시지)" }
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          content: true,
          createdAt: true,
          senderType: true
        }
      });
      return {
        messageCount: messages.length,
        period: `${days}일`,
        sampleMessages: messages.slice(0, 5).map((m: any) => ({
          content: m.content.slice(0, 100),
          createdAt: m.createdAt.toISOString()
        }))
      };
    }

    case "search_room_messages_text": {
      const query = String(args.query ?? "").trim();
      const limit = Math.min(Number(args.limit ?? 8) || 8, 30);
      const days = Math.max(1, Math.min(Number(args.days ?? 30) || 30, 365));
      if (!query) return { messages: [] };

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const messages = await context.prisma.message.findMany({
        where: {
          roomId: context.roomId,
          createdAt: { gte: since },
          content: { contains: query, mode: "insensitive" },
          NOT: { content: "(삭제된 메시지)" }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, content: true, createdAt: true, senderType: true, senderUserId: true }
      });

      return {
        query,
        rangeDays: days,
        count: messages.length,
        messages: messages.map((m: any) => ({
          id: m.id,
          senderType: m.senderType,
          senderUserId: m.senderUserId ?? null,
          createdAt: m.createdAt.toISOString(),
          content: String(m.content ?? "").slice(0, 500)
        }))
      };
    }

    case "calendar_list_events": {
      const limit = Math.min(Number(args.limit ?? 50) || 50, 200);
      const fromRaw = args.from ? new Date(String(args.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toRaw = args.to ? new Date(String(args.to)) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const from = Number.isFinite(fromRaw.getTime()) ? fromRaw : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = Number.isFinite(toRaw.getTime()) ? toRaw : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const events = await context.prisma.calendarEvent.findMany({
        where: { userId: context.requestedBy, start: { gte: from }, end: { lte: to } },
        orderBy: { start: "asc" },
        take: limit,
        select: { id: true, title: true, start: true, end: true, color: true, createdAt: true, updatedAt: true }
      });
      return {
        count: events.length,
        events: events.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start.toISOString(),
          end: e.end.toISOString(),
          color: e.color,
          updatedAt: e.updatedAt.toISOString()
        }))
      };
    }

    case "calendar_find_events": {
      const q = String(args.query ?? "").trim();
      const limit = Math.min(Number(args.limit ?? 20) || 20, 100);
      const fromRaw = args.from ? new Date(String(args.from)) : null;
      const toRaw = args.to ? new Date(String(args.to)) : null;
      const where: any = { userId: context.requestedBy };
      if (q) where.title = { contains: q, mode: "insensitive" };
      if (fromRaw && Number.isFinite(fromRaw.getTime())) where.start = { gte: fromRaw };
      if (toRaw && Number.isFinite(toRaw.getTime())) where.end = { lte: toRaw };
      const events = await context.prisma.calendarEvent.findMany({
        where,
        orderBy: { start: "asc" },
        take: limit,
        select: { id: true, title: true, start: true, end: true, color: true, updatedAt: true }
      });
      return {
        query: q || null,
        count: events.length,
        events: events.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start.toISOString(),
          end: e.end.toISOString(),
          color: e.color,
          updatedAt: e.updatedAt.toISOString()
        }))
      };
    }

    case "calendar_create_event": {
      const title = String(args.title ?? "").trim();
      const startDate = new Date(String(args.start ?? ""));
      const endDate = new Date(String(args.end ?? ""));
      const color = args.color ? String(args.color).trim() : undefined;
      if (!title) throw new Error("title is required");
      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) throw new Error("Invalid date format");
      if (startDate > endDate) throw new Error("start must be before or equal to end");
      const event = await context.prisma.calendarEvent.create({
        data: { userId: context.requestedBy, title, start: startDate, end: endDate, color: color || undefined },
        select: { id: true, title: true, start: true, end: true, color: true, createdAt: true }
      });
      return {
        id: event.id,
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        color: event.color,
        createdAt: event.createdAt.toISOString()
      };
    }

    case "calendar_update_event": {
      const eventId = String(args.eventId ?? "").trim();
      if (!eventId) throw new Error("eventId is required");
      const existing = await context.prisma.calendarEvent.findFirst({
        where: { id: eventId, userId: context.requestedBy }
      });
      if (!existing) throw new Error("Event not found");

      const data: any = {};
      if (args.title != null) data.title = String(args.title).trim();
      if (args.color != null) data.color = String(args.color).trim();
      if (args.start != null) {
        const d = new Date(String(args.start));
        if (!Number.isFinite(d.getTime())) throw new Error("Invalid start date");
        data.start = d;
      }
      if (args.end != null) {
        const d = new Date(String(args.end));
        if (!Number.isFinite(d.getTime())) throw new Error("Invalid end date");
        data.end = d;
      }
      const next = await context.prisma.calendarEvent.update({
        where: { id: eventId },
        data,
        select: { id: true, title: true, start: true, end: true, color: true, updatedAt: true }
      });
      return {
        id: next.id,
        title: next.title,
        start: next.start.toISOString(),
        end: next.end.toISOString(),
        color: next.color,
        updatedAt: next.updatedAt.toISOString()
      };
    }

    case "calendar_delete_event": {
      const eventId = String(args.eventId ?? "").trim();
      if (!eventId) throw new Error("eventId is required");
      const existing = await context.prisma.calendarEvent.findFirst({
        where: { id: eventId, userId: context.requestedBy }
      });
      if (!existing) return { ok: true, deleted: false };
      await context.prisma.calendarEvent.delete({ where: { id: eventId } });
      return { ok: true, deleted: true, eventId };
    }

    case "room_add_user": {
      const identifier = String(args.identifier ?? "").trim();
      const email = args.email ? String(args.email).trim() : "";
      const name = args.name ? String(args.name).trim() : "";
      if (!identifier) throw new Error("identifier is required");

      // requester must be a member
      const requester = await context.prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: context.roomId, userId: context.requestedBy } }
      });
      if (!requester) throw new Error("FORBIDDEN");

      let candidates: any[] = [];
      if (email) {
        const byEmail = await context.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
        if (byEmail) candidates = [byEmail];
      }
      if (!candidates.length) {
        const q = identifier;
        candidates = await context.prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } }
            ]
          },
          take: 8,
          select: { id: true, email: true, name: true }
        });
      }

      // create user only when both email+name are provided
      if (candidates.length === 0 && email && name) {
        const created = await context.prisma.user.create({
          data: { email, name },
          select: { id: true, email: true, name: true }
        });
        candidates = [created];
      }

      if (candidates.length === 0) {
        return {
          ok: false,
          reason: "USER_NOT_FOUND",
          message: "해당 사용자를 찾지 못했습니다. 이메일까지 알려주면 생성/추가할 수 있어요.",
          candidates: []
        };
      }
      if (candidates.length > 1) {
        return {
          ok: false,
          reason: "AMBIGUOUS",
          message: "동명이인/유사 사용자가 여러 명입니다. 이메일 또는 정확한 이름으로 다시 요청해 주세요.",
          candidates
        };
      }

      const user = candidates[0];

      // add membership (idempotent)
      await context.prisma.roomMember.createMany({
        data: [{ roomId: context.roomId, userId: user.id, role: "member" }],
        skipDuplicates: true
      });

      // notify room (system msg in client)
      await publishRoomEvent("room.member.added", { roomId: context.roomId, userId: user.id, userName: user.name });

      // best-effort: notify newly added user about the room (so list updates immediately when online)
      const roomWithMeta = await context.prisma.room.findUnique({
        where: { id: context.roomId },
        include: {
          _count: { select: { members: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } }
        }
      });
      if (roomWithMeta) {
        const r: any = roomWithMeta as any;
        const lastMsg = r.messages?.[0];
        const lastMessageAt = (lastMsg?.createdAt ?? r.createdAt) as Date;
        const { messages, _count, ...rest } = r;
        const roomDto = {
          ...rest,
          membersCount: _count?.members ?? 0,
          lastMessageAt: lastMessageAt.toISOString()
        };
        await publishUserEvent(user.id, "room.added", { room: roomDto });
      }

      return { ok: true, addedUser: user, roomId: context.roomId };
    }

    case "create_room": {
      const title = String(args.title ?? "").trim();
      const type = String(args.type ?? "group").trim() || "group";
      const membersIn = Array.isArray(args.members) ? args.members : [];
      if (!title) throw new Error("title is required");

      const resolvedUserIds: string[] = [];
      const unresolved: Array<{ input: any; reason: string; candidates?: any[] }> = [];

      async function resolveMember(m: any) {
        const identifier = String(m?.identifier ?? "").trim();
        const email = m?.email ? String(m.email).trim() : "";
        const name = m?.name ? String(m.name).trim() : "";
        if (!identifier) {
          unresolved.push({ input: m, reason: "IDENTIFIER_REQUIRED" });
          return;
        }

        let candidates: any[] = [];
        if (email) {
          const byEmail = await context.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
          if (byEmail) candidates = [byEmail];
        }

        if (!candidates.length) {
          candidates = await context.prisma.user.findMany({
            where: {
              OR: [
                { name: { contains: identifier, mode: "insensitive" } },
                { email: { contains: identifier, mode: "insensitive" } }
              ]
            },
            take: 8,
            select: { id: true, email: true, name: true }
          });
        }

        if (candidates.length === 0 && email && name) {
          const created = await context.prisma.user.create({
            data: { email, name },
            select: { id: true, email: true, name: true }
          });
          candidates = [created];
        }

        if (candidates.length === 0) {
          unresolved.push({
            input: { identifier, email: email || undefined, name: name || undefined },
            reason: "USER_NOT_FOUND"
          });
          return;
        }
        if (candidates.length > 1) {
          unresolved.push({
            input: { identifier, email: email || undefined, name: name || undefined },
            reason: "AMBIGUOUS",
            candidates
          });
          return;
        }
        resolvedUserIds.push(candidates[0].id);
      }

      for (const m of membersIn) {
        // eslint-disable-next-line no-await-in-loop
        await resolveMember(m);
      }

      const memberUserIds = Array.from(new Set([context.requestedBy, ...resolvedUserIds]));

      const room = await context.prisma.room.create({
        data: {
          title,
          type,
          createdBy: context.requestedBy,
          members: {
            create: memberUserIds.map((uid: string) => ({
              userId: uid,
              role: uid === context.requestedBy ? "owner" : "member"
            }))
          }
        }
      });

      const roomWithMeta = await context.prisma.room.findUnique({
        where: { id: room.id },
        include: {
          _count: { select: { members: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } }
        }
      });
      let roomDto: any = null;
      if (roomWithMeta) {
        const r: any = roomWithMeta as any;
        const lastMsg = r.messages?.[0];
        const lastMessageAt = (lastMsg?.createdAt ?? r.createdAt) as Date;
        const { messages, _count, ...rest } = r;
        roomDto = {
          ...rest,
          membersCount: _count?.members ?? memberUserIds.length,
          lastMessageAt: lastMessageAt.toISOString()
        };
      }

      // Notify creator + invited users so room list updates immediately
      if (roomDto) {
        for (const uid of memberUserIds) {
          // eslint-disable-next-line no-await-in-loop
          await publishUserEvent(uid, "room.added", { room: roomDto });
        }
      }

      // Best-effort: emit member-added system events in the new room
      if (resolvedUserIds.length) {
        const users = await context.prisma.user.findMany({
          where: { id: { in: resolvedUserIds } },
          select: { id: true, name: true }
        });
        for (const u of users) {
          // eslint-disable-next-line no-await-in-loop
          await pub.publish(
            env.pubsubChannel,
            JSON.stringify({ roomId: room.id, type: "room.member.added", payload: { roomId: room.id, userId: u.id, userName: u.name } })
          );
        }
      }

      return {
        ok: true,
        room: { id: room.id, title: room.title, type: room.type },
        invitedUserIds: resolvedUserIds,
        unresolved
      };
    }

    case "open_news_search_popup": {
      const query = String(args.query ?? "").trim();
      if (!query) throw new Error("query is required");
      await publishRoomEvent("ui.news.search", { roomId: context.roomId, query });
      return { ok: true, roomId: context.roomId, query };
    }

    case "calculate": {
      const expression = args.expression as string;
      try {
        // 안전한 계산만 허용 (eval은 위험하지만 예시용)
        // 실제 프로덕션에서는 mathjs 같은 라이브러리 사용 권장
        const result = Function(`"use strict"; return (${expression})`)();
        return {
          expression,
          result: typeof result === "number" ? result : String(result)
        };
      } catch (error: any) {
        return {
          expression,
          error: error.message
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}


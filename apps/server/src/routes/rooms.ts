import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { aiQueue } from "../lib/queues.js";

export async function roomRoutes(app: FastifyInstance) {
  app.get("/rooms", { preHandler: app.authenticate }, async (req: any) => {
    const userId = req.user.sub as string;
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            _count: { select: { members: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true }
            }
          }
        }
      }
    });
    // lastMessageAt = latest message in room (for list order & "2h ago" display)
    return memberships.map((m) => {
      const room = m.room as any;
      const lastMsg = room.messages?.[0];
      const lastMessageAt = lastMsg?.createdAt ?? room.createdAt;
      const { messages, ...roomWithoutMessages } = room;
      return {
        ...roomWithoutMessages,
        membersCount: room._count?.members ?? 0,
        lastMessageAt: lastMessageAt instanceof Date ? lastMessageAt.toISOString() : lastMessageAt
      };
    });
  });

  app.get("/rooms/:roomId/members", { preHandler: app.authenticate }, async (req: any) => {
    const roomId = req.params.roomId as string;
    const userId = req.user.sub as string;

    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } }
    });
    if (!membership) return [];

    const members = await prisma.roomMember.findMany({
      where: { roomId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: {
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isOnline: true,
            lastSeenAt: true
          }
        }
      }
    });

    // Keep shape future-proof for department/avatarUrl if added later.
    return members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      isOnline: m.user.isOnline,
      lastSeenAt: m.user.lastSeenAt ? m.user.lastSeenAt.toISOString() : null,
      department: null,
      avatarUrl: null,
      joinedAt: m.joinedAt.toISOString()
    }));
  });

  app.post("/rooms", { preHandler: app.authenticate }, async (req: any) => {
    const userId = req.user.sub as string;
    const body = (req.body ?? {}) as { title?: string; type?: string; memberUserIds?: string[] };
    const title = body.title?.trim() || "New Room";
    const type = body.type?.trim() || "group";
    const memberUserIds = Array.from(new Set([userId, ...(body.memberUserIds ?? [])]));

    const room = await prisma.room.create({
      data: {
        title,
        type,
        createdBy: userId,
        members: {
          create: memberUserIds.map((id) => ({ userId: id, role: id === userId ? "owner" : "member" }))
        }
      }
    });

    return room;
  });

  app.get("/rooms/:roomId/messages", { preHandler: app.authenticate }, async (req: any) => {
    const roomId = req.params.roomId as string;
    const take = Math.min(Number(req.query.take ?? 50), 200);

    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: req.user.sub as string } }
    });
    if (!membership) return [];

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take
    });
    return messages.reverse().map((m) => ({
      id: m.id,
      roomId: m.roomId,
      senderType: m.senderType as any,
      senderUserId: m.senderUserId ?? null,
      content: m.content,
      createdAt: m.createdAt.toISOString()
    }));
  });

  // 지난 회의록 요약해서 현재 방에 가져오기 (참여했던 방 중 하나 선택 → 최근 약 1주일 메시지 요약 후 현재 방에 봇 메시지로 등록)
  app.post("/rooms/:roomId/import-meeting-summary", { preHandler: app.authenticate }, async (req: any, reply) => {
    const targetRoomId = req.params.roomId as string;
    const userId = req.user.sub as string;
    const body = (req.body ?? {}) as { sourceRoomId?: string };
    const sourceRoomId = body.sourceRoomId?.trim();

    if (!sourceRoomId) return reply.code(400).send({ error: "SOURCE_ROOM_REQUIRED" });
    if (sourceRoomId === targetRoomId) return reply.code(400).send({ error: "SOURCE_AND_TARGET_SAME" });

    const [targetMember, sourceMember] = await Promise.all([
      prisma.roomMember.findUnique({ where: { roomId_userId: { roomId: targetRoomId, userId } } }),
      prisma.roomMember.findUnique({ where: { roomId_userId: { roomId: sourceRoomId, userId } } })
    ]);
    if (!targetMember) return reply.code(403).send({ error: "FORBIDDEN_TARGET" });
    if (!sourceMember) return reply.code(403).send({ error: "FORBIDDEN_SOURCE" });

    await aiQueue.add("meeting-summary", {
      targetRoomId,
      sourceRoomId,
      requestedBy: userId
    });
    return reply.send({ ok: true });
  });
}

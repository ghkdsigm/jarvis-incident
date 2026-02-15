import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { aiQueue } from "../lib/queues.js";
import { redisPub } from "../lib/redis.js";
import { env } from "../lib/env.js";

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

    // 실시간: 초대된 사용자에게 방이 즉시 리스트에 보이도록 user-target 이벤트 발행
    // (자기 자신은 클라이언트에서 rooms reload로 처리하므로 제외)
    if (memberUserIds.length > 1) {
      const roomWithMeta = await prisma.room.findUnique({
        where: { id: room.id },
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

        for (const targetUserId of memberUserIds) {
          if (targetUserId === userId) continue;
          const evt = {
            type: "room.added",
            // mark origin so this instance can avoid double-delivery when also receiving from Redis
            origin: (app as any).wsInstanceId,
            targetUserId,
            payload: { room: roomDto }
          };

          // Best-effort local delivery (works even if Redis pubsub is unavailable)
          try {
            (app as any).wsSendToUsers?.([targetUserId], evt);
          } catch {
            // ignore
          }

          // Cross-instance delivery
          try {
            await redisPub.publish(env.pubsubChannel, JSON.stringify(evt));
          } catch {
            // ignore
          }
        }
      }
    }

    return room;
  });

  app.get("/rooms/:roomId/messages", { preHandler: app.authenticate }, async (req: any) => {
    const roomId = req.params.roomId as string;
    const take = Math.min(Number(req.query.take ?? 50), 200);
    const beforeId = req.query.beforeId as string | undefined;

    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: req.user.sub as string } }
    });
    if (!membership) return [];

    const where: any = { roomId };
    if (beforeId) {
      const beforeMessage = await prisma.message.findUnique({
        where: { id: beforeId },
        select: { createdAt: true }
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const messages = await prisma.message.findMany({
      where,
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

  // 참가자 추가
  app.post("/rooms/:roomId/members", { preHandler: app.authenticate }, async (req: any, reply) => {
    const roomId = req.params.roomId as string;
    const userId = req.user.sub as string;
    const body = (req.body ?? {}) as { userIds?: string[] };
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];

    if (userIds.length === 0) {
      return reply.code(400).send({ error: "USER_IDS_REQUIRED" });
    }

    // 현재 사용자가 방의 멤버인지 확인
    const requesterMembership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } }
    });
    if (!requesterMembership) {
      return reply.code(403).send({ error: "FORBIDDEN" });
    }

    // 이미 멤버인 사용자 제외
    const existingMembers = await prisma.roomMember.findMany({
      where: {
        roomId,
        userId: { in: userIds }
      },
      select: { userId: true }
    });
    const existingUserIds = new Set(existingMembers.map((m) => m.userId));
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return reply.send({ ok: true, added: 0, skipped: userIds.length });
    }

    // 사용자 존재 확인
    const users = await prisma.user.findMany({
      where: { id: { in: newUserIds } },
      select: { id: true, name: true }
    });
    const validUserIds = users.map((u) => u.id);
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    if (validUserIds.length === 0) {
      return reply.code(400).send({ error: "NO_VALID_USERS" });
    }

    // 멤버 추가
    await prisma.roomMember.createMany({
      data: validUserIds.map((id) => ({
        roomId,
        userId: id,
        role: "member"
      })),
      skipDuplicates: true
    });

    // WebSocket 이벤트 브로드캐스트
    const members = await prisma.roomMember.findMany({
      where: { roomId },
      select: { userId: true }
    });
    const memberUserIds = members.map((m) => m.userId);

    // 방 메타(리스트 표시용) 구성: 새로 추가된 사용자는 이 정보로 방 리스트를 즉시 갱신한다.
    const roomWithMeta = await prisma.room.findUnique({
      where: { id: roomId },
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
        membersCount: _count?.members ?? 0,
        lastMessageAt: lastMessageAt.toISOString()
      };
    }

    for (const addedUserId of validUserIds) {
      const userName = userMap.get(addedUserId) ?? "알 수 없음";
      const event = {
        type: "room.member.added",
        roomId,
        payload: { roomId, userId: addedUserId, userName }
      };
      try {
        await redisPub.publish(env.pubsubChannel, JSON.stringify(event));
      } catch {
        // ignore
      }

      // 새로 추가된 사용자에게는 user-target 이벤트로 방이 자동으로 리스트에 추가되도록 알림
      if (roomDto) {
        const evt = {
          type: "room.added",
          origin: (app as any).wsInstanceId,
          targetUserId: addedUserId,
          payload: { room: roomDto }
        };

        // Best-effort local delivery (works even if Redis pubsub is unavailable)
        try {
          (app as any).wsSendToUsers?.([addedUserId], evt);
        } catch {
          // ignore
        }

        // Cross-instance delivery
        try {
          await redisPub.publish(env.pubsubChannel, JSON.stringify(evt));
        } catch {
          // ignore
        }
      }
    }

    return reply.send({ ok: true, added: validUserIds.length, skipped: userIds.length - validUserIds.length });
  });
}

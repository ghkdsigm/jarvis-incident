import type { FastifyInstance } from "fastify";
import { WsClientMessageSchema, isJarvisTrigger, stripJarvisPrefix } from "@jarvis/shared";
import { prisma } from "../lib/prisma.js";
import { aiQueue } from "../lib/queues.js";
import { env } from "../lib/env.js";
import { redisSub, redisPub } from "../lib/redis.js";
import { randomUUID } from "crypto";

type WsConn = { socket: any; userId: string; rooms: Set<string> };

export async function registerWs(app: FastifyInstance) {
  const conns = new Set<WsConn>();
  const roomIndex = new Map<string, Set<WsConn>>();
  const userConnCount = new Map<string, number>();

  const INSTANCE_ID = process.env.INSTANCE_ID || randomUUID();

  const DELETED_PLACEHOLDER = "(삭제된 메시지)";

  function broadcast(roomId: string, msg: any) {
    const set = roomIndex.get(roomId);
    if (!set) return;
    const data = JSON.stringify(msg);
    for (const c of set) {
      try {
        c.socket.send(data);
      } catch {
        // ignore broken sockets
      }
    }
  }

  function sendToUsers(userIds: string[], msg: any) {
    const set = new Set(userIds);
    const data = JSON.stringify(msg);
    for (const c of conns) {
      if (!set.has(c.userId)) continue;
      try {
        c.socket.send(data);
      } catch {
        // ignore
      }
    }
  }

  // Allow HTTP routes to deliver user-target events directly (avoids relying solely on Redis pubsub).
  try {
    (app as any).wsInstanceId = INSTANCE_ID;
    (app as any).wsSendToUsers = sendToUsers;
  } catch {
    // ignore
  }

  async function ensureJoined(conn: WsConn, roomId: string): Promise<boolean> {
    if (conn.rooms.has(roomId)) return true;
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: conn.userId } }
    });
    if (!membership) return false;

    conn.rooms.add(roomId);
    if (!roomIndex.has(roomId)) roomIndex.set(roomId, new Set());
    roomIndex.get(roomId)!.add(conn);
    return true;
  }

  await redisSub.subscribe(env.pubsubChannel);
  redisSub.on("message", (_channel, payload) => {
    try {
      const evt = JSON.parse(payload);
      // Avoid double-delivery for user-target events that were already delivered locally by this instance.
      if (evt?.targetUserId && evt?.origin && evt.origin === INSTANCE_ID) return;
      if (evt?.targetUserId) {
        sendToUsers([evt.targetUserId], evt);
      } else if (evt?.roomId) {
        broadcast(evt.roomId, evt);
      }
    } catch {
      // ignore
    }
  });

  app.get("/ws", { websocket: true }, async (connection, req: any) => {
    // @fastify/websocket has had minor API shape differences across versions.
    // Some versions pass a SocketStream-like object ({ socket }), others pass the WebSocket directly.
    const socket: any = (connection as any)?.socket ?? connection;
    if (!socket || typeof socket.on !== "function" || typeof socket.send !== "function") {
      app.log.error(
        { connectionType: typeof connection, keys: connection ? Object.keys(connection as any) : null },
        "Invalid websocket connection object"
      );
      return;
    }

    const token = (req.query?.token as string | undefined) ?? "";
    let user: any;
    try {
      user = app.jwt.verify(token);
    } catch {
      socket.send(JSON.stringify({ type: "error", payload: { message: "INVALID_TOKEN" } }));
      socket.close();
      return;
    }

    const conn: WsConn = { socket, userId: user.sub, rooms: new Set() };
    conns.add(conn);

    // Presence: mark online when first socket connects for this user
    const prevCount = userConnCount.get(conn.userId) ?? 0;
    userConnCount.set(conn.userId, prevCount + 1);
    if (prevCount === 0) {
      prisma.user
        .update({
          where: { id: conn.userId },
          // Cast to avoid stale Prisma Client type caches in some editors/linters.
          data: ({ isOnline: true, lastSeenAt: new Date() } as any)
        })
        .catch(() => {
          // ignore
        });
    }

    socket.on("message", async (raw: any) => {
      let parsed: any;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        socket.send(JSON.stringify({ type: "error", payload: { message: "BAD_JSON" } }));
        return;
      }

      const result = WsClientMessageSchema.safeParse(parsed);
      if (!result.success) {
        socket.send(JSON.stringify({ type: "error", payload: { message: "BAD_MESSAGE" } }));
        return;
      }

      const msg = result.data;

      if (msg.type === "room.join") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }

        socket.send(JSON.stringify({ type: "room.joined", payload: { roomId } }));
        return;
      }

      if (msg.type === "room.leave") {
        const roomId = msg.roomId;
        const membership = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: conn.userId } },
          include: { user: { select: { name: true } } }
        });
        if (!membership) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }

        // Owner가 단독 멤버가 아니라면 나가기 금지 (간단 정책)
        if (membership.role === "owner") {
          const memberCount = await prisma.roomMember.count({ where: { roomId } });
          if (memberCount > 1) {
            socket.send(JSON.stringify({ type: "error", payload: { message: "OWNER_CANNOT_LEAVE" } }));
            return;
          }
        }

        const userName = membership.user?.name ?? "알 수 없음";

        await prisma.roomMember.delete({
          where: { roomId_userId: { roomId, userId: conn.userId } }
        });

        // Remove this socket from in-memory room subscription
        conn.rooms.delete(roomId);
        roomIndex.get(roomId)?.delete(conn);
        if (roomIndex.get(roomId)?.size === 0) roomIndex.delete(roomId);

        // If no members remain, delete the room (cascade cleans messages)
        const remain = await prisma.roomMember.count({ where: { roomId } });
        if (remain === 0) {
          await prisma.room.delete({ where: { id: roomId } });
        } else {
          // 참가자 제거 이벤트 브로드캐스트
          const event = {
            type: "room.member.removed",
            roomId,
            payload: { roomId, userId: conn.userId, userName }
          };
          await redisPub.publish(env.pubsubChannel, JSON.stringify(event));
        }

        socket.send(JSON.stringify({ type: "room.left", payload: { roomId } }));
        return;
      }

      if (msg.type === "message.send") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) return socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));

        const created = await prisma.message.create({
          data: {
            roomId,
            senderType: "user",
            senderUserId: conn.userId,
            content: msg.content
          }
        });

        const dto = {
          id: created.id,
          roomId: created.roomId,
          senderType: "user",
          senderUserId: created.senderUserId ?? null,
          content: created.content,
          createdAt: created.createdAt.toISOString()
        };

        broadcast(roomId, { type: "message.new", payload: dto });

        if (isJarvisTrigger(msg.content)) {
          const prompt = stripJarvisPrefix(msg.content);
          await aiQueue.add("jarvis", { roomId, messageId: created.id, requestedBy: conn.userId, prompt });
        }

        return;
      }

      if (msg.type === "message.edit") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) return socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));

        // Only author can edit their own user message.
        const existing = await prisma.message.findUnique({ where: { id: msg.messageId } });
        if (!existing || existing.roomId !== roomId) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_FOUND" } }));
          return;
        }
        if (existing.senderType !== "user" || existing.senderUserId !== conn.userId) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }
        if (existing.content === DELETED_PLACEHOLDER) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "ALREADY_DELETED" } }));
          return;
        }

        const updated = await prisma.message.update({
          where: { id: msg.messageId },
          data: { content: msg.content }
        });

        const dto = {
          id: updated.id,
          roomId: updated.roomId,
          senderType: updated.senderType as any,
          senderUserId: updated.senderUserId ?? null,
          content: updated.content,
          createdAt: updated.createdAt.toISOString()
        };
        broadcast(roomId, { type: "message.updated", payload: dto });
        return;
      }

      if (msg.type === "message.delete") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) return socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));

        const existing = await prisma.message.findUnique({ where: { id: msg.messageId } });
        if (!existing || existing.roomId !== roomId) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_FOUND" } }));
          return;
        }
        if (existing.senderType !== "user" || existing.senderUserId !== conn.userId) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }
        if (existing.content === DELETED_PLACEHOLDER) {
          // idempotent
          broadcast(roomId, { type: "message.deleted", payload: { roomId, messageId: msg.messageId } });
          return;
        }

        await prisma.message.update({
          where: { id: msg.messageId },
          data: { content: DELETED_PLACEHOLDER }
        });
        broadcast(roomId, { type: "message.deleted", payload: { roomId, messageId: msg.messageId } });
        return;
      }

      if (msg.type === "jarvis.request") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) return socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
        await aiQueue.add("jarvis", {
          roomId,
          messageId: msg.messageId ?? null,
          requestedBy: conn.userId,
          prompt: msg.prompt,
          isPersonal: msg.isPersonal ?? false,
          requestId: msg.requestId ?? null
        });
        return;
      }

      if (msg.type === "room.rename") {
        const roomId = msg.roomId;
        const membership = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: conn.userId } }
        });
        if (!membership) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }
        if (membership.role !== "owner") {
          socket.send(JSON.stringify({ type: "error", payload: { message: "OWNER_ONLY" } }));
          return;
        }
        const room = await prisma.room.update({
          where: { id: roomId },
          data: { title: msg.title.trim() || "New Room" }
        });
        const members = await prisma.roomMember.findMany({ where: { roomId }, select: { userId: true } });
        sendToUsers(
          members.map((m) => m.userId),
          { type: "room.updated", payload: { roomId: room.id, title: room.title } }
        );
        return;
      }

      if (msg.type === "room.delete") {
        const roomId = msg.roomId;
        const membership = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: conn.userId } }
        });
        if (!membership) {
          socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }
        if (membership.role !== "owner") {
          socket.send(JSON.stringify({ type: "error", payload: { message: "OWNER_ONLY" } }));
          return;
        }

        const members = await prisma.roomMember.findMany({ where: { roomId }, select: { userId: true } });
        await prisma.room.delete({ where: { id: roomId } });
        sendToUsers(
          members.map((m) => m.userId),
          { type: "room.deleted", payload: { roomId } }
        );
        return;
      }

      if (msg.type === "rtc.offer") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) return socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
        broadcast(roomId, { type: "rtc.offer", payload: { roomId, fromUserId: conn.userId, sdp: msg.sdp } });
        return;
      }

      if (msg.type === "rtc.answer") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) return socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
        broadcast(roomId, { type: "rtc.answer", payload: { roomId, fromUserId: conn.userId, sdp: msg.sdp } });
        return;
      }

      if (msg.type === "rtc.ice") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) return socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
        broadcast(roomId, {
          type: "rtc.ice",
          payload: { roomId, fromUserId: conn.userId, candidate: msg.candidate }
        });
        return;
      }

      if (msg.type === "rtc.hangup") {
        const roomId = msg.roomId;
        const ok = await ensureJoined(conn, roomId);
        if (!ok) return socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
        broadcast(roomId, { type: "rtc.hangup", payload: { roomId, fromUserId: conn.userId } });
        return;
      }
    });

    socket.on("close", () => {
      conns.delete(conn);
      for (const roomId of conn.rooms) {
        roomIndex.get(roomId)?.delete(conn);
        if (roomIndex.get(roomId)?.size === 0) roomIndex.delete(roomId);
      }

      // Presence: mark offline when last socket closes
      const prev = userConnCount.get(conn.userId) ?? 0;
      const next = Math.max(0, prev - 1);
      if (next === 0) userConnCount.delete(conn.userId);
      else userConnCount.set(conn.userId, next);
      if (prev > 0 && next === 0) {
        prisma.user
          .update({
            where: { id: conn.userId },
            // Cast to avoid stale Prisma Client type caches in some editors/linters.
            data: ({ isOnline: false, lastSeenAt: new Date() } as any)
          })
          .catch(() => {
            // ignore
          });
      }
    });
  });
}

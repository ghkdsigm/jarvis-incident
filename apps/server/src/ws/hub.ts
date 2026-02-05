import type { FastifyInstance } from "fastify";
import { WsClientMessageSchema, isJarvisTrigger, stripJarvisPrefix } from "@jarvis/shared";
import { prisma } from "../lib/prisma.js";
import { aiQueue } from "../lib/queues.js";
import { env } from "../lib/env.js";
import { redisSub } from "../lib/redis.js";

type WsConn = { socket: any; userId: string; rooms: Set<string> };

export async function registerWs(app: FastifyInstance) {
  const conns = new Set<WsConn>();
  const roomIndex = new Map<string, Set<WsConn>>();

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

  await redisSub.subscribe(env.pubsubChannel);
  redisSub.on("message", (_channel, payload) => {
    try {
      const evt = JSON.parse(payload);
      if (evt?.roomId) broadcast(evt.roomId, evt);
    } catch {
      // ignore
    }
  });

  app.get("/ws", { websocket: true }, async (connection, req: any) => {
    const token = (req.query?.token as string | undefined) ?? "";
    let user: any;
    try {
      user = app.jwt.verify(token);
    } catch {
      connection.socket.send(JSON.stringify({ type: "error", payload: { message: "INVALID_TOKEN" } }));
      connection.socket.close();
      return;
    }

    const conn: WsConn = { socket: connection.socket, userId: user.sub, rooms: new Set() };
    conns.add(conn);

    connection.socket.on("message", async (raw: any) => {
      let parsed: any;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        connection.socket.send(JSON.stringify({ type: "error", payload: { message: "BAD_JSON" } }));
        return;
      }

      const result = WsClientMessageSchema.safeParse(parsed);
      if (!result.success) {
        connection.socket.send(JSON.stringify({ type: "error", payload: { message: "BAD_MESSAGE" } }));
        return;
      }

      const msg = result.data;

      if (msg.type === "room.join") {
        const roomId = msg.roomId;
        const membership = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: conn.userId } }
        });
        if (!membership) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }

        conn.rooms.add(roomId);
        if (!roomIndex.has(roomId)) roomIndex.set(roomId, new Set());
        roomIndex.get(roomId)!.add(conn);

        connection.socket.send(JSON.stringify({ type: "room.joined", payload: { roomId } }));
        return;
      }

      if (msg.type === "room.leave") {
        const roomId = msg.roomId;
        const membership = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: conn.userId } }
        });
        if (!membership) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }

        // Owner가 단독 멤버가 아니라면 나가기 금지 (간단 정책)
        if (membership.role === "owner") {
          const memberCount = await prisma.roomMember.count({ where: { roomId } });
          if (memberCount > 1) {
            connection.socket.send(JSON.stringify({ type: "error", payload: { message: "OWNER_CANNOT_LEAVE" } }));
            return;
          }
        }

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
        }

        connection.socket.send(JSON.stringify({ type: "room.left", payload: { roomId } }));
        return;
      }

      if (msg.type === "message.send") {
        const roomId = msg.roomId;
        if (!conn.rooms.has(roomId)) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_IN_ROOM" } }));
          return;
        }

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
        if (!conn.rooms.has(roomId)) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_IN_ROOM" } }));
          return;
        }

        // Only author can edit their own user message.
        const existing = await prisma.message.findUnique({ where: { id: msg.messageId } });
        if (!existing || existing.roomId !== roomId) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_FOUND" } }));
          return;
        }
        if (existing.senderType !== "user" || existing.senderUserId !== conn.userId) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }
        if (existing.content === DELETED_PLACEHOLDER) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "ALREADY_DELETED" } }));
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
        if (!conn.rooms.has(roomId)) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_IN_ROOM" } }));
          return;
        }

        const existing = await prisma.message.findUnique({ where: { id: msg.messageId } });
        if (!existing || existing.roomId !== roomId) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_FOUND" } }));
          return;
        }
        if (existing.senderType !== "user" || existing.senderUserId !== conn.userId) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
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
        if (!conn.rooms.has(roomId)) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_IN_ROOM" } }));
          return;
        }
        await aiQueue.add("jarvis", {
          roomId,
          messageId: msg.messageId ?? null,
          requestedBy: conn.userId,
          prompt: msg.prompt
        });
        return;
      }

      if (msg.type === "room.rename") {
        const roomId = msg.roomId;
        const membership = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: conn.userId } }
        });
        if (!membership) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }
        if (membership.role !== "owner") {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "OWNER_ONLY" } }));
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
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "FORBIDDEN" } }));
          return;
        }
        if (membership.role !== "owner") {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "OWNER_ONLY" } }));
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
        if (!conn.rooms.has(roomId)) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_IN_ROOM" } }));
          return;
        }
        broadcast(roomId, { type: "rtc.offer", payload: { roomId, fromUserId: conn.userId, sdp: msg.sdp } });
        return;
      }

      if (msg.type === "rtc.answer") {
        const roomId = msg.roomId;
        if (!conn.rooms.has(roomId)) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_IN_ROOM" } }));
          return;
        }
        broadcast(roomId, { type: "rtc.answer", payload: { roomId, fromUserId: conn.userId, sdp: msg.sdp } });
        return;
      }

      if (msg.type === "rtc.ice") {
        const roomId = msg.roomId;
        if (!conn.rooms.has(roomId)) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_IN_ROOM" } }));
          return;
        }
        broadcast(roomId, {
          type: "rtc.ice",
          payload: { roomId, fromUserId: conn.userId, candidate: msg.candidate }
        });
        return;
      }

      if (msg.type === "rtc.hangup") {
        const roomId = msg.roomId;
        if (!conn.rooms.has(roomId)) {
          connection.socket.send(JSON.stringify({ type: "error", payload: { message: "NOT_IN_ROOM" } }));
          return;
        }
        broadcast(roomId, { type: "rtc.hangup", payload: { roomId, fromUserId: conn.userId } });
        return;
      }
    });

    connection.socket.on("close", () => {
      conns.delete(conn);
      for (const roomId of conn.rooms) {
        roomIndex.get(roomId)?.delete(conn);
        if (roomIndex.get(roomId)?.size === 0) roomIndex.delete(roomId);
      }
    });
  });
}

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

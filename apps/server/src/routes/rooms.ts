import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function roomRoutes(app: FastifyInstance) {
  app.get("/rooms", { preHandler: app.authenticate }, async (req: any) => {
    const userId = req.user.sub as string;
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            _count: { select: { members: true } }
          }
        }
      }
    });
    return memberships.map((m) => m.room);
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
}

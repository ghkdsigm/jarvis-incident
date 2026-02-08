import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users", { preHandler: app.authenticate }, async (req: any) => {
    const me = req.user.sub as string;
    const qRaw = String(req.query?.q ?? "").trim();
    const q = qRaw.length ? qRaw : null;
    const includeMe = String(req.query?.includeMe ?? "0") === "1";

    const users = await prisma.user.findMany({
      where: {
        ...(includeMe ? {} : { id: { not: me } }),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: [{ isOnline: "desc" }, { name: "asc" }],
      select: { id: true, email: true, name: true, isOnline: true, lastSeenAt: true }
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isOnline: u.isOnline,
      lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null
    }));
  });
}



import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function devAuthRoutes(app: FastifyInstance) {
  app.post("/auth/dev", async (req, reply) => {
    const body = (req.body ?? {}) as { email?: string; name?: string };
    const email = body.email?.trim() || `dev${Date.now()}@local`;
    const name = body.name?.trim() || "Dev User";

    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name }
    });

    const token = app.jwt.sign({ sub: user.id, email: user.email, name: user.name }, { expiresIn: "7d" });
    return reply.send({ token, user: { id: user.id, email: user.email, name: user.name } });
  });
}

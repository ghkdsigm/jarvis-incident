import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../lib/env.js";

type JwtUser = { sub: string; email: string; name: string };

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(jwt, { secret: env.jwtSecret });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const tokenFromQuery = (request.query as any)?.token as string | undefined;

      // Allow token via query param for dev convenience
      if (!authHeader && tokenFromQuery) {
        (request.headers as any).authorization = `Bearer ${tokenFromQuery}`;
      }

      if (!(request.headers as any).authorization) {
        reply.code(401).send({ error: "NO_TOKEN" });
        return;
      }

      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "INVALID_TOKEN" });
    }
  });
});

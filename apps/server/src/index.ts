import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { env } from "./lib/env.js";
import authPlugin from "./plugins/auth.js";
import { devAuthRoutes } from "./routes/devAuth.js";
import { roomRoutes } from "./routes/rooms.js";
import { newsRoutes } from "./routes/news.js";
import { insightsRoutes } from "./routes/insights.js";
import { translateRoutes } from "./routes/translate.js";
import { userRoutes } from "./routes/users.js";
import { holidayRoutes } from "./routes/holidays.js";
import { speechRoutes } from "./routes/speech.js";
import { registerWs } from "./ws/hub.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";

// 로거 설정: 개발 환경에서는 기본 로거 사용 (pino-pretty는 선택사항)
const app = Fastify({
  logger: {
    level: env.nodeEnv === "production" ? "info" : "debug"
    // 개발 환경에서 더 예쁜 로그를 원하면: npm install -D pino-pretty
    // 그리고 아래 주석을 해제하세요:
    // transport: env.nodeEnv === "development" ? {
    //   target: "pino-pretty",
    //   options: {
    //     translateTime: "HH:MM:ss Z",
    //     ignore: "pid,hostname"
    //   }
    // } : undefined
  }
});

// CORS 설정: 운영 환경에서는 특정 도메인만 허용
const corsOrigin = env.nodeEnv === "production" 
  ? (env.corsOrigin?.split(",").map(o => o.trim()).filter(Boolean) || []) 
  : true;

await app.register(cors, {
  origin: corsOrigin,
  credentials: true
});
await app.register(websocket);

await app.register(authPlugin);

// Health check: DB와 Redis 연결 상태 확인
app.get("/health", async (req, reply) => {
  try {
    // DB 연결 확인
    await prisma.$queryRaw`SELECT 1`;
    
    // Redis 연결 확인
    await redis.ping();
    
    return reply.send({
      ok: true,
      timestamp: new Date().toISOString(),
      services: {
        database: "ok",
        redis: "ok"
      }
    });
  } catch (err: any) {
    req.log.error({ err }, "Health check failed");
    return reply.code(503).send({
      ok: false,
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});

await app.register(devAuthRoutes);
await app.register(roomRoutes);
await app.register(newsRoutes);
await app.register(insightsRoutes);
await app.register(translateRoutes);
await app.register(userRoutes);
await app.register(holidayRoutes);
await app.register(speechRoutes);
await registerWs(app);

// 전역 에러 핸들러
app.setErrorHandler((error, request, reply) => {
  app.log.error({ err: error, url: request.url, method: request.method }, "Unhandled error");
  
  // Prisma 에러 처리
  if (error.code === "P2002") {
    return reply.code(409).send({ error: "DUPLICATE_ENTRY", message: "Resource already exists" });
  }
  
  // 기본 에러 응답
  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send({
    error: error.name ?? "INTERNAL_ERROR",
    message: env.nodeEnv === "production" ? "Internal server error" : error.message
  });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down gracefully");
  
  try {
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app.listen({ port: env.port, host: env.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

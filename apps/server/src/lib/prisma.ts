import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

// Prisma 연결 풀링 설정 (운영 환경 최적화)
export const prisma = new PrismaClient({
  log: env.nodeEnv === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: env.databaseUrl
    }
  }
});

// Graceful shutdown: 애플리케이션 종료 시 Prisma 연결 정리
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

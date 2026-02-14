import Redis from "ioredis";
import { env } from "./env.js";

// BullMQ Worker는 blocking command를 사용하므로,
// ioredis 옵션 maxRetriesPerRequest 는 반드시 null 이어야 합니다.
// (그렇지 않으면 BullMQ가 런타임에 에러를 던지고 프로세스가 종료됩니다)
const redisOptions = {
  maxRetriesPerRequest: null as null,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

export const redis = new Redis(env.redisUrl, redisOptions);
export const pub = new Redis(env.redisUrl, redisOptions);

// Redis 연결 에러 핸들링
[redis, pub].forEach((client, index) => {
  const names = ["redis", "pub"];
  client.on("error", (err) => {
    console.error(`[Worker ${names[index]}] Connection error:`, err);
  });
  client.on("connect", () => {
    console.log(`[Worker ${names[index]}] Connected to Redis`);
  });
  client.on("ready", () => {
    console.log(`[Worker ${names[index]}] Redis ready`);
  });
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await Promise.all([redis.quit(), pub.quit()]);
});

process.on("SIGINT", async () => {
  await Promise.all([redis.quit(), pub.quit()]);
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await Promise.all([redis.quit(), pub.quit()]);
  process.exit(0);
});

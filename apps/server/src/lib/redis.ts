import Redis from "ioredis";
import { env } from "./env.js";

// BullMQ(Queue/Worker)는 blocking command를 사용하므로,
// ioredis 옵션 maxRetriesPerRequest 는 반드시 null 이어야 합니다.
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
export const redisSub = new Redis(env.redisUrl, redisOptions);
export const redisPub = new Redis(env.redisUrl, redisOptions);

// Redis 연결 에러 핸들링
[redis, redisSub, redisPub].forEach((client, index) => {
  const names = ["redis", "redisSub", "redisPub"];
  client.on("error", (err) => {
    console.error(`[${names[index]}] Connection error:`, err);
  });
  client.on("connect", () => {
    console.log(`[${names[index]}] Connected to Redis`);
  });
  client.on("ready", () => {
    console.log(`[${names[index]}] Redis ready`);
  });
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await Promise.all([redis.quit(), redisSub.quit(), redisPub.quit()]);
});

process.on("SIGINT", async () => {
  await Promise.all([redis.quit(), redisSub.quit(), redisPub.quit()]);
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await Promise.all([redis.quit(), redisSub.quit(), redisPub.quit()]);
  process.exit(0);
});

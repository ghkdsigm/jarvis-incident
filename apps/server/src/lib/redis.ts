import Redis from "ioredis";
import { env } from "./env.js";

// BullMQ(Queue/Worker)는 blocking command를 사용하므로,
// ioredis 옵션 maxRetriesPerRequest 는 반드시 null 이어야 합니다.
const redisOptions = { maxRetriesPerRequest: null as null };

export const redis = new Redis(env.redisUrl, redisOptions);
export const redisSub = new Redis(env.redisUrl, redisOptions);
export const redisPub = new Redis(env.redisUrl, redisOptions);

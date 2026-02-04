import { Queue } from "bullmq";
import { env } from "./env.js";
import { redis } from "./redis.js";

export const aiQueue = new Queue(env.aiQueueName, { connection: redis });

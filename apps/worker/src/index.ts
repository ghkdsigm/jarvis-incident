import { Worker } from "bullmq";
import { nanoid } from "nanoid";
import { env } from "./lib/env.js";
import { redis, pub } from "./lib/redis.js";
import { prisma } from "./lib/prisma.js";
import { streamAnswer } from "./lib/aiProvider.js";

type AiJob = {
  roomId: string;
  messageId: string | null;
  requestedBy: string;
  prompt: string;
};

const worker = new Worker<AiJob>(
  env.aiQueueName,
  async (job) => {
    const { roomId, messageId, requestedBy, prompt } = job.data;
    const requestId = nanoid();

    const startedAt = Date.now();
    const aiReq = await prisma.aiRequest.create({
      data: {
        roomId,
        messageId: messageId ?? undefined,
        requestedBy,
        model: env.aiProvider === "openai" ? env.openAiModel : "mock",
        status: "running"
      }
    });

    let content = "";
    await pub.publish(env.pubsubChannel, JSON.stringify({ roomId, type: "bot.stream", payload: { requestId, roomId, chunk: "" } }));

    const full = await streamAnswer(prompt, async (chunk) => {
      content += chunk;
      await pub.publish(env.pubsubChannel, JSON.stringify({ roomId, type: "bot.stream", payload: { requestId, roomId, chunk } }));
    });

    const created = await prisma.message.create({
      data: {
        roomId,
        senderType: "bot",
        content: full
      }
    });

    const latencyMs = Date.now() - startedAt;
    await prisma.aiRequest.update({
      where: { id: aiReq.id },
      data: { status: "done", latencyMs }
    });

    await pub.publish(
      env.pubsubChannel,
      JSON.stringify({
        roomId,
        type: "bot.done",
        payload: {
          id: created.id,
          roomId: created.roomId,
          senderType: "bot",
          senderUserId: null,
          content: created.content,
          createdAt: created.createdAt.toISOString()
        }
      })
    );

    return { ok: true, requestId };
  },
  { connection: redis }
);

worker.on("failed", async (job, err) => {
  const roomId = (job?.data as any)?.roomId;
  if (roomId) {
    await pub.publish(env.pubsubChannel, JSON.stringify({ roomId, type: "error", payload: { message: err.message } }));
  }
});

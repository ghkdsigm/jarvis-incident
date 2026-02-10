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

type MeetingSummaryJob = {
  targetRoomId: string;
  sourceRoomId: string;
  requestedBy: string;
};

const MEETING_SUMMARY_SYSTEM =
  "You are a meeting minutes assistant. Given a chat transcript from a past meeting (about 1 week), produce a concise summary in Korean with these sections:\n" +
  "1. **요약** (Summary): 2–3 sentences.\n" +
  "2. **주요 결정** (Key decisions): Bullet list.\n" +
  "3. **미해결 논의** (Open/unresolved items): Bullet list, or \"없음\" if none.\n" +
  "Use markdown. Be factual and brief.";

async function generateMeetingSummary(transcript: string): Promise<string> {
  if (!env.openAiKey || transcript.length === 0) {
    return "**요약**\n대화 내용이 없거나 요약을 생성할 수 없습니다.\n\n**주요 결정**\n- 없음\n\n**미해결 논의**\n- 없음";
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.openAiModel,
      stream: false,
      messages: [
        { role: "system", content: MEETING_SUMMARY_SYSTEM },
        { role: "user", content: `다음 채팅 기록을 요약해 주세요:\n\n${transcript.slice(0, 120_000)}` }
      ]
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as any;
  return String(data?.choices?.[0]?.message?.content ?? "").trim() || "요약을 생성할 수 없습니다.";
}

const worker = new Worker<AiJob | MeetingSummaryJob>(
  env.aiQueueName,
  async (job) => {
    if (job.name === "meeting-summary") {
      const { targetRoomId, sourceRoomId, requestedBy } = job.data as MeetingSummaryJob;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const messages = await prisma.message.findMany({
        where: {
          roomId: sourceRoomId,
          createdAt: { gte: sevenDaysAgo },
          NOT: { content: "(삭제된 메시지)" }
        },
        orderBy: { createdAt: "asc" },
        take: 500
      });
      const transcript = messages
        .map((m) => `[${m.createdAt.toISOString()}] ${m.senderType}${m.senderUserId ? `:${m.senderUserId}` : ""}: ${m.content}`)
        .join("\n");
      const summary = await generateMeetingSummary(transcript);
      const created = await prisma.message.create({
        data: {
          roomId: targetRoomId,
          senderType: "bot",
          content: summary
        }
      });
      await pub.publish(
        env.pubsubChannel,
        JSON.stringify({
          roomId: targetRoomId,
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
      return { ok: true, targetRoomId };
    }

    const { roomId, messageId, requestedBy, prompt } = job.data as AiJob;
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
  const data = job?.data as any;
  const roomId = data?.roomId ?? data?.targetRoomId;
  if (roomId) {
    await pub.publish(env.pubsubChannel, JSON.stringify({ roomId, type: "error", payload: { message: err.message } }));
  }
});

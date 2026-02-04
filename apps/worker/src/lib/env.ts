import "dotenv/config";

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: requireEnv("REDIS_URL", "redis://localhost:6379"),
  aiProvider: (process.env.AI_PROVIDER ?? "mock") as "mock" | "openai",
  openAiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  aiQueueName: process.env.AI_QUEUE_NAME ?? "jarvis_ai_jobs",
  pubsubChannel: process.env.PUBSUB_CHANNEL ?? "jarvis_room_events"
};

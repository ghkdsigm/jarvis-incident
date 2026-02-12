import "dotenv/config";

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? "8080"),
  jwtSecret: requireEnv("JWT_SECRET", "dev-secret-change-me"),
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: requireEnv("REDIS_URL", "redis://localhost:6379"),
  aiQueueName: process.env.AI_QUEUE_NAME ?? "jarvis_ai_jobs",
  pubsubChannel: process.env.PUBSUB_CHANNEL ?? "jarvis_room_events",

  // Optional: used by /translate endpoint
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openaiTranslateModel: process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini",
  openaiIdeaModel: process.env.OPENAI_IDEA_MODEL ?? "gpt-4o-mini",

  // Optional: used by /rooms/:roomId/news (Naver News Search API)
  naverClientId: process.env.NAVER_CLIENT_ID ?? "",
  naverClientSecret: process.env.NAVER_CLIENT_SECRET ?? ""
};

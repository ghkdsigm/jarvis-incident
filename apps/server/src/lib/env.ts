import "dotenv/config";

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function requireSecureEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  const isProduction = process.env.NODE_ENV === "production";
  
  // 운영 환경에서는 기본값 사용 금지
  if (isProduction && v === fallback) {
    throw new Error(`Production environment requires secure ${name}`);
  }
  
  // JWT_SECRET은 운영 환경에서만 최소 길이 검증
  if (name === "JWT_SECRET" && isProduction && v.length < 32) {
    throw new Error(`JWT_SECRET must be at least 32 characters long in production`);
  }
  
  // 개발 환경에서는 경고만 출력
  if (name === "JWT_SECRET" && !isProduction && v.length < 32) {
    console.warn(`⚠️  Warning: JWT_SECRET is less than 32 characters. This is acceptable for development but not for production.`);
  }
  
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? "8080"),
  jwtSecret: requireSecureEnv("JWT_SECRET", "dev-secret-change-me"),
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
  naverClientSecret: process.env.NAVER_CLIENT_SECRET ?? "",

  // Optional: used by /holidays (Korean Public Data Portal API)
  holidayApiKey: process.env.HOLIDAY_API_KEY ?? "",

  // CORS origin (production에서 특정 도메인만 허용)
  corsOrigin: process.env.CORS_ORIGIN
};

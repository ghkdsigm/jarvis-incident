import { env } from "./env.js";
import { prisma } from "./prisma.js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536;

/**
 * OpenAI API를 사용하여 텍스트의 임베딩 벡터를 생성합니다.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!env.openAiKey) {
    throw new Error("OPENAI_API_KEY is required for embeddings");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000) // API 제한
    })
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI embedding error: ${res.status} ${t.slice(0, 500)}`);
  }

  const data = (await res.json()) as any;
  return data?.data?.[0]?.embedding ?? [];
}

/**
 * 메시지의 임베딩을 저장합니다 (이미 있으면 업데이트).
 */
export async function saveMessageEmbedding(messageId: string, embedding: number[]): Promise<void> {
  // Prisma는 vector 타입을 직접 지원하지 않으므로 Raw SQL 사용
  const vectorStr = `[${embedding.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "MessageEmbedding" ("id", "messageId", "embedding", "model", "createdAt")
    VALUES (gen_random_uuid(), $1::text, $2::vector, $3::text, NOW())
    ON CONFLICT ("messageId") 
    DO UPDATE SET "embedding" = $2::vector, "model" = $3::text, "createdAt" = NOW()
    `,
    messageId,
    vectorStr,
    EMBEDDING_MODEL
  );
}

/**
 * 질문과 유사한 메시지들을 벡터 검색으로 찾습니다.
 */
export async function searchSimilarMessages(
  queryEmbedding: number[],
  roomId: string,
  limit: number = 5,
  minSimilarity: number = 0.7
): Promise<Array<{ messageId: string; content: string; similarity: number; createdAt: Date }>> {
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // cosine similarity를 사용한 벡터 검색
  const results = await prisma.$queryRawUnsafe<Array<{
    messageId: string;
    content: string;
    similarity: number;
    createdAt: Date;
  }>>(
    `
    SELECT 
      me."messageId",
      m."content",
      1 - (me."embedding" <=> $1::vector) as similarity,
      m."createdAt"
    FROM "MessageEmbedding" me
    INNER JOIN "Message" m ON m."id" = me."messageId"
    WHERE m."roomId" = $2::text
      AND m."senderType" != 'bot'
      AND m."content" != '(삭제된 메시지)'
      AND 1 - (me."embedding" <=> $1::vector) >= $3
    ORDER BY me."embedding" <=> $1::vector
    LIMIT $4
    `,
    vectorStr,
    roomId,
    minSimilarity,
    limit
  );

  return results;
}

/**
 * 메시지가 임베딩을 가지고 있는지 확인합니다.
 */
export async function hasEmbedding(messageId: string): Promise<boolean> {
  const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "MessageEmbedding" WHERE "messageId" = $1`,
    messageId
  );
  return Number(count[0]?.count ?? 0) > 0;
}


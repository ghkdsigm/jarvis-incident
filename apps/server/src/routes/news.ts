import type { FastifyInstance } from "fastify";
import axios from "axios";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";

/** HTML 태그 제거 (네이버 API는 검색어 하이라이트용 <b> 등 반환) */
function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export type NewsItemDto = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function newsRoutes(app: FastifyInstance) {
  /**
   * 채팅방 주제(방 제목)를 키워드로 네이버 뉴스 검색 API에서 최신 뉴스 3개 조회.
   * ClientID/ClientSecret은 .env (NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)에서 관리.
   */
  app.get("/rooms/:roomId/news", { preHandler: app.authenticate }, async (req: any, reply) => {
    const roomId = req.params.roomId as string;
    const userId = req.user.sub as string;

    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      include: { room: { select: { title: true } } }
    });
    if (!membership?.room) return reply.code(403).send({ error: "FORBIDDEN" });

    const query = String((membership.room as { title: string }).title ?? "").trim();
    if (!query) return reply.send({ items: [] });

    if (!env.naverClientId || !env.naverClientSecret) {
      app.log.warn("Naver News API: NAVER_CLIENT_ID or NAVER_CLIENT_SECRET not set");
      return reply.send({ items: [] });
    }

    try {
      const { data } = await axios.get<{
        items?: Array<{ title?: string; link?: string; description?: string; pubDate?: string }>;
      }>("https://openapi.naver.com/v1/search/news.json", {
        params: {
          query,
          display: 3,
          sort: "date"
        },
        headers: {
          "X-Naver-Client-Id": env.naverClientId,
          "X-Naver-Client-Secret": env.naverClientSecret
        },
        timeout: 8000
      });

      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const items: NewsItemDto[] = rawItems.slice(0, 3).map((it) => ({
        title: stripHtml(it.title ?? ""),
        link: String(it.link ?? ""),
        description: stripHtml(it.description ?? ""),
        pubDate: String(it.pubDate ?? "")
      }));

      return reply.send({ items });
    } catch (err: any) {
      app.log.error({ err }, "Naver News API request failed");
      const status = err?.response?.status;
      if (status === 401) return reply.code(502).send({ error: "NAVER_API_AUTH_FAILED" });
      if (status === 429) return reply.code(429).send({ error: "NAVER_API_RATE_LIMIT" });
      return reply.code(502).send({ error: "NAVER_NEWS_FETCH_FAILED" });
    }
  });
}

import type { FastifyInstance } from "fastify";
import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";

/** HTML 태그 제거 (네이버 API는 검색어 하이라이트용 <b> 등 반환) */
function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * URL에서 OG 이미지를 추출합니다.
 * og:image 메타 태그를 우선적으로 찾고, 없으면 첫 번째 이미지 태그를 찾습니다.
 */
async function fetchOgImage(url: string, timeout = 5000): Promise<string | null> {
  try {
    const { data } = await axios.get(url, {
      timeout,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    if (!data || typeof data !== "string") return null;

    const $ = cheerio.load(data);

    // og:image 메타 태그 찾기
    let imageUrl = $('meta[property="og:image"]').attr("content");
    if (!imageUrl) {
      // twitter:image 대체
      imageUrl = $('meta[name="twitter:image"]').attr("content");
    }
    if (!imageUrl) {
      // 일반 이미지 메타 태그
      imageUrl = $('meta[name="image"]').attr("content");
    }

    // 상대 경로를 절대 경로로 변환
    if (imageUrl) {
      try {
        const urlObj = new URL(url);
        if (imageUrl.startsWith("//")) {
          imageUrl = `${urlObj.protocol}${imageUrl}`;
        } else if (imageUrl.startsWith("/")) {
          imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
        } else if (!imageUrl.startsWith("http")) {
          imageUrl = new URL(imageUrl, url).toString();
        }
        return imageUrl;
      } catch {
        return null;
      }
    }

    return null;
  } catch (err) {
    // OG 이미지 추출 실패는 무시 (뉴스 항목은 여전히 반환)
    return null;
  }
}

export type NewsItemDto = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string | null;
};

/**
 * 네이버 뉴스 API로 검색하고 OG 이미지를 가져옵니다.
 */
async function searchNewsWithImages(query: string): Promise<NewsItemDto[]> {
  if (!env.naverClientId || !env.naverClientSecret) {
    return [];
  }

  try {
    const { data } = await axios.get<{
      items?: Array<{ title?: string; link?: string; description?: string; pubDate?: string }>;
    }>("https://openapi.naver.com/v1/search/news.json", {
      params: {
        query,
        display: 6,
        sort: "date"
      },
      headers: {
        "X-Naver-Client-Id": env.naverClientId,
        "X-Naver-Client-Secret": env.naverClientSecret
      },
      timeout: 8000
    });

    const rawItems = Array.isArray(data?.items) ? data.items : [];
    if (rawItems.length === 0) return [];

    const baseItems = rawItems.slice(0, 6).map((it) => ({
      title: stripHtml(it.title ?? ""),
      link: String(it.link ?? ""),
      description: stripHtml(it.description ?? ""),
      pubDate: String(it.pubDate ?? "")
    }));

    // 각 뉴스 항목의 OG 이미지를 병렬로 가져오기
    const itemsWithImages = await Promise.all(
      baseItems.map(async (item) => {
        const imageUrl = await fetchOgImage(item.link).catch(() => null);
        return {
          ...item,
          imageUrl
        };
      })
    );

    return itemsWithImages;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 || status === 429) {
      throw err;
    }
    // 기타 에러는 빈 배열 반환 (재검색 시도 가능하도록)
    return [];
  }
}

export async function newsRoutes(app: FastifyInstance) {
  /**
   * 채팅방 주제(방 제목)를 키워드로 네이버 뉴스 검색 API에서 최신 뉴스 조회.
   * 전체 제목으로 검색 결과가 없으면 띄어쓰기 기준으로 분리하여 각 단어로 순차 검색합니다.
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
      return reply.code(503).send({ error: "NAVER_NEWS_NOT_CONFIGURED" });
    }

    try {
      // 1. 전체 제목으로 검색
      let items = await searchNewsWithImages(query);

      // 2. 결과가 없으면 띄어쓰기 기준으로 분리하여 각 단어로 순차 검색
      if (items.length === 0 && query.includes(" ")) {
        const words = query
          .split(" ")
          .map((w) => w.trim())
          .filter((w) => w.length > 0);

        // 각 단어로 순차적으로 검색 (결과가 나오면 즉시 반환)
        for (const word of words) {
          items = await searchNewsWithImages(word);
          if (items.length > 0) break;
        }
      }

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

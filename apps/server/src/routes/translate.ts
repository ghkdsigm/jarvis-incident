import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { env } from "../lib/env.js";

type CacheEntry = { translatedText: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

function cacheKey(targetLang: string, text: string) {
  const h = createHash("sha256").update(text).digest("hex").slice(0, 24);
  return `${targetLang}:${h}`;
}

function getCached(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.translatedText;
}

function setCached(key: string, translatedText: string) {
  cache.set(key, { translatedText, expiresAt: Date.now() + CACHE_TTL_MS });
  // prevent unbounded growth
  if (cache.size > 2000) {
    const first = cache.keys().next().value as string | undefined;
    if (first) cache.delete(first);
  }
}

export async function translateRoutes(app: FastifyInstance) {
  app.post("/translate", { preHandler: app.authenticate }, async (req: any, reply) => {
    const body = (req.body ?? {}) as { text?: string; targetLang?: string };
    const text = String(body.text ?? "").trim();
    const targetLang = String(body.targetLang ?? "ko").trim() || "ko";

    if (!text) return reply.send({ translatedText: "" });

    if (!env.openaiApiKey) {
      return reply.code(501).send({ error: "OPENAI_NOT_CONFIGURED" });
    }

    const lang = targetLang.toLowerCase();
    const langLabel =
      lang === "ko" ? "Korean (ko)" : lang === "en" ? "English (en)" : "";
    if (!langLabel) return reply.code(400).send({ error: "UNSUPPORTED_TARGET_LANG" });

    const key = cacheKey(targetLang, text);
    const cached = getCached(key);
    if (cached != null) return reply.send({ translatedText: cached, cached: true });

    const upstream = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.openaiTranslateModel,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              `You are a translation engine. Translate the user's text to ${langLabel}. ` +
              "Preserve line breaks and formatting. Return ONLY the translated text. " +
              "Do not add quotes, labels, or explanations."
          },
          { role: "user", content: text }
        ]
      })
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return reply.code(502).send({
        error: "TRANSLATE_UPSTREAM_ERROR",
        status: upstream.status,
        details: details.slice(0, 2000)
      });
    }

    const data: any = await upstream.json();
    const translatedText = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!translatedText) {
      return reply.code(502).send({ error: "TRANSLATE_EMPTY_RESPONSE" });
    }

    setCached(key, translatedText);
    return reply.send({ translatedText });
  });
}


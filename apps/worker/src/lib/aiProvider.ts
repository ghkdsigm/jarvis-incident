import { env } from "./env.js";

type StreamCb = (chunk: string) => Promise<void> | void;

export async function streamAnswer(prompt: string, onChunk: StreamCb): Promise<string> {
  if (env.aiProvider === "openai") {
    if (!env.openAiKey) throw new Error("OPENAI_API_KEY is empty");
    return await streamOpenAi(prompt, onChunk);
  }
  return await streamMock(prompt, onChunk);
}

async function streamMock(prompt: string, onChunk: StreamCb): Promise<string> {
  const base = [
    "가능한 원인 후보를 정리해볼게요.",
    "1) 업로드 제한(서버/프록시 body size) 2) 프론트 파일 사이즈 제한 3) S3 멀티파트 설정 4) CloudFront 캐시/리사이징 파이프라인",
    "지금 확인할 체크리스트:",
    "- 브라우저 네트워크 탭에서 업로드 요청이 413/400인지",
    "- Nginx client_max_body_size",
    "- 서버 업로드 핸들러 제한",
    "- presigned URL 만료/권한"
  ].join("\n");

  const full = `질문: ${prompt}\n\n${base}\n`;
  for (const chunk of chunkify(full, 24)) {
    await wait(60);
    await onChunk(chunk);
  }
  return full;
}

async function streamOpenAi(prompt: string, onChunk: StreamCb): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.openAiModel,
      stream: true,
      messages: [
        { role: "system", content: "You are Jarvis, a friendly assistant in this team chat. Answer naturally: greet back for greetings, answer briefly for simple questions, and give concise actionable steps only when the user asks for troubleshooting or technical help. Use Korean when the user writes in Korean." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${t}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          await onChunk(delta);
        }
      } catch {
        // ignore
      }
    }
  }
  return full;
}

function chunkify(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

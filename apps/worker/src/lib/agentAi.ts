import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { generateEmbedding, searchSimilarMessages } from "./embeddings.js";
import { AVAILABLE_TOOLS, executeTool, type ToolCall, type ToolResult } from "./agentTools.js";
import { nanoid } from "nanoid";

type StreamCb = (chunk: string) => Promise<void> | void;
type Message = { role: "system" | "user" | "assistant" | "function"; content: string; name?: string; tool_call_id?: string };

/**
 * RAG와 에이전트 기능을 통합한 AI 응답 생성
 */
export async function streamAgentAnswer(
  prompt: string,
  roomId: string,
  onChunk: StreamCb,
  options: {
    useRAG?: boolean;
    useTools?: boolean;
    maxToolIterations?: number;
  } = {}
): Promise<string> {
  const { useRAG = true, useTools = true, maxToolIterations = 3 } = options;

  // RAG: 관련 컨텍스트 검색
  let contextMessages: string[] = [];
  if (useRAG && env.openAiKey) {
    try {
      const queryEmbedding = await generateEmbedding(prompt);
      const similar = await searchSimilarMessages(queryEmbedding, roomId, 5, 0.7);
      if (similar.length > 0) {
        contextMessages = similar.map(
          (m, idx) => `[관련 메시지 ${idx + 1}] (유사도: ${(m.similarity * 100).toFixed(1)}%)\n${m.content}`
        );
      }
    } catch (error: any) {
      console.error("RAG 검색 실패:", error.message);
    }
  }

  // 시스템 프롬프트 구성
  let systemPrompt = `You are Jarvis, an intelligent AI assistant in this team chat. 
- Answer naturally: greet back for greetings, answer briefly for simple questions.
- Give concise actionable steps when users ask for troubleshooting or technical help.
- Use Korean when the user writes in Korean.
- Be helpful, accurate, and context-aware.`;

  if (contextMessages.length > 0) {
    systemPrompt += `\n\n아래는 이 질문과 관련된 과거 대화 내용입니다. 참고하여 더 정확하고 맥락에 맞는 답변을 해주세요:\n\n${contextMessages.join("\n\n")}`;
  }

  if (useTools) {
    systemPrompt += `\n\nYou have access to tools. When you need to search for information, calculate, or get room context, use the appropriate tool.`;
  }

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt }
  ];

  // 에이전트 루프: 도구 사용이 필요한 경우 반복
  let iteration = 0;
  let fullResponse = "";

  while (iteration < maxToolIterations) {
    const isLastIteration = iteration === maxToolIterations - 1;
    const response = await callOpenAIWithTools(messages, useTools && !isLastIteration);
    
    // 도구 호출이 없으면 최종 응답을 스트리밍하고 종료
    if (!response.toolCalls || response.toolCalls.length === 0) {
      if (response.content) {
        fullResponse = response.content;
        for (const chunk of chunkify(response.content, 10)) {
          await wait(30);
          await onChunk(chunk);
        }
      }
      break;
    }

    // 도구 실행
    const toolResults: ToolResult[] = [];
    for (const toolCall of response.toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args, {
          roomId,
          prisma,
          generateEmbedding,
          searchSimilarMessages
        });
        toolResults.push({
          toolCallId: toolCall.id,
          result
        });
      } catch (error: any) {
        console.error(`도구 실행 실패 (${toolCall.function.name}):`, error.message);
        toolResults.push({
          toolCallId: toolCall.id,
          result: null,
          error: error.message
        });
      }
    }

    // 모든 tool_call_id에 대한 응답이 있는지 확인
    const toolCallIds = new Set(response.toolCalls.map((tc) => tc.id));
    const resultIds = new Set(toolResults.map((tr) => tr.toolCallId));
    const missingIds = Array.from(toolCallIds).filter((id) => !resultIds.has(id));
    
    if (missingIds.length > 0) {
      console.error(`누락된 tool_call_id: ${missingIds.join(", ")}`);
      // 누락된 tool_call에 대해 에러 응답 추가
      for (const missingId of missingIds) {
        const toolCall = response.toolCalls.find((tc) => tc.id === missingId);
        if (toolCall) {
          toolResults.push({
            toolCallId: missingId,
            result: null,
            error: "Tool execution failed"
          });
        }
      }
    }

    // assistant 메시지 추가 (tool_calls 포함)
    const assistantMsg: any = {
      role: "assistant",
      content: response.content || "", // null이면 빈 문자열로 처리
      tool_calls: response.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }))
    };
    messages.push(assistantMsg);

    // tool 메시지 추가 (각 tool_call_id에 대해 - 반드시 모든 tool_call에 대해)
    for (const toolCall of response.toolCalls) {
      const toolResult = toolResults.find((tr) => tr.toolCallId === toolCall.id);
      if (!toolResult) {
        // 결과가 없으면 에러 응답 추가
        messages.push({
          role: "function",
          name: toolCall.function.name,
          content: JSON.stringify({ error: "Tool execution failed" }),
          tool_call_id: toolCall.id
        });
        continue;
      }

      messages.push({
        role: "function",
        name: toolCall.function.name,
        content: toolResult.error
          ? JSON.stringify({ error: toolResult.error })
          : JSON.stringify(toolResult.result),
        tool_call_id: toolCall.id
      });
    }

    // 마지막 반복이면 도구 결과를 바탕으로 최종 응답 생성
    if (isLastIteration) {
      const finalResponse = await callOpenAIWithTools(messages, false); // 도구 비활성화
      if (finalResponse.content) {
        fullResponse = finalResponse.content;
        for (const chunk of chunkify(finalResponse.content, 10)) {
          await wait(30);
          await onChunk(chunk);
        }
      }
      break;
    }

    iteration++;
  }

  return fullResponse;
}

type OpenAIResponse = {
  content: string;
  toolCalls?: ToolCall[];
};

async function callOpenAIWithTools(messages: Message[], enableTools: boolean): Promise<OpenAIResponse> {
  if (env.aiProvider !== "openai" || !env.openAiKey) {
    // Mock 모드
    return { content: "에이전트 기능은 OpenAI API가 필요합니다." };
  }

  const url = "https://api.openai.com/v1/chat/completions";
  const body: any = {
    model: env.openAiModel,
    messages: messages.map((m) => {
      const msg: any = { 
        role: m.role, 
        content: m.content ?? "" // null이면 빈 문자열
      };
      if (m.name) msg.name = m.name;
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      if ((m as any).tool_calls) msg.tool_calls = (m as any).tool_calls;
      return msg;
    }),
    stream: false
  };

  if (enableTools) {
    body.tools = AVAILABLE_TOOLS;
    body.tool_choice = "auto";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${t}`);
  }

  const data = (await res.json()) as any;
  const choice = data?.choices?.[0];
  const message = choice?.message ?? {};

  const toolCalls: ToolCall[] = [];
  if (message.tool_calls) {
    for (const tc of message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      });
    }
  }

  return {
    content: message.content ?? "",
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined
  };
}

function chunkify(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}


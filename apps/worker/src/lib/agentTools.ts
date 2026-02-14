/**
 * 에이전트가 사용할 수 있는 도구들 정의
 * OpenAI Function Calling 형식으로 정의합니다.
 */

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
};

export type ToolResult = {
  toolCallId: string;
  result: any;
  error?: string;
};

/**
 * 사용 가능한 도구들 정의
 */
export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_room_messages",
      description: "채팅방의 과거 메시지를 검색합니다. 특정 키워드나 주제와 관련된 메시지를 찾을 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "검색할 키워드나 질문"
          },
          limit: {
            type: "number",
            description: "반환할 최대 메시지 수 (기본값: 5)",
            default: 5
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_summary",
      description: "채팅방의 최근 대화 요약을 가져옵니다. 방의 전체적인 맥락을 파악할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "요약할 기간(일) (기본값: 7)",
            default: 7
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "수학 계산을 수행합니다. 숫자 연산이나 통계 계산이 필요할 때 사용합니다.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "계산할 수식 (예: '2 + 2', 'sqrt(16)', '10 * 5')"
          }
        },
        required: ["expression"]
      }
    }
  }
];

/**
 * 도구 실행 함수
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: { roomId: string; prisma: any; generateEmbedding?: (text: string) => Promise<number[]>; searchSimilarMessages?: (embedding: number[], roomId: string, limit: number) => Promise<any[]> }
): Promise<any> {
  switch (toolName) {
    case "search_room_messages": {
      if (!context.generateEmbedding || !context.searchSimilarMessages) {
        throw new Error("Embedding functions not available");
      }
      const query = args.query as string;
      const limit = args.limit ?? 5;
      const embedding = await context.generateEmbedding(query);
      const results = await context.searchSimilarMessages(embedding, context.roomId, limit);
      return {
        messages: results.map((r) => ({
          content: r.content,
          similarity: r.similarity,
          createdAt: r.createdAt.toISOString()
        }))
      };
    }

    case "get_room_summary": {
      const days = args.days ?? 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const messages = await context.prisma.message.findMany({
        where: {
          roomId: context.roomId,
          createdAt: { gte: since },
          senderType: { not: "bot" },
          content: { not: "(삭제된 메시지)" }
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          content: true,
          createdAt: true,
          senderType: true
        }
      });
      return {
        messageCount: messages.length,
        period: `${days}일`,
        sampleMessages: messages.slice(0, 5).map((m: any) => ({
          content: m.content.slice(0, 100),
          createdAt: m.createdAt.toISOString()
        }))
      };
    }

    case "calculate": {
      const expression = args.expression as string;
      try {
        // 안전한 계산만 허용 (eval은 위험하지만 예시용)
        // 실제 프로덕션에서는 mathjs 같은 라이브러리 사용 권장
        const result = Function(`"use strict"; return (${expression})`)();
        return {
          expression,
          result: typeof result === "number" ? result : String(result)
        };
      } catch (error: any) {
        return {
          expression,
          error: error.message
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}


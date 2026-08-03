import { HumanMessage } from "@langchain/core/messages";
import {
  contentToText,
  getChatModel,
  isGeminiModelId,
} from "../llm";
import { DEFAULT_SYSTEM_INSTRUCTION } from "../prompts";
import type { GeminiModelId } from "../constants";
import {
  buildSystemMessage,
  turnsToMessages,
  type PreparedMemory,
  type ThreadTurn,
} from "../memory";

export type ChatChainInput = {
  userPrompt: string;
  customPrompt?: string | null;
  model?: GeminiModelId;
  memory?: PreparedMemory;
  /** @deprecated Phase 3 uses full-thread memory from the server. */
  previousUserPrompt?: string | null;
  /** @deprecated Phase 3 uses full-thread memory from the server. */
  previousLlmResponse?: string | null;
  image?: {
    data: string;
    mimeType: string;
  } | null;
};

function resolveModel(model?: string): GeminiModelId | undefined {
  return isGeminiModelId(model) ? model : undefined;
}

function fallbackMemoryFromPrevious(input: ChatChainInput): PreparedMemory {
  const turns: ThreadTurn[] = [];
  if (input.previousUserPrompt || input.previousLlmResponse) {
    turns.push({
      userPrompt: input.previousUserPrompt,
      llmResponse: input.previousLlmResponse,
    });
  }
  return {
    history: turnsToMessages(turns),
    summary: null,
    turnCount: turns.length,
    recentTurnCount: turns.length,
    didSummarize: false,
    summaryToPersist: null,
  };
}

function resolveMemory(input: ChatChainInput): PreparedMemory {
  if (input.memory) return input.memory;
  return fallbackMemoryFromPrevious(input);
}

/**
 * Stream a text-only chat reply with multi-turn memory.
 */
export async function streamChatReply(input: ChatChainInput) {
  const model = getChatModel({
    model: resolveModel(input.model),
    streaming: true,
  });

  const memory = resolveMemory(input);
  const system = buildSystemMessage({
    systemInstruction:
      input.customPrompt?.trim() || DEFAULT_SYSTEM_INSTRUCTION,
    summary: memory.summary,
  });

  const messages = [
    system,
    ...memory.history,
    new HumanMessage(input.userPrompt),
  ];

  return model.stream(messages);
}

/**
 * Multimodal (image + text) reply with multi-turn memory — non-streaming.
 */
export async function invokeChatWithImage(
  input: ChatChainInput & {
    image: { data: string; mimeType: string };
  }
) {
  const model = getChatModel({
    model: resolveModel(input.model),
    streaming: false,
  });

  const memory = resolveMemory(input);
  const system = buildSystemMessage({
    systemInstruction:
      input.customPrompt?.trim() || DEFAULT_SYSTEM_INSTRUCTION,
    summary: memory.summary,
  });

  const human = new HumanMessage({
    content: [
      { type: "text", text: input.userPrompt },
      {
        type: "image_url",
        image_url: `data:${input.image.mimeType};base64,${input.image.data}`,
      },
    ],
  });

  const result = await model.invoke([system, ...memory.history, human]);
  return contentToText(result.content);
}

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
import type { RagSource } from "../rag/types";
import {
  buildVisionUserPrompt,
  resolveVisionPreset,
  type VisionPresetId,
} from "../vision-presets";

export type ChatChainInput = {
  userPrompt: string;
  customPrompt?: string | null;
  model?: GeminiModelId;
  memory?: PreparedMemory;
  ragContext?: string | null;
  ragSources?: RagSource[];
  visionPreset?: VisionPresetId | null;
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

function buildRagAugmentedInstruction(
  baseInstruction: string,
  ragContext?: string | null
): string {
  if (!ragContext?.trim()) return baseInstruction;
  return `${baseInstruction}

---
Document grounding mode is ON. Answer using the uploaded document excerpts below when relevant.

${ragContext.trim()}`;
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
    systemInstruction: buildRagAugmentedInstruction(
      input.customPrompt?.trim() || DEFAULT_SYSTEM_INSTRUCTION,
      input.ragContext
    ),
    summary: memory.summary,
  });

  const messages = [
    system,
    ...memory.history,
    new HumanMessage(input.userPrompt),
  ];

  return model.stream(messages);
}

function buildMultimodalHumanMessage(
  input: ChatChainInput & { image: { data: string; mimeType: string } }
) {
  const preset = resolveVisionPreset(input.visionPreset);
  const prompt = buildVisionUserPrompt(input.userPrompt, preset);

  return new HumanMessage({
    content: [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: `data:${input.image.mimeType};base64,${input.image.data}`,
      },
    ],
  });
}

function buildMultimodalMessages(
  input: ChatChainInput & { image: { data: string; mimeType: string } }
) {
  const memory = resolveMemory(input);
  const system = buildSystemMessage({
    systemInstruction: buildRagAugmentedInstruction(
      input.customPrompt?.trim() || DEFAULT_SYSTEM_INSTRUCTION,
      input.ragContext
    ),
    summary: memory.summary,
  });

  return [system, ...memory.history, buildMultimodalHumanMessage(input)];
}

/**
 * Stream a multimodal (image + text) reply with multi-turn memory.
 */
export async function streamChatWithImage(
  input: ChatChainInput & {
    image: { data: string; mimeType: string };
  }
) {
  const model = getChatModel({
    model: resolveModel(input.model),
    streaming: true,
  });

  return model.stream(buildMultimodalMessages(input));
}

/**
 * Multimodal (image + text) reply with multi-turn memory — non-streaming fallback.
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

  const result = await model.invoke(buildMultimodalMessages(input));
  return contentToText(result.content);
}

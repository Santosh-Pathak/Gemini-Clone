import { HumanMessage } from "@langchain/core/messages";
import { contentToText, getChatModel, isGeminiModelId } from "../llm";
import {
  chatPromptTemplate,
  DEFAULT_SYSTEM_INSTRUCTION,
} from "../prompts";
import type { GeminiModelId } from "../constants";

export type ChatChainInput = {
  userPrompt: string;
  previousUserPrompt?: string | null;
  previousLlmResponse?: string | null;
  customPrompt?: string | null;
  model?: GeminiModelId;
  image?: {
    data: string;
    mimeType: string;
  } | null;
};

function resolveModel(model?: string): GeminiModelId | undefined {
  return isGeminiModelId(model) ? model : undefined;
}

/**
 * Stream a text-only chat reply via LangChain LCEL.
 */
export async function streamChatReply(input: ChatChainInput) {
  const model = getChatModel({
    model: resolveModel(input.model),
    streaming: true,
  });

  const chain = chatPromptTemplate.pipe(model);

  return chain.stream({
    date: new Date().toISOString().split("T")[0],
    systemInstruction:
      input.customPrompt?.trim() || DEFAULT_SYSTEM_INSTRUCTION,
    previousUserPrompt: input.previousUserPrompt || "(none)",
    previousLlmResponse: input.previousLlmResponse || "(none)",
    userPrompt: input.userPrompt,
  });
}

/**
 * Multimodal (image + text) reply — non-streaming for reliability.
 */
export async function invokeChatWithImage(input: ChatChainInput & {
  image: { data: string; mimeType: string };
}) {
  const model = getChatModel({
    model: resolveModel(input.model),
    streaming: false,
  });

  const systemInstruction =
    input.customPrompt?.trim() || DEFAULT_SYSTEM_INSTRUCTION;
  const date = new Date().toISOString().split("T")[0];

  const textBlock = `Date: ${date}

${systemInstruction}

Previous conversation turn:
User: ${input.previousUserPrompt || "(none)"}
Assistant: ${input.previousLlmResponse || "(none)"}

Current user query:
${input.userPrompt}`;

  const message = new HumanMessage({
    content: [
      { type: "text", text: textBlock },
      {
        type: "image_url",
        image_url: `data:${input.image.mimeType};base64,${input.image.data}`,
      },
    ],
  });

  const result = await model.invoke([message]);
  return contentToText(result.content);
}

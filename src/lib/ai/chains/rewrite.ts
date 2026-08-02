import { contentToText, getChatModel } from "../llm";
import {
  REWRITE_INSTRUCTIONS,
  customRewritePromptTemplate,
  rewritePromptTemplate,
} from "../prompts";
import type { RewritePromptType } from "../schemas";
import type { GeminiModelId } from "../constants";

export async function rewriteResponse(input: {
  fullResponse: string;
  selectedText: string;
  promptType: RewritePromptType;
  customInstruction?: string;
  model?: GeminiModelId;
}) {
  const model = getChatModel({
    model: input.model,
    temperature: 0.5,
    streaming: false,
  });

  if (input.promptType === "Custom") {
    const chain = customRewritePromptTemplate.pipe(model);
    const result = await chain.invoke({
      fullResponse: input.fullResponse,
      selectedText: input.selectedText,
      customInstruction: input.customInstruction?.trim() || "",
    });
    return contentToText(result.content);
  }

  const instruction = REWRITE_INSTRUCTIONS[input.promptType];
  if (!instruction) {
    throw new Error(`Unsupported rewrite type: ${input.promptType}`);
  }

  const chain = rewritePromptTemplate.pipe(model);
  const result = await chain.invoke({
    fullResponse: input.fullResponse,
    selectedText: input.selectedText,
    instruction,
  });

  return contentToText(result.content);
}

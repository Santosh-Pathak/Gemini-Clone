import { getChatModel } from "../llm";
import { doubleCheckPromptTemplate } from "../prompts";
import { doubleCheckSchema, type DoubleCheckResult } from "../schemas";
import type { GeminiModelId } from "../constants";

/**
 * Structured-output chain: returns validated Google search queries.
 */
export async function generateDoubleCheckQueries(input: {
  userPrompt: string;
  model?: GeminiModelId;
}): Promise<DoubleCheckResult> {
  const model = getChatModel({
    model: input.model,
    temperature: 0.2,
    streaming: false,
  }).withStructuredOutput(doubleCheckSchema);

  const promptValue = await doubleCheckPromptTemplate.invoke({
    userPrompt: input.userPrompt,
  });

  // withStructuredOutput returns parsed Zod object directly
  const result = await model.invoke(promptValue.toChatMessages());
  return doubleCheckSchema.parse(result);
}

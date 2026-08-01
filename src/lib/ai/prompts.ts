const DEFAULT_SYSTEM_INSTRUCTION = `User is seeking a wise and impressive response. Consider including necessary details, context, and thoughtful insights. Aim to provide a comprehensive, well-structured, and articulate answer. Respond in a friendly and natural manner, using terms like "buddy" or other friendly expressions. Provide a complete and final response without asking any further questions.`;

export function buildChatPrompt({
  userPrompt,
  previousUserPrompt,
  previousLlmResponse,
  customPrompt,
}: {
  userPrompt: string;
  previousUserPrompt?: string | null;
  previousLlmResponse?: string | null;
  customPrompt?: string | null;
}) {
  const date = new Date().toISOString().split("T")[0];
  const instruction =
    customPrompt?.trim() || DEFAULT_SYSTEM_INSTRUCTION;

  return `
Date: ${date}

${instruction}

Previous chats:
User: ${previousUserPrompt || ""}
LLM Response: ${previousLlmResponse || ""}

Current User Query:
${userPrompt}
`.trim();
}

export function buildRewritePrompt({
  fullResponse,
  selectedText,
  instruction,
}: {
  fullResponse: string;
  selectedText: string;
  instruction: string;
}) {
  return `This is the whole response: ${fullResponse}. ${instruction} a specific part of the response, specifically "${selectedText}". Ensure it aligns seamlessly with the rest of the response. Provide the entire modified response back, preserving the essential introductory and concluding phrases without adding any new non-contextual information.`;
}

export function buildDoubleCheckPrompt(userPrompt: string) {
  return `
Generate a list of at least 5 different Google search queries based strictly on the user prompt.
Return ONLY a valid JSON array of strings — no markdown fences, no commentary.
Ensure the queries are relevant and varied but aligned with the user's prompt.

User prompt:
${userPrompt}
`.trim();
}

/** Best-effort parse of a JSON string array from model output. */
export function parseJsonStringArray(text: string): string[] {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed;
    }
  } catch {
    // fall through to bracket extraction
  }

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  }

  throw new Error("Model did not return a valid JSON string array");
}

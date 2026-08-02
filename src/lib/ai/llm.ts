import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GEMINI_MODEL, GEMINI_MODELS, type GeminiModelId } from "./constants";

export function isGeminiModelId(value: unknown): value is GeminiModelId {
  return (
    typeof value === "string" &&
    (GEMINI_MODELS as readonly string[]).includes(value)
  );
}

export function getChatModel(options?: {
  model?: GeminiModelId;
  temperature?: number;
  streaming?: boolean;
}) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Add it to your server environment (.env)."
    );
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: options?.model ?? GEMINI_MODEL,
    temperature: options?.temperature ?? 0.7,
    maxRetries: 2,
    streaming: options?.streaming ?? true,
  });
}

/** Extract plain text from LangChain message content (string or parts). */
export function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

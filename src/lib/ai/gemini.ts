/**
 * @deprecated Phase 2 uses LangChain (`./llm`). Kept as a thin re-export
 * so any leftover imports keep working during the migration.
 */
export { getChatModel as getGeminiModel, contentToText } from "./llm";

export type InlineImagePart = {
  inlineData: {
    data: string;
    mimeType: string;
  };
};

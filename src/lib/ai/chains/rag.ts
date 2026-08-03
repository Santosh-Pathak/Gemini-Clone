import { retrieveRelevantChunks } from "../rag/retrieve";
import { buildRagContextBlock, type RagSource } from "../rag/types";

export async function retrieveRagContext(input: {
  userId: string;
  query: string;
}): Promise<{ sources: RagSource[]; contextBlock: string }> {
  const sources = await retrieveRelevantChunks({
    userId: input.userId,
    query: input.query,
  });

  return {
    sources,
    contextBlock: buildRagContextBlock(sources),
  };
}

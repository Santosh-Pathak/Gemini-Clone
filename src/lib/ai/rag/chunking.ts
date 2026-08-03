import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import {
  RAG_CHUNK_OVERLAP,
  RAG_CHUNK_SIZE,
} from "./constants";

export async function splitIntoChunks(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: RAG_CHUNK_SIZE,
    chunkOverlap: RAG_CHUNK_OVERLAP,
  });
  const chunks = await splitter.splitText(text.trim());
  return chunks.filter((c) => c.trim().length > 0);
}

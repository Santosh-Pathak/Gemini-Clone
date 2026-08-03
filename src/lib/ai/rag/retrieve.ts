import connectDB from "@/utils/db";
import { KnowledgeChunk } from "@/app/models/knowledge.model";
import { Types } from "mongoose";
import { embedQuery } from "./embeddings";
import { RAG_MIN_SCORE, RAG_TOP_K } from "./constants";
import {
  cosineSimilarity,
  truncateExcerpt,
  type RagSource,
} from "./types";

type ChunkDoc = {
  _id: unknown;
  document: unknown;
  fileName: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
};

export async function retrieveRelevantChunks(input: {
  userId: string;
  query: string;
  topK?: number;
}): Promise<RagSource[]> {
  await connectDB();

  const chunks = (await KnowledgeChunk.find({
    participant: new Types.ObjectId(input.userId),
  })
    .select("document fileName chunkIndex text embedding")
    .lean()) as ChunkDoc[];

  if (chunks.length === 0) return [];

  const queryEmbedding = await embedQuery(input.query);
  const topK = input.topK ?? RAG_TOP_K;

  const scored = chunks
    .map((chunk) => ({
      documentId: String(chunk.document),
      fileName: chunk.fileName,
      chunkIndex: chunk.chunkIndex,
      excerpt: truncateExcerpt(chunk.text),
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((item) => item.score >= RAG_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export async function userHasKnowledge(userId: string): Promise<boolean> {
  await connectDB();
  const count = await KnowledgeChunk.countDocuments({
    participant: new Types.ObjectId(userId),
  });
  return count > 0;
}

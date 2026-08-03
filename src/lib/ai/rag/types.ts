import type { RagSource } from "@/types/types";

export type { RagSource };

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function truncateExcerpt(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function buildRagContextBlock(sources: RagSource[]): string {
  if (sources.length === 0) return "";

  const blocks = sources.map(
    (s, i) =>
      `[Source ${i + 1}] ${s.fileName} (chunk ${s.chunkIndex + 1}, relevance ${(s.score * 100).toFixed(0)}%)\n${s.excerpt}`
  );

  return `Relevant excerpts from the user's uploaded documents:\n\n${blocks.join("\n\n")}\n\nUse these sources when answering. If the answer is not supported by the sources, say you could not find it in the uploaded documents. Cite sources inline like [Source 1], [Source 2].`;
}

export function encodeRagSourcesHeader(sources: RagSource[]): string {
  return Buffer.from(JSON.stringify(sources), "utf-8").toString("base64url");
}

export function decodeRagSourcesHeader(value: string): RagSource[] {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf-8")
    );
    if (!Array.isArray(parsed)) return [];
    return parsed as RagSource[];
  } catch {
    return [];
  }
}

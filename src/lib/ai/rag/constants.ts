/** RAG chunk size / overlap (RecursiveCharacterTextSplitter). */
export const RAG_CHUNK_SIZE = 1_000;
export const RAG_CHUNK_OVERLAP = 150;

/** Top-k chunks retrieved per question. */
export const RAG_TOP_K = 4;

/** Minimum cosine similarity to include a chunk (0–1). */
export const RAG_MIN_SCORE = 0.55;

/** Max upload size in bytes (~5 MB). */
export const RAG_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const RAG_ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
] as const;

export type RagMimeType = (typeof RAG_ALLOWED_MIME_TYPES)[number];

export const RAG_ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"] as const;

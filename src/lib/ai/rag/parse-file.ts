import {
  RAG_ALLOWED_EXTENSIONS,
  RAG_ALLOWED_MIME_TYPES,
  RAG_MAX_FILE_BYTES,
  type RagMimeType,
} from "./constants";

export function isAllowedRagMime(mime: string): mime is RagMimeType {
  return (RAG_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function inferMimeFromName(fileName: string): RagMimeType | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return null;
}

export function validateRagUpload(input: {
  fileName: string;
  mimeType: string;
  size: number;
}): RagMimeType {
  if (input.size > RAG_MAX_FILE_BYTES) {
    throw new Error("File is too large. Maximum size is 5 MB.");
  }

  const mime = isAllowedRagMime(input.mimeType)
    ? input.mimeType
    : inferMimeFromName(input.fileName);

  if (!mime) {
    throw new Error(
      `Unsupported file type. Allowed: ${RAG_ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  return mime;
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: RagMimeType,
  fileName: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    const pdfModule = await import("pdf-parse");
    const pdfParse =
      "default" in pdfModule && typeof pdfModule.default === "function"
        ? pdfModule.default
        : (pdfModule as unknown as (data: Buffer) => Promise<{ text?: string }>);
    const parsed = await pdfParse(buffer);
    return parsed.text?.trim() || "";
  }

  const text = buffer.toString("utf-8").trim();
  if (!text) {
    throw new Error(`Could not extract text from ${fileName}.`);
  }
  return text;
}

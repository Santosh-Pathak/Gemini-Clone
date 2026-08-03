import connectDB from "@/utils/db";
import {
  KnowledgeChunk,
  KnowledgeDocument,
} from "@/app/models/knowledge.model";
import { Types } from "mongoose";
import { splitIntoChunks } from "./chunking";
import { embedDocuments } from "./embeddings";
import {
  extractTextFromFile,
  validateRagUpload,
} from "./parse-file";

export async function ingestKnowledgeDocument(input: {
  userId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const mime = validateRagUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.buffer.length,
  });

  const text = await extractTextFromFile(input.buffer, mime, input.fileName);
  if (!text) {
    throw new Error("No readable text found in the uploaded file.");
  }

  const chunks = await splitIntoChunks(text);
  if (chunks.length === 0) {
    throw new Error("Document produced no indexable chunks.");
  }

  await connectDB();

  const doc = await KnowledgeDocument.create({
    participant: new Types.ObjectId(input.userId),
    fileName: input.fileName,
    mimeType: mime,
    chunkCount: chunks.length,
    charCount: text.length,
  });

  const embeddings = await embedDocuments(chunks);

  await KnowledgeChunk.insertMany(
    chunks.map((chunkText, chunkIndex) => ({
      participant: new Types.ObjectId(input.userId),
      document: doc._id,
      fileName: input.fileName,
      chunkIndex,
      text: chunkText,
      embedding: embeddings[chunkIndex],
    }))
  );

  return {
    id: String(doc._id),
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    chunkCount: doc.chunkCount,
    charCount: doc.charCount,
  };
}

export async function listKnowledgeDocuments(userId: string) {
  await connectDB();
  const docs = await KnowledgeDocument.find({
    participant: new Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return docs.map((doc) => ({
    id: String(doc._id),
    fileName: doc.fileName as string,
    mimeType: doc.mimeType as string,
    chunkCount: doc.chunkCount as number,
    charCount: doc.charCount as number,
    createdAt: doc.createdAt,
  }));
}

export async function deleteKnowledgeDocument(userId: string, documentId: string) {
  await connectDB();
  const participant = new Types.ObjectId(userId);
  const document = new Types.ObjectId(documentId);

  const existing = await KnowledgeDocument.findOne({
    _id: document,
    participant,
  });
  if (!existing) {
    throw new Error("Document not found or not authorized.");
  }

  await KnowledgeChunk.deleteMany({ document, participant });
  await KnowledgeDocument.deleteOne({ _id: document, participant });

  return { success: true };
}

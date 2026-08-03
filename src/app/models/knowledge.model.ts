import { Schema, model, models } from "mongoose";

const knowledgeDocumentSchema = new Schema(
  {
    participant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    chunkCount: { type: Number, default: 0 },
    charCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const knowledgeChunkSchema = new Schema(
  {
    participant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    document: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgeDocument",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

export const KnowledgeDocument =
  models.KnowledgeDocument ||
  model("KnowledgeDocument", knowledgeDocumentSchema);

export const KnowledgeChunk =
  models.KnowledgeChunk || model("KnowledgeChunk", knowledgeChunkSchema);

export default KnowledgeDocument;

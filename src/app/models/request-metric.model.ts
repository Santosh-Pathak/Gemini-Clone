import { Schema, model, models } from "mongoose";

const requestMetricSchema = new Schema(
  {
    userIdHash: { type: String, required: true, index: true },
    feature: {
      type: String,
      required: true,
      enum: ["chat", "agent", "rag", "vision", "rewrite", "double-check"],
      index: true,
    },
    model: { type: String, default: null },
    latencyMs: { type: Number, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ok", "error", "aborted"],
      default: "ok",
    },
  },
  { timestamps: true }
);

requestMetricSchema.index({ createdAt: -1 });

const RequestMetric =
  models.RequestMetric || model("RequestMetric", requestMetricSchema);

export default RequestMetric;

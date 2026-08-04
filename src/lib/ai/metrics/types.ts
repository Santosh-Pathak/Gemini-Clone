export const REQUEST_FEATURES = [
  "chat",
  "agent",
  "rag",
  "vision",
  "rewrite",
  "double-check",
] as const;

export type RequestFeature = (typeof REQUEST_FEATURES)[number];

export type RequestMetricStatus = "ok" | "error" | "aborted";

export type RequestMetricInput = {
  userId: string;
  feature: RequestFeature;
  model?: string | null;
  latencyMs: number;
  inputChars?: number;
  outputChars?: number;
  status?: RequestMetricStatus;
};

export type RequestMetricSummary = {
  id: string;
  userIdHash: string;
  feature: RequestFeature;
  model: string | null;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  status: RequestMetricStatus;
  createdAt: string;
};

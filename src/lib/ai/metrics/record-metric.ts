import RequestMetric from "@/app/models/request-metric.model";
import connectDB from "@/utils/db";
import { hashUserId } from "./hash-user-id";
import { estimateTokensFromChars } from "./estimate-tokens";
import type { RequestMetricInput, RequestMetricStatus } from "./types";

export function recordRequestMetric(input: RequestMetricInput): void {
  void persistRequestMetric(input).catch((error) => {
    console.error("[metrics]", error);
  });
}

async function persistRequestMetric(input: RequestMetricInput): Promise<void> {
  await connectDB();
  await RequestMetric.create({
    userIdHash: hashUserId(input.userId),
    feature: input.feature,
    model: input.model ?? null,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    inputTokens: estimateTokensFromChars(input.inputChars ?? 0),
    outputTokens: estimateTokensFromChars(input.outputChars ?? 0),
    status: input.status ?? "ok",
  });
}

export function createRequestTimer() {
  const startedAt = Date.now();
  return {
    elapsedMs: () => Date.now() - startedAt,
  };
}

export function createStreamMetricTracker(params: {
  userId: string;
  feature: RequestMetricInput["feature"];
  model?: string | null;
  inputChars?: number;
}) {
  const timer = createRequestTimer();
  let outputChars = 0;

  return {
    addOutput(text: string) {
      outputChars += text.length;
    },
    finish(status: RequestMetricStatus = "ok") {
      recordRequestMetric({
        userId: params.userId,
        feature: params.feature,
        model: params.model,
        latencyMs: timer.elapsedMs(),
        inputChars: params.inputChars,
        outputChars,
        status,
      });
    },
  };
}

export function resolveChatFeatureTag(options: {
  mode: "chat" | "agent";
  useKnowledge: boolean;
  hasImage: boolean;
}): RequestMetricInput["feature"] {
  if (options.mode === "agent") return "agent";
  if (options.hasImage) return "vision";
  if (options.useKnowledge) return "rag";
  return "chat";
}

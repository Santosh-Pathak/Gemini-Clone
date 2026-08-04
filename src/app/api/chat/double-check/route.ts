import { generateDoubleCheckQueries } from "@/lib/ai/chains/double-check";
import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import { MAX_PROMPT_LENGTH } from "@/lib/ai/constants";
import {
  createRequestTimer,
  recordRequestMetric,
} from "@/lib/ai/metrics/record-metric";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DoubleCheckBody = {
  userPrompt?: string;
};

export async function POST(req: Request) {
  try {
    const authResult = await requireAuthedUser("double-check");
    if (authResult.error) return authResult.error;

    const body = (await req.json()) as DoubleCheckBody;
    const userPrompt = body.userPrompt?.trim() ?? "";

    if (!userPrompt) {
      return NextResponse.json(
        { error: "userPrompt is required." },
        { status: 400 }
      );
    }

    if (userPrompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: "Prompt is too long." },
        { status: 400 }
      );
    }

    const timer = createRequestTimer();

    try {
      const { queries } = await generateDoubleCheckQueries({ userPrompt });

      recordRequestMetric({
        userId: authResult.userId,
        feature: "double-check",
        latencyMs: timer.elapsedMs(),
        inputChars: userPrompt.length,
        outputChars: queries.join(" ").length,
        status: "ok",
      });

      return NextResponse.json({ queries });
    } catch (error) {
      recordRequestMetric({
        userId: authResult.userId,
        feature: "double-check",
        latencyMs: timer.elapsedMs(),
        inputChars: userPrompt.length,
        status: "error",
      });
      throw error;
    }
  } catch (error) {
    console.error("[api/chat/double-check]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate search queries";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

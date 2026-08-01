import { getGeminiModel } from "@/lib/ai/gemini";
import {
  buildDoubleCheckPrompt,
  parseJsonStringArray,
} from "@/lib/ai/prompts";
import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import { MAX_PROMPT_LENGTH } from "@/lib/ai/constants";
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

    const model = getGeminiModel();
    const result = await model.generateContent(
      buildDoubleCheckPrompt(userPrompt)
    );
    const text = result.response.text();
    const queries = parseJsonStringArray(text);

    if (queries.length === 0) {
      return NextResponse.json(
        { error: "No search queries generated." },
        { status: 502 }
      );
    }

    return NextResponse.json({ queries });
  } catch (error) {
    console.error("[api/chat/double-check]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate search queries";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

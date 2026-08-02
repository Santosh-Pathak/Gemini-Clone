import { rewriteResponse } from "@/lib/ai/chains/rewrite";
import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import { MAX_PROMPT_LENGTH } from "@/lib/ai/constants";
import { rewriteRequestSchema } from "@/lib/ai/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const authResult = await requireAuthedUser("rewrite");
    if (authResult.error) return authResult.error;

    const raw = await req.json();
    const parsed = rewriteRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid rewrite request." },
        { status: 400 }
      );
    }

    const { fullResponse, selectedText, promptType, customInstruction } =
      parsed.data;

    if (
      fullResponse.length > MAX_PROMPT_LENGTH * 2 ||
      selectedText.length > MAX_PROMPT_LENGTH
    ) {
      return NextResponse.json(
        { error: "Input is too long." },
        { status: 400 }
      );
    }

    if (promptType === "Custom") {
      const instruction = customInstruction?.trim() || "";
      if (!instruction) {
        return NextResponse.json(
          { error: "customInstruction is required for Custom rewrites." },
          { status: 400 }
        );
      }
      if (instruction.length > MAX_PROMPT_LENGTH) {
        return NextResponse.json(
          { error: "Custom instruction is too long." },
          { status: 400 }
        );
      }
    }

    const text = await rewriteResponse({
      fullResponse,
      selectedText,
      promptType,
      customInstruction,
    });

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[api/chat/rewrite]", error);
    const message =
      error instanceof Error ? error.message : "Failed to rewrite response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

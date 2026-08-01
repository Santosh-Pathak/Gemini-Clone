import { getGeminiModel } from "@/lib/ai/gemini";
import { buildRewritePrompt } from "@/lib/ai/prompts";
import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import { MAX_PROMPT_LENGTH } from "@/lib/ai/constants";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REWRITE_INSTRUCTIONS: Record<string, string> = {
  Longer: "Lengthen",
  Shorter: "Shorten",
  Regenerate: "Regenerate",
  Remove: "Remove",
  Simplify: "Simplify the language of",
  Elaborate: "Elaborate on",
  Formalize: "Rewrite in a more formal tone",
  Casual: "Rewrite in a more casual tone",
  Persuasive: "Rewrite to be more persuasive",
  Technical: "Add more technical details to",
  Metaphor: "Incorporate a relevant metaphor into",
  Examples: "Add relevant examples to",
  Counterargument: "Present a counterargument to",
  Summary: "Provide a concise summary of",
};

type RewriteBody = {
  fullResponse?: string;
  selectedText?: string;
  promptType?: string;
  customInstruction?: string;
};

export async function POST(req: Request) {
  try {
    const authResult = await requireAuthedUser("rewrite");
    if (authResult.error) return authResult.error;

    const body = (await req.json()) as RewriteBody;
    const fullResponse = body.fullResponse?.trim() ?? "";
    const selectedText = body.selectedText?.trim() ?? "";

    if (!fullResponse || !selectedText) {
      return NextResponse.json(
        { error: "fullResponse and selectedText are required." },
        { status: 400 }
      );
    }

    if (
      fullResponse.length > MAX_PROMPT_LENGTH * 2 ||
      selectedText.length > MAX_PROMPT_LENGTH
    ) {
      return NextResponse.json(
        { error: "Input is too long." },
        { status: 400 }
      );
    }

    let instruction: string;
    if (body.promptType === "Custom") {
      instruction = body.customInstruction?.trim() || "";
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
    } else {
      instruction = REWRITE_INSTRUCTIONS[body.promptType || ""];
      if (!instruction) {
        return NextResponse.json(
          { error: "Invalid promptType." },
          { status: 400 }
        );
      }
    }

    const prompt =
      body.promptType === "Custom"
        ? `This is the whole response: ${fullResponse}. ${instruction} Specifically focus on this part: "${selectedText}". Ensure the modified part aligns seamlessly with the rest of the response. Provide the entire modified response back, preserving the essential introductory and concluding phrases without adding any new non-contextual information.`
        : buildRewritePrompt({ fullResponse, selectedText, instruction });

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();

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

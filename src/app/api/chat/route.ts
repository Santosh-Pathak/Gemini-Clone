import {
  invokeChatWithImage,
  streamChatReply,
} from "@/lib/ai/chains/chat";
import { contentToText, isGeminiModelId } from "@/lib/ai/llm";
import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import {
  MAX_IMAGE_BASE64_LENGTH,
  MAX_PROMPT_LENGTH,
} from "@/lib/ai/constants";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRequestBody = {
  message?: string;
  previousUserPrompt?: string | null;
  previousLlmResponse?: string | null;
  customPrompt?: string | null;
  model?: string;
  image?: {
    data: string;
    mimeType: string;
  } | null;
};

export async function POST(req: Request) {
  try {
    const authResult = await requireAuthedUser("chat");
    if (authResult.error) return authResult.error;

    const body = (await req.json()) as ChatRequestBody;
    const message = body.message?.trim() ?? "";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (message.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          error: `Message exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    if (body.customPrompt && body.customPrompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: "Custom prompt is too long." },
        { status: 400 }
      );
    }

    if (body.model && !isGeminiModelId(body.model)) {
      return NextResponse.json(
        { error: "Unsupported model." },
        { status: 400 }
      );
    }

    if (body.image?.data) {
      if (body.image.data.length > MAX_IMAGE_BASE64_LENGTH) {
        return NextResponse.json(
          { error: "Image is too large. Please upload a smaller image." },
          { status: 400 }
        );
      }
      if (!body.image.mimeType?.startsWith("image/")) {
        return NextResponse.json(
          { error: "Invalid image MIME type." },
          { status: 400 }
        );
      }
    }

    const chainInput = {
      userPrompt: message,
      previousUserPrompt: body.previousUserPrompt,
      previousLlmResponse: body.previousLlmResponse,
      customPrompt: body.customPrompt,
      model: body.model && isGeminiModelId(body.model) ? body.model : undefined,
      image: body.image,
    };

    // Multimodal: non-streaming invoke
    if (body.image?.data) {
      const text = await invokeChatWithImage({
        ...chainInput,
        image: body.image,
      });

      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const lcStream = await streamChatReply(chainInput);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of lcStream) {
            if (req.signal.aborted) {
              controller.close();
              return;
            }
            const chunkText = contentToText(chunk.content);
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();
        } catch (error) {
          if (req.signal.aborted) {
            controller.close();
            return;
          }
          controller.error(error);
        }
      },
      cancel() {
        // Client aborted via AbortController.
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[api/chat]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

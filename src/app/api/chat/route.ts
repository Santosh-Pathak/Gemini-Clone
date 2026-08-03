import {
  invokeChatWithImage,
  streamChatReply,
} from "@/lib/ai/chains/chat";
import { retrieveRagContext } from "@/lib/ai/chains/rag";
import { contentToText, isGeminiModelId } from "@/lib/ai/llm";
import { prepareConversationMemory } from "@/lib/ai/memory";
import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import {
  MAX_IMAGE_BASE64_LENGTH,
  MAX_PROMPT_LENGTH,
} from "@/lib/ai/constants";
import {
  encodeRagSourcesHeader,
  type RagSource,
} from "@/lib/ai/rag/types";
import {
  loadThreadMemory,
  updateThreadSummary,
} from "@/actions/actions";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRequestBody = {
  message?: string;
  chatID?: string;
  previousUserPrompt?: string | null;
  previousLlmResponse?: string | null;
  customPrompt?: string | null;
  model?: string;
  useKnowledge?: boolean;
  image?: {
    data: string;
    mimeType: string;
  } | null;
};

function memoryHeaders(meta: {
  turnCount: number;
  recentTurnCount: number;
  didSummarize: boolean;
  hasSummary: boolean;
}) {
  return {
    "X-Memory-Turns": String(meta.turnCount),
    "X-Memory-Recent": String(meta.recentTurnCount),
    "X-Memory-Summarized": meta.didSummarize ? "1" : "0",
    "X-Memory-Has-Summary": meta.hasSummary ? "1" : "0",
  };
}

function ragHeaders(sources: RagSource[], enabled: boolean) {
  return {
    "X-RAG-Enabled": enabled ? "1" : "0",
    ...(sources.length > 0
      ? { "X-RAG-Sources": encodeRagSourcesHeader(sources) }
      : {}),
  };
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAuthedUser("chat");
    if (authResult.error) return authResult.error;

    const body = (await req.json()) as ChatRequestBody;
    const message = body.message?.trim() ?? "";
    const chatID = body.chatID?.trim() || "";
    const useKnowledge = Boolean(body.useKnowledge);

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

    let turns: { userPrompt: string; llmResponse: string }[] = [];
    let existingSummary: string | null = null;

    if (chatID) {
      const thread = await loadThreadMemory(chatID);
      if (thread.success) {
        turns = thread.turns;
        existingSummary = thread.threadSummary;
      }
    } else if (body.previousUserPrompt || body.previousLlmResponse) {
      turns = [
        {
          userPrompt: body.previousUserPrompt || "",
          llmResponse: body.previousLlmResponse || "",
        },
      ];
    }

    const memory = await prepareConversationMemory({
      turns,
      existingSummary,
    });

    if (memory.summaryToPersist && chatID) {
      await updateThreadSummary(chatID, memory.summaryToPersist);
    }

    let ragSources: RagSource[] = [];
    let ragContext: string | null = null;

    if (useKnowledge && !body.image?.data) {
      const rag = await retrieveRagContext({
        userId: authResult.userId,
        query: message,
      });
      ragSources = rag.sources;
      ragContext = rag.contextBlock || null;
    }

    const chainInput = {
      userPrompt: message,
      customPrompt: body.customPrompt,
      model: body.model && isGeminiModelId(body.model) ? body.model : undefined,
      memory,
      ragContext,
      ragSources,
      image: body.image,
    };

    const metaHeaders = {
      ...memoryHeaders({
        turnCount: memory.turnCount,
        recentTurnCount: memory.recentTurnCount,
        didSummarize: memory.didSummarize,
        hasSummary: Boolean(memory.summary),
      }),
      ...ragHeaders(ragSources, useKnowledge),
    };

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
          ...metaHeaders,
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
        ...metaHeaders,
      },
    });
  } catch (error) {
    console.error("[api/chat]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

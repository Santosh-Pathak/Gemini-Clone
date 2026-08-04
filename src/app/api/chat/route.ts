import {
  streamChatWithImage,
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
import { runAgentStream } from "@/lib/ai/agents/run-agent";
import { isVisionPresetId } from "@/lib/ai/vision-presets";
import {
  getChatImageBase64,
  uploadChatImage,
} from "@/lib/storage/chat-images";
import {
  createStreamMetricTracker,
  resolveChatFeatureTag,
} from "@/lib/ai/metrics/record-metric";
import { assertFeatureEnabled, getFeatureFlags } from "@/lib/feature-flags";
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
  mode?: "chat" | "agent";
  visionPreset?: string | null;
  imageId?: string | null;
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
    const mode = body.mode === "agent" ? "agent" : "chat";
    const flags = getFeatureFlags();

    if (mode === "agent") {
      const blocked = assertFeatureEnabled("agent", "Agent mode");
      if (blocked.error) {
        return NextResponse.json({ error: blocked.error }, { status: 403 });
      }
    }

    if (useKnowledge) {
      const blocked = assertFeatureEnabled("rag", "Knowledge mode");
      if (blocked.error) {
        return NextResponse.json({ error: blocked.error }, { status: 403 });
      }
    }

    if (body.image?.data || body.imageId?.trim()) {
      const blocked = assertFeatureEnabled("vision", "Image uploads");
      if (blocked.error) {
        return NextResponse.json({ error: blocked.error }, { status: 403 });
      }
    }

    if (mode === "agent" && (body.image?.data || body.imageId)) {
      return NextResponse.json(
        { error: "Agent mode does not support image prompts." },
        { status: 400 }
      );
    }

    if (!message && !body.image?.data && !body.imageId?.trim()) {
      return NextResponse.json(
        { error: "Message or image is required." },
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

    if (body.visionPreset && !isVisionPresetId(body.visionPreset)) {
      return NextResponse.json(
        { error: "Unsupported vision preset." },
        { status: 400 }
      );
    }

    let resolvedImage: { data: string; mimeType: string } | null = null;
    let persistedImageId: string | null = body.imageId?.trim() || null;

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
      resolvedImage = body.image;
    } else if (persistedImageId) {
      try {
        resolvedImage = await getChatImageBase64(
          persistedImageId,
          authResult.userId
        );
      } catch {
        return NextResponse.json({ error: "Image not found." }, { status: 404 });
      }
    }

    if (body.image?.data && !persistedImageId) {
      const buffer = Buffer.from(body.image.data, "base64");
      persistedImageId = await uploadChatImage({
        userId: authResult.userId,
        buffer,
        filename: "chat-upload.png",
        mimeType: body.image.mimeType,
      });
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

    if (useKnowledge && !resolvedImage && mode === "chat") {
      const rag = await retrieveRagContext({
        userId: authResult.userId,
        query: message,
      });
      ragSources = rag.sources;
      ragContext = rag.contextBlock || null;
    }

    const visionPreset =
      body.visionPreset && isVisionPresetId(body.visionPreset)
        ? body.visionPreset
        : null;

    const chainInput = {
      userPrompt: message,
      customPrompt: body.customPrompt,
      model: body.model && isGeminiModelId(body.model) ? body.model : undefined,
      memory,
      ragContext,
      ragSources,
      visionPreset,
      image: resolvedImage,
    };

    const imageHeaders = persistedImageId
      ? { "X-Image-Id": persistedImageId }
      : {};

    const metaHeaders = {
      ...memoryHeaders({
        turnCount: memory.turnCount,
        recentTurnCount: memory.recentTurnCount,
        didSummarize: memory.didSummarize,
        hasSummary: Boolean(memory.summary),
      }),
      ...ragHeaders(ragSources, useKnowledge && mode === "chat"),
      ...imageHeaders,
      "X-Chat-Mode": mode,
    };

    const modelId =
      body.model && isGeminiModelId(body.model) ? body.model : undefined;
    const featureTag = resolveChatFeatureTag({
      mode,
      useKnowledge,
      hasImage: Boolean(resolvedImage),
    });
    const inputChars = message.length;

    if (mode === "agent") {
      const tracker = createStreamMetricTracker({
        userId: authResult.userId,
        feature: featureTag,
        model: modelId ?? null,
        inputChars,
      });
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let finished = false;
          const finishOnce = (status: "ok" | "error" | "aborted") => {
            if (finished) return;
            finished = true;
            tracker.finish(status);
          };

          try {
            for await (const event of runAgentStream({
              userId: authResult.userId,
              userPrompt: message,
              memory,
              model: modelId,
            })) {
              if (req.signal.aborted) {
                finishOnce("aborted");
                controller.close();
                return;
              }
              if (event.type === "text") {
                tracker.addOutput(event.delta);
              }
              controller.enqueue(
                encoder.encode(`${JSON.stringify(event)}\n`)
              );
              if (event.type === "done") {
                finishOnce("ok");
              }
              if (event.type === "error") {
                finishOnce("error");
              }
            }
            finishOnce("ok");
            controller.close();
          } catch (error) {
            finishOnce("error");
            const message =
              error instanceof Error ? error.message : "Agent failed";
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({ type: "error", message })}\n`
              )
            );
            controller.close();
          }
        },
        cancel() {
          tracker.finish("aborted");
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          ...metaHeaders,
        },
      });
    }

    if (resolvedImage) {
      const tracker = createStreamMetricTracker({
        userId: authResult.userId,
        feature: featureTag,
        model: modelId ?? null,
        inputChars,
      });
      const lcStream = await streamChatWithImage({
        ...chainInput,
        image: resolvedImage,
      });
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of lcStream) {
              if (req.signal.aborted) {
                tracker.finish("aborted");
                controller.close();
                return;
              }
              const chunkText = contentToText(chunk.content);
              if (chunkText) {
                tracker.addOutput(chunkText);
                controller.enqueue(encoder.encode(chunkText));
              }
            }
            tracker.finish("ok");
            controller.close();
          } catch (error) {
            tracker.finish("error");
            if (req.signal.aborted) {
              controller.close();
              return;
            }
            controller.error(error);
          }
        },
        cancel() {
          tracker.finish("aborted");
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
    }

    const tracker = createStreamMetricTracker({
      userId: authResult.userId,
      feature: featureTag,
      model: modelId ?? null,
      inputChars,
    });
    const lcStream = await streamChatReply(chainInput);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of lcStream) {
            if (req.signal.aborted) {
              tracker.finish("aborted");
              controller.close();
              return;
            }
            const chunkText = contentToText(chunk.content);
            if (chunkText) {
              tracker.addOutput(chunkText);
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          tracker.finish("ok");
          controller.close();
        } catch (error) {
          tracker.finish("error");
          if (req.signal.aborted) {
            controller.close();
            return;
          }
          controller.error(error);
        }
      },
      cancel() {
        tracker.finish("aborted");
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

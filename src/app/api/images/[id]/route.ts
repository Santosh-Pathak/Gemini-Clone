import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import { openChatImageDownload } from "@/lib/storage/chat-images";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: { id: string };
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const authResult = await requireAuthedUser("images");
    if (authResult.error) return authResult.error;

    const imageId = context.params.id?.trim();
    if (!imageId) {
      return NextResponse.json({ error: "Image id is required." }, { status: 400 });
    }

    const { stream, mimeType, filename } = await openChatImageDownload(
      imageId,
      authResult.userId
    );

    const webStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[api/images GET]", error);
    const message = error instanceof Error ? error.message : "Failed to load image";
    const status = message === "Forbidden" ? 403 : message === "Image not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

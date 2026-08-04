import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import { MAX_IMAGE_BASE64_LENGTH } from "@/lib/ai/constants";
import { uploadChatImage } from "@/lib/storage/chat-images";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const authResult = await requireAuthedUser("images");
    if (authResult.error) return authResult.error;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 3MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Length = Math.ceil((buffer.length * 4) / 3);
    if (base64Length > MAX_IMAGE_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "Image is too large after encoding." },
        { status: 400 }
      );
    }

    const imageId = await uploadChatImage({
      userId: authResult.userId,
      buffer,
      filename: file.name || "upload.png",
      mimeType: file.type || "image/png",
    });

    return NextResponse.json({
      imageId,
      filename: file.name,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("[api/images POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

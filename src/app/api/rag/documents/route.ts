import { requireAuthedUser } from "@/lib/ai/require-authed-user";
import {
  deleteKnowledgeDocument,
  ingestKnowledgeDocument,
  listKnowledgeDocuments,
} from "@/lib/ai/rag/ingest";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authResult = await requireAuthedUser("rag-list");
    if (authResult.error) return authResult.error;

    const documents = await listKnowledgeDocuments(authResult.userId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[api/rag/documents GET]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list documents",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAuthedUser("rag-upload");
    if (authResult.error) return authResult.error;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestKnowledgeDocument({
      userId: authResult.userId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });

    return NextResponse.json({ document: result });
  } catch (error) {
    console.error("[api/rag/documents POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload document",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authResult = await requireAuthedUser("rag-delete");
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id")?.trim();
    if (!documentId) {
      return NextResponse.json(
        { error: "Document id is required." },
        { status: 400 }
      );
    }

    await deleteKnowledgeDocument(authResult.userId, documentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/rag/documents DELETE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete document",
      },
      { status: 500 }
    );
  }
}

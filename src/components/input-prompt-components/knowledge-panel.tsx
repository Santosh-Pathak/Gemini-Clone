"use client";

import React, { useCallback, useEffect, useState } from "react";
import DevModal from "../dev-components/dev-modal";
import DevButton from "../dev-components/dev-button";
import { MdOutlineMenuBook } from "react-icons/md";
import { IoTrashOutline } from "react-icons/io5";
import geminiZustand from "@/utils/gemini-zustand";
import type { KnowledgeDocumentSummary } from "@/types/types";
import { parseApiError } from "@/utils/chat-api-client";

const KnowledgePanel = ({ disabled }: { disabled?: boolean }) => {
  const { setToast, setKnowledgeDocCount } = geminiZustand();
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<KnowledgeDocumentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rag/documents");
      if (!res.ok) throw new Error(await parseApiError(res));
      const data = (await res.json()) as {
        documents?: KnowledgeDocumentSummary[];
      };
      const docs = data.documents ?? [];
      setDocuments(docs);
      setKnowledgeDocCount(docs.length);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Failed to load documents"
      );
    } finally {
      setLoading(false);
    }
  }, [setToast, setKnowledgeDocCount]);

  useEffect(() => {
    if (open) fetchDocuments();
  }, [open, fetchDocuments]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/rag/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      setToast(`Indexed ${file.name}`);
      await fetchDocuments();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Failed to upload document"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/rag/documents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      setToast("Document removed");
      await fetchDocuments();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Failed to delete document"
      );
    }
  };

  return (
    <DevModal
      open={open}
      isOpen={setOpen}
      modalTitle="Knowledge base"
      loader={uploading}
      openBtn={
        <DevButton
          asIcon
          rounded="full"
          variant="v3"
          disabled={disabled}
          className="p-3 relative"
          title="Upload documents"
        >
          <MdOutlineMenuBook className="text-2xl" />
        </DevButton>
      }
    >
      <div className="w-[min(92vw,520px)] space-y-4 p-1">
        <p className="text-sm opacity-80">
          Upload PDF, TXT, or MD files. When Knowledge mode is on, answers are
          grounded in your documents with cited sources.
        </p>

        <DevButton
          variant="v2"
          rounded="full"
          className="relative w-full justify-center"
          disabled={uploading}
        >
          {uploading ? "Indexing…" : "Upload document"}
          <input
            type="file"
            accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleUpload}
            disabled={uploading}
          />
        </DevButton>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm opacity-70">Loading documents…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm opacity-70">No documents uploaded yet.</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-accentGray/10"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{doc.fileName}</p>
                  <p className="text-xs opacity-70">
                    {doc.chunkCount} chunks · {doc.charCount.toLocaleString()}{" "}
                    chars
                  </p>
                </div>
                <DevButton
                  asIcon
                  variant="v3"
                  rounded="full"
                  onClick={() => handleDelete(doc.id)}
                  title="Delete document"
                >
                  <IoTrashOutline className="text-xl" />
                </DevButton>
              </div>
            ))
          )}
        </div>
      </div>
    </DevModal>
  );
};

export default KnowledgePanel;

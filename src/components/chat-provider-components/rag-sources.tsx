"use client";

import React, { useState } from "react";
import type { RagSource } from "@/types/types";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import { MdOutlineSource } from "react-icons/md";

const RagSources = ({ sources }: { sources?: RagSource[] }) => {
  const [open, setOpen] = useState(true);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="w-full md:w-[90%] mt-4 mx-auto overflow-hidden rounded-2xl border border-accentBlue/20 bg-accentBlue/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 font-medium text-accentBlue">
          <MdOutlineSource className="text-xl" />
          Sources ({sources.length})
        </span>
        {open ? <IoChevronUp /> : <IoChevronDown />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {sources.map((source, index) => (
            <div
              key={`${source.documentId}-${source.chunkIndex}-${index}`}
              className="rounded-xl bg-white/60 dark:bg-black/20 p-3 text-sm"
            >
              <p className="font-medium">
                Based on {source.fileName}
                {source.chunkIndex >= 0
                  ? ` · chunk ${source.chunkIndex + 1}`
                  : ""}
                {" · "}
                {(source.score * 100).toFixed(0)}% match
              </p>
              <p className="mt-1 opacity-80">{source.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RagSources;

"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center gap-4">
      <h2 className="text-xl font-semibold">Couldn&apos;t load this chat</h2>
      <p className="text-sm opacity-70 max-w-md">
        {error.message || "An unexpected error occurred while loading the page."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded-full border border-gray-500/30 text-sm hover:opacity-100 opacity-80"
      >
        Retry
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error]", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-white dark:bg-[#131314]">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm opacity-70">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2 rounded-full bg-accentBlue/20 text-accentBlue"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

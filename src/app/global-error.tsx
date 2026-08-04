"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh flex items-center justify-center bg-[#131314] text-white p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm opacity-70">
            An unexpected error occurred. You can reload the app or try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2 rounded-full bg-blue-500/30 text-blue-300"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

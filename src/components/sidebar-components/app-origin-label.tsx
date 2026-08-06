"use client";

import { useEffect, useState } from "react";

/** Shows the current origin in the sidebar footer (avoids hardcoded localhost). */
export default function AppOriginLabel() {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) return null;

  return (
    <span className="flex items-center text-xs gap-2 ml-3 mt-5 truncate max-w-[240px]">
      <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
      <p className="truncate" title={origin}>
        {origin.replace(/^https?:\/\//, "")}
      </p>
    </span>
  );
}

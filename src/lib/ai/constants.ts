/** Max characters accepted for a single user prompt / rewrite instruction. */
export const MAX_PROMPT_LENGTH = 8_000;

/** Max base64 characters for an inline image (~3MB decoded). */
export const MAX_IMAGE_BASE64_LENGTH = 4_000_000;

/** Default Gemini model used for generation endpoints. */
export const GEMINI_MODEL = "gemini-1.5-flash" as const;

/** Models exposed via the optional model picker. */
export const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number];

/** Sliding-window rate limit: max requests per user per window. */
export const RATE_LIMIT_MAX_REQUESTS = 20;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Rough token budget for prior conversation context (excludes system + new user turn).
 * ~4 chars/token heuristic — good enough for truncation decisions.
 */
export const MAX_HISTORY_TOKENS = 6_000;

/** When summarizing, keep this many most-recent turns as raw messages. */
export const RECENT_TURNS_TO_KEEP = 4;

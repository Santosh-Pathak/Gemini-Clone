/** Max characters accepted for a single user prompt / rewrite instruction. */
export const MAX_PROMPT_LENGTH = 8_000;

/** Max base64 characters for an inline image (~3MB decoded). */
export const MAX_IMAGE_BASE64_LENGTH = 4_000_000;

/** Gemini model used for all Phase-1 generation endpoints. */
export const GEMINI_MODEL = "gemini-1.5-flash";

/** Sliding-window rate limit: max requests per user per window. */
export const RATE_LIMIT_MAX_REQUESTS = 20;
export const RATE_LIMIT_WINDOW_MS = 60_000;

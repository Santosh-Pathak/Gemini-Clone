/** Map raw API / network errors to user-friendly copy. */
export function formatUserFacingAiError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Generation stopped.";
  }

  const message =
    error instanceof Error ? error.message : "Something went wrong.";

  const lower = message.toLowerCase();

  if (lower.includes("unauthorized") || lower.includes("sign in")) {
    return "Please sign in to continue.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "You're sending requests too quickly. Please wait a moment.";
  }
  if (lower.includes("api key") || lower.includes("google_api_key")) {
    return "The AI service is not configured. Try again later.";
  }
  if (lower.includes("disabled on this deployment")) {
    return message;
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error — check your connection and retry.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The model took too long to respond. Please try again.";
  }
  if (lower.includes("image is too large")) {
    return "That image is too large. Use a smaller file (under 3MB).";
  }
  if (lower.includes("empty response")) {
    return "The model returned an empty response. Try rephrasing your prompt.";
  }

  return message.length > 180 ? `${message.slice(0, 180)}…` : message;
}

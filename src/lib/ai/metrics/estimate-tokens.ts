/** Rough token proxy (~4 chars per token) when providers omit usage metadata. */
export function estimateTokensFromChars(charCount: number): number {
  if (charCount <= 0) return 0;
  return Math.max(1, Math.ceil(charCount / 4));
}

export function estimateTokensFromText(text?: string | null): number {
  return estimateTokensFromChars(text?.length ?? 0);
}

import { z } from "zod";

/** Safely evaluate basic math expressions (numbers and + - * / % parentheses). */
export function evaluateMathExpression(expression: string): number {
  const trimmed = expression.trim();
  if (!trimmed) throw new Error("Expression is empty.");

  const sanitized = trimmed.replace(/\s+/g, "");
  if (!/^[0-9+\-*/().%]+$/.test(sanitized)) {
    throw new Error("Expression contains unsupported characters.");
  }

  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${sanitized})`)();
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Expression did not produce a valid number.");
  }
  return result;
}

export const calculatorSchema = z.object({
  expression: z
    .string()
    .describe("Math expression to evaluate, e.g. (12 + 8) * 3 / 2"),
});

export async function runCalculator(input: {
  expression: string;
}): Promise<string> {
  const value = evaluateMathExpression(input.expression);
  return String(value);
}

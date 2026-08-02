import { z } from "zod";

export const doubleCheckSchema = z.object({
  queries: z
    .array(z.string().min(1))
    .min(5)
    .describe(
      "At least 5 varied Google search queries grounded in the user prompt"
    ),
});

export type DoubleCheckResult = z.infer<typeof doubleCheckSchema>;

export const rewritePromptTypes = [
  "Longer",
  "Shorter",
  "Regenerate",
  "Remove",
  "Simplify",
  "Elaborate",
  "Formalize",
  "Casual",
  "Persuasive",
  "Technical",
  "Metaphor",
  "Examples",
  "Counterargument",
  "Summary",
  "Custom",
] as const;

export type RewritePromptType = (typeof rewritePromptTypes)[number];

export const rewriteRequestSchema = z.object({
  fullResponse: z.string().min(1),
  selectedText: z.string().min(1),
  promptType: z.enum(rewritePromptTypes),
  customInstruction: z.string().optional(),
});

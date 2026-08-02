import { ChatPromptTemplate } from "@langchain/core/prompts";

export const DEFAULT_SYSTEM_INSTRUCTION = `You are a helpful Gemini-style assistant. Provide comprehensive, well-structured, and articulate answers. Respond in a friendly and natural manner. Provide a complete final response without asking unnecessary follow-up questions.`;

export const REWRITE_INSTRUCTIONS: Record<string, string> = {
  Longer: "Lengthen",
  Shorter: "Shorten",
  Regenerate: "Regenerate",
  Remove: "Remove",
  Simplify: "Simplify the language of",
  Elaborate: "Elaborate on",
  Formalize: "Rewrite in a more formal tone",
  Casual: "Rewrite in a more casual tone",
  Persuasive: "Rewrite to be more persuasive",
  Technical: "Add more technical details to",
  Metaphor: "Incorporate a relevant metaphor into",
  Examples: "Add relevant examples to",
  Counterargument: "Present a counterargument to",
  Summary: "Provide a concise summary of",
};

export const chatPromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Date: {date}

{systemInstruction}

Previous conversation turn:
User: {previousUserPrompt}
Assistant: {previousLlmResponse}`,
  ],
  ["human", "{userPrompt}"],
]);

export const rewritePromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You rewrite assistant replies. Return the entire modified response only — no preamble.",
  ],
  [
    "human",
    `This is the whole response:
{fullResponse}

Instruction: {instruction}
Focus specifically on this part: "{selectedText}"

Ensure the modified part aligns seamlessly with the rest of the response. Provide the entire modified response back, preserving essential introductory and concluding phrases without adding non-contextual information.`,
  ],
]);

export const customRewritePromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You rewrite assistant replies. Return the entire modified response only — no preamble.",
  ],
  [
    "human",
    `This is the whole response:
{fullResponse}

Custom instruction: {customInstruction}
Specifically focus on this part: "{selectedText}"

Ensure the modified part aligns seamlessly with the rest of the response. Provide the entire modified response back, preserving essential introductory and concluding phrases without adding non-contextual information.`,
  ],
]);

export const doubleCheckPromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You generate Google search queries that help fact-check or explore a user prompt. Follow the output schema exactly.",
  ],
  [
    "human",
    `Generate at least 5 different Google search queries based strictly on this user prompt. Make them relevant and varied.

User prompt:
{userPrompt}`,
  ],
]);

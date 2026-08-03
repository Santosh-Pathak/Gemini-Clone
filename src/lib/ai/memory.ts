import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  MAX_HISTORY_TOKENS,
  RECENT_TURNS_TO_KEEP,
} from "./constants";
import { contentToText, getChatModel } from "./llm";

export type ThreadTurn = {
  userPrompt?: string | null;
  llmResponse?: string | null;
};

export type PreparedMemory = {
  history: BaseMessage[];
  summary: string | null;
  turnCount: number;
  recentTurnCount: number;
  didSummarize: boolean;
  summaryToPersist: string | null;
};

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateTurnTokens(turn: ThreadTurn): number {
  return (
    estimateTokens(turn.userPrompt || "") +
    estimateTokens(turn.llmResponse || "")
  );
}

export function turnsToMessages(turns: ThreadTurn[]): BaseMessage[] {
  const messages: BaseMessage[] = [];
  for (const turn of turns) {
    const user = turn.userPrompt?.trim();
    const assistant = turn.llmResponse?.trim();
    if (user) messages.push(new HumanMessage(user));
    if (assistant) messages.push(new AIMessage(assistant));
  }
  return messages;
}

function formatTurnsForSummary(turns: ThreadTurn[]): string {
  return turns
    .map((turn, i) => {
      const parts = [`Turn ${i + 1}:`];
      if (turn.userPrompt?.trim()) {
        parts.push(`User: ${turn.userPrompt.trim()}`);
      }
      if (turn.llmResponse?.trim()) {
        parts.push(`Assistant: ${turn.llmResponse.trim()}`);
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

const summaryPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You maintain a concise running summary of a chat thread for future context. Capture decisions, facts, user preferences, and open questions. Do not invent details. Output plain prose only (no bullets required).",
  ],
  [
    "human",
    `Existing summary (may be empty):
{existingSummary}

Older conversation turns to fold in:
{olderTurns}

Write an updated summary (max ~250 words):`,
  ],
]);

export async function summarizeOlderTurns(input: {
  existingSummary?: string | null;
  olderTurns: ThreadTurn[];
}): Promise<string> {
  if (input.olderTurns.length === 0) {
    return input.existingSummary?.trim() || "";
  }

  const model = getChatModel({
    temperature: 0.2,
    streaming: false,
  });
  const chain = summaryPrompt.pipe(model);
  const result = await chain.invoke({
    existingSummary: input.existingSummary?.trim() || "(none)",
    olderTurns: formatTurnsForSummary(input.olderTurns),
  });
  return contentToText(result.content).trim();
}

/**
 * Build token-aware memory: keep recent raw turns; summarize older ones when over budget.
 */
export async function prepareConversationMemory(input: {
  turns: ThreadTurn[];
  existingSummary?: string | null;
}): Promise<PreparedMemory> {
  const turns = input.turns.filter(
    (t) => t.userPrompt?.trim() || t.llmResponse?.trim()
  );
  const turnCount = turns.length;
  const existingSummary = input.existingSummary?.trim() || null;

  if (turnCount === 0) {
    return {
      history: [],
      summary: existingSummary,
      turnCount: 0,
      recentTurnCount: 0,
      didSummarize: false,
      summaryToPersist: null,
    };
  }

  const historyTokens =
    turns.reduce((sum, t) => sum + estimateTurnTokens(t), 0) +
    estimateTokens(existingSummary || "");

  // Fits in budget — use full thread (+ existing summary if present).
  if (historyTokens <= MAX_HISTORY_TOKENS) {
    return {
      history: turnsToMessages(turns),
      summary: existingSummary,
      turnCount,
      recentTurnCount: turnCount,
      didSummarize: false,
      summaryToPersist: null,
    };
  }

  // Over budget — keep recent raw turns, summarize the rest.
  const recentTurns = turns.slice(-RECENT_TURNS_TO_KEEP);
  const olderTurns = turns.slice(0, Math.max(0, turns.length - RECENT_TURNS_TO_KEEP));

  let summary = existingSummary;
  let didSummarize = false;
  let summaryToPersist: string | null = null;

  if (olderTurns.length > 0) {
    summary = await summarizeOlderTurns({
      existingSummary,
      olderTurns,
    });
    didSummarize = true;
    summaryToPersist = summary || null;
  }

  return {
    history: turnsToMessages(recentTurns),
    summary,
    turnCount,
    recentTurnCount: recentTurns.length,
    didSummarize,
    summaryToPersist,
  };
}

export function buildMemorySystemBlock(summary: string | null): string {
  if (!summary?.trim()) return "";
  return `Conversation summary (earlier turns):\n${summary.trim()}`;
}

export function buildSystemMessage(input: {
  systemInstruction: string;
  summary?: string | null;
}): SystemMessage {
  const date = new Date().toISOString().split("T")[0];
  const memoryBlock = buildMemorySystemBlock(input.summary ?? null);
  const content = [
    `Date: ${date}`,
    "",
    input.systemInstruction,
    memoryBlock ? `\n${memoryBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return new SystemMessage(content);
}

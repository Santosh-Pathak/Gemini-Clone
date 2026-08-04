import { DynamicStructuredTool } from "@langchain/core/tools";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import { runCalculator } from "./calculator";
import { getCurrentDatetime } from "./datetime";
import { runWebSearch } from "./web-search";
import { listRecentChatsForUser } from "./list-recent-chats";

export function createAgentTools(userId: string): StructuredToolInterface[] {
  const calculator = new DynamicStructuredTool({
    name: "calculator",
    description:
      "Evaluate a math expression and return the numeric result. Use for arithmetic or percentages.",
    schema: z.object({
      expression: z.string(),
    }),
    func: async ({ expression }: { expression: string }) =>
      runCalculator({ expression }),
  });

  const datetime = new DynamicStructuredTool({
    name: "get_current_datetime",
    description:
      "Get the current date and time, optionally for a specific IANA timezone.",
    schema: z.object({
      timezone: z.string().optional(),
    }),
    func: async ({ timezone }: { timezone?: string }) =>
      getCurrentDatetime({ timezone }),
  });

  const webSearch = new DynamicStructuredTool({
    name: "web_search",
    description:
      "Search the web for up-to-date facts, news, or definitions. Returns short snippets and links.",
    schema: z.object({
      query: z.string(),
    }),
    func: async ({ query }: { query: string }) => runWebSearch({ query }),
  });

  const listChats = new DynamicStructuredTool({
    name: "list_recent_chats",
    description:
      "List the user's recent Gemini chat threads from this app, including titles and last reply snippets.",
    schema: z.object({
      limit: z.number().int().min(1).max(10).optional(),
    }),
    func: async ({ limit }: { limit?: number }) =>
      listRecentChatsForUser(userId, limit ?? 5),
  });

  return [calculator, datetime, webSearch, listChats];
}

export type AgentTool = StructuredToolInterface;

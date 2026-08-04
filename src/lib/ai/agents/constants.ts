/** Max tool-calling rounds before forcing a final answer. */
export const AGENT_MAX_ITERATIONS = 5;

export const AGENT_TOOL_LABELS: Record<string, string> = {
  calculator: "Calculating",
  get_current_datetime: "Getting date & time",
  web_search: "Searching the web",
  list_recent_chats: "Listing your recent chats",
};

export function agentToolLabel(toolName: string): string {
  return AGENT_TOOL_LABELS[toolName] ?? `Running ${toolName}`;
}

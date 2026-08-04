import type { AgentStep } from "@/types/types";

export type AgentStreamEvent =
  | { type: "step"; step: AgentStep }
  | { type: "text"; delta: string; accumulated: string }
  | { type: "done"; agentSteps: AgentStep[] }
  | { type: "error"; message: string };

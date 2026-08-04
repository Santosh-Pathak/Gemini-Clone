"use client";

import type { AgentStep } from "@/types/types";
import type { AgentStreamEvent } from "@/lib/ai/agents/stream-events";

export type AgentStreamResult = {
  text: string;
  agentSteps: AgentStep[];
};

export async function readAgentStream(
  response: Response,
  handlers: {
    onStep?: (step: AgentStep) => void;
    onText?: (accumulated: string) => void;
  },
  signal?: AbortSignal
): Promise<AgentStreamResult> {
  if (!response.body) {
    throw new Error("Empty agent stream body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let agentSteps: AgentStep[] = [];

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as AgentStreamEvent;

        if (event.type === "step") {
          handlers.onStep?.(event.step);
          if (event.step.status !== "running") {
            const idx = agentSteps.findIndex(
              (s) => s.tool === event.step.tool && s.status === "running"
            );
            if (idx >= 0) agentSteps[idx] = event.step;
            else agentSteps.push(event.step);
          } else {
            agentSteps = [...agentSteps, event.step];
          }
        }

        if (event.type === "text") {
          text = event.accumulated;
          handlers.onText?.(text);
        }

        if (event.type === "done") {
          agentSteps = event.agentSteps;
        }

        if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { text, agentSteps };
}

import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { AgentStep } from "@/types/types";
import { contentToText, getChatModel } from "../llm";
import type { GeminiModelId } from "../constants";
import {
  buildSystemMessage,
  type PreparedMemory,
} from "../memory";
import { createAgentTools } from "../tools";
import { AGENT_MAX_ITERATIONS, agentToolLabel } from "./constants";
import type { AgentStreamEvent } from "./stream-events";

export type { AgentStreamEvent } from "./stream-events";

const AGENT_SYSTEM = `You are a helpful Gemini-style assistant with access to tools.
Use tools when they improve accuracy (math, current time, web facts, user's recent chats).
After tool results arrive, synthesize one clear final answer for the user.
Do not call tools unnecessarily for simple conversational replies.`;

function logAgentToolUse(input: {
  userId: string;
  tool: string;
  latencyMs: number;
  ok: boolean;
}) {
  console.info("[agent]", {
    userId: input.userId.slice(-6),
    tool: input.tool,
    latencyMs: input.latencyMs,
    ok: input.ok,
  });
}

export async function* runAgentStream(input: {
  userId: string;
  userPrompt: string;
  memory: PreparedMemory;
  model?: GeminiModelId;
}): AsyncGenerator<AgentStreamEvent> {
  const tools = createAgentTools(input.userId);
  const toolByName = Object.fromEntries(tools.map((t) => [t.name, t]));

  const baseModel = getChatModel({
    model: input.model,
    temperature: 0.3,
    streaming: false,
  });
  const model = baseModel.bindTools(tools);

  const system = buildSystemMessage({
    systemInstruction: AGENT_SYSTEM,
    summary: input.memory.summary,
  });

  const messages: BaseMessage[] = [
    system,
    ...input.memory.history,
    new HumanMessage(input.userPrompt),
  ];

  const completedSteps: AgentStep[] = [];

  for (let iteration = 0; iteration < AGENT_MAX_ITERATIONS; iteration += 1) {
    const response = (await model.invoke(messages)) as AIMessage;
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const text = contentToText(response.content);
      if (text) {
        yield { type: "text", delta: text, accumulated: text };
      }
      yield { type: "done", agentSteps: completedSteps };
      return;
    }

    messages.push(response);

    for (const call of toolCalls) {
      const toolName = call.name;
      const label = agentToolLabel(toolName);

      const runningStep: AgentStep = {
        tool: toolName,
        label,
        status: "running",
      };
      yield { type: "step", step: runningStep };

      const started = Date.now();
      try {
        const selected = toolByName[toolName];
        if (!selected) throw new Error(`Unknown tool: ${toolName}`);

        const result = await selected.invoke(call.args as Record<string, unknown>);
        const latencyMs = Date.now() - started;
        const preview = String(result).slice(0, 160);

        const doneStep: AgentStep = {
          tool: toolName,
          label,
          status: "done",
          latencyMs,
          preview,
        };
        completedSteps.push(doneStep);
        yield { type: "step", step: doneStep };
        logAgentToolUse({ userId: input.userId, tool: toolName, latencyMs, ok: true });

        messages.push(
          new ToolMessage({
            content: String(result),
            tool_call_id: call.id ?? `${toolName}-${iteration}`,
            name: toolName,
          })
        );
      } catch (error) {
        const latencyMs = Date.now() - started;
        const message =
          error instanceof Error ? error.message : "Tool execution failed";
        const errorStep: AgentStep = {
          tool: toolName,
          label,
          status: "error",
          latencyMs,
          preview: message,
        };
        completedSteps.push(errorStep);
        yield { type: "step", step: errorStep };
        logAgentToolUse({ userId: input.userId, tool: toolName, latencyMs, ok: false });

        messages.push(
          new ToolMessage({
            content: `Error: ${message}`,
            tool_call_id: call.id ?? `${toolName}-${iteration}`,
            name: toolName,
          })
        );
      }
    }
  }

  yield {
    type: "error",
    message: "Agent reached the maximum number of tool iterations.",
  };
}

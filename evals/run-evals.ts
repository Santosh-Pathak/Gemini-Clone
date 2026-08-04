import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentToText } from "../src/lib/ai/llm";
import { streamChatReply } from "../src/lib/ai/chains/chat";
import {
  scoreEvalResponse,
  type EvalCase,
  type EvalScore,
} from "./score-response";

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptsPath = join(__dirname, "prompts.json");
const resultsDir = join(__dirname, "results");

async function collectStreamText(
  stream: AsyncIterable<{ content: unknown }>
): Promise<string> {
  let text = "";
  for await (const chunk of stream) {
    text += contentToText(chunk.content);
  }
  return text.trim();
}

async function runCase(evalCase: EvalCase): Promise<EvalScore> {
  const startedAt = Date.now();
  const stream = await streamChatReply({ userPrompt: evalCase.prompt });
  const response = await collectStreamText(stream);
  return scoreEvalResponse(evalCase, response, Date.now() - startedAt);
}

async function main() {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("GOOGLE_API_KEY is required to run evals.");
    process.exit(1);
  }

  const cases = JSON.parse(readFileSync(promptsPath, "utf8")) as EvalCase[];
  console.log(`Running ${cases.length} eval cases...\n`);

  const results: EvalScore[] = [];
  for (const evalCase of cases) {
    process.stdout.write(`• ${evalCase.id} ... `);
    try {
      const result = await runCase(evalCase);
      results.push(result);
      console.log(result.passed ? "PASS" : `FAIL (${result.score.toFixed(2)})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results.push({
        id: evalCase.id,
        passed: false,
        score: 0,
        reasons: [message],
        responsePreview: "",
        latencyMs: 0,
      });
      console.log(`ERROR (${message})`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / Math.max(results.length, 1);
  const avgLatency =
    results.reduce((sum, r) => sum + r.latencyMs, 0) /
    Math.max(results.length, 1);

  const summary = {
    ranAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: passed / Math.max(results.length, 1),
    avgScore,
    avgLatencyMs: Math.round(avgLatency),
    results,
  };

  mkdirSync(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(resultsDir, `eval-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log("\n--- Summary ---");
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Pass rate: ${(summary.passRate * 100).toFixed(1)}%`);
  console.log(`Avg score: ${avgScore.toFixed(2)}`);
  console.log(`Avg latency: ${summary.avgLatencyMs}ms`);
  console.log(`Report: ${outPath}`);

  if (passed < results.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

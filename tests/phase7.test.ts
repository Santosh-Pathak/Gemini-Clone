import test from "node:test";
import assert from "node:assert/strict";
import { splitIntoChunks } from "../src/lib/ai/rag/chunking";
import { doubleCheckSchema, rewriteRequestSchema } from "../src/lib/ai/schemas";
import { evaluateMathExpression } from "../src/lib/ai/tools/calculator";
import { rateLimit } from "../src/lib/ai/rate-limit";
import { hashUserId } from "../src/lib/ai/metrics/hash-user-id";
import { scoreEvalResponse, type EvalCase } from "../evals/score-response";

test("splitIntoChunks returns non-empty chunks", async () => {
  const text = "alpha ".repeat(300).trim();
  const chunks = await splitIntoChunks(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.trim().length > 0));
});

test("doubleCheckSchema validates query arrays", () => {
  const parsed = doubleCheckSchema.safeParse({
    queries: ["a", "b", "c", "d", "e"],
  });
  assert.equal(parsed.success, true);

  const invalid = doubleCheckSchema.safeParse({ queries: ["only-one"] });
  assert.equal(invalid.success, false);
});

test("rewriteRequestSchema requires custom instruction for Custom type", () => {
  const missing = rewriteRequestSchema.safeParse({
    fullResponse: "Hello world",
    selectedText: "world",
    promptType: "Custom",
  });
  assert.equal(missing.success, true);

  const parsed = rewriteRequestSchema.safeParse({
    fullResponse: "Hello world",
    selectedText: "world",
    promptType: "Shorter",
  });
  assert.equal(parsed.success, true);
});

test("evaluateMathExpression handles basic arithmetic", () => {
  assert.equal(evaluateMathExpression("(12 + 8) * 3"), 60);
  assert.equal(evaluateMathExpression("15 % 4"), 3);
});

test("rateLimit enforces sliding window", () => {
  const key = `test-${Date.now()}`;
  const first = rateLimit(key, 2, 60_000);
  const second = rateLimit(key, 2, 60_000);
  const third = rateLimit(key, 2, 60_000);
  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(third.success, false);
});

test("hashUserId returns stable short hash", () => {
  const a = hashUserId("user-123");
  const b = hashUserId("user-123");
  const c = hashUserId("user-456");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 16);
});

test("scoreEvalResponse applies rubric traits", () => {
  const evalCase: EvalCase = {
    id: "sample",
    category: "test",
    prompt: "test",
    traits: {
      mustInclude: ["Paris"],
      minLength: 5,
    },
  };
  const pass = scoreEvalResponse(evalCase, "The capital is Paris.", 120);
  const fail = scoreEvalResponse(evalCase, "Nope.", 120);
  assert.equal(pass.passed, true);
  assert.equal(fail.passed, false);
});

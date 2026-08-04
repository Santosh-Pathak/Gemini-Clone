export type EvalTraits = {
  mustInclude?: string[];
  mustIncludeAny?: string[];
  mustNotInclude?: string[];
  minLength?: number;
  maxLength?: number;
};

export type EvalCase = {
  id: string;
  category: string;
  prompt: string;
  traits: EvalTraits;
};

export type EvalScore = {
  id: string;
  passed: boolean;
  score: number;
  reasons: string[];
  responsePreview: string;
  latencyMs: number;
};

function includesAll(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.every((term) => lower.includes(term.toLowerCase()));
}

function includesAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function excludesAll(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.every((term) => !lower.includes(term.toLowerCase()));
}

/** Rubric scoring: 1 point per satisfied trait, normalized to 0–1. */
export function scoreEvalResponse(
  evalCase: EvalCase,
  response: string,
  latencyMs: number
): EvalScore {
  const reasons: string[] = [];
  let earned = 0;
  let total = 0;
  const text = response.trim();

  const { traits } = evalCase;

  if (traits.minLength !== undefined) {
    total += 1;
    if (text.length >= traits.minLength) {
      earned += 1;
    } else {
      reasons.push(`Expected min length ${traits.minLength}, got ${text.length}`);
    }
  }

  if (traits.maxLength !== undefined) {
    total += 1;
    if (text.length <= traits.maxLength) {
      earned += 1;
    } else {
      reasons.push(`Expected max length ${traits.maxLength}, got ${text.length}`);
    }
  }

  if (traits.mustInclude?.length) {
    total += 1;
    if (includesAll(text, traits.mustInclude)) {
      earned += 1;
    } else {
      reasons.push(`Missing required terms: ${traits.mustInclude.join(", ")}`);
    }
  }

  if (traits.mustIncludeAny?.length) {
    total += 1;
    if (includesAny(text, traits.mustIncludeAny)) {
      earned += 1;
    } else {
      reasons.push(
        `Missing any of: ${traits.mustIncludeAny.join(", ")}`
      );
    }
  }

  if (traits.mustNotInclude?.length) {
    total += 1;
    if (excludesAll(text, traits.mustNotInclude)) {
      earned += 1;
    } else {
      reasons.push(
        `Should not include: ${traits.mustNotInclude.join(", ")}`
      );
    }
  }

  if (total === 0) {
    total = 1;
    earned = text.length > 0 ? 1 : 0;
    if (!text.length) reasons.push("Empty response");
  }

  const score = earned / total;
  return {
    id: evalCase.id,
    passed: score >= 0.999,
    score,
    reasons,
    responsePreview: text.slice(0, 180),
    latencyMs,
  };
}

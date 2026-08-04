export type FeatureFlags = {
  agent: boolean;
  rag: boolean;
  vision: boolean;
};

function envFlag(name: string, defaultEnabled = true): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultEnabled;
  return !["0", "false", "off", "no"].includes(value.toLowerCase());
}

/** Server-side feature toggles for demos and staged rollouts. */
export function getFeatureFlags(): FeatureFlags {
  return {
    agent: envFlag("FEATURE_AGENT_ENABLED"),
    rag: envFlag("FEATURE_RAG_ENABLED"),
    vision: envFlag("FEATURE_VISION_ENABLED"),
  };
}

export function assertFeatureEnabled(
  flag: keyof FeatureFlags,
  label: string
): { error?: string } {
  const flags = getFeatureFlags();
  if (!flags[flag]) {
    return { error: `${label} is disabled on this deployment.` };
  }
  return {};
}

export const CLAUDE_MODELS = [
  { id: "claude-opus-4-7", label: "Opus 7" },
  { id: "claude-sonnet-4-6", label: "Sonnet 6" },
  { id: "claude-haiku-4-5", label: "Haiku 6" },
] as const;

export const CLAUDE_MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  "claude-opus-4-7": 128000,
  "claude-sonnet-4-6": 64000,
  "claude-haiku-4-5": 64000,
};

export const CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS = 64000;

/** God Mode slider ceiling (clamped server-side to provider limits). */
export const CLAUDE_GODMODE_MAX_OUTPUT_CAP = 64000;

// Cost in USD per 1M tokens (input / output).
export const CLAUDE_MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "claude-opus-4-7":   { inputPer1M: 15.00, outputPer1M: 75.00 },
  "claude-sonnet-4-6": { inputPer1M: 3.00,  outputPer1M: 15.00 },
  "claude-haiku-4-5":  { inputPer1M: 0.80,  outputPer1M: 4.00  },
};

const ALLOWED = new Set<string>(CLAUDE_MODELS.map((m) => m.id));

export function isAllowedClaudeModel(model: string): boolean {
  return ALLOWED.has(model);
}

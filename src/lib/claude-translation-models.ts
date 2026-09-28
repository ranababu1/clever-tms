// Fallback model list shown before the live Anthropic catalog has been fetched (no API key
// yet, or /api/claude-models failed). Kept in the same shape as the dynamic models returned
// by that route — see ModelCardInfo in ModelInfoModal.tsx.
//
// Current generation as of 2026-09: Opus 5.5, Sonnet 5, Haiku 4.5 (Opus 5.5 is in its launch
// window — confirm against platform.claude.com/docs/en/models/overview if pricing looks stale).
export const FALLBACK_CLAUDE_MODELS: {
  id: string;
  label: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  badge: string;
  pricing: { inputPer1M: number; outputPer1M: number };
}[] = [
  {
    id: "claude-opus-5-5",
    label: "Claude Opus 5.5",
    inputTokenLimit: 1_000_000,
    outputTokenLimit: 128_000,
    badge: "Opus",
    pricing: { inputPer1M: 4.0, outputPer1M: 20.0 },
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    inputTokenLimit: 1_000_000,
    outputTokenLimit: 128_000,
    badge: "Sonnet",
    pricing: { inputPer1M: 2.0, outputPer1M: 10.0 },
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    inputTokenLimit: 200_000,
    outputTokenLimit: 64_000,
    badge: "Haiku",
    pricing: { inputPer1M: 1.0, outputPer1M: 5.0 },
  },
];

export const CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS = 64000;

/** God Mode slider ceiling (clamped server-side to provider limits). */
export const CLAUDE_GODMODE_MAX_OUTPUT_CAP = 128000;

// Cost in USD per 1M tokens (input / output), exact-id overrides for the dynamic catalog.
export const CLAUDE_MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "claude-opus-5-5":  { inputPer1M: 4.00,  outputPer1M: 20.00 },
  "claude-sonnet-5":  { inputPer1M: 2.00,  outputPer1M: 10.00 },
  "claude-haiku-4-5": { inputPer1M: 1.00,  outputPer1M: 5.00  },
};

// Model ids are validated by shape (claude-<family>-<version>) rather than an exact allowlist,
// since the family's model catalog is now fetched live and its ids change over time.
const MODEL_ID_PATTERN = /^claude-(opus|sonnet|haiku)-\d/i;

export function isAllowedClaudeModel(model: string): boolean {
  return MODEL_ID_PATTERN.test(model);
}

// Claude Sonnet 5, Opus 5, and Opus 5.5 reject temperature/top_p/top_k entirely (400) — Claude
// decides sampling itself on these models. Only Haiku 4.5 (and legacy pre-5-generation models,
// which the dynamic catalog no longer surfaces but could still be requested directly) still
// accept them. Check this before putting `temperature`/`top_k` on an Anthropic request.
export function supportsSamplingParams(model: string): boolean {
  return !/^claude-(opus|sonnet)-5/i.test(model);
}

export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

// The flip side of supportsSamplingParams: Opus 5 / Opus 5.5 / Sonnet 5 support the modern
// `output_config.effort` lever (their replacement for temperature/top_k); Haiku 4.5 rejects it
// outright (400). Check this before putting `output_config.effort` on an Anthropic request.
export function supportsEffort(model: string): boolean {
  return /^claude-(opus|sonnet)-5/i.test(model);
}

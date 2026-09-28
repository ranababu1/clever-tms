import { CLAUDE_MODEL_PRICING } from "@/lib/claude-translation-models";

export interface ClaudeModelInfo {
  id: string;
  label: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  badge: string;
  pricing: { inputPer1M: number; outputPer1M: number };
}

type Family = "opus" | "sonnet" | "haiku";

const FAMILY_ORDER: Family[] = ["opus", "sonnet", "haiku"];

// Anthropic's models API doesn't return context window / max-output / pricing — these are
// published in their docs, not the API. Fall back to these per-family defaults (current
// generation: Opus 5.5 / Sonnet 5 / Haiku 4.5) for any model id not present in the exact-match
// pricing table above.
const FAMILY_INPUT_TOKEN_LIMIT: Record<Family, number> = {
  opus: 1_000_000,
  sonnet: 1_000_000,
  haiku: 200_000,
};
const FAMILY_OUTPUT_TOKEN_LIMIT: Record<Family, number> = {
  opus: 128_000,
  sonnet: 128_000,
  haiku: 64_000,
};
const FAMILY_PRICING: Record<Family, { inputPer1M: number; outputPer1M: number }> = {
  opus: { inputPer1M: 4.0, outputPer1M: 20.0 },
  sonnet: { inputPer1M: 2.0, outputPer1M: 10.0 },
  haiku: { inputPer1M: 1.0, outputPer1M: 5.0 },
};

function detectFamily(id: string): Family | null {
  if (/opus/i.test(id)) return "opus";
  if (/sonnet/i.test(id)) return "sonnet";
  if (/haiku/i.test(id)) return "haiku";
  return null;
}

function toDisplayLabel(id: string, displayName?: string): string {
  if (displayName && displayName.trim()) return displayName.trim();
  return id
    .replace(/^claude-/, "Claude ")
    .split("-")
    .map((part) => (/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

/**
 * Fetches the live Anthropic model catalog and narrows it down to the most recent model in
 * each of the three chat-model families (Opus, Sonnet, Haiku) — 3 models total. Anthropic's
 * List Models API only returns id/display_name/created_at, so token limits and pricing are
 * filled in from a per-family default table (exact-id overrides take priority where known).
 */
export async function fetchClaudeModels(apiKey: string): Promise<ClaudeModelInfo[]> {
  const response = await fetch("https://api.anthropic.com/v1/models?limit=1000", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!response.ok) {
    throw new Error(`Anthropic models API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: { id: string; display_name?: string; created_at?: string }[];
  };
  const items = data.data ?? [];

  const mostRecentByFamily = new Map<Family, { id: string; displayName?: string; createdAt: number }>();

  for (const item of items) {
    const id = item.id;
    if (!id?.startsWith("claude-")) continue;
    const family = detectFamily(id);
    if (!family) continue;

    const createdAt = item.created_at ? Date.parse(item.created_at) : 0;
    const existing = mostRecentByFamily.get(family);
    if (!existing || createdAt > existing.createdAt) {
      mostRecentByFamily.set(family, { id, displayName: item.display_name, createdAt });
    }
  }

  return FAMILY_ORDER.filter((family) => mostRecentByFamily.has(family)).map((family) => {
    const match = mostRecentByFamily.get(family)!;
    return {
      id: match.id,
      label: toDisplayLabel(match.id, match.displayName),
      inputTokenLimit: FAMILY_INPUT_TOKEN_LIMIT[family],
      outputTokenLimit: FAMILY_OUTPUT_TOKEN_LIMIT[family],
      badge: family.charAt(0).toUpperCase() + family.slice(1),
      pricing: CLAUDE_MODEL_PRICING[match.id] ?? FAMILY_PRICING[family],
    };
  });
}

import { getGeminiClient } from "@/lib/gemini-client";

export interface GeminiModelInfo {
  id: string;
  label: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  isPro: boolean;
}

// Google's "-latest" aliases always point at whichever model in that tier is current, so the
// dropdown never needs a code change when Google ships a new Flash/Pro build. Labels are
// fixed text (not the API's displayName, which just echoes the alias) — update them by hand
// when the alias moves to a new underlying model.
const MODEL_ALIASES: { id: string; label: string; isPro: boolean }[] = [
  { id: "gemini-pro-latest", label: "Gemini 3.1 Pro", isPro: true },
  { id: "gemini-flash-latest", label: "Gemini 3.8 Flash", isPro: false },
  { id: "gemini-flash-lite-latest", label: "Gemini 3.5 Flash Lite", isPro: false },
];

/**
 * Fetches token limits for the fixed set of Gemini "-latest" aliases (Pro / Flash / Flash
 * Lite). Each alias is resolved individually via `models.get` rather than scanning the whole
 * catalog — we already know exactly which 3 ids we want.
 */
export async function fetchGeminiModels(apiKey: string): Promise<GeminiModelInfo[]> {
  const ai = getGeminiClient(apiKey);

  const results = await Promise.all(
    MODEL_ALIASES.map(async (alias) => {
      try {
        const model = await ai.models.get({ model: alias.id });
        if (!model.inputTokenLimit || !model.outputTokenLimit) return null;
        return {
          id: alias.id,
          label: alias.label,
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit,
          isPro: alias.isPro,
        };
      } catch {
        // One alias failing (e.g. temporarily renamed) shouldn't take down the other two.
        return null;
      }
    })
  );

  return results.filter((m): m is GeminiModelInfo => m !== null);
}

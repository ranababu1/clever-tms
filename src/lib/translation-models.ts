// Targets with a hand-written, language-tuned prompt (see translation-system-prompt.ts). Any
// other target silently falls back to the German template with the language name substituted —
// used to flag those languages differently in the "To" dropdown.
export const LANGUAGES_WITH_PROMPT = ["de", "tr", "vi"] as const;

export function hasDedicatedPrompt(langCode: string): boolean {
  return (LANGUAGES_WITH_PROMPT as readonly string[]).includes(langCode);
}

export const LANGUAGE_NAMES: Record<string, string> = {
  auto: "auto-detected language",
  ar: "Arabic",
  en: "English",
  fr: "French",
  de: "German",
  el: "Greek",
  ja: "Japanese",
  zh: "Mandarin Chinese",
  pt: "Portuguese",
  es: "Spanish",
  tr: "Turkish",
  vi: "Vietnamese",
};

// Fallback model list shown before the live Gemini catalog has been fetched (e.g. no API key
// set yet, or the /api/models call failed). Mirrors the 3 "-latest" aliases /api/models
// resolves — see gemini-models.ts.
export const FALLBACK_MODELS: {
  id: string;
  label: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  isPro: boolean;
}[] = [
  { id: "gemini-pro-latest", label: "Gemini 3.1 Pro", inputTokenLimit: 1_048_576, outputTokenLimit: 65_536, isPro: true },
  { id: "gemini-flash-latest", label: "Gemini 3.8 Flash", inputTokenLimit: 1_048_576, outputTokenLimit: 65_536, isPro: false },
  { id: "gemini-flash-lite-latest", label: "Gemini 3.5 Flash Lite", inputTokenLimit: 1_048_576, outputTokenLimit: 65_536, isPro: false },
];

export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

// Cost in USD per 1M tokens (input / output). Best-effort — omit for models with unknown/unpublished pricing.
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gemini-pro-latest": { inputPer1M: 1.25, outputPer1M: 10.00 },
  "gemini-flash-latest": { inputPer1M: 0.30, outputPer1M: 2.50 },
  "gemini-flash-lite-latest": { inputPer1M: 0.10, outputPer1M: 0.40 },
};

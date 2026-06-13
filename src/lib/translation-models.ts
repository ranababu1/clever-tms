export const LANGUAGE_NAMES: Record<string, string> = {
  auto: "auto-detected language",
  es: "Spanish",
  pt: "Portuguese",
  tr: "Turkish",
  de: "German",
  vi: "Vietnamese",
  en: "English",
};

export const MODELS = [
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
] as const;

export const MODEL_LIMITS: Record<string, { inputTokens: number; outputTokens: number }> = {
  "gemini-3.1-pro-preview": { inputTokens: 1_048_576, outputTokens: 65_536 },
  "gemini-3.5-flash": { inputTokens: 1_048_576, outputTokens: 65_536 },
  "gemini-3-flash-preview": { inputTokens: 1_048_576, outputTokens: 65_536 },
  "gemini-3.1-flash-lite": { inputTokens: 1_048_576, outputTokens: 65_536 },
  "gemini-2.5-pro": { inputTokens: 1_048_576, outputTokens: 65_536 },
  "gemini-2.5-flash": { inputTokens: 1_048_576, outputTokens: 65_536 },
};

export const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  "gemini-3.1-pro-preview": 65536,
  "gemini-3.5-flash": 65536,
  "gemini-3-flash-preview": 65536,
  "gemini-3.1-flash-lite": 65536,
  "gemini-2.5-pro": 65536,
  "gemini-2.5-flash": 65536,
};

export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

// Cost in USD per 1M tokens (input / output). Optional — omit for models with unknown pricing.
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gemini-3.1-pro-preview": { inputPer1M: 1.25, outputPer1M: 10.00 },
  "gemini-3.5-flash": { inputPer1M: 0.30, outputPer1M: 2.50 },
  "gemini-3-flash-preview": { inputPer1M: 0.30, outputPer1M: 2.50 },
  "gemini-3.1-flash-lite": { inputPer1M: 0.10, outputPer1M: 0.40 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10.00 },
  "gemini-2.5-flash": { inputPer1M: 0.30, outputPer1M: 2.50 },
};

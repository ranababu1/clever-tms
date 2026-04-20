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
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite (Preview)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "gemini-flash-latest", label: "Gemini Flash (Latest)" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
] as const;

export const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  "gemini-2.0-flash": 8192,
  "gemini-2.5-flash": 65536,
  "gemini-3.1-flash-lite-preview": 65536,
  "gemini-3.1-pro-preview": 65536,
  "gemini-3-flash-preview": 65536,
  "gemini-flash-latest": 65536,
  "gemini-3-pro-preview": 65536,
};

export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

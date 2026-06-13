import { GERMAN_PROMPT_TEMPLATE, buildGermanSystemPrompt } from "@/lib/translation-system-prompt-de";
import { TURKISH_PROMPT_TEMPLATE, buildTurkishSystemPrompt } from "@/lib/translation-system-prompt-tr";
import { VIETNAMESE_PROMPT_TEMPLATE, buildVietnameseSystemPrompt } from "@/lib/translation-system-prompt-vi";

export { GERMAN_PROMPT_TEMPLATE, TURKISH_PROMPT_TEMPLATE, VIETNAMESE_PROMPT_TEMPLATE };

const PROMPT_BUILDERS: Record<string, (sourceLang: string) => string> = {
  de: buildGermanSystemPrompt,
  tr: buildTurkishSystemPrompt,
  vi: buildVietnameseSystemPrompt,
};

export function getPromptTemplateForLang(targetLang: string): string {
  if (targetLang === "tr") return TURKISH_PROMPT_TEMPLATE;
  if (targetLang === "vi") return VIETNAMESE_PROMPT_TEMPLATE;
  return GERMAN_PROMPT_TEMPLATE;
}

export function buildTranslationSystemPrompt(sourceLang: string, targetLang: string): string {
  const builder = PROMPT_BUILDERS[targetLang] ?? buildGermanSystemPrompt;
  return builder(sourceLang);
}

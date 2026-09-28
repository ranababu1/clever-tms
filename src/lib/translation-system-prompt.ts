import { GERMAN_PROMPT_TEMPLATE, buildGermanSystemPrompt } from "@/lib/translation-system-prompt-de";
import { TURKISH_PROMPT_TEMPLATE, buildTurkishSystemPrompt } from "@/lib/translation-system-prompt-tr";
import { VIETNAMESE_PROMPT_TEMPLATE, buildVietnameseSystemPrompt } from "@/lib/translation-system-prompt-vi";
import { LANGUAGE_NAMES } from "@/lib/translation-models";

export { GERMAN_PROMPT_TEMPLATE, TURKISH_PROMPT_TEMPLATE, VIETNAMESE_PROMPT_TEMPLATE };

const PROMPT_BUILDERS: Record<string, (sourceLang: string) => string> = {
  de: buildGermanSystemPrompt,
  tr: buildTurkishSystemPrompt,
  vi: buildVietnameseSystemPrompt,
};

// Only these targets have a hand-written, language-tuned prompt.
const PROMPT_TEMPLATES: Record<string, string> = {
  de: GERMAN_PROMPT_TEMPLATE,
  tr: TURKISH_PROMPT_TEMPLATE,
  vi: VIETNAMESE_PROMPT_TEMPLATE,
};

// Used by God Mode's editable System Prompt textarea (initial value + "Reset"). For a target
// language with no dedicated template, this returns a placeholder rather than silently reusing
// another language's prompt — God Mode users are expected to write their own from here.
export function getPromptTemplateForLang(targetLang: string): string {
  const template = PROMPT_TEMPLATES[targetLang];
  if (template) return template;
  const languageName = LANGUAGE_NAMES[targetLang] || targetLang;
  return `No predefined prompt for ${languageName} yet. You can write your own here — it will be sent as-is (the code/markup preservation rules are still appended automatically and aren't editable).`;
}

export function buildTranslationSystemPrompt(sourceLang: string, targetLang: string): string {
  const builder = PROMPT_BUILDERS[targetLang] ?? buildGermanSystemPrompt;
  return builder(sourceLang);
}

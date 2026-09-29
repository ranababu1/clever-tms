import {
  GERMAN_PROMPT_TEMPLATE,
  GERMAN_TWO_PHASE_OUTPUT_FORMAT,
  buildGermanSystemPrompt,
} from "@/lib/translation-system-prompt-de";
import {
  TURKISH_PROMPT_TEMPLATE,
  TURKISH_TWO_PHASE_OUTPUT_FORMAT,
  buildTurkishSystemPrompt,
} from "@/lib/translation-system-prompt-tr";
import {
  VIETNAMESE_PROMPT_TEMPLATE,
  VIETNAMESE_TWO_PHASE_OUTPUT_FORMAT,
  buildVietnameseSystemPrompt,
} from "@/lib/translation-system-prompt-vi";
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

// Same fallback as buildTranslationSystemPrompt: targets with no dedicated template reuse German's.
const TWO_PHASE_FORMATS: Record<string, string> = {
  de: GERMAN_TWO_PHASE_OUTPUT_FORMAT,
  tr: TURKISH_TWO_PHASE_OUTPUT_FORMAT,
  vi: VIETNAMESE_TWO_PHASE_OUTPUT_FORMAT,
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

// Pulls the numbered self-check items out of a language's <critique> block (see
// *_TWO_PHASE_OUTPUT_FORMAT) so the verification pass grades against the exact same checklist
// the model used, instead of a hand-duplicated copy that could drift out of sync.
function extractChecklist(twoPhaseFormat: string): string[] {
  const critiqueMatch = twoPhaseFormat.match(/<critique>([\s\S]*?)<\/critique>/i);
  if (!critiqueMatch) return [];
  return Array.from(critiqueMatch[1].matchAll(/^\d+\.\s*(.+)$/gm)).map((m) => m[1].trim());
}

export function getVerificationChecklist(targetLang: string): string[] {
  const format = TWO_PHASE_FORMATS[targetLang] ?? GERMAN_TWO_PHASE_OUTPUT_FORMAT;
  return extractChecklist(format);
}

// A fresh, independent grading pass — this prompt is sent with no memory of having written the
// translation, so it re-checks the *actual* final text against the checklist rather than trusting
// the same generation's self-graded <critique> block.
export function buildVerificationPrompt(targetLang: string): string {
  const languageName = LANGUAGE_NAMES[targetLang] || targetLang;
  const checklist = getVerificationChecklist(targetLang);
  const checklistText = checklist.map((item, i) => `${i + 1}. ${item}`).join("\n");

  return `You are an independent quality reviewer checking a ${languageName} marketing translation you did NOT write. You have no memory of producing it — grade it strictly and honestly on its own merits.

You will receive the ORIGINAL source text and the FINAL translated text.

Grade the FINAL text against every item below. Mark each PASS only if it is genuinely satisfied — do not give the benefit of the doubt.

${checklistText}

Respond with ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{"results":[{"item":1,"pass":true,"note":"one short sentence why"}, ...],"allPassed":true}

Include one entry per checklist item above, in order. "allPassed" must be true only if every item passed.`;
}

export interface FailingCheck {
  description: string;
  note: string;
}

// Used by the retry loop: takes a translation that failed one or more independent verification
// checks and asks for a targeted revision — same glossary/style rules as the original prompt,
// but scoped to only the items that actually failed, so passing checks aren't disturbed.
export function buildFixPrompt(targetLang: string, failingChecks: FailingCheck[]): string {
  const baseTemplate = getPromptTemplateForLang(targetLang);
  const issuesText = failingChecks
    .map((f, i) => `${i + 1}. ${f.description}${f.note ? ` — Reviewer note: ${f.note}` : ""}`)
    .join("\n");

  return `${baseTemplate}

## FIX REQUEST
You will be given the ORIGINAL source text and a CURRENT TRANSLATION of it. An independent reviewer graded the current translation and found it fails the following checks:

${issuesText}

Revise the CURRENT TRANSLATION to fix exactly these issues. Keep everything else — wording, structure, glossary terms, formatting — unchanged unless fixing an issue requires it.

Return ONLY the corrected translation text. No explanations, no tags, no markdown code fences.`;
}

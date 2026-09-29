export interface VerificationCheck {
  item: number;
  pass: boolean;
  note: string;
}

export interface ParsedVerification {
  results: VerificationCheck[];
  allPassed: boolean;
}

export interface VerificationAttempt {
  attemptNumber: number;
  translatedText: string;
  checklist: string[];
  results: VerificationCheck[];
  allPassed: boolean;
}

// Retry loop cap: verify, and if it fails, ask the model to fix just the failing items and
// verify again — up to this many rounds before giving up and leaving the last attempt as-is.
export const MAX_VERIFICATION_ATTEMPTS = 5;

// Parses the JSON the verification model is asked to return (see buildVerificationPrompt).
// Tolerates markdown code fences and stray text around the object, same as the existing
// review-translation parser, since models don't always follow "JSON only" literally.
export function parseVerificationJson(text: string, checklistLength: number): ParsedVerification {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return { results: [], allPassed: false };
    }
    try {
      parsed = JSON.parse(objectMatch[0]);
    } catch {
      return { results: [], allPassed: false };
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return { results: [], allPassed: false };
  }

  const obj = parsed as Record<string, unknown>;
  const rawResults = Array.isArray(obj.results) ? obj.results : [];

  const results: VerificationCheck[] = rawResults
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r, idx) => ({
      item: typeof r.item === "number" ? r.item : idx + 1,
      pass: Boolean(r.pass),
      note: typeof r.note === "string" ? r.note : "",
    }))
    .slice(0, checklistLength);

  const allPassed =
    typeof obj.allPassed === "boolean"
      ? obj.allPassed
      : results.length > 0 && results.every((r) => r.pass);

  return { results, allPassed };
}

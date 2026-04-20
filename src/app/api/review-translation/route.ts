import { NextRequest, NextResponse } from "next/server";
import { LANGUAGE_NAMES, MODEL_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS } from "@/lib/translation-models";

interface ReviewRequest {
    originalText: string;
    translatedText: string;
    targetLang: string;
    model: string;
    apiKey: string;
}

interface ParsedReview {
    hasIssues: boolean;
    issues: string[];
    correctedTranslation: string | null;
}

function parseReviewJson(text: string): ParsedReview {
    const trimmed = text.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() || trimmed;

    let parsed: unknown;
    try {
        parsed = JSON.parse(candidate);
    } catch {
        const objectMatch = candidate.match(/\{[\s\S]*\}/);
        if (!objectMatch) {
            return {
                hasIssues: false,
                issues: ["Review parsing failed. Raw review returned."],
                correctedTranslation: null,
            };
        }
        parsed = JSON.parse(objectMatch[0]);
    }

    if (!parsed || typeof parsed !== "object") {
        return {
            hasIssues: false,
            issues: ["Review response format was invalid."],
            correctedTranslation: null,
        };
    }

    const obj = parsed as Record<string, unknown>;
    const issues = Array.isArray(obj.issues)
        ? obj.issues.filter((item): item is string => typeof item === "string").slice(0, 8)
        : [];

    return {
        hasIssues: Boolean(obj.hasIssues),
        issues,
        correctedTranslation:
            typeof obj.correctedTranslation === "string" && obj.correctedTranslation.trim()
                ? obj.correctedTranslation
                : null,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: ReviewRequest = await request.json();
        const { originalText, translatedText, targetLang, model, apiKey } = body;

        if (!originalText || !originalText.trim()) {
            return NextResponse.json({ error: "Original text is required." }, { status: 400 });
        }

        if (!translatedText || !translatedText.trim()) {
            return NextResponse.json({ error: "Translated text is required." }, { status: 400 });
        }

        if (!targetLang) {
            return NextResponse.json({ error: "Target language is required." }, { status: 400 });
        }

        if (!model) {
            return NextResponse.json({ error: "Model selection is required." }, { status: 400 });
        }

        if (!apiKey || !apiKey.trim()) {
            return NextResponse.json({ error: "API key is required." }, { status: 400 });
        }

        const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;
        const maxOutputTokens = MODEL_MAX_OUTPUT_TOKENS[model] ?? DEFAULT_MAX_OUTPUT_TOKENS;
        const reviewMaxTokens = Math.min(maxOutputTokens, 4096);

        const systemInstruction = `You are a professional translation QA specialist for website copy and marketing content.

Your job is to evaluate whether a translation sounds completely natural to a native ${targetLangName} speaker — not just technically correct.

Evaluate for:
- Naturalness and idiomatic fluency (most important — would a native speaker write it this way?)
- Faithfulness to the source meaning and persuasive intent
- Tone and register match (energetic copy stays energetic, formal stays formal, casual stays casual)
- Cultural appropriateness for ${targetLangName}-speaking audiences
- Code/markup preservation (HTML tags, template variables, URLs must be completely unchanged)

Return ONLY valid JSON with this exact schema:
{
  "hasIssues": boolean,
  "issues": string[],
  "correctedTranslation": string
}

Rules:
- issues: brief, specific descriptions of each problem found
- correctedTranslation: the full corrected translation if hasIssues is true, otherwise empty string ""
- Do not include any text outside the JSON object`;

        const userPrompt = `Source text:
${originalText}

Target language: ${targetLangName}

Translated text to review:
${translatedText}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemInstruction }],
                },
                contents: [
                    {
                        parts: [{ text: userPrompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.95,
                    maxOutputTokens: reviewMaxTokens,
                },
            }),
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json().catch(() => ({}));
            const errorMessage =
                errorData?.error?.message || `Gemini API error: ${geminiResponse.status}`;
            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }

        const data = await geminiResponse.json();
        const reviewText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reviewText) {
            return NextResponse.json(
                { error: "No review response was returned by the model." },
                { status: 500 }
            );
        }

        const parsed = parseReviewJson(reviewText);

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Review API error:", error);

        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
        }

        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { LANGUAGE_NAMES } from "@/lib/translation-models";

interface GodModeRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
  seed?: number;
  stopSequences: string[];
}

// Always appended after the user's system prompt — not editable in the UI.
const HARDCODED_RULES = `
CODE/MARKUP RULES (non-negotiable):
6. PRESERVE ALL of the following EXACTLY as-is: HTML tags and attributes, CSS, JavaScript, PHP, WordPress shortcodes, template expressions ({{ variable }}, {variable}), variable/function names, URLs, email addresses, file paths, numbers, dates in technical formats.
7. Maintain the EXACT same structure, formatting, indentation, and line breaks as the original.
8. If the content is purely code with no translatable text, return it unchanged.

OUTPUT RULES:
9. Return ONLY the translated content — no explanations, comments, or notes.
10. Do NOT wrap output in markdown code blocks or any other formatting.`;

export async function POST(request: NextRequest) {
  try {
    const body: GodModeRequest = await request.json();
    const {
      text, sourceLang, targetLang, model, apiKey,
      systemPrompt, temperature, topP, topK, maxOutputTokens,
      presencePenalty, frequencyPenalty, seed, stopSequences,
    } = body;

    if (!text?.trim()) return NextResponse.json({ error: "Text to translate is required." }, { status: 400 });
    if (!targetLang) return NextResponse.json({ error: "Target language is required." }, { status: 400 });
    if (!apiKey?.trim() || apiKey.length < 10) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 400 });
    if (!model) return NextResponse.json({ error: "Model selection is required." }, { status: 400 });
    if (sourceLang === targetLang && sourceLang !== "auto") {
      return NextResponse.json({ error: "Source and target languages must be different." }, { status: 400 });
    }

    const sourceLangName = sourceLang === "auto" ? "auto-detected" : (LANGUAGE_NAMES[sourceLang] || sourceLang);
    const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;

    const interpolatedPrompt = (systemPrompt || "")
      .replace(/\{sourceLang\}/g, sourceLangName)
      .replace(/\{targetLang\}/g, targetLangName);

    const finalSystemPrompt = interpolatedPrompt + HARDCODED_RULES;

    const generationConfig: Record<string, unknown> = {
      temperature: Math.max(0, Math.min(1, temperature ?? 0.7)),
      topP: Math.max(0, Math.min(1, topP ?? 0.95)),
      topK: Math.max(1, Math.min(100, Math.round(topK ?? 40))),
      maxOutputTokens: Math.max(1, Math.min(65536, Math.round(maxOutputTokens ?? 8192))),
      presencePenalty: Math.max(-2, Math.min(2, presencePenalty ?? 0)),
      frequencyPenalty: Math.max(-2, Math.min(2, frequencyPenalty ?? 0)),
    };

    if (seed !== undefined && Number.isFinite(seed)) {
      generationConfig.seed = Math.round(seed);
    }

    const filteredStop = (stopSequences || []).filter((s) => s.trim());
    if (filteredStop.length > 0) generationConfig.stopSequences = filteredStop;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: finalSystemPrompt }] },
        contents: [{ parts: [{ text }] }],
        generationConfig,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `Gemini API error: ${geminiResponse.status}`;
      if (geminiResponse.status === 401 || geminiResponse.status === 403) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
      if (geminiResponse.status === 429) return NextResponse.json({ error: "Rate limit exceeded. Please wait and try again." }, { status: 429 });
      if (geminiResponse.status === 404) return NextResponse.json({ error: `Model "${model}" not found.` }, { status: 404 });
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await geminiResponse.json();
    const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!translatedText) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === "SAFETY") return NextResponse.json({ error: "Content blocked by safety filters." }, { status: 422 });
      return NextResponse.json({ error: "No translation returned. The model may have produced empty output." }, { status: 500 });
    }

    return NextResponse.json({
      translatedText,
      model,
      sourceLang,
      targetLang,
      usage: {
        inputTokens: data?.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data?.usageMetadata?.totalTokenCount ?? 0,
      },
    });
  } catch (error) {
    console.error("God Mode API error:", error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

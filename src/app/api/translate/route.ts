import { NextRequest, NextResponse } from "next/server";

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  apiKey: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  auto: "auto-detected language",
  es: "Spanish",
  pt: "Portuguese",
  tr: "Turkish",
  de: "German",
  vi: "Vietnamese",
  en: "English",
};

// Keep these limits aligned with the current Gemini model documentation.
const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  "gemini-2.0-flash": 8192,
  "gemini-2.5-flash": 65536,
  "gemini-3-flash-preview": 65536,
  "gemini-3-pro-preview": 65536,
};

const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

function buildSystemPrompt(sourceLang: string, targetLang: string): string {
  const sourceLabel = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetLabel = LANGUAGE_NAMES[targetLang] || targetLang;

  const sourceInstruction =
    sourceLang === "auto"
      ? "Auto-detect the source language of the content."
      : `The source language is ${sourceLabel}.`;

  return `You are a professional translator. Your task is to translate content from ${sourceLabel} to ${targetLabel}.

${sourceInstruction}
The target language is ${targetLabel}.

CRITICAL RULES:
1. ONLY translate natural language text (human-readable sentences, paragraphs, labels, UI strings).
2. PRESERVE ALL of the following EXACTLY as-is, without any modification:
   - HTML tags and attributes (e.g., <div class="example">, <a href="...">, etc.)
   - CSS code and inline styles
   - JavaScript code
   - PHP code (<?php ... ?>)
   - WordPress shortcodes (e.g., [shortcode attr="value"])
   - Template tags and expressions (e.g., {{ variable }}, {variable})
   - Code blocks, variable names, function names
   - URLs, email addresses, file paths
   - Numbers, dates in technical formats
   - Any programming syntax or markup
3. Maintain the EXACT same structure, formatting, indentation, and line breaks as the original.
4. Do NOT add any explanations, comments, or notes. Return ONLY the translated content.
5. Do NOT wrap the output in markdown code blocks or any other formatting.
6. If the content is purely code with no translatable text, return it unchanged.

Translate the following content:`;
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json();
    const { text, sourceLang, targetLang, model, apiKey } = body;

    // Validation
    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text to translate is required." },
        { status: 400 }
      );
    }

    if (!targetLang) {
      return NextResponse.json(
        { error: "Target language is required." },
        { status: 400 }
      );
    }

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { error: "API key is required." },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: "Model selection is required." },
        { status: 400 }
      );
    }

    // Basic API key format validation
    if (apiKey.length < 10) {
      return NextResponse.json(
        { error: "Invalid API key format." },
        { status: 400 }
      );
    }

    if (sourceLang === targetLang && sourceLang !== "auto") {
      return NextResponse.json(
        { error: "Source and target languages must be different." },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(sourceLang, targetLang);
    const maxOutputTokens =
      MODEL_MAX_OUTPUT_TOKENS[model] ?? DEFAULT_MAX_OUTPUT_TOKENS;

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          maxOutputTokens,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      const errorMessage =
        errorData?.error?.message || `Gemini API error: ${geminiResponse.status}`;

      if (geminiResponse.status === 401 || geminiResponse.status === 403) {
        return NextResponse.json(
          { error: "Invalid API key. Please check your Gemini API key." },
          { status: 401 }
        );
      }

      if (geminiResponse.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait a moment and try again." },
          { status: 429 }
        );
      }

      if (geminiResponse.status === 404) {
        return NextResponse.json(
          {
            error: `Model "${model}" not found. It may not be available yet or the name may be incorrect.`,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await geminiResponse.json();

    const translatedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!translatedText) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === "SAFETY") {
        return NextResponse.json(
          { error: "Content was blocked by safety filters. Try rephrasing." },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: "No translation was returned. The model may have produced empty output." },
        { status: 500 }
      );
    }

    const usage = {
      inputTokens: data?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: data?.usageMetadata?.totalTokenCount ?? 0,
    };

    return NextResponse.json({
      translatedText,
      model,
      sourceLang,
      targetLang,
      usage,
    });
  } catch (error) {
    console.error("Translation API error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

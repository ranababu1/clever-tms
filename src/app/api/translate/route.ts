import { NextRequest, NextResponse } from "next/server";
import { MODEL_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS } from "@/lib/translation-models";
import { buildTranslationSystemPrompt } from "@/lib/translation-system-prompt";
import { getGeminiClient } from "@/lib/gemini-client";

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  model: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json();
    const { text, sourceLang, targetLang, model } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text to translate is required." }, { status: 400 });
    }
    if (!targetLang) {
      return NextResponse.json({ error: "Target language is required." }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: "Model selection is required." }, { status: 400 });
    }
    if (sourceLang === targetLang && sourceLang !== "auto") {
      return NextResponse.json({ error: "Source and target languages must be different." }, { status: 400 });
    }

    const systemPrompt = buildTranslationSystemPrompt(sourceLang, targetLang);
    const maxOutputTokens = MODEL_MAX_OUTPUT_TOKENS[model] ?? DEFAULT_MAX_OUTPUT_TOKENS;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      },
    });

    const rawText = response.text;

    if (!rawText) {
      const finishReason = response.candidates?.[0]?.finishReason;
      if (String(finishReason) === "SAFETY") {
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

    // Extract only the <final> block from the two-phase output format.
    // Falls back to the full response if the model didn't follow the structured format.
    const finalMatch = rawText.match(/<final>([\s\S]*?)<\/final>/i);
    const translatedText = finalMatch?.[1]?.trim() ?? rawText;

    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    return NextResponse.json({ translatedText, model, sourceLang, targetLang, usage });
  } catch (error) {
    console.error("Translation API error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MAX_OUTPUT_TOKENS } from "@/lib/translation-models";
import { buildFixPrompt, type FailingCheck } from "@/lib/translation-system-prompt";
import { getGeminiClient } from "@/lib/gemini-client";

interface FixRequest {
  originalText: string;
  currentTranslation: string;
  targetLang: string;
  model: string;
  apiKey: string;
  failingChecks: FailingCheck[];
}

export async function POST(request: NextRequest) {
  try {
    const body: FixRequest = await request.json();
    const { originalText, currentTranslation, targetLang, model, apiKey, failingChecks } = body;

    if (!originalText || !originalText.trim()) {
      return NextResponse.json({ error: "Original text is required." }, { status: 400 });
    }
    if (!currentTranslation || !currentTranslation.trim()) {
      return NextResponse.json({ error: "Current translation is required." }, { status: 400 });
    }
    if (!targetLang) {
      return NextResponse.json({ error: "Target language is required." }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: "Model selection is required." }, { status: 400 });
    }
    if (!apiKey || apiKey.trim().length < 10) {
      return NextResponse.json({ error: "A valid Gemini API key is required." }, { status: 400 });
    }
    if (!Array.isArray(failingChecks) || failingChecks.length === 0) {
      return NextResponse.json({ error: "At least one failing check is required." }, { status: 400 });
    }

    const systemInstruction = buildFixPrompt(targetLang, failingChecks);
    const userPrompt = `ORIGINAL SOURCE:\n${originalText}\n\nCURRENT TRANSLATION (to fix):\n${currentTranslation}`;
    const fixMaxTokens = DEFAULT_MAX_OUTPUT_TOKENS;

    const ai = getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.5,
        topP: 0.95,
        maxOutputTokens: fixMaxTokens,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return NextResponse.json(
        { error: "No fix response was returned by the model." },
        { status: 500 }
      );
    }

    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    return NextResponse.json({ translatedText: rawText.trim(), usage });
  } catch (error) {
    console.error("Fix API error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

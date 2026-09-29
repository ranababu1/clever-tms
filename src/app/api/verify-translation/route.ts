import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MAX_OUTPUT_TOKENS } from "@/lib/translation-models";
import { buildVerificationPrompt, getVerificationChecklist } from "@/lib/translation-system-prompt";
import { parseVerificationJson } from "@/lib/verification";
import { getGeminiClient } from "@/lib/gemini-client";

interface VerifyRequest {
  originalText: string;
  translatedText: string;
  targetLang: string;
  model: string;
  apiKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
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
    if (!apiKey || apiKey.trim().length < 10) {
      return NextResponse.json({ error: "A valid Gemini API key is required." }, { status: 400 });
    }

    const checklist = getVerificationChecklist(targetLang);
    const systemInstruction = buildVerificationPrompt(targetLang);
    const userPrompt = `ORIGINAL:\n${originalText}\n\nFINAL TRANSLATION:\n${translatedText}`;
    // Generous headroom: thinking-enabled Gemini models count reasoning tokens against this
    // budget, so a tight cap here can leave zero tokens for the actual JSON answer.
    const verifyMaxTokens = Math.min(DEFAULT_MAX_OUTPUT_TOKENS, 8192);

    const ai = getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: verifyMaxTokens,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      const finishReason = response.candidates?.[0]?.finishReason;
      console.error("Gemini verification returned no text. finishReason:", finishReason);
      return NextResponse.json(
        {
          error: String(finishReason) === "MAX_TOKENS"
            ? "Verification ran out of output budget before writing a response. Try again."
            : "No verification response was returned by the model.",
        },
        { status: 500 }
      );
    }

    const parsed = parseVerificationJson(rawText, checklist.length);
    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    return NextResponse.json({ checklist, ...parsed, usage });
  } catch (error) {
    console.error("Verification API error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

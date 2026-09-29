import { NextRequest, NextResponse } from "next/server";
import { isAllowedClaudeModel, supportsSamplingParams } from "@/lib/claude-translation-models";
import { buildVerificationPrompt, getVerificationChecklist } from "@/lib/translation-system-prompt";
import { parseVerificationJson } from "@/lib/verification";

const ANTHROPIC_VERSION = "2023-06-01";

interface VerifyClaudeRequest {
  originalText: string;
  translatedText: string;
  targetLang: string;
  model: string;
  apiKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyClaudeRequest = await request.json();
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
    if (!apiKey || !apiKey.trim() || apiKey.trim().length < 10) {
      return NextResponse.json({ error: "A valid Anthropic API key is required." }, { status: 400 });
    }
    if (!model || !isAllowedClaudeModel(model)) {
      return NextResponse.json({ error: "Invalid model selection." }, { status: 400 });
    }

    const checklist = getVerificationChecklist(targetLang);
    const systemPrompt = buildVerificationPrompt(targetLang);
    const userPrompt = `ORIGINAL:\n${originalText}\n\nFINAL TRANSLATION:\n${translatedText}`;

    const payload: Record<string, unknown> = {
      model,
      // Generous headroom: some models spend part of this budget on internal reasoning before
      // writing the JSON answer, so a tight cap here can leave zero tokens for actual output.
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };

    if (supportsSamplingParams(model)) {
      payload.temperature = 0.2;
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.json().catch(() => ({}));
      const err = errorData as { error?: { message?: string } };
      const errorMessage = err?.error?.message || `Anthropic API error: ${anthropicResponse.status}`;
      return NextResponse.json({ error: errorMessage }, { status: anthropicResponse.status || 500 });
    }

    const data = (await anthropicResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const textBlock = data?.content?.find((c) => c.type === "text");
    const rawText = textBlock?.text;

    if (!rawText) {
      const stopReason = (data as { stop_reason?: string })?.stop_reason;
      console.error(
        "Claude verification returned no text block. stop_reason:",
        stopReason,
        "content:",
        JSON.stringify(data?.content)
      );
      return NextResponse.json(
        {
          error: stopReason === "max_tokens"
            ? "Verification ran out of output budget before writing a response. Try again."
            : "No verification response was returned by the model.",
        },
        { status: 500 }
      );
    }

    const parsed = parseVerificationJson(rawText, checklist.length);
    const inputTokens = data?.usage?.input_tokens ?? 0;
    const outputTokens = data?.usage?.output_tokens ?? 0;

    return NextResponse.json({
      checklist,
      ...parsed,
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
    });
  } catch (error) {
    console.error("Claude verification API error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

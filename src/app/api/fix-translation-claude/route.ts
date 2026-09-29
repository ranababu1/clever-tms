import { NextRequest, NextResponse } from "next/server";
import {
  CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS,
  isAllowedClaudeModel,
  supportsSamplingParams,
} from "@/lib/claude-translation-models";
import { buildFixPrompt, type FailingCheck } from "@/lib/translation-system-prompt";

const ANTHROPIC_VERSION = "2023-06-01";

interface FixClaudeRequest {
  originalText: string;
  currentTranslation: string;
  targetLang: string;
  model: string;
  apiKey: string;
  failingChecks: FailingCheck[];
}

export async function POST(request: NextRequest) {
  try {
    const body: FixClaudeRequest = await request.json();
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
    if (!apiKey || !apiKey.trim() || apiKey.trim().length < 10) {
      return NextResponse.json({ error: "A valid Anthropic API key is required." }, { status: 400 });
    }
    if (!model || !isAllowedClaudeModel(model)) {
      return NextResponse.json({ error: "Invalid model selection." }, { status: 400 });
    }
    if (!Array.isArray(failingChecks) || failingChecks.length === 0) {
      return NextResponse.json({ error: "At least one failing check is required." }, { status: 400 });
    }

    const systemPrompt = buildFixPrompt(targetLang, failingChecks);
    const userPrompt = `ORIGINAL SOURCE:\n${originalText}\n\nCURRENT TRANSLATION (to fix):\n${currentTranslation}`;

    const payload: Record<string, unknown> = {
      model,
      max_tokens: CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };

    if (supportsSamplingParams(model)) {
      payload.temperature = 0.5;
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
      return NextResponse.json(
        { error: "No fix response was returned by the model." },
        { status: 500 }
      );
    }

    const inputTokens = data?.usage?.input_tokens ?? 0;
    const outputTokens = data?.usage?.output_tokens ?? 0;

    return NextResponse.json({
      translatedText: rawText.trim(),
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
    });
  } catch (error) {
    console.error("Claude fix API error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

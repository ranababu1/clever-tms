import { NextRequest, NextResponse } from "next/server";
import {
  CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS,
  CLAUDE_GODMODE_MAX_OUTPUT_CAP,
  isAllowedClaudeModel,
  supportsSamplingParams,
} from "@/lib/claude-translation-models";
import { buildTranslationSystemPrompt } from "@/lib/translation-system-prompt";

const ANTHROPIC_VERSION = "2023-06-01";

interface TranslateClaudeRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  maxOutputTokens?: number;
  apiKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateClaudeRequest = await request.json();
    const { text, sourceLang, targetLang, model, maxOutputTokens: requestedMaxOutputTokens, apiKey } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text to translate is required." }, { status: 400 });
    }

    if (!targetLang) {
      return NextResponse.json({ error: "Target language is required." }, { status: 400 });
    }

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: "API key is required." }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: "Model selection is required." }, { status: 400 });
    }

    if (!isAllowedClaudeModel(model)) {
      return NextResponse.json({ error: "Invalid model selection." }, { status: 400 });
    }

    if (apiKey.length < 10) {
      return NextResponse.json({ error: "Invalid API key format." }, { status: 400 });
    }

    if (sourceLang === targetLang && sourceLang !== "auto") {
      return NextResponse.json(
        { error: "Source and target languages must be different." },
        { status: 400 }
      );
    }

    const systemPrompt = buildTranslationSystemPrompt(sourceLang, targetLang);
    const maxTokens =
      Number.isFinite(requestedMaxOutputTokens) && (requestedMaxOutputTokens as number) > 0
        ? Math.min(CLAUDE_GODMODE_MAX_OUTPUT_CAP, Math.round(requestedMaxOutputTokens as number))
        : CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS;

    const payload: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    };

    // Sonnet 5 / Opus 5 / Opus 5.5 reject temperature/top_p/top_k outright (400) — only
    // include them for models that still accept sampling controls (e.g. Haiku 4.5).
    if (supportsSamplingParams(model)) {
      // Higher temperature encourages natural, idiomatic phrasing over literal word-for-word output.
      // top_k caps vocabulary diversity to reduce noise while preserving creative rephrasing.
      // Note: Claude 4.x rejects top_p when temperature is set; use temperature + top_k only.
      payload.temperature = 0.7;
      payload.top_k = 100;
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
      const err = errorData as { error?: { message?: string; type?: string } };
      const errorMessage =
        err?.error?.message || `Anthropic API error: ${anthropicResponse.status}`;

      if (anthropicResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Please check your Anthropic API key." },
          { status: 401 }
        );
      }

      if (anthropicResponse.status === 403) {
        return NextResponse.json(
          { error: "Access denied. Check your Anthropic API key and account permissions." },
          { status: 403 }
        );
      }

      if (anthropicResponse.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait a moment and try again." },
          { status: 429 }
        );
      }

      if (anthropicResponse.status === 404) {
        return NextResponse.json(
          {
            error: `Model "${model}" not found. It may not be available for your account yet.`,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = (await anthropicResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const textBlock = data?.content?.find((c) => c.type === "text");
    const rawText = textBlock?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "No translation was returned. The model may have produced empty output." },
        { status: 500 }
      );
    }

    // Extract the <draft>, <critique>, and <final> blocks from the two-phase output format.
    // Falls back to the full response as the final text if the model didn't follow the structure.
    const draftMatch = rawText.match(/<draft>([\s\S]*?)<\/draft>/i);
    const critiqueMatch = rawText.match(/<critique>([\s\S]*?)<\/critique>/i);
    const finalMatch = rawText.match(/<final>([\s\S]*?)<\/final>/i);
    const translatedText = finalMatch?.[1]?.trim() ?? rawText;

    const inputTokens = data?.usage?.input_tokens ?? 0;
    const outputTokens = data?.usage?.output_tokens ?? 0;

    return NextResponse.json({
      translatedText,
      draftText: draftMatch?.[1]?.trim() ?? null,
      critiqueText: critiqueMatch?.[1]?.trim() ?? null,
      model,
      sourceLang,
      targetLang,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    });
  } catch (error) {
    console.error("Claude translation API error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

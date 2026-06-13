import { NextRequest, NextResponse } from "next/server";
import { LANGUAGE_NAMES } from "@/lib/translation-models";
import {
  CLAUDE_GODMODE_MAX_OUTPUT_CAP,
  isAllowedClaudeModel,
} from "@/lib/claude-translation-models";

const ANTHROPIC_VERSION = "2023-06-01";

const HARDCODED_RULES = `
CODE/MARKUP RULES (non-negotiable):
6. PRESERVE ALL of the following EXACTLY as-is: HTML tags and attributes, CSS, JavaScript, PHP, WordPress shortcodes, template expressions ({{ variable }}, {variable}), variable/function names, URLs, email addresses, file paths, numbers, dates in technical formats.
7. Maintain the EXACT same structure, formatting, indentation, and line breaks as the original.
8. If the content is purely code with no translatable text, return it unchanged.

OUTPUT RULES:
9. Return ONLY the translated content — no explanations, comments, or notes.
10. Do NOT wrap output in markdown code blocks or any other formatting.`;

interface GodModeClaudeRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  topK: number;
  maxOutputTokens: number;
  stopSequences: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GodModeClaudeRequest = await request.json();
    const {
      text,
      sourceLang,
      targetLang,
      model,
      apiKey,
      systemPrompt,
      temperature,
      topK,
      maxOutputTokens,
      stopSequences,
    } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text to translate is required." }, { status: 400 });
    }
    if (!targetLang) {
      return NextResponse.json({ error: "Target language is required." }, { status: 400 });
    }
    if (!apiKey?.trim() || apiKey.length < 10) {
      return NextResponse.json({ error: "Invalid or missing API key." }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: "Model selection is required." }, { status: 400 });
    }
    if (!isAllowedClaudeModel(model)) {
      return NextResponse.json({ error: "Invalid model selection." }, { status: 400 });
    }
    if (sourceLang === targetLang && sourceLang !== "auto") {
      return NextResponse.json(
        { error: "Source and target languages must be different." },
        { status: 400 }
      );
    }

    const sourceLangName =
      sourceLang === "auto" ? "auto-detected" : LANGUAGE_NAMES[sourceLang] || sourceLang;
    const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;

    const interpolatedPrompt = (systemPrompt || "")
      .replace(/\{sourceLang\}/g, sourceLangName)
      .replace(/\{targetLang\}/g, targetLangName);

    const finalSystemPrompt = interpolatedPrompt + HARDCODED_RULES;

    const temp = Math.max(0, Math.min(1, temperature ?? 0.7));
    const tk = Math.max(1, Math.min(500, Math.round(topK ?? 40)));
    const maxTokens = Math.max(
      1,
      Math.min(CLAUDE_GODMODE_MAX_OUTPUT_CAP, Math.round(maxOutputTokens ?? 8192))
    );

    const filteredStop = (stopSequences || []).filter((s) => s.trim()).slice(0, 4);

    const payload: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      system: finalSystemPrompt,
      messages: [{ role: "user", content: text }],
      temperature: temp,
      top_k: tk,
    };

    if (filteredStop.length > 0) {
      payload.stop_sequences = filteredStop;
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
      const errorMessage =
        err?.error?.message || `Anthropic API error: ${anthropicResponse.status}`;
      if (anthropicResponse.status === 401) {
        return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
      }
      if (anthropicResponse.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
      if (anthropicResponse.status === 404) {
        return NextResponse.json({ error: `Model "${model}" not found.` }, { status: 404 });
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = (await anthropicResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const textBlock = data?.content?.find((c) => c.type === "text");
    const translatedText = textBlock?.text;

    if (!translatedText) {
      return NextResponse.json(
        { error: "No translation returned. The model may have produced empty output." },
        { status: 500 }
      );
    }

    const inputTokens = data?.usage?.input_tokens ?? 0;
    const outputTokens = data?.usage?.output_tokens ?? 0;

    return NextResponse.json({
      translatedText,
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
    console.error("Claude God Mode API error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCachedGeminiModels } from "@/lib/gemini-models-cache";
import { FALLBACK_MODELS } from "@/lib/translation-models";

interface ModelsRequest {
  apiKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ModelsRequest = await request.json();
    const { apiKey } = body;

    if (!apiKey || apiKey.trim().length < 10) {
      return NextResponse.json({ error: "A valid Gemini API key is required." }, { status: 400 });
    }

    const { models, fetchedAt } = await getCachedGeminiModels(apiKey.trim());

    if (!models.length) {
      return NextResponse.json({ models: FALLBACK_MODELS, fetchedAt: null, fallback: true });
    }

    return NextResponse.json({ models, fetchedAt, fallback: false });
  } catch (error) {
    console.error("Models API error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    // Degrade gracefully to the static fallback list rather than breaking the model picker.
    return NextResponse.json({ models: FALLBACK_MODELS, fetchedAt: null, fallback: true });
  }
}

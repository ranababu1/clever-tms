"use client";

import { useEffect, useRef, useState } from "react";
import { FALLBACK_MODELS, MODEL_PRICING } from "@/lib/translation-models";
import type { Pricing } from "@/lib/pricing";

export interface GeminiModelInfo {
  id: string;
  label: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  isPro: boolean;
  badge?: string;
  pricing?: Pricing;
}

// Best-effort pricing for models not in the static MODEL_PRICING table (e.g. newly released
// ones the live catalog picked up before pricing was hardcoded) — same tier as the closest
// known Gemini pricing bracket.
const PRO_FALLBACK_PRICING: Pricing = { inputPer1M: 1.25, outputPer1M: 10.0 };
const FLASH_FALLBACK_PRICING: Pricing = { inputPer1M: 0.3, outputPer1M: 2.5 };

function enrich(models: { id: string; label: string; inputTokenLimit: number; outputTokenLimit: number; isPro: boolean }[]): GeminiModelInfo[] {
  return models.map((m) => ({
    ...m,
    badge: m.isPro ? "Pro" : undefined,
    pricing: MODEL_PRICING[m.id] ?? (m.isPro ? PRO_FALLBACK_PRICING : FLASH_FALLBACK_PRICING),
  }));
}

/**
 * Loads the Gemini model catalog from our /api/models route, which itself
 * caches Google's live model list for 7 days. Falls back to a small static
 * list until an API key is available or if the fetch fails.
 */
export function useGeminiModels(apiKey: string): {
  models: GeminiModelInfo[];
  isLoading: boolean;
  fetchedAt: number | null;
} {
  const [models, setModels] = useState<GeminiModelInfo[]>(() => enrich(FALLBACK_MODELS));
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const lastFetchedKey = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = apiKey.trim();
    if (!trimmed || trimmed.length < 10) return;
    if (lastFetchedKey.current === trimmed) return;

    let cancelled = false;
    lastFetchedKey.current = trimmed;
    setIsLoading(true);

    fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: trimmed }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.models) && data.models.length > 0) {
          setModels(enrich(data.models));
          setFetchedAt(typeof data.fetchedAt === "number" ? data.fetchedAt : null);
        }
      })
      .catch(() => {
        /* keep whatever list is already shown */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return { models, isLoading, fetchedAt };
}

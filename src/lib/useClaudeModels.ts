"use client";

import { useEffect, useRef, useState } from "react";
import { FALLBACK_CLAUDE_MODELS } from "@/lib/claude-translation-models";
import type { Pricing } from "@/lib/pricing";

export interface ClaudeModelInfo {
  id: string;
  label: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  badge: string;
  pricing: Pricing;
}

/**
 * Loads the Claude model catalog (most recent Opus/Sonnet/Haiku) from our /api/claude-models
 * route, which caches Anthropic's live model list for 7 days. Falls back to a small static
 * list until an API key is available or if the fetch fails.
 */
export function useClaudeModels(apiKey: string): {
  models: ClaudeModelInfo[];
  isLoading: boolean;
  fetchedAt: number | null;
} {
  const [models, setModels] = useState<ClaudeModelInfo[]>(FALLBACK_CLAUDE_MODELS);
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

    fetch("/api/claude-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: trimmed }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
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

import fs from "fs";
import path from "path";
import { fetchClaudeModels, type ClaudeModelInfo } from "@/lib/claude-models";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_FILE = path.join(process.cwd(), ".cache", "claude-models.json");

interface ModelsCache {
  fetchedAt: number;
  models: ClaudeModelInfo[];
}

let memoryCache: ModelsCache | null = null;

function readDiskCache(): ModelsCache | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.models) && typeof parsed.fetchedAt === "number") {
      return parsed as ModelsCache;
    }
    return null;
  } catch {
    return null;
  }
}

function writeDiskCache(cache: ModelsCache): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
  } catch {
    // Best-effort only — in-memory cache still works within this process.
  }
}

function isFresh(cache: ModelsCache | null): cache is ModelsCache {
  return !!cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

/**
 * Returns the Claude model catalog (Opus/Sonnet/Haiku, most recent of each), refreshed from
 * Anthropic at most once every 7 days. Falls back to a stale cache rather than throwing if a
 * refresh attempt fails.
 */
export async function getCachedClaudeModels(apiKey: string): Promise<ModelsCache> {
  if (!memoryCache) memoryCache = readDiskCache();
  if (isFresh(memoryCache)) return memoryCache;

  try {
    const models = await fetchClaudeModels(apiKey);
    memoryCache = { fetchedAt: Date.now(), models };
    writeDiskCache(memoryCache);
    return memoryCache;
  } catch (error) {
    if (memoryCache) return memoryCache;
    throw error;
  }
}

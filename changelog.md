# Changelog

Incremental history of this app. Newest first. Entries before "Unreleased" are reconstructed
from `git log`; commit hashes are from `main`.

## Unreleased (working tree, not yet committed)

Gemini switched to Google's "-latest" aliases; language list swap (Greek/Japanese in for
Hindi/Bengali, and now on both dropdowns, not just "From"); old app name purged from
everything except historical git commits.

- **Gemini model picker simplified to 3 fixed aliases** instead of scanning/ranking the full
  catalog: `gemini-pro-latest` ("Gemini 3.1 Pro"), `gemini-flash-latest` ("Gemini 3.8 Flash"),
  `gemini-flash-lite-latest` ("Gemini 3.5 Flash Lite"). Google keeps each alias pointed at
  whichever build is current for that tier, so the dropdown never needs a code change when a
  new Flash/Pro ships — only the fixed label needs updating if the alias moves to a
  meaningfully different generation. `gemini-models.ts` now calls `models.get()` per alias
  (3 calls) instead of listing + filtering + sorting the whole catalog; still cached 7 days.
- **Language dropdowns:** removed Hindi and Bengali, added Greek and Japanese. Also fixed: the
  earlier language expansion only touched the two Gemini apps' "From" dropdown — the "To"
  dropdown (previously hardcoded to German/Turkish/Vietnamese only) and both Claude apps
  (which still had the original 7-language list) are now all on the same full list. "To" is no
  longer restricted to the 3 languages with a dedicated system prompt — untranslated targets
  fall back to the German prompt template (unchanged pre-existing behavior), which is a
  quality trade-off worth knowing about, not a crash risk.
- **Model popup footer** shortened from a paragraph explaining the INR conversion rate and the
  chars-per-token estimate to "Fetched from official pricing." Cost/1L-chars column header now
  says "(In+Out)" to make explicit that it already sums input and output cost (it always did).
- **Purged the app's original name** from every file this session touches: docs
  (`current.md`, `changelog.md`), the referral query params on the landing page's external
  links (now `?ref=smarttms`), and `package-lock.json`'s `name` field (regenerated via
  `npm install --package-lock-only` to match `package.json`'s `smart-tms`). Left alone on
  request: the GitHub remote URL and existing commit history, whose diffs still contain the
  old name — rewriting history was offered and declined (it would rewrite every commit hash
  from the first commit onward and require a force-push).
  **Not touched, on purpose:** "CleverTap" throughout the system-prompt files — that's the
  actual company these prompts write marketing copy for, unrelated to this app's own old name.

Dual-currency model pricing + dynamic Claude catalog + a model-lineup correction.

- **Pricing in the model popup:** `ModelInfoModal` now shows cost per 1M tokens (input/output)
  and cost per 1 lakh characters, each in $ and ₹ — new `src/lib/pricing.ts`
  (`USD_TO_INR` constant, `costPerLakhChars`, `formatUsd`/`formatInr`). `ModelInfoModal` is now
  provider-generic (`ModelCardInfo`: `id, label, inputTokenLimit, outputTokenLimit, badge?,
  pricing?`) instead of Gemini-only.
- **Dynamic Claude model catalog**, mirroring the Gemini one added earlier: new
  `src/lib/claude-models.ts` (fetches Anthropic's `GET /v1/models`, picks the most recent
  model in each of the Opus/Sonnet/Haiku families by `created_at`, fills in token
  limits/pricing from a per-family default table since that endpoint doesn't return them),
  `src/lib/claude-models-cache.ts` (7-day cache, same pattern as Gemini's), new
  `POST /api/claude-models` route, new `src/lib/useClaudeModels.ts` hook. `TranslatorClaudeApp`
  and `GodModeClaudeApp` now use it instead of the old static `CLAUDE_MODELS` array, and both
  gained the same clickable token-limit popup the Gemini apps have.
  `isAllowedClaudeModel` changed from an exact allowlist to a shape check
  (`^claude-(opus|sonnet|haiku)-\d`) so it doesn't reject ids the live catalog picks up.
- **Model-lineup correction (user-caught):** the fallback/pricing tables initially shipped
  with this dynamic-Claude work used the *old* static ids already sitting in the repo
  (`claude-opus-4-7` / `claude-sonnet-4-6` / `claude-haiku-4-5`) instead of checking what's
  actually current. Corrected via the `claude-api` skill's live model table to **Opus 5.5**
  (`claude-opus-5-5`, $4/$20 per 1M, 1M context, 128K output), **Sonnet 5** (`claude-sonnet-5`,
  $2/$10, 1M context, 128K output), **Haiku 4.5** (`claude-haiku-4-5`, $1/$5, 200K context,
  64K output) across `FALLBACK_CLAUDE_MODELS`, `CLAUDE_MODEL_PRICING`, `claude-models.ts`'s
  family-default tables, and both Claude apps' default `selectedModel` state.
  **Discovered in the process:** Sonnet 5 / Opus 5 / Opus 5.5 reject
  `temperature`/`top_p`/`top_k` outright (400) — Claude decides sampling itself on these
  models; only Haiku still accepts them. Added `supportsSamplingParams(model)` and made both
  `translate-claude`/`godmode-claude` routes omit those fields when unsupported, and
  `GodModeClaudeApp` disables the Creativity/Top-K sliders with an explanatory note in that
  case. Lesson: don't trust a repo's existing hardcoded model ids as ground truth for "current"
  — check a live/authoritative source before treating them as the fallback for a *new*
  feature, even when just refactoring how they're fetched.
- Rewrote the `Claude (static)` section of `current.md` to describe the new dynamic system and
  the sampling-params gotcha.
- **Cursor constellation** on the landing page hero, inspired by antigravity.google: new
  `src/components/CursorConstellation.tsx`, a canvas-only (no library) particle field that
  drifts, links nearby particles with faint lines, and links particles near the cursor —
  tuned down from the reference (48 particles, low opacity, cyan-only) and confined to the
  hero `<section>` in `src/app/page.tsx` so it reads as texture, not a focal effect. Skips
  itself under `prefers-reduced-motion: reduce`.

Rebrand + dynamic Gemini model catalog + expanded source-language list.

- **Rebrand:** renamed the app to Smart TMS across `layout.tsx` metadata, all four
  `*/page.tsx` headers/footers, the landing page, `README.md`, and `package.json`
  (`name: smart-tms`). Logo badge letter changed to "S" (God Mode's separate amber "G" badge
  is unrelated and unchanged).
- **Languages:** Added Arabic, Bengali, French, Hindi, Mandarin Chinese to the "From" dropdown
  in `TranslatorApp` and `GodModeApp` (12 entries total, alphabetical, `auto` pinned first).
  "To" dropdown intentionally left at German/Turkish/Vietnamese only — those are the only
  languages with a dedicated system prompt file; widening it further needs a matching prompt
  or an accepted German-prompt fallback. `LANGUAGE_NAMES` in `translation-models.ts` updated
  to match.
- **Dynamic Gemini model catalog** (previously a hardcoded array):
  - New `src/lib/gemini-models.ts`: fetches `ai.models.list()`, filters to text-generation
    `gemini-*` models (excludes Imagen/Veo/TTS/audio/embedding/aqa/vision-only/learnlm/gemma),
    returns the 4 most recent non-Pro models + 1 most recent Pro model (5 total), sorted by
    version extracted from the model id.
  - New `src/lib/gemini-models-cache.ts`: 7-day TTL cache, memory + on-disk
    (`.cache/gemini-models.json`, gitignored) with stale-cache fallback on refresh failure.
  - New `POST /api/models` route: returns `{ models, fetchedAt, fallback }`; degrades to a
    static `FALLBACK_MODELS` list on any error so the picker is never empty.
  - New `src/lib/useGeminiModels.ts` client hook and `src/components/ModelInfoModal.tsx`
    popup (opened by clicking the input/output token-limit flash text) listing every loaded
    model with its token limits.
  - `TranslatorApp.tsx` / `GodModeApp.tsx`: replaced the static `MODELS`/`MODEL_LIMITS`/
    `MODEL_MAX_OUTPUT_TOKENS` lookups with the live catalog; removed the redundant "Max
    output: N tokens" line (duplicated the output token limit) from the token-meta marquee,
    which is now 2 real metrics instead of 3 (input limit, output limit) — `globals.css`
    `@keyframes tokenMetaSlide` reduced from 4 stops to 3 to match.
  - `translation-models.ts`: removed `MODELS`, `MODEL_LIMITS`, `MODEL_MAX_OUTPUT_TOKENS`;
    added `FALLBACK_MODELS` in the new `{ id, label, inputTokenLimit, outputTokenLimit, isPro }`
    shape. `MODEL_PRICING` kept as-is (static, best-effort, Gemini doesn't expose pricing via
    the API).
  - `api/translate/route.ts`: now takes `maxOutputTokens` from the client (computed from the
    live model's `outputTokenLimit`) instead of a static per-model lookup table.
  - `api/review-translation/route.ts`: no longer looks up a per-model output cap; uses
    `DEFAULT_MAX_OUTPUT_TOKENS` capped to 4096 for the review call.
  - `.gitignore`: added `/.cache`.
- Added this file and `current.md`.

## 25dd0f5 — Metadata UI update

UI polish pass across the token-usage marquee and both Gemini apps/pages; touched
`globals.css`, both God Mode / Translate Claude+Gemini pages, `GodModeApp.tsx`,
`TranslatorApp.tsx`.

## 7d75a00 — HarmBlockThreshold issue fixed

Fixed Gemini safety-setting configuration (`HarmBlockThreshold`/`HarmCategory`) across
`api/godmode`, `api/review-translation`, `api/translate`; refactored `gemini-client.ts`;
significant God Mode / Translate page UI expansion (`godmode/page.tsx`,
`translate/page.tsx` grew substantially — API-key modal, layout).

## ab1d79d — Claude support added - gemini adc tested

Big addition: full Claude track mirroring the Gemini one.

- New `api/translate-claude/route.ts`, `api/godmode-claude/route.ts`.
- New `translate/claude/page.tsx`, `godmode/claude/page.tsx`.
- New `components/TranslatorClaudeApp.tsx` (541 lines), `components/GodModeClaudeApp.tsx` (711 lines).
- New `lib/claude-translation-models.ts` (static `CLAUDE_MODELS`/pricing/limits).
- New `lib/translation-system-prompt-{de,tr,vi}.ts` + `translation-system-prompt.ts` dispatcher
  — per-target-language system prompts replacing whatever single-prompt setup existed before.
- `api/translate/route.ts` shrank significantly (223 → much smaller) as prompt logic moved
  into the new per-language prompt files.

## 3dd4684 — Godmode added

Introduced the advanced/"God Mode" flow for Gemini: `api/godmode/route.ts`,
`godmode/page.tsx`, `components/GodModeApp.tsx` (666 lines) — full sampling-parameter control
(temperature, topP, topK, maxOutputTokens, penalties, seed, stop sequences) plus an editable
system prompt. `translation-models.ts` grew (+31 lines) to support it.

## f603bc1 — update

Small styling (`globals.css`) and `TranslatorApp.tsx` tweaks.

## 1e36181 — 2 agentic workflow added

Landing page (`page.tsx`) rework and `TranslatorApp.tsx` changes to support what became the
"Translate and Review" two-stage (translate → review agent) flow.

## 8127d86 — second agent added

Added `api/review-translation/route.ts` (the QA/review pass) and wired it into
`TranslatorApp.tsx`; substantial `globals.css` and `translate/page.tsx` growth.

## 8cc5689 — Newer models added

Expanded the (then-static) Gemini model list; `api/translate/route.ts` and
`TranslatorApp.tsx`/`globals.css` updated accordingly.

## 8cda1b2 — UI update + Model token Usage indicator

Introduced the token-usage display (input/output/total tokens, cost) in `TranslatorApp.tsx`
and `api/translate/route.ts`; `.gitignore` updated.

## 038430c — Stop tracking claude

Removed `.claude/settings.local.json` from version control.

## 01ad92b — gi update

`.gitignore` tweak.

## b6fd099 — first commit

Initial scaffold: Next.js app, `translate/page.tsx`, `components/TranslatorApp.tsx` (541 lines),
`api/translate/route.ts`, landing page, Tailwind/DaisyUI setup. Single provider (Gemini),
single mode (simple translate, no review, no God Mode).

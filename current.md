# Smart TMS — Current State

> Purpose of this file: let an AI agent understand what this app does and how it's wired
> without reading every source file. Update it whenever functionality changes materially
> (see `changelog.md` for the incremental history).

## What this is

Smart TMS is a Next.js (App Router, v16, Turbopack) web app that translates arbitrary
text/code/markup using LLMs, while preserving code structure (HTML, template syntax,
variables, URLs, etc.). It ships two provider tracks (Google Gemini and Anthropic Claude)
and two UI modes per provider (a simple "Translate" flow and an advanced "God Mode" flow
with full generation-parameter control and an editable system prompt).

No accounts, no database, no server-side persistence of secrets. The user supplies their
own API key, which lives only in `sessionStorage` in the browser and is sent per-request to
our Next.js API routes, which forward it to the provider. Nothing is stored server-side
except a small, non-secret cache of the Gemini model catalog (see below).

## Routes

| Path | Component | Provider | Mode |
|---|---|---|---|
| `/` | `src/app/page.tsx` | — | Marketing/landing page |
| `/translate` | `src/app/translate/page.tsx` → `TranslatorApp` | Gemini | Simple |
| `/godmode` | `src/app/godmode/page.tsx` → `GodModeApp` | Gemini | Advanced |
| `/translate/claude` | `src/app/translate/claude/page.tsx` → `TranslatorClaudeApp` | Claude | Simple |
| `/godmode/claude` | `src/app/godmode/claude/page.tsx` → `GodModeClaudeApp` | Claude | Advanced |

Each `*/page.tsx` also owns the "Set API Key" modal (stores into `sessionStorage`, then
dispatches a custom event so the App component picks up the change without a page reload).
Gemini pages use key `gemini_translator_api_key` / event `gemini-api-key-updated`. Claude
pages use `claude_translator_api_key` / `claude-api-key-updated`.

## API routes (`src/app/api/*/route.ts`)

- `POST /api/translate` — Gemini, simple mode. Builds a per-target-language system prompt
  (see below), calls `ai.models.generateContent`, extracts the `<final>…</final>` block from
  the two-phase output, returns `{ translatedText, usage }`.
- `POST /api/godmode` — Gemini, advanced mode. Takes a user-editable system prompt plus
  generation params (temperature, topP, topK, maxOutputTokens, presence/frequency penalty,
  seed, thinkingLevel), appends non-editable hardcoded code-preservation rules, calls Gemini.
  No stop sequences — removed from the UI and the route (see "God Mode parameters" below).
- `POST /api/review-translation` — Gemini only. Second-pass QA: given the original text and
  a draft translation, asks the model to return `{ hasIssues, issues[], correctedTranslation }`
  as JSON. Used by the "Translate and Review" button in both Gemini apps (5s delay before the
  review call starts, purely a UX pacing choice, not a real dependency).
- `POST /api/translate-claude` — Claude, simple mode. Calls Anthropic's Messages API directly
  via `fetch` (no SDK). Same `<final>` extraction convention as Gemini.
- `POST /api/godmode-claude` — Claude, advanced mode. Same shape as `/api/godmode` but for
  Claude's parameter set (temperature, top_k, max_tokens, effort). No stop sequences.
- `POST /api/models` — Returns the live Gemini model catalog (see "Model system"
  below). Takes `{ apiKey }`, returns `{ models, fetchedAt, fallback }`.
- `POST /api/claude-models` — Same shape, for the Claude model catalog.
- `POST /api/verify-translation` / `POST /api/verify-translation-claude` — independent
  accuracy-verification pass (Gemini/Claude respectively). A fresh model call with no memory
  of having written the translation; grades a given translation against the exact numbered
  checklist from that language's `<critique>` block. Returns
  `{ checklist, results[], allPassed, usage }` as structured JSON. See "Two-phase translation &
  verification retry loop" below.
- `POST /api/fix-translation` / `POST /api/fix-translation-claude` — given the original text,
  the current translation, and the specific failing checklist items (with the verifier's
  notes), returns a targeted revision fixing only those items. Called by the verification
  retry loop, not exposed as a standalone UI action.

### God Mode parameters (as of this writing)

**Gemini (`/api/godmode`):** temperature, topP, topK, maxOutputTokens, presencePenalty,
frequencyPenalty, seed, and **Thinking Level** (`thinkingLevel`: MINIMAL/LOW/MEDIUM/HIGH,
maps to `generationConfig.thinkingConfig.thinkingLevel` in the `@google/genai` SDK — Gemini
3.x models think by default, this controls how much). No stop sequences (removed on request —
was UI clutter no one used).

**Claude (`/api/godmode-claude`):** temperature, top_k, max_tokens, and **Effort**
(`effort`: low/medium/high/xhigh/max, maps to `output_config.effort` on the raw Anthropic
request). Both temperature/top_k and effort are **model-gated, not both always sent**:
- `supportsSamplingParams(model)` (in `claude-translation-models.ts`) — true for Haiku, false
  for the Opus-5x/Sonnet-5x family. Gates temperature/top_k.
- `supportsEffort(model)` — the inverse: true for Opus-5x/Sonnet-5x, false for Haiku.
  Gates `output_config.effort`.

These two are currently exact opposites for the 3 models we fetch (Opus 5.5 gets effort not
sampling, Haiku 4.5 gets sampling not effort, Sonnet 5 gets effort not sampling) but are
written as **independent checks**, not derived from each other — a future model could support
both, neither, or a different split. `GodModeClaudeApp` disables+greys the irrelevant
control(s) with an inline note rather than hiding them, so the UI doesn't silently drop a
setting the user just changed. No stop sequences (removed on request).

All routes validate `apiKey.trim().length >= 10` and return 400 on missing required fields.
None of the routes persist the API key.

## Model system

### Gemini (dynamic, via "-latest" aliases)

Historically the Gemini model list was a hardcoded array, then briefly a scan of the whole
live catalog ranked by recency. It's now simpler: Google publishes 3 aliases that always point
at whichever build is current for that tier, so the dropdown is just those 3, with token
limits fetched live (pricing is still a local table — the API doesn't return it):

- `src/lib/gemini-models.ts` — `fetchGeminiModels(apiKey)` calls `ai.models.get({model: id})`
  once per alias for exactly 3 ids: `gemini-pro-latest`, `gemini-flash-latest`,
  `gemini-flash-lite-latest`. Labels are **fixed text, not the API's `displayName`** (which
  just echoes the alias name back) — currently "Gemini 3.1 Pro" / "Gemini 3.8 Flash" /
  "Gemini 3.5 Flash Lite"; update these by hand when an alias moves to a new underlying model
  (there's no automated way to detect that from the API). Each alias is fetched independently
  (`Promise.all` + per-call `try/catch`) so one failing alias doesn't take down the other two.
- `src/lib/gemini-models-cache.ts` — `getCachedGeminiModels(apiKey)` wraps the above with a
  **7-day TTL cache**, memory-first then falling back to a JSON file at `.cache/gemini-models.json`
  (gitignored) so the cache survives process restarts. If a refresh attempt fails and a stale
  cache exists, the stale cache is served rather than throwing.
- `src/app/api/models/route.ts` — the endpoint above. On any failure (bad key, network, etc.)
  it degrades to `FALLBACK_MODELS` from `translation-models.ts` rather than erroring out, so
  the model picker is never empty.
- `src/lib/useGeminiModels.ts` — client hook used by `TranslatorApp` and `GodModeApp`. Fetches
  once per distinct API key, exposes `{ models, isLoading, fetchedAt }`. Both apps have an
  effect that snaps `selectedModel` back to `models[0].id` if the currently selected id isn't
  in the freshly loaded list (i.e. when the fallback list is replaced by the live one).
- `src/components/ModelInfoModal.tsx` — **shared by both Gemini and Claude apps** (all four:
  `TranslatorApp`, `GodModeApp`, `TranslatorClaudeApp`, `GodModeClaudeApp`). Popup opened by
  clicking the "Input token limit" / "Output token limit" flash text next to the model
  dropdown; lists every currently loaded model with input/output token limits, a
  badge (Pro/Opus/Sonnet/Haiku)+Selected tag, cost per 1M tokens in $ and ₹ (in/out), and cost
  per 1 lakh characters in $ and ₹ (see `src/lib/pricing.ts` for the currency/cost math —
  `USD_TO_INR` is a hardcoded approximate rate, not live; `costPerLakhChars` assumes
  ~4 chars/token, counted once as input and once as output, matching this app's own char→token
  estimate shown elsewhere in the UI).

Each Gemini model object: `{ id, label, inputTokenLimit, outputTokenLimit, isPro, badge?,
pricing? }` (`badge`/`pricing` are attached client-side in `useGeminiModels.ts`, not by the
API route). Claude model objects use `{ id, label, inputTokenLimit, outputTokenLimit, badge,
pricing }` (badge/pricing always present, attached server-side in `claude-models.ts`). There is
no "max output tokens" concept as a separate static table for either provider —
`outputTokenLimit` from the live/fallback model *is* the ceiling used everywhere.

Pricing: exact-id tables (`MODEL_PRICING` in `translation-models.ts`, `CLAUDE_MODEL_PRICING` in
`claude-translation-models.ts`) take priority; unknown/future model ids fall back to a
tier-based estimate (Gemini: Pro vs. Flash bracket in `useGeminiModels.ts`; Claude: per-family
bracket in `claude-models.ts`) rather than showing no price at all.

### Claude (dynamic, mirrors Gemini)

Also fetched live now, narrowed to 3 models — the most recent of each of Opus/Sonnet/Haiku:

- `src/lib/claude-models.ts` — `fetchClaudeModels(apiKey)` calls Anthropic's `GET /v1/models`
  (raw `fetch`, no SDK — matches the rest of the Claude routes). That endpoint only returns
  `id`/`display_name`/`created_at` (no token limits or pricing), so token limits and pricing
  are filled in from a **per-family default table** (`FAMILY_INPUT_TOKEN_LIMIT`,
  `FAMILY_OUTPUT_TOKEN_LIMIT`, `FAMILY_PRICING`), with an exact-id override from
  `CLAUDE_MODEL_PRICING` when known. Family is detected by regex on the id (`opus`/`sonnet`/`haiku`
  anywhere in it); most-recent-per-family is picked by `created_at`.
- `src/lib/claude-models-cache.ts` / `src/app/api/claude-models/route.ts` /
  `src/lib/useClaudeModels.ts` — same 7-day-cache-then-fallback pattern as the Gemini trio.
  Fallback list: `FALLBACK_CLAUDE_MODELS` in `claude-translation-models.ts`.
- `isAllowedClaudeModel(model)` (server-side gate in both Claude routes) now checks the id
  **shape** (`^claude-(opus|sonnet|haiku)-\d`) instead of an exact allowlist, since the live
  catalog's ids change over time.
- **Sampling params gotcha:** `claude-opus-5*`/`claude-sonnet-5*` (current generation) reject
  `temperature`/`top_p`/`top_k` outright (400) — Claude decides sampling itself on these
  models. Only Haiku (and any older opus/sonnet id, which the dynamic catalog no longer
  surfaces but could still be typed in directly) still accept them.
  `supportsSamplingParams(model)` in `claude-translation-models.ts` gates whether
  `translate-claude`/`godmode-claude` routes include those fields in the Anthropic request —
  check it before adding any new sampling-style parameter. `GodModeClaudeApp` disables and
  greys out the Creativity/Top-K sliders when the selected model doesn't support them.
- Current generation as of this writing: **Opus 5.5** (`claude-opus-5-5`), **Sonnet 5**
  (`claude-sonnet-5`), **Haiku 4.5** (`claude-haiku-4-5`) — verify against
  `platform.claude.com/docs/en/models/overview` before trusting this list blindly; it was
  wrong once already in this project's history (see changelog) and Anthropic ships new
  generations faster than this file gets updated.

## Languages

`src/lib/translation-models.ts` → `LANGUAGE_NAMES` is the canonical code→name map, used by
the API routes (e.g. to interpolate `{sourceLang}`/`{targetLang}` into system prompts). All
four apps (`TranslatorApp`, `GodModeApp`, `TranslatorClaudeApp`, `GodModeClaudeApp`) duplicate
a `LANGUAGES` list locally (12 entries: `auto` pinned first, then alphabetical — Arabic,
English, French, German, Greek, Japanese, Mandarin Chinese, Portuguese, Spanish, Turkish,
Vietnamese) and use it for **both** the "From" and "To" dropdowns
(`TARGET_LANGUAGES = LANGUAGES.filter(l => l.code !== "auto")`) — "To" is not restricted to a
subset.

Only `de`/`tr`/`vi` have a **dedicated system prompt file**, and the two consumers in
`src/lib/translation-system-prompt.ts` handle that gap differently on purpose:

- `src/lib/translation-system-prompt-de.ts` / `-tr.ts` / `-vi.ts` — the 3 hand-written templates.
- `buildTranslationSystemPrompt(sourceLang, targetLang)` — used server-side by the **simple**
  `/api/translate` flow, which has no UI for the user to see or edit the prompt. This one
  **must always produce a working instruction**, so it falls back to the German builder for
  any other target (just with `{targetLang}` interpolated to the new language's name) rather
  than fail or emit a placeholder. Translating into Arabic/English/French/Greek/Japanese/
  Mandarin/Portuguese/Spanish via simple mode works, quietly reusing German-tuned phrasing.
  Known, accepted trade-off — not a bug.
- `getPromptTemplateForLang(targetLang)` — used **client-side only**, to seed God Mode's
  editable System Prompt textarea (initial value + "Reset" button) in both Gemini and Claude
  God Mode apps. Unlike the builder above, this one does **not** silently substitute the
  German template for unsupported targets — it returns a placeholder string telling the user
  there's no predefined prompt for that language and that they can write their own. This is
  safe here specifically because the textarea's content is what actually gets sent as the
  system prompt in God Mode requests — the placeholder is meant to be overwritten, not used
  as-is. Don't reuse `getPromptTemplateForLang`'s output as a real instruction anywhere else.

If you add a dedicated prompt file for another language, wire it into **both**
`PROMPT_BUILDERS` and `PROMPT_TEMPLATES` in `translation-system-prompt.ts` — missing one means
simple mode and God Mode disagree about whether that language has a real prompt.

The "To" dropdown in all four apps colors languages without a dedicated prompt file
(`hasDedicatedPrompt()` / `LANGUAGES_WITH_PROMPT` in `translation-models.ts`) in violet
(`#a78bfa`) via an inline `<option>` style — a visual hint that they silently fall back to the
German template. Color only, no label text.

## Two-phase translation & verification retry loop

Each dedicated-language prompt (`de`/`tr`/`vi`) asks the model for three tagged sections in
one generation: `<draft>` → `<critique>` (a numbered self-graded PASS/FAIL checklist, 15 items
as of this writing — see the individual prompt files) → `<final>`. Both `/api/translate` and
`/api/translate-claude` parse all three out of the raw response and return
`draftText`/`critiqueText` alongside `translatedText`; `TranslatorApp`/`TranslatorClaudeApp`
show them as **Draft**/**Critique** tabs that persist until the next translation is triggered,
rather than being discarded like a normal "thinking" trace. This costs nothing extra — the
model was already generating all three sections before this was surfaced in the UI.

`getVerificationChecklist(targetLang)` (`translation-system-prompt.ts`) extracts the numbered
items straight out of that language's `<critique>` block via regex, so the checklist used for
independent verification can never drift out of sync with the one the model self-grades
against. `getPromptTemplateForLang`/`buildTranslationSystemPrompt`'s German-fallback rule
applies here too (unsupported targets grade against German's checklist).

**Optional independent verification (opt-in, real extra cost):** a checkbox in each "Set API
Key" modal ("Run an independent accuracy verification pass after each translation"), persisted
to `sessionStorage` (`gemini_translator_verify_enabled` / `claude_translator_verify_enabled`,
off by default). When enabled, the simple Translator apps run a retry loop
(`runVerificationRetryLoop`) after the main translation:

1. `/api/verify-translation(-claude)` — a fresh model call, no memory of writing the
   translation, grades it against the checklist.
2. If any item fails, `/api/fix-translation(-claude)` is called with just the failing items +
   the verifier's notes, asking for a targeted revision (not a full retranslate).
3. Repeat from step 1 on the fixed text, up to `MAX_VERIFICATION_ATTEMPTS` (5, in
   `src/lib/verification.ts`) or until every item passes.

Each round is a separate network call, so each **Attempt N** tab appears the moment that round
actually finishes (a pulsing placeholder tab shows while one is in flight) rather than all at
once. The **Output** tab always reflects the latest (best) version — `translatedText` is
overwritten by each successful fix. This is not token streaming: the main translate call still
returns draft/critique/final together in one response; only the retry rounds are genuinely
incremental. `accumulateCost` folds every verify/fix call's usage into both the
per-translation ("Current") and session ("Session") cost totals shown in the tab bar. Not
implemented for God Mode — God Mode's system prompt is raw/user-editable with no
draft/critique/final structure to verify against.

## Branding

App name is "Smart TMS". `package.json` name: `smart-tms`. Logo badge letter is "S" (God Mode
pages keep their separate amber "G" badge, unrelated). The app's original name has been fully
purged from the codebase, docs, and this file on purpose — don't reintroduce it, including in
example URLs, referral params, or comments.

## Landing page effects

`src/components/CursorConstellation.tsx` — a canvas-only particle field modeled on
antigravity.google's hero animation, mounted once inside the landing page's hero `<section>`
(`src/app/page.tsx`). Particle count scales with container area (70–220, vs. a flat count
originally); each particle has a random hue across a cyan→violet→pink spectrum plus a
per-particle twinkle (sine-wave opacity pulse), and renders as a soft radial-gradient glow +
bright core with `globalCompositeOperation: "lighter"` so overlapping particles/lines actually
brighten each other. Cursor interaction is real physics, not just drawn lines: nearby particles
are pulled toward the cursor with a slight tangential swirl (so they orbit rather than pile
straight onto it), with drag and a speed cap so motion settles rather than runs away; a soft
violet halo is also drawn centered on the cursor. Reads the parent's bounding rect for sizing
(mount it inside a `position: relative` container), no-ops under
`prefers-reduced-motion: reduce`. Not used anywhere else in the app — the `/translate*`/
`/godmode*` pages are functional surfaces where this kind of motion would be a
distraction, not a translate-app-wide chrome element.

The "God Mode" badge text (both `godmode/page.tsx` and `godmode/claude/page.tsx` headers) has
a subtle `.godmode-heartbeat` pulse (`globals.css`: scale/opacity keyframes, ~2.4s loop,
no-ops under `prefers-reduced-motion: reduce`) — purely decorative, not tied to any loading
state.

## UI conventions worth knowing before editing

- Both simple apps (`TranslatorApp`, `TranslatorClaudeApp`) and both God Mode apps
  (`GodModeApp`, `GodModeClaudeApp`) are large, mostly self-contained single-file components —
  no shared base component between simple/advanced modes (some duplication is intentional/accepted).
  Gemini and Claude variants share **no** code either; the only shared cross-provider module is
  `translation-models.ts`'s `LANGUAGE_NAMES` and the (now dynamic) Gemini model plumbing.
- The "token-meta-slider" (`globals.css`) is a small CSS-only vertical marquee that cycles
  through `<li class="token-meta-item">` entries. It currently expects **exactly 3 `<li>`s**:
  real item 1, real item 2, then a duplicate of item 1 (`aria-hidden`) so the loop-back snap is
  invisible. The `@keyframes tokenMetaSlide` has 3 stops (`0%/30%`, `45%/75%`, `100%`) to match.
  If you add/remove a displayed metric here, update both the `<li>` count and the keyframe
  stop count together.
- Translation flow (`handleTranslate`) vs. "Translate and Review" flow
  (`handleTranslateAndReview`) both exist in the two **Gemini** apps only
  (`TranslatorApp`, `GodModeApp`). `/api/review-translation` is Gemini-only. The two **Claude**
  apps (`TranslatorClaudeApp`, `GodModeClaudeApp`) have no review step at all — just a single
  translate action. Don't assume feature parity between the Gemini and Claude tracks.
- API keys and cost/session totals are per-tab, in-memory + `sessionStorage` only; refreshing
  the tab keeps the key (sessionStorage persists across reload, cleared on tab close), but
  `totalCost` (session spend tracker) resets on reload since it's plain React state.
- Live cost figures (Current/Session in the tab bar, per-translation cost in the Output panel)
  are shown to 2 decimal places (`toFixed(2)`) across all four apps — cheap single translations
  can legitimately round to `$0.00`; this is a deliberate readability choice, not a bug.
- The translating/verifying loading visual is `.ai-orb` (globals.css) — a spinning conic
  gradient ring + pulsing core + expanding rings + progress sweep — used identically for the
  main translate wait and for each verification/fix round, across all four apps. Replaced the
  old `.translation-canvas` shimmer-bar animation (removed).

## Build/run

Standard Next.js: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`. No test
suite exists. TypeScript strict-ish config; `npx tsc --noEmit` is the fastest correctness check.
`.cache/gemini-models.json` is created on first successful `/api/models` call and is gitignored.

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite (Preview)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "gemini-flash-latest", label: "Gemini Flash (Latest)" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
] as const;

const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  "gemini-2.0-flash": 8192,
  "gemini-2.5-flash": 65536,
  "gemini-3.1-flash-lite-preview": 65536,
  "gemini-3.1-pro-preview": 65536,
  "gemini-3-flash-preview": 65536,
  "gemini-flash-latest": 65536,
  "gemini-3-pro-preview": 65536,
};

const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

const LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "tr", label: "Turkish" },
  { code: "de", label: "German" },
  { code: "vi", label: "Vietnamese" },
] as const;

const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.code !== "auto");

const API_KEY_STORAGE_KEY = "gemini_translator_api_key";
const TARGET_LANG_STORAGE_KEY = "gemini_translator_target_lang";
const API_KEY_UPDATED_EVENT = "gemini-api-key-updated";
const REVIEW_START_DELAY_MS = 5000;
const LOADING_MESSAGES = [
  "Powered by Google AI",
  "Inference pipeline initialized",
  "Optimizing translation quality",
  "Aligning output structure",
  "Preserving context and tone",
  "Formatting output for quick use",
  "Cutting hours of manual effort",
] as const;

// ─── Icons (inline SVG) ─────────────────────────────────────────────────────

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconSwap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function IconTranslate() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  );
}

function IconClear() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TranslatorApp() {
  // State
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.1-flash-lite-preview");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("es");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isReviewPending, setIsReviewPending] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [activePanel, setActivePanel] = useState<"input" | "output">("input");
  const [reviewSummary, setReviewSummary] = useState<string[]>([]);
  const [correctedVersion, setCorrectedVersion] = useState<string | null>(null);
  const [reviewHasIssues, setReviewHasIssues] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null>(null);

  const activeMaxOutputTokens =
    MODEL_MAX_OUTPUT_TOKENS[selectedModel] ?? DEFAULT_MAX_OUTPUT_TOKENS;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load API key from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored) setApiKey(stored);
    } catch {
      // sessionStorage not available
    }
  }, []);

  // Keep API key in sync when updated from header modal.
  useEffect(() => {
    const handleApiKeyUpdated = () => {
      try {
        const stored = sessionStorage.getItem(API_KEY_STORAGE_KEY) || "";
        setApiKey(stored);
      } catch {
        // sessionStorage not available
      }
    };

    window.addEventListener(API_KEY_UPDATED_EVENT, handleApiKeyUpdated);
    return () => window.removeEventListener(API_KEY_UPDATED_EVENT, handleApiKeyUpdated);
  }, []);

  // Load target language from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(TARGET_LANG_STORAGE_KEY);
      if (stored && TARGET_LANGUAGES.some((l) => l.code === stored)) {
        setTargetLang(stored);
      }
    } catch {
      // sessionStorage not available
    }
  }, []);

  const handleTargetLangChange = (value: string) => {
    setTargetLang(value);
    try {
      sessionStorage.setItem(TARGET_LANG_STORAGE_KEY, value);
    } catch {
      // sessionStorage not available
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.max(200, Math.min(textareaRef.current.scrollHeight, 500)) + "px";
    }
  }, [inputText]);

  // Update char count
  useEffect(() => {
    setCharCount(inputText.length);
  }, [inputText]);

  // Rotate short status messages while translating.
  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  // Swap languages
  const handleSwapLanguages = useCallback(() => {
    if (sourceLang === "auto") return;
    setSourceLang(targetLang);
    handleTargetLangChange(sourceLang);
  }, [sourceLang, targetLang]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = translatedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [translatedText]);

  const resetTranslationState = useCallback(() => {
    setInputText("");
    setTranslatedText("");
    setError(null);
    setTokenUsage(null);
    setReviewSummary([]);
    setCorrectedVersion(null);
    setReviewHasIssues(false);
    setIsReviewPending(false);
    setIsReviewLoading(false);
    setActivePanel("input");
  }, []);

  const requestTranslation = useCallback(async () => {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: inputText,
        sourceLang,
        targetLang,
        model: selectedModel,
        apiKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Translation failed.");
    }

    setTranslatedText(data.translatedText);
    setActivePanel("output");

    if (data.usage) {
      setTokenUsage(data.usage);
      console.group("%c[Gemini] Token Usage", "color:#22d3ee;font-weight:bold");
      console.log("Input tokens: ", data.usage.inputTokens);
      console.log("Output tokens:", data.usage.outputTokens);
      console.log("Total tokens: ", data.usage.totalTokens);
      console.groupEnd();
    }

    return data.translatedText as string;
  }, [apiKey, inputText, selectedModel, sourceLang, targetLang]);

  const requestReview = useCallback(async (draftTranslation: string) => {
    const response = await fetch("/api/review-translation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalText: inputText,
        translatedText: draftTranslation,
        targetLang,
        model: selectedModel,
        apiKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Review failed.");
    }

    setReviewHasIssues(Boolean(data.hasIssues));
    setReviewSummary(Array.isArray(data.issues) ? data.issues.slice(0, 5) : []);
    setCorrectedVersion(data.correctedTranslation || null);
  }, [apiKey, inputText, selectedModel, targetLang]);

  // Translate
  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to translate.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Please enter your Gemini API key.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranslatedText("");
    setReviewSummary([]);
    setCorrectedVersion(null);
    setReviewHasIssues(false);
    setActivePanel("output");

    try {
      await requestTranslation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, inputText, requestTranslation]);

  const handleTranslateAndReview = useCallback(async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to translate.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Please enter your Gemini API key.");
      return;
    }

    setIsLoading(true);
    setIsReviewLoading(false);
    setIsReviewPending(false);
    setError(null);
    setTranslatedText("");
    setReviewSummary([]);
    setCorrectedVersion(null);
    setReviewHasIssues(false);
    setActivePanel("output");

    try {
      const draft = await requestTranslation();

      // Stage 1 complete: show translation result before review starts.
      setIsLoading(false);
      setIsReviewPending(true);
      await new Promise((resolve) => window.setTimeout(resolve, REVIEW_START_DELAY_MS));

      setIsReviewPending(false);
      setIsReviewLoading(true);
      await requestReview(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
      setIsReviewPending(false);
      setIsReviewLoading(false);
    }
  }, [apiKey, inputText, requestReview, requestTranslation]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleTranslate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleTranslate]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Controls Row */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] gap-3 items-end">
          {/* Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block font-display">
                Model
              </label>
              <span className="text-[10px] text-gray-500 font-display tabular-nums whitespace-nowrap">
                Max output: {activeMaxOutputTokens.toLocaleString()} tokens
              </span>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-[#12141c] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-gray-200 font-display cursor-pointer transition-all appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
              }}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selection */}
          <div className="flex items-end gap-2 min-w-0">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block font-display">
                From
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full bg-[#12141c] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-gray-200 font-display cursor-pointer transition-all appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSwapLanguages}
              disabled={sourceLang === "auto"}
              className="mb-0.5 p-2.5 rounded-lg border border-[#2a2d3a] bg-[#12141c] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Swap languages"
              type="button"
            >
              <IconSwap />
            </button>

            <div className="flex-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block font-display">
                To
              </label>
              <select
                value={targetLang}
                onChange={(e) => handleTargetLangChange(e.target.value)}
                className="w-full bg-[#12141c] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-gray-200 font-display cursor-pointer transition-all appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                }}
              >
                {TARGET_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Input / Output Tabs */}
      <div className="glass-card p-4 flex flex-col min-h-[520px]">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActivePanel("input")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display uppercase tracking-wider transition-all ${activePanel === "input"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-[#12141c] text-gray-400 border border-[#2a2d3a] hover:text-gray-200"
              }`}
          >
            Input
          </button>
          <button
            type="button"
            onClick={() => setActivePanel("output")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display uppercase tracking-wider transition-all ${activePanel === "output"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-[#12141c] text-gray-400 border border-[#2a2d3a] hover:text-gray-200"
              }`}
          >
            Output
          </button>
          {!apiKey.trim() && (
            <span className="ml-auto text-[11px] text-amber-300/90 font-display">
              Set API key from top nav to start translating
            </span>
          )}
        </div>

        {activePanel === "input" ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider font-display">
                Input
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 font-display tabular-nums">
                  {charCount.toLocaleString()} chars
                  {charCount > 0 && (
                    <> | ~{Math.ceil(charCount / 4).toLocaleString()} tokens</>
                  )}
                </span>
                {inputText && (
                  <button
                    onClick={resetTranslationState}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    title="Clear input"
                    type="button"
                  >
                    <IconClear />
                  </button>
                )}
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="add your content here and translate.."
              className="flex-1 w-full bg-[#12141c] border border-[#2a2d3a] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder:text-gray-500 font-display leading-relaxed resize-none min-h-[360px] transition-all"
              spellCheck={false}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider font-display">
                Output
              </span>
              {(translatedText || isReviewLoading) && (
                <div className="flex items-center gap-3">
                  {translatedText && !isLoading && (
                    <button
                      onClick={resetTranslationState}
                      className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-display"
                      type="button"
                    >
                      New Translation
                    </button>
                  )}
                  <span className="text-[10px] text-gray-500 font-display tabular-nums">
                    {translatedText.length.toLocaleString()} chars
                    {tokenUsage && (
                      <> | {tokenUsage.outputTokens.toLocaleString()} tokens</>
                    )}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-cyan-400 transition-colors font-display"
                    type="button"
                  >
                    {copied ? (
                      <>
                        <IconCheck />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <IconCopy />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="output-block flex-1 min-h-[360px] overflow-auto">
              {isLoading ? (
                <div className="translation-wow h-full min-h-[360px] flex items-center justify-center p-6">
                  <div className="translation-wow-card">
                    <p className="translation-wow-title">Translator Agent In Action</p>
                    <div className="translation-canvas" aria-hidden="true" />
                    <div className="translation-message-rail">
                      <span className="translation-message-text" key={loadingMessageIndex}>
                        {LOADING_MESSAGES[loadingMessageIndex]}
                      </span>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="p-4 flex flex-col items-center justify-center min-h-[360px] gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-lg">
                    !
                  </div>
                  <p className="text-sm text-red-400 text-center max-w-sm leading-relaxed">
                    {error}
                  </p>
                  <button
                    onClick={handleTranslate}
                    className="mt-1 text-xs text-gray-400 hover:text-cyan-400 transition-colors font-display underline underline-offset-2"
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              ) : translatedText ? (
                <pre className="p-4">
                  <code className="text-gray-200">{translatedText}</code>
                </pre>
              ) : (
                <div className="p-4 flex items-center justify-center min-h-[360px]">
                  <p className="text-sm text-gray-500 text-center font-display">
                    Translation will appear here
                  </p>
                </div>
              )}
            </div>

            {translatedText && (
              <div className="mt-3 p-3 rounded-lg border border-[#2a2d3a] bg-[#12141c]">
                {isReviewPending ? (
                  <div className="flex items-center gap-2 text-xs text-blue-300 font-display">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    Translation agent done. Starting review agent in 5 seconds...
                  </div>
                ) : isReviewLoading ? (
                  <div className="flex items-center gap-2 text-xs text-cyan-300 font-display">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Review agent working on quality and accuracy checks...
                  </div>
                ) : reviewSummary.length > 0 || reviewHasIssues ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold font-display text-gray-300 uppercase tracking-wider">
                      Review Summary
                    </p>
                    {reviewSummary.length > 0 ? (
                      <ul className="text-xs text-gray-300 space-y-1 font-display list-disc list-inside">
                        {reviewSummary.map((issue, idx) => (
                          <li key={`${issue}-${idx}`}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-300 font-display">
                        No issues found. Translation looks good.
                      </p>
                    )}
                    {reviewHasIssues && correctedVersion && (
                      <button
                        onClick={() => {
                          setTranslatedText(correctedVersion);
                          setReviewHasIssues(false);
                        }}
                        className="mt-1 px-3 py-2 rounded-md border border-cyan-500/30 text-xs text-cyan-300 hover:text-cyan-200 hover:border-cyan-400/50 transition-colors font-display"
                        type="button"
                      >
                        Provide corrected version
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 font-display">
                    Use Translate and Review for a second-pass quality check.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-4">
          {translatedText && !isLoading ? (
            <button
              onClick={resetTranslationState}
              className="w-full py-3 px-6 rounded-lg border border-[#2a2d3a] bg-[#12141c] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/40 font-semibold text-sm font-display transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              type="button"
            >
              <IconClear />
              <span>New Translation</span>
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleTranslate}
                disabled={isLoading || isReviewPending || isReviewLoading || !inputText.trim() || !apiKey.trim()}
                className={`btn-translate w-full py-3 px-6 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm font-display disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isLoading && !isReviewLoading ? "btn-translate-live" : ""}`}
                type="button"
              >
                {isLoading && !isReviewLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="loading-text-shimmer">Translating...</span>
                  </span>
                ) : (
                  <>
                    <IconTranslate />
                    <span>Translate</span>
                    <span className="text-white/50 text-xs ml-1 hidden sm:inline">⌘↵</span>
                  </>
                )}
              </button>

              <button
                onClick={handleTranslateAndReview}
                disabled={isLoading || isReviewPending || isReviewLoading || !inputText.trim() || !apiKey.trim()}
                className={`btn-translate w-full py-3 px-6 rounded-lg border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-semibold text-sm font-display disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${(isLoading || isReviewLoading) ? "btn-translate-live" : ""}`}
                type="button"
              >
                {isReviewLoading ? (
                  <span className="loading-text-shimmer">Reviewing...</span>
                ) : (
                  <>
                    <IconTranslate />
                    <span>Translate and Review</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

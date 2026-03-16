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

function IconKey() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
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
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [activePanel, setActivePanel] = useState<"input" | "output">("input");
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

  // Save API key to sessionStorage
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    try {
      if (value) {
        sessionStorage.setItem(API_KEY_STORAGE_KEY, value);
      } else {
        sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {
      // sessionStorage not available
    }
  };

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
    setActivePanel("output");

    try {
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

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, apiKey, sourceLang, targetLang, selectedModel]);

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
      {/* API Key Section */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <IconKey />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-display">
            API Key
          </span>
          <span className="text-[10px] text-gray-400 ml-auto font-display">
            Session only
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="w-full bg-[#12141c] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 font-display pr-10 transition-all"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              title={showApiKey ? "Hide API key" : "Show API key"}
              type="button"
            >
              {showApiKey ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
        </div>
      </div>

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
                    onClick={() => {
                      setInputText("");
                      setTranslatedText("");
                      setError(null);
                      setTokenUsage(null);
                    }}
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
              {translatedText && (
                <div className="flex items-center gap-3">
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
                    <div className="translation-orb" aria-hidden="true" />
                    <p className="translation-wow-title">Crafting your translation...</p>
                    <p className="translation-wow-subtitle">Gemini is preserving markup and structure while translating.</p>
                    <div className="translation-wow-bars" aria-hidden="true">
                      <span />
                      <span />
                      <span />
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
          </>
        )}

        <div className="mt-4">
          {translatedText && !isLoading ? (
            <button
              onClick={() => {
                setInputText("");
                setTranslatedText("");
                setError(null);
                setTokenUsage(null);
                setActivePanel("input");
              }}
              className="w-full py-3 px-6 rounded-lg border border-[#2a2d3a] bg-[#12141c] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/40 font-semibold text-sm font-display transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              type="button"
            >
              <IconClear />
              <span>New Translation</span>
            </button>
          ) : (
            <button
              onClick={handleTranslate}
              disabled={isLoading || !inputText.trim() || !apiKey.trim()}
              className={`btn-translate w-full py-3 px-6 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm font-display disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isLoading ? "btn-translate-live" : ""}`}
              type="button"
            >
              {isLoading ? (
                <>
                  <span className="dot-pulse flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                  </span>
                  <span>Translating with Gemini...</span>
                </>
              ) : (
                <>
                  <IconTranslate />
                  <span>Process..</span>
                  <span className="text-white/50 text-xs ml-1 hidden sm:inline">⌘↵</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

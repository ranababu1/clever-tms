"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  CLAUDE_MODELS,
  CLAUDE_MODEL_MAX_OUTPUT_TOKENS,
  CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS,
  CLAUDE_GODMODE_MAX_OUTPUT_CAP,
  CLAUDE_MODEL_PRICING,
} from "@/lib/claude-translation-models";
import { getPromptTemplateForLang } from "@/lib/translation-system-prompt";

const LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "tr", label: "Turkish" },
  { code: "de", label: "German" },
  { code: "vi", label: "Vietnamese" },
] as const;

const TARGET_LANGUAGES = LANGUAGES.filter((l) => ["de", "tr", "vi"].includes(l.code));
const API_KEY_STORAGE_KEY = "claude_translator_api_key";
const API_KEY_UPDATED_EVENT = "claude-api-key-updated";

const LOADING_MESSAGES = [
  "Powered by Anthropic Models",
  "Inference pipeline initialized",
  "Optimizing translation quality",
  "Preserving context and tone",
  "Formatting output for quick use",
  "Cutting hours of manual effort",
] as const;

function sliderStyle(value: number, min: number, max: number): React.CSSProperties {
  const pct = ((value - min) / (max - min)) * 100;
  return { background: `linear-gradient(to right, #f59e0b ${pct}%, #2a2d3a ${pct}%)` };
}

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

export default function GodModeClaudeApp() {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("claude-sonnet-4-6");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("tr");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [activePanel, setActivePanel] = useState<"input" | "output">("input");
  const [tokenUsage, setTokenUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null>(null);
  const [translationCost, setTranslationCost] = useState<number | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  const [creativity, setCreativity] = useState(0.8);
  const [topK, setTopK] = useState(100);
  const [maxTokens, setMaxTokens] = useState(CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS);
  const [stopSequences, setStopSequences] = useState<string[]>([]);
  const [stopInput, setStopInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(() => getPromptTemplateForLang("de"));

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelCeiling = Math.min(
    CLAUDE_MODEL_MAX_OUTPUT_TOKENS[selectedModel] ?? CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS,
    CLAUDE_GODMODE_MAX_OUTPUT_CAP
  );

  useEffect(() => {
    setMaxTokens((prev) => Math.min(prev, modelCeiling));
  }, [modelCeiling]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored) setApiKey(stored);
    } catch {
      /* sessionStorage not available */
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        setApiKey(sessionStorage.getItem(API_KEY_STORAGE_KEY) || "");
      } catch {
        /* sessionStorage not available */
      }
    };
    window.addEventListener(API_KEY_UPDATED_EVENT, handler);
    return () => window.removeEventListener(API_KEY_UPDATED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.max(200, Math.min(textareaRef.current.scrollHeight, 500)) + "px";
    }
  }, [inputText]);

  useEffect(() => {
    setCharCount(inputText.length);
  }, [inputText]);

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

  const handleSwapLanguages = useCallback(() => {
    if (sourceLang === "auto") return;
    const prev = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prev);
  }, [sourceLang, targetLang]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
    } catch {
      const el = document.createElement("textarea");
      el.value = translatedText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [translatedText]);

  const handleAddStopSequence = useCallback(() => {
    const val = stopInput.trim();
    if (!val || stopSequences.length >= 4 || stopSequences.includes(val)) return;
    setStopSequences((prev) => [...prev, val]);
    setStopInput("");
  }, [stopInput, stopSequences]);

  const handleRemoveStopSequence = useCallback((idx: number) => {
    setStopSequences((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const resetTranslationState = useCallback(() => {
    setInputText("");
    setTranslatedText("");
    setError(null);
    setTokenUsage(null);
    setTranslationCost(null);
    setActivePanel("input");
  }, []);

  const requestTranslation = useCallback(async () => {
    const response = await fetch("/api/godmode-claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: inputText,
        sourceLang,
        targetLang,
        model: selectedModel,
        apiKey,
        systemPrompt,
        temperature: creativity,
        topK,
        maxOutputTokens: maxTokens,
        stopSequences,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Translation failed.");
    setTranslatedText(data.translatedText);
    setActivePanel("output");
    if (data.usage) {
      setTokenUsage(data.usage);
      const pricing = CLAUDE_MODEL_PRICING[selectedModel];
      if (pricing) {
        const cost =
          (data.usage.inputTokens / 1_000_000) * pricing.inputPer1M +
          (data.usage.outputTokens / 1_000_000) * pricing.outputPer1M;
        setTranslationCost(cost);
        setTotalCost((prev) => prev + cost);
      }
      console.group("%c[God Mode · Claude] Token Usage", "color:#f59e0b;font-weight:bold");
      console.log("Input tokens: ", data.usage.inputTokens);
      console.log("Output tokens:", data.usage.outputTokens);
      console.log("Total tokens: ", data.usage.totalTokens);
      console.groupEnd();
    }
    return data.translatedText as string;
  }, [
    apiKey,
    inputText,
    selectedModel,
    sourceLang,
    targetLang,
    systemPrompt,
    creativity,
    topK,
    maxTokens,
    stopSequences,
  ]);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to translate.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Please enter your Anthropic API key.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setTranslatedText("");
    setActivePanel("output");
    try {
      await requestTranslation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, inputText, requestTranslation]);

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
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] gap-3 items-end">
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider font-display">
                Model
              </label>
              <span className="text-[10px] text-gray-500 font-display tabular-nums whitespace-nowrap">
                Max: {modelCeiling.toLocaleString()} tokens
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
              {CLAUDE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
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
              title="Swap"
              type="button"
              className="mb-0.5 p-2.5 rounded-lg border border-[#2a2d3a] bg-[#12141c] text-gray-400 hover:text-amber-400 hover:border-amber-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <IconSwap />
            </button>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block font-display">
                To
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
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

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider font-display">
            Prompt Lab · Claude
          </span>
          <button
            type="button"
            onClick={() => {
              setCreativity(0.7);
              setTopK(40);
              setMaxTokens(Math.min(CLAUDE_DEFAULT_MAX_OUTPUT_TOKENS, modelCeiling));
              setStopSequences([]);
              setSystemPrompt(getPromptTemplateForLang(targetLang));
            }}
            className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors font-display underline underline-offset-2"
          >
            Reset all
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-semibold text-gray-200 font-display">Creativity (temperature)</label>
            <span className="text-xs text-amber-400 font-display tabular-nums font-semibold">
              {creativity.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={creativity}
            onChange={(e) => setCreativity(Number(e.target.value))}
            className="gm-slider"
            style={sliderStyle(creativity, 0, 1)}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-500 font-display">Accurate</span>
            <span className="text-[10px] text-gray-500 font-display">Creative</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-gray-200 font-display">Top-K</label>
              <span className="text-xs text-amber-400 font-display tabular-nums font-semibold">{topK}</span>
            </div>
            <input
              type="range"
              min="1"
              max="500"
              step="1"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="gm-slider"
              style={sliderStyle(topK, 1, 500)}
            />
            <p className="text-[11px] text-gray-600 font-display mt-2">
              Claude 4.x rejects sending top_p with temperature; this panel uses temperature + top_k only.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-200 font-display block mb-2.5">
              Max Output Tokens
            </label>
            <input
              type="number"
              min="1"
              max={modelCeiling}
              value={maxTokens}
              onChange={(e) =>
                setMaxTokens(Math.max(1, Math.min(modelCeiling, Number(e.target.value))))
              }
              className="w-full bg-[#12141c] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-gray-200 font-display tabular-nums transition-all"
            />
            <p className="text-[11px] text-gray-600 font-display mt-2">
              Capped at {modelCeiling.toLocaleString()} for this model.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2.5">
            <label className="text-xs font-semibold text-gray-200 font-display">Stop Sequences</label>
            <span className="text-[10px] text-gray-600 font-display">max 4</span>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={stopInput}
              onChange={(e) => setStopInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddStopSequence();
                }
              }}
              placeholder='e.g.  ###  or  </div>'
              className="flex-1 bg-[#12141c] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-gray-200 font-mono placeholder:text-gray-600 placeholder:font-sans transition-all"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleAddStopSequence}
              disabled={stopSequences.length >= 4 || !stopInput.trim()}
              className="px-4 py-2 rounded-lg bg-[#12141c] border border-[#2a2d3a] text-xs text-gray-300 hover:text-amber-400 hover:border-amber-400/30 disabled:opacity-40 disabled:cursor-not-allowed font-display transition-all"
            >
              Add
            </button>
          </div>
          {stopSequences.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {stopSequences.map((seq, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#12141c] border border-[#2a2d3a] text-xs text-gray-300 font-mono"
                >
                  {JSON.stringify(seq)}
                  <button
                    type="button"
                    onClick={() => handleRemoveStopSequence(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-semibold text-gray-200 font-display">System Prompt</label>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-gray-600 font-display hidden sm:inline">
                <code className="text-gray-500">{"{sourceLang}"}</code> and{" "}
                <code className="text-gray-500">{"{targetLang}"}</code> are substituted at request time
              </span>
              <button
                type="button"
                onClick={() => setSystemPrompt(getPromptTemplateForLang(targetLang))}
                className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors font-display underline underline-offset-2 whitespace-nowrap"
              >
                Reset
              </button>
            </div>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full bg-[#12141c] border border-[#2a2d3a] rounded-lg px-4 py-3 text-sm text-gray-200 font-display leading-relaxed resize-none min-h-[220px] transition-all"
            spellCheck={false}
            placeholder="Enter your system prompt..."
          />
          <p className="text-[11px] text-gray-600 font-display mt-1.5">
            Code/markup preservation and output formatting rules are enforced automatically and not editable here.
          </p>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col min-h-[520px]">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActivePanel("input")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display uppercase tracking-wider transition-all ${
              activePanel === "input"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-[#12141c] text-gray-400 border border-[#2a2d3a] hover:text-gray-200"
            }`}
          >
            Input
          </button>
          <button
            type="button"
            onClick={() => setActivePanel("output")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display uppercase tracking-wider transition-all ${
              activePanel === "output"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-[#12141c] text-gray-400 border border-[#2a2d3a] hover:text-gray-200"
            }`}
          >
            Output
          </button>
          {!apiKey.trim() && (
            <span className="ml-auto text-[11px] text-amber-300/90 font-display">Set API key to start</span>
          )}
          {totalCost > 0 && (
            <span className="ml-auto text-[11px] text-amber-400/80 font-display tabular-nums">Session: ${totalCost.toFixed(6)}</span>
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
                  {charCount > 0 && <> | ~{Math.ceil(charCount / 4).toLocaleString()} tokens</>}
                </span>
                {inputText && (
                  <button
                    onClick={resetTranslationState}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    title="Clear"
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
              placeholder="Add your content here and translate..."
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
                    {tokenUsage && <> | {tokenUsage.outputTokens.toLocaleString()} tokens</>}
                    {translationCost != null && <> | ${translationCost.toFixed(6)}</>}
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
                  <p className="text-sm text-red-400 text-center max-w-sm leading-relaxed">{error}</p>
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
                  <p className="text-sm text-gray-500 text-center font-display">Translation will appear here</p>
                </div>
              )}
            </div>
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
            <button
              onClick={handleTranslate}
              disabled={isLoading || !inputText.trim() || !apiKey.trim()}
              className={`btn-translate w-full py-3 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm font-display disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                isLoading ? "btn-translate-live" : ""
              }`}
              type="button"
            >
              {isLoading ? (
                <span className="loading-text-shimmer">Translating...</span>
              ) : (
                <>
                  <IconTranslate />
                  <span>Translate</span>
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

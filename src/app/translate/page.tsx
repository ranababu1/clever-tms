"use client";

import { useEffect, useState } from "react";
import TranslatorApp from "@/components/TranslatorApp";

const API_KEY_STORAGE_KEY = "gemini_translator_api_key";
const API_KEY_UPDATED_EVENT = "gemini-api-key-updated";

export default function TranslatePage() {
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(API_KEY_STORAGE_KEY) || "";
      setApiKeyDraft(stored);
    } catch {
      // sessionStorage not available
    }
  }, []);

  const saveApiKey = () => {
    try {
      if (apiKeyDraft.trim()) {
        sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKeyDraft.trim());
      } else {
        sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      }
      window.dispatchEvent(new Event(API_KEY_UPDATED_EVENT));
    } catch {
      // sessionStorage not available
    }
    setIsApiKeyModalOpen(false);
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-[#2a2d3a] bg-[#13151e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-white font-bold text-sm font-display">
                C
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight font-display text-white">
                  Clever TMS
                </h1>
                <p className="text-[11px] text-gray-400 tracking-wide uppercase font-display">
                  Powered by Google AI Models
                </p>
              </div>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsApiKeyModalOpen(true)}
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-display"
            >
              Set API Key
            </button>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-display"
            >
              Get API Key
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <TranslatorApp />
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-[#2a2d3a] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs text-gray-500 font-display">
            Powered by Google Gemini
          </p>
        </div>
      </footer>

      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setIsApiKeyModalOpen(false)}
            aria-label="Close API key modal"
          />
          <div className="relative w-full max-w-lg glass-card p-5 sm:p-6 border border-[#2a2d3a]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm sm:text-base font-semibold text-white font-display">Set API Key</h2>
              <span className="text-[10px] text-gray-400 font-display uppercase tracking-wider">Session only</span>
            </div>

            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder="Paste your Gemini API key"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-[#12141c] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 font-display pr-16 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-cyan-300 font-display"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="px-3 py-2 rounded-lg border border-[#2a2d3a] text-xs text-gray-300 hover:text-white font-display"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveApiKey}
                className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold font-display"
              >
                Save API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

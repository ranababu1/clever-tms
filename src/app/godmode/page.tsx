"use client";

import Link from "next/link";
import GodModeApp from "@/components/GodModeApp";

export default function GodModePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-[#2a2d3a] bg-[#13151e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-sm font-display">
              G
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight font-display text-white">Clever TMS</h1>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/25 font-display">
                  God Mode
                </span>
              </div>
              <p className="text-[11px] text-gray-400 tracking-wide uppercase font-display">
                Unrestricted · Full Control
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/godmode/claude"
              className="hidden sm:inline text-xs text-gray-500 hover:text-violet-300 transition-colors font-display"
            >
              Claude god mode →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <GodModeApp />
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-[#2a2d3a] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs text-gray-600 font-display">
            Powered by Google Gemini · God Mode
          </p>
        </div>
      </footer>
    </main>
  );
}

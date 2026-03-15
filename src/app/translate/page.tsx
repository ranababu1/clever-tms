import TranslatorApp from "@/components/TranslatorApp";

export default function TranslatePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-[#2a2d3a] bg-[#13151e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
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
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-display"
          >
            Get API Key
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <TranslatorApp />
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-[#2a2d3a] py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs text-gray-500 font-display">
            Powered by Google Gemini
          </p>
        </div>
      </footer>
    </main>
  );
}

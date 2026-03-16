import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Header / Navbar ── */}
      <header className="w-full border-b border-[#2a2d3a] bg-[#13151e]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-base font-display">
              C
            </div>
            <span className="text-lg font-bold tracking-tight font-display bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Clever TMS
            </span>
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink href="https://aieditor.imrn.dev/?ref=clevertms">AI Image Editor</NavLink>
            <NavLink href="https://audit.imrn.dev/?ref=clevertms">Web Asset Audit</NavLink>
            <NavLink href="https://pixfix.imrn.dev/?ref=clevertms">Image Optimizer</NavLink>
            <NavLink href="https://crawler.imrn.dev/?ref=clevertms">Web Crawler</NavLink>
            <NavLink href="https://www.freeabtest.com/?ref=clevertms">Free AB Test Tool</NavLink>
          </nav>

          {/* CTA badge */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-[10px] font-semibold text-cyan-400 border border-cyan-500/30 rounded-full px-3 py-1 tracking-wide uppercase">
              AI Tools Suite
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-20 sm:py-24 overflow-hidden landing-grid-bg">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[760px] h-[460px] bg-cyan-500/10 rounded-full blur-[120px] float-slow" />
          <div className="absolute bottom-0 left-1/4 w-[360px] h-[360px] bg-blue-500/8 rounded-full blur-[100px] float-medium" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start gap-8 reveal-up">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 border border-cyan-500/20 rounded-full px-4 py-1.5 bg-cyan-500/5 tracking-wide uppercase font-display">
              Powered by Google Gemini
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.06] text-white font-display">
              Translate
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                Anything. Instantly.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed font-display">
              Drop any text, code, or content and get high-quality translations powered by the latest Gemini models. Free to use &mdash; just bring your own API key.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
              <Link
                href="/translate"
                className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-base font-display transition-all hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]"
              >
                Start Translating
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm leading-none pt-0.5 text-gray-400 hover:text-cyan-400 transition-colors font-display underline underline-offset-4 decoration-gray-600 hover:decoration-cyan-400/50"
              >
                Get your Gemini API key
              </a>
            </div>
          </div>

          <div className="glass-card p-6 sm:p-7 relative overflow-hidden reveal-right">
            <div className="absolute -top-20 -right-16 w-56 h-56 bg-cyan-500/10 blur-[70px] rounded-full float-slow" />
            <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-blue-500/10 blur-[70px] rounded-full float-medium" />

            <div className="relative space-y-4">
              <div className="text-[11px] uppercase tracking-wider text-cyan-300/90 font-display">Live Preview</div>
              <div className="output-block p-4 min-h-[210px] flex flex-col gap-3">
                <p className="text-xs text-gray-400 font-display">Input</p>
                <div className="h-3 rounded skeleton-shimmer w-[80%]" />
                <div className="h-3 rounded skeleton-shimmer w-[92%]" />
                <div className="h-3 rounded skeleton-shimmer w-[70%]" />
                <p className="text-xs text-gray-400 font-display mt-2">Output</p>
                <div className="h-3 rounded skeleton-shimmer w-[88%]" />
                <div className="h-3 rounded skeleton-shimmer w-[74%]" />
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-gray-400 font-display">
                <span className="px-2.5 py-1 rounded-md border border-cyan-500/25 text-cyan-300/90">Code-safe</span>
                <span className="px-2.5 py-1 rounded-md border border-cyan-500/25 text-cyan-300/90">Fast Models</span>
                <span className="px-2.5 py-1 rounded-md border border-cyan-500/25 text-cyan-300/90">Review Mode</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="w-full px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-white font-display tracking-tight mb-4">
            Why Clever TMS?
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-lg mx-auto font-display">
            Free to use, powerful, and private. No sign-ups, no nonsense.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
                  <path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
                </svg>
              }
              title="Multi-Language"
              description="Auto-detect source language and translate to English, Spanish, Portuguese, Turkish, German, Vietnamese and more."
            />
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
              title="Blazing Fast"
              description="Powered by Gemini 2.0, 2.5, and 3.0 models. Pick the one that suits your speed and quality needs."
            />
            <FeatureCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              title="Private & Secure"
              description="Your API key stays in your browser session. Nothing is stored on our servers. Your data is yours."
            />
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="w-full px-4 sm:px-6 py-20 sm:py-24">
        <div className="max-w-5xl mx-auto text-center glass-card p-12 sm:p-16 relative overflow-hidden reveal-up">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-[80px]" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display tracking-tight mb-4">
              Ready to translate?
            </h2>
            <p className="text-gray-400 mb-8 font-display">
              Free to use. No sign-up required. Just bring your Gemini API key and go.
            </p>
            <Link
              href="/translate"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-base font-display transition-all hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]"
            >
              Open Translator
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-[#2a2d3a] bg-[#0c0e15] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center gap-3">
          <p className="font-semibold text-lg text-white font-display tracking-tight">
            Clever TMS
          </p>
          <p className="text-sm text-gray-400 font-display">
            AI-powered translation for anything and everything
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-display">
            <a href="https://audit.imrn.dev/?ref=clevertms" className="hover:text-cyan-400 transition-colors">Web Asset Audit</a>
            <span className="text-gray-600">|</span>
            <a href="https://pixfix.imrn.dev/?ref=clevertms" className="hover:text-cyan-400 transition-colors">Image Optimizer</a>
            <span className="text-gray-600">|</span>
            <a href="https://crawler.imrn.dev/?ref=clevertms" className="hover:text-cyan-400 transition-colors">Web Crawler</a>
          </div>
          <p className="text-xs text-gray-600 mt-4">
            &copy; 2026 Clever TMS. Powered by AI
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ── Sub-components ── */

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors font-display"
    >
      {children}
    </a>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card p-6 sm:p-8 flex flex-col gap-4 hover:border-cyan-500/20 transition-all hover:-translate-y-1 hover:shadow-[0_12px_36px_-18px_rgba(34,211,238,0.4)] reveal-up">
      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white font-display">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed font-display">{description}</p>
    </div>
  );
}

# Smart TMS

A markup-safe AI translation tool powered by Google's Gemini API. Translates natural language while preserving code snippets.

## Features

- **Live Gemini Model Catalog** — Fetched from Google and cached for 7 days; shows the top 5 most recent text-generation models (4 latest + 1 Pro)
- **11 Languages** — English, Spanish, Portuguese, Turkish, German, Vietnamese, Mandarin Chinese, Hindi, Arabic, French, Bengali + auto-detect
- **Client-Side API Key** — Your key stays in sessionStorage (never sent to any server except Google)
- **Responsive Dark UI** — Clean interface built with DaisyUI + Tailwind CSS
- **Keyboard Shortcut** — `Ctrl/⌘ + Enter` to translate

## Security Notes

- The API key is stored in `sessionStorage` (cleared when the browser tab closes)
- The key is only sent to Google's Gemini API endpoint via the Next.js API route
- No key is ever persisted server-side or logged
- Input validation and error handling on both client and server

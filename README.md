# Clever TMS

A markup-safe AI translation tool powered by Google's Gemini API. Translates natural language while preserving code snippets.

## Features

- **Multiple Gemini Models** — Choose from Flash, Pro, and preview models
- **6 Languages** — English, Spanish, Portuguese, Turkish, German, Vietnamese + auto-detect
- **Client-Side API Key** — Your key stays in sessionStorage (never sent to any server except Google)
- **Responsive Dark UI** — Clean interface built with DaisyUI + Tailwind CSS
- **Keyboard Shortcut** — `Ctrl/⌘ + Enter` to translate

## Security Notes

- The API key is stored in `sessionStorage` (cleared when the browser tab closes)
- The key is only sent to Google's Gemini API endpoint via the Next.js API route
- No key is ever persisted server-side or logged
- Input validation and error handling on both client and server

import { GoogleGenAI } from "@google/genai";

export function getGeminiClient(apiKey: string): GoogleGenAI {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error("Invalid Gemini API key.");
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

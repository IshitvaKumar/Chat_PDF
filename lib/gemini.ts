import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env.local and restart the development server.");
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

// Gemini File Search supports this model on the free tier. Keeping the model
// fixed prevents this starter from accidentally being pointed at a paid model.
export const FREE_TIER_MODEL = "gemini-3.5-flash";

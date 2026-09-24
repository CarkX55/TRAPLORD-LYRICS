// Centralized Gemini API Configuration & Helpers
// TRAPLORD Studio Engine — Direct Google Generative AI integration

export const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";

// Permissive safety settings for trap/street lyrics (unrestricted creative expression)
export const GEMINI_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

// Fallback safety settings when project tier rejects BLOCK_NONE
export const GEMINI_SAFETY_SETTINGS_FALLBACK = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];

/**
 * Checks whether a given model name supports or defaults to thinking.
 * Covers Gemini 2.0 Flash Thinking, Gemini 2.5, Gemini 3.x, and custom thinking models.
 */
export function isThinkingModel(modelName?: string): boolean {
  if (!modelName) return false;
  const lower = modelName.toLowerCase();
  return (
    lower.includes("thinking") ||
    lower.includes("gemini-2.5") ||
    lower.includes("gemini-3") ||
    lower.startsWith("gemini-3") ||
    lower.includes("3.5") ||
    lower.includes("3.6") ||
    lower.includes("3.7") ||
    lower.includes("3.8")
  );
}

/**
 * Safely extracts genuine text content from a Gemini candidate part array.
 * Crucially ignores thoughts (thought: true) produced by thinking models (Gemini 2.5, 3.x, thinking-exp)
 * so that internal reasoning never poisons the lyrics, hook contract, or AST parser.
 */
export function extractGeminiText(candidate: any): string {
  if (!candidate?.content?.parts || !Array.isArray(candidate.content.parts)) {
    return "";
  }

  // 1. Filter out parts explicitly flagged as internal thought/reasoning
  const nonThoughtParts = candidate.content.parts.filter(
    (p: any) => p && !p.thought && p.thought !== true
  );

  if (nonThoughtParts.length > 0) {
    const text = nonThoughtParts.map((p: any) => (typeof p.text === "string" ? p.text : "")).join("");
    if (text.trim()) return text.trim();
  }

  // 2. If all parts were marked as thought or non-thought was empty, fallback gracefully
  const fallback = candidate.content.parts.map((p: any) => (typeof p.text === "string" ? p.text : "")).join("");
  return fallback.trim();
}

/**
 * Resolves the active Gemini API key:
 * Prioritizes explicitly provided client key (from localStorage/UI),
 * then falls back to server environment variable GEMINI_API_KEY.
 * Throws an explicit, user-friendly error if neither is configured.
 */
export function getEffectiveApiKey(explicitKey?: string): string {
  const key = (explicitKey && explicitKey.trim()) ? explicitKey.trim() : (process.env.GEMINI_API_KEY?.trim() || "");
  if (!key) {
    throw new Error(
      "Se requiere una API Key de Google Gemini. Configúrala en el panel lateral de la aplicación o en la variable de entorno GEMINI_API_KEY."
    );
  }
  return key;
}

/**
 * Checks whether an API key is available without throwing.
 */
export function hasAvailableApiKey(explicitKey?: string): boolean {
  if (explicitKey && explicitKey.trim()) return true;
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) return true;
  return false;
}

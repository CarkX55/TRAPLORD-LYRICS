// Centralized Gemini API Configuration & Helpers
// TRAPLORD Studio Engine — Direct Google Generative AI integration

export const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash-lite";

/**
 * Modern Google Gemini model cascade in order of availability and stability.
 * Prioritizes high-throughput, low-latency models that avoid 503 high demand spikes.
 */
export const GEMINI_MODEL_CASCADE = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.6-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
];

/**
 * Migrates deprecated model IDs (1.0, 1.5, 2.0, 2.5) to modern Google 3.x models.
 */
export function normalizeGeminiModel(modelName?: string): string {
  if (!modelName || !modelName.trim()) return GEMINI_DEFAULT_MODEL;
  const trimmed = modelName.trim();
  const lower = trimmed.toLowerCase();

  // If user has old deprecated 1.0, 1.5, 2.0 or 2.5 model in state or localStorage, auto-upgrade to 3.5-flash-lite
  if (
    lower.includes("gemini-2.0") ||
    lower.includes("gemini-2.5") ||
    lower.includes("gemini-1.5") ||
    lower.includes("gemini-1.0") ||
    lower.includes("thinking-exp")
  ) {
    return GEMINI_DEFAULT_MODEL;
  }
  return trimmed;
}

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
 */
export function isThinkingModel(modelName?: string): boolean {
  if (!modelName) return false;
  const lower = modelName.toLowerCase();
  return (
    lower.includes("thinking") ||
    lower.includes("pro") ||
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

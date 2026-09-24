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

export interface GeminiCallParams {
  prompt: string;
  apiKey?: string;
  preferredModel?: string;
  temperature?: number;
  topP?: number;
  timeoutMs?: number;
  responseMimeType?: "application/json" | "text/plain";
  thinkingBudget?: number; // 0 for instant response
  systemInstruction?: string;
}

export interface GeminiCallResult {
  text: string;
  rawJson?: any;
  modelUsed: string;
  durationMs: number;
}

/**
 * Universal resilient Gemini caller with automatic model cascade, instant 503 failover,
 * exponential backoff, safety downgrades, AbortController timeouts, and native JSON extraction.
 */
export async function callGeminiResilient(params: GeminiCallParams): Promise<GeminiCallResult> {
  const apiKey = getEffectiveApiKey(params.apiKey);
  const primaryModel = normalizeGeminiModel(params.preferredModel);
  const timeoutMs = params.timeoutMs ?? 25000;
  const temperature = params.temperature ?? 0.85;
  const topP = params.topP ?? 0.95;

  const modelCascade = [primaryModel];
  for (const m of GEMINI_MODEL_CASCADE) {
    if (!modelCascade.includes(m)) {
      modelCascade.push(m);
    }
  }

  let lastError: Error | null = null;
  let activeSafetySettings = GEMINI_SAFETY_SETTINGS;

  for (let mIdx = 0; mIdx < modelCascade.length; mIdx++) {
    const currentModel = modelCascade[mIdx];
    const isFallback = mIdx > 0;
    if (isFallback) {
      const backoffMs = Math.min(600 * Math.pow(1.3, mIdx - 1), 2000);
      console.warn(`[callGeminiResilient] Cascading to fallback model: ${currentModel} (backoff ${Math.round(backoffMs)}ms)`);
      await new Promise(r => setTimeout(r, backoffMs));
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
      const attemptStart = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const generationConfig: Record<string, unknown> = {
          temperature,
          topP,
        };

        if (params.responseMimeType) {
          generationConfig.responseMimeType = params.responseMimeType;
        }

        if (isThinkingModel(currentModel)) {
          generationConfig.thinkingConfig = { thinkingBudget: params.thinkingBudget ?? 0 };
        }

        const bodyPayload: Record<string, unknown> = {
          contents: [{ parts: [{ text: params.prompt }] }],
          generationConfig,
          safetySettings: activeSafetySettings,
        };

        if (params.systemInstruction) {
          bodyPayload.systemInstruction = {
            parts: [{ text: params.systemInstruction }],
          };
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify(bodyPayload),
          }
        );
        clearTimeout(timeoutId);
        const durationMs = Date.now() - attemptStart;

        const json = await res.json();
        if (json.error) {
          const errMsg = json.error.message || json.error.status || `Error ${json.error.code}`;
          const errCode = json.error.code;
          console.warn(`[callGeminiResilient] ${currentModel} error (${errCode}): ${errMsg}`);
          lastError = new Error(`Gemini (${currentModel}): ${errMsg}`);

          if (errCode === 400 && (errMsg.toLowerCase().includes("thinking") || errMsg.toLowerCase().includes("thinkingconfig"))) {
            delete generationConfig.thinkingConfig;
            continue;
          }
          if (errCode === 400 && errMsg.toLowerCase().includes("safety")) {
            activeSafetySettings = GEMINI_SAFETY_SETTINGS_FALLBACK;
            continue;
          }
          if (errCode === 503 || errCode === 404 || errCode === 410) {
            break; // cascade immediately to next model
          }
          if (errCode === 429) {
            if (attempt === 1) {
              await new Promise(r => setTimeout(r, 1500));
              continue;
            }
            break;
          }
          break;
        }

        const candidate = json.candidates?.[0];
        const text = extractGeminiText(candidate);
        if (!text) {
          lastError = new Error(`Gemini (${currentModel}) devolvió respuesta vacía.`);
          continue;
        }

        let rawJson: any = undefined;
        if (params.responseMimeType === "application/json" || text.trim().startsWith("{") || text.trim().startsWith("[")) {
          try {
            rawJson = JSON.parse(text);
          } catch {
            const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
            try {
              rawJson = JSON.parse(cleaned);
            } catch {
              const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
              if (match) {
                try {
                  rawJson = JSON.parse(match[0]);
                } catch {
                  // ignore
                }
              }
            }
          }
        }

        return {
          text,
          rawJson,
          modelUsed: currentModel,
          durationMs,
        };
      } catch (err: any) {
        const durationMs = Date.now() - attemptStart;
        if (err.name === "AbortError" || err.message?.includes("aborted")) {
          console.warn(`[callGeminiResilient] ${currentModel} TIMEOUT (${Math.round(durationMs / 1000)}s)`);
          lastError = new Error(`Gemini (${currentModel}) tiempo de espera agotado.`);
          break; // cascade immediately
        }
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  throw lastError || new Error("Todos los modelos de la cascada de Gemini fallaron.");
}


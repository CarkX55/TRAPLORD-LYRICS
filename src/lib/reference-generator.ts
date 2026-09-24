// Reference Generator — fallback for non-curated artists
// Generates authentic style-matched bars based on FlowProfile and Google Gemini

import { getFlowProfile } from "./artist-flow-profiles";
import type { ArtistReference } from "./artist-references";
import { getEffectiveApiKey, hasAvailableApiKey, GEMINI_SAFETY_SETTINGS, extractGeminiText } from "./gemini-config";

export interface GenerateReferenceParams {
  artistId: string;
  artistName: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

async function callLLM(prompt: string, params: GenerateReferenceParams): Promise<string> {
  const apiKey = getEffectiveApiKey(params.geminiApiKey);
  const model = params.geminiModel || "gemini-2.0-flash";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topP: 0.95 },
          safetySettings: GEMINI_SAFETY_SETTINGS,
        }),
      }
    );
    clearTimeout(timeoutId);
    const json = await res.json();
    if (json.error) throw new Error(`Gemini: ${json.error.message}`);
    return extractGeminiText(json.candidates?.[0]);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Generate style-matched bars based on FlowProfile
async function generateViaGemini(
  params: GenerateReferenceParams,
  peakEra: string
): Promise<ArtistReference | null> {
  const flowProfile = getFlowProfile(params.artistId);
  try {
    const prompt = `Eres un experto en flow de trap/rap. Genera 4 barras style-matched (NO reales, imitación del estilo) para ${params.artistName} en su peak era: ${peakEra}.

${flowProfile ? `FLOW PROFILE DEL ARTISTA:
- Cadencia: ${flowProfile.cadenceInstruction}
- Hook style: ${flowProfile.hookStyle}
- Velocidad: ${flowProfile.syllablesPerBar} sílabas por barra (${flowProfile.speedLabel})
- Esquema de rima: ${flowProfile.defaultRhymeScheme}
- Contorno melódico: ${flowProfile.melodicContour}
- Arco emocional: ${flowProfile.emotionalArc}` : "Sin flow profile disponible — improvisa basándote en lo que sepas del artista."}

REGLAS:
- 2 barras de VERSO (muestren flow + esquema de rima del artista)
- 2 barras de HOOK (estilo ${flowProfile?.hookStyle ?? "melodic"})
- Cada barra: 1-2 líneas, ~${flowProfile?.syllablesPerBar ?? 10} sílabas
- Incluye ad-libs del artista entre paréntesis
- NO menciones el nombre del artista en las barras
- Captura el slang, la cadencia y la vibra del peak era

Devuelve SOLO JSON (sin markdown):
{"verseBars": ["barra 1", "barra 2"], "hookBars": ["barra 1", "barra 2"]}`;

    const raw = await callLLM(prompt, params);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      artistId: params.artistId,
      peakEra,
      verseBars: parsed.verseBars ?? [],
      hookBars: parsed.hookBars ?? [],
      verified: false,
      source: "llm-generated",
    };
  } catch {
    return null;
  }
}

// Main entry: generate a reference for a non-curated artist
export async function generateArtistReference(
  params: GenerateReferenceParams
): Promise<ArtistReference | null> {
  if (!hasAvailableApiKey(params.geminiApiKey)) {
    return null;
  }
  const flowProfile = getFlowProfile(params.artistId);
  const peakEra = flowProfile?.peakEra ?? "peak era (desconocido)";
  return await generateViaGemini(params, peakEra);
}

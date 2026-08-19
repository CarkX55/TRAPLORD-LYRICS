// Reference Generator — fallback for non-curated artists
// Sandbox: uses z-ai-web-dev-sdk web_search + page_reader + LLM extraction
// Vercel: uses Gemini to generate style-matched bars based on FlowProfile

import { getFlowProfile } from "./artist-flow-profiles";
import type { ArtistReference } from "./artist-references";

export interface GenerateReferenceParams {
  artistId: string;
  artistName: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

async function callLLM(prompt: string, params: GenerateReferenceParams): Promise<string> {
  if (params.geminiApiKey?.trim()) {
    const model = params.geminiModel || "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${params.geminiApiKey.trim()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topP: 0.95 },
        }),
      }
    );
    const json = await res.json();
    if (json.error) throw new Error(`Gemini: ${json.error.message}`);
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "disabled" },
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

// Sandbox-only: web search + page reader to find real bars
async function webSearchSandbox(
  artistName: string,
  peakEra: string
): Promise<ArtistReference | null> {
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    // Search for the artist's best verses
    const query = `${artistName} best verses iconic bars lyrics`;
    const searchResult = await zai.functions.invoke("web_search", {
      query,
      num: 5,
    });

    if (!Array.isArray(searchResult) || searchResult.length === 0) {
      return null;
    }

    // Read top 2 pages
    const topUrls = searchResult.slice(0, 3).map((r: any) => r.url).filter(Boolean);
    const contents: string[] = [];
    for (const url of topUrls) {
      try {
        const pageResult = await zai.functions.invoke("page_reader", { url });
        const html = pageResult?.data?.html ?? "";
        // Basic HTML to text
        const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (text.length > 100) contents.push(text);
      } catch {
        // Skip failed pages
      }
    }

    if (contents.length === 0) return null;

    const combinedContent = contents.join("\n---\n").substring(0, 6000);

    // Use LLM to extract 4 bars from the web content
    const extractPrompt = `Eres un experto en trap/rap. De este contenido web sobre "${artistName}", extrae 4 barras reales (2 verso + 2 hook) que representen su peak era: ${peakEra}.

CONTENIDO WEB:
${combinedContent}

REGLAS:
- Si encuentras barras reales claras en el contenido, úsalas (verified: true)
- Si NO encuentras barras reales claras, genera 4 barras style-matched basadas en lo que sepas del artista (verified: false)
- Cada barra: 1-2 líneas, ~10-15 sílabas
- Incluye ad-libs del artista entre paréntesis si aplica
- NO inventes el nombre del artista en las barras

Devuelve SOLO JSON (sin markdown):
{"verseBars": ["barra 1", "barra 2"], "hookBars": ["barra 1", "barra 2"], "verified": true/false}`;

    const raw = await callLLM(extractPrompt, { artistId: "", artistName } as any);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      artistId: "",
      peakEra,
      verseBars: parsed.verseBars ?? [],
      hookBars: parsed.hookBars ?? [],
      verified: Boolean(parsed.verified),
      source: parsed.verified ? "web-search" : "llm-generated",
    };
  } catch {
    return null;
  }
}

// Vercel/Gemini mode: generate style-matched bars based on FlowProfile
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
  const flowProfile = getFlowProfile(params.artistId);
  const peakEra = flowProfile?.peakEra ?? "peak era (desconocido)";

  // Vercel mode (Gemini API key present) — generate via LLM
  if (params.geminiApiKey?.trim()) {
    return await generateViaGemini(params, peakEra);
  }

  // Sandbox mode — try web search first, fall back to z-ai LLM generation
  const webResult = await webSearchSandbox(params.artistName, peakEra);
  if (webResult && webResult.verseBars.length > 0) {
    return { ...webResult, artistId: params.artistId };
  }

  // Fallback: generate via z-ai LLM (same as Gemini path but with z-ai SDK)
  return await generateViaGemini(params, peakEra);
}

// Track Analyzer — extracts the "DNA" of a pasted reference track
// Uses LLM (Gemini on Vercel, z-ai SDK in sandbox) to analyze structure, rhyme scheme, density, etc.

export interface TrackSection {
  name: string;
  type: "intro" | "verse" | "chorus" | "bridge" | "outro" | "pre-chorus" | "hook" | "instrumental";
  barCount: number;
  voice?: string;
}

export interface TrackAnalysis {
  sections: TrackSection[];
  rhymeScheme: string;
  density: "sparse" | "normal" | "dense" | "extra_dense";
  avgSyllablesPerBar: number;
  adlibFrequency: "low" | "medium" | "high";
  adlibPositions: string[];
  languageRatio: number;
  hookStyle: "repetitive" | "melodic" | "technical" | "simple_punchy";
  emotionalArc: "rising" | "flat" | "chaotic" | "introspective";
  notableTechniques: string[];
  summary: string;
}

export interface AnalyzeTrackParams {
  lyrics: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

async function callLLM(prompt: string, params: AnalyzeTrackParams): Promise<string> {
  if (params.geminiApiKey?.trim()) {
    const model = params.geminiModel || "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${params.geminiApiKey.trim()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, topP: 0.9 },
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
      temperature: 0.4,
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

export async function analyzeReferenceTrack(params: AnalyzeTrackParams): Promise<TrackAnalysis | null> {
  if (!params.lyrics?.trim()) return null;

  const prompt = `Eres un analista experto en estructura de canciones de trap/rap. Analiza estas letras y extrae su "ADN" estructural con precisión.

LETRAS:
${params.lyrics.substring(0, 8000)}

INSTRUCCIONES:
1. Identifica las SECCIONES (Intro, Verse 1, Chorus, Bridge, etc.) con su tipo y número de barras
2. Detecta el ESQUEMA DE RIMA dominante (AABB, ABAB, AABBCC, monorhyme, etc.)
3. Estima la DENSIDAD (sparse=4-6 sílabas, normal=8-10, dense=12-14, extra_dense=14-18)
4. Cuenta sílabas promedio por barra
5. Frecuencia de AD-LIBS (low=0-1 por barra, medium=1-2, high=2+) y sus posiciones más comunes
6. Ratio de IDIOMA (% inglés vs español)
7. HOOK STYLE: repetitive (vamp), melodic (cantado), technical (rimas internas), simple_punchy (frases cortas)
8. ARCO EMOCIONAL: rising (sube intensidad), flat (constante), chaotic (impredecible), introspective (reflexivo)
9. TÉCNICAS NOTABLES: internal rhymes, multisyllabic, wordplay, vamp, punchlines, callbacks, etc.
10. RESUMEN breve (1-2 frases) de la vibra del track

Devuelve SOLO JSON (sin markdown, sin explicaciones):
{
  "sections": [{"name": "Verse 1", "type": "verse", "barCount": 16, "voice": "main"}],
  "rhymeScheme": "AABB",
  "density": "normal",
  "avgSyllablesPerBar": 10,
  "adlibFrequency": "medium",
  "adlibPositions": ["end", "middle"],
  "languageRatio": 30,
  "hookStyle": "melodic",
  "emotionalArc": "rising",
  "notableTechniques": ["internal rhymes", "multisyllabic"],
  "summary": "Track agresivo con hook melódico, densidad alta"
}`;

  try {
    const raw = await callLLM(prompt, params);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Validate + provide defaults
    return {
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      rhymeScheme: parsed.rhymeScheme ?? "AABB",
      density: parsed.density ?? "normal",
      avgSyllablesPerBar: parsed.avgSyllablesPerBar ?? 10,
      adlibFrequency: parsed.adlibFrequency ?? "medium",
      adlibPositions: Array.isArray(parsed.adlibPositions) ? parsed.adlibPositions : ["end"],
      languageRatio: typeof parsed.languageRatio === "number" ? parsed.languageRatio : 50,
      hookStyle: parsed.hookStyle ?? "melodic",
      emotionalArc: parsed.emotionalArc ?? "flat",
      notableTechniques: Array.isArray(parsed.notableTechniques) ? parsed.notableTechniques : [],
      summary: parsed.summary ?? "",
    };
  } catch (err) {
    console.error("[track-analyzer] parse error:", err instanceof Error ? err.message : err);
    return null;
  }
}

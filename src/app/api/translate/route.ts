import { NextRequest, NextResponse } from "next/server";
import { getEffectiveApiKey, GEMINI_SAFETY_SETTINGS, extractGeminiText } from "@/lib/gemini-config";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TranslateBody {
  text: string;
  targetLang: "es" | "en";
  preserveFormat?: boolean;
  geminiApiKey?: string;
  geminiModel?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TranslateBody;

    if (!body.text || !body.text.trim()) {
      return NextResponse.json({ error: "No se proporcionó texto para traducir." }, { status: 400 });
    }

    const targetLangName = body.targetLang === "es" ? "español" : "inglés americano";
    const sourceLangName = body.targetLang === "es" ? "inglés" : "español";

    const prompt = `Eres un traductor experto en letras de rap/trap. Traduce el siguiente texto del ${sourceLangName} al ${targetLangName}.

REGLAS CRÍTICAS:
1. Conserva el formato (marcas de sección [Verse 1], [Chorus], intérpretes, saltos de línea).
2. Conserva los ad-libs entre paréntesis (Skrrt!) tal cual si son universales (Brrr, Yeah, Skrrt) o tradúcelos si son idioma-específicos.
3. Mantén el flow y la métrica lo más cercano posible al original.
4. Conserva los marcadores dinámicos [BEAT DROP], [WHISPERING], etc.
5. Adapta el slang al idioma destino de forma natural (no traduzcas literalmente el slang callejero).
6. NO añadas explicaciones ni comentarios. Devuelve SOLO la traducción.

Traduce del ${sourceLangName} al ${targetLangName}:

${body.text}`;

    let translated = "";
    const apiKey = getEffectiveApiKey(body.geminiApiKey);
    const rawModel = body.geminiModel?.trim();
    const model = (rawModel && rawModel.trim()) ? rawModel.trim() : "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            topP: 0.9,
          },
          safetySettings: GEMINI_SAFETY_SETTINGS,
        }),
      }
    );
    const json = await res.json();
    if (json.error) {
      throw new Error(`Gemini: ${json.error.message}`);
    }
    translated = extractGeminiText(json.candidates?.[0]);

    if (!translated || !translated.trim()) {
      return NextResponse.json({ error: "La traducción no devolvió contenido válido." }, { status: 502 });
    }

    return NextResponse.json({
      translated: translated.trim(),
      sourceLang: body.targetLang === "es" ? "en" : "es",
      targetLang: body.targetLang,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en la traducción.";
    console.error("[translate] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

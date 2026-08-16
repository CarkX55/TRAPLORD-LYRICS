import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TranslateBody {
  text: string;
  targetLang: "es" | "en";
  preserveFormat?: boolean;
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

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
      temperature: 0.5, // lower temperature for more faithful translation
    });

    const translated = completion.choices[0]?.message?.content;
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

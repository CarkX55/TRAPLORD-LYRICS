import { NextRequest, NextResponse } from "next/server";
import { PRODUCER_TAG_ARCHETYPES, getProducerTagArchetypeById } from "@/lib/trap-data";

export const runtime = "nodejs";
export const maxDuration = 45;

interface ProducerTagBody {
  producerName?: string;
  archetypeId?: string;
  lyrics?: string;
  artistName?: string;
  moodId?: string;
  spanglishPercent?: number;
  geminiApiKey?: string;
  geminiModel?: string;
}

export interface GeneratedTag {
  text: string;
  style: string;
  language: "en" | "es" | "spanglish";
  archetypeName: string;
  sunoFormatted: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProducerTagBody;
    const producerName = body.producerName?.trim() || "Markoff";
    const archetype = body.archetypeId ? getProducerTagArchetypeById(body.archetypeId) : null;

    const lyricsSnippet = body.lyrics ? body.lyrics.slice(0, 1000) : "";
    const artistName = body.artistName || "Trap Artist";
    const mood = body.moodId || "calle";

    let archetypeConstraint = "";
    if (archetype && archetype.id !== "smart") {
      archetypeConstraint = `
ARQUETIPO OBLIGATORIO:
- Estilo: "${archetype.name}" (${archetype.vibe})
- Tag de referencia icónico: "${archetype.referenceTag}"
- Descripción del arquetipo: ${archetype.description}
- Debes imitar con total precisión la cadencia, el tono y el golpe del tag de referencia pero adaptándolo al nombre "${producerName}" y a la temática de la letra.`;
    } else if (archetype && archetype.id === "smart") {
      archetypeConstraint = `
ARQUETIPO OBLIGATORIO:
- Estilo: "Smart Contextual (100% Letra)"
- Analiza las mejores punchlines y la narrativa de la letra proporcionada.
- Crea tags únicos y originales para "${producerName}" que conecten directamente con los conceptos de la canción (ej. dinero, traición, joyas, calle, noche).`;
    } else {
      archetypeConstraint = `
ARQUETIPOS VARIADOS:
Genera tags inspirados en diferentes leyendas del trap (Metro Boomin, Tay Keith, Pi'erre Bourne, Southside/808 Mafia, BNYX/F1lthy, Bizarrap), adaptados a "${producerName}".`;
    }

    const prompt = `Eres un productor de audio legendario y ghostwriter de trap. Genera entre 4 y 5 Producer Tags icónicos para el productor "${producerName}".

# 🎯 CONTEXTO DE LA CANCIÓN:
- Productor: "${producerName}"
- Artista: ${artistName}
- Mood / Vibra: ${mood}
${lyricsSnippet ? `- Letra / Barras de la canción (para extraer conceptos y jerga):\n${lyricsSnippet}` : ""}

# 🎛️ REGLAS DE GENERACIÓN:
${archetypeConstraint}
1. El nombre "${producerName}" DEBE aparecer en cada tag.
2. Cada tag debe ser CORTO y CONTUNDENTE (máximo 8-10 palabras).
3. Debe sonar extremadamente pegadizo, callejero y profesional.
4. Genera variedad de idiomas: al menos uno en inglés americano (US Trap), uno en español callejero y uno en Spanglish orgánico.
5. NO uses el nombre real de otros productores en el tag cantado (solo "${producerName}").
6. Formatea cada tag para que en Suno AI suene como un audio tag perfecto al inicio del tema.

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura (sin markdown, sin explicaciones):
{
  "tags": [
    {
      "text": "Frase del tag aquí",
      "style": "Amenazante / Hype / Trippy / Melódico / Minimal",
      "language": "en | es | spanglish",
      "archetypeName": "Metro Style / Tay Keith / Pi'erre / Smart Context / etc.",
      "sunoFormatted": "[Intro: Whispered Producer Tag]\\n\\\"Frase del tag aquí\\\"\\n(Yeah!)\\n\\n[Beat Drop - Heavy 808]"
    }
  ]
}`;

    let result: { tags: GeneratedTag[] };

    if (body.geminiApiKey?.trim()) {
      const model = body.geminiModel || "gemini-2.0-flash";
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.geminiApiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.95, topP: 0.95 },
          }),
        }
      );
      const geminiJson = await geminiRes.json();
      if (geminiJson.error) {
        return NextResponse.json({ error: `Gemini: ${geminiJson.error.message}` }, { status: 400 });
      }
      const raw = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      try {
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        return NextResponse.json({ tags: [], raw });
      }
    } else {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        thinking: { type: "disabled" },
        temperature: 0.95,
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      try {
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        return NextResponse.json({ tags: [], raw });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generando producer tag";
    console.error("[producer-tag] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getArtistById, getDirtyLevel } from "@/lib/trap-data";
import { getFlowProfile } from "@/lib/artist-flow-profiles";

export const runtime = "nodejs";
export const maxDuration = 60;

interface HookVariationsBody {
  artistId: string;
  featureArtistId?: string;
  moodId: string;
  dirtyLevel?: number;
  spanglishPercent: number;
  bpmRange: string;
  conceptOrLyrics?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

export interface HookVariationOption {
  id: "mantra" | "melodic" | "punchy";
  title: string;
  badge: string;
  icon: string;
  description: string;
  hookText: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HookVariationsBody;

    if (!body.artistId) {
      return NextResponse.json({ error: "Falta artistId" }, { status: 400 });
    }

    const artist = getArtistById(body.artistId);
    const flowProfile = getFlowProfile(body.artistId);
    const dirty = getDirtyLevel(body.dirtyLevel ?? 2);

    const systemPrompt = `Eres un Ghostwriter y Topliner de élite en Trap y Música Urbana.
Tu misión es componer EXACTAMENTE 3 VARIANTES DISTINTAS DE ESTRIBILLO (HOOK / CHORUS) de 4 a 8 compases optimizadas para SUNO AI.

# PERFIL DEL ARTISTA
- Artista: ${artist?.name ?? "Lead"} (${artist?.origin ?? "Trap"})
- Estilo: ${artist?.style ?? "Trap contemporáneo"}
- Mood: ${body.moodId}
- Spanglish objetivo: ${body.spanglishPercent}% inglés
- Tempo: ${body.bpmRange} BPM
- Nivel de actitud: ${dirty.label} (${dirty.badge})
${body.conceptOrLyrics ? `- Contexto / Letra actual:\n${body.conceptOrLyrics.slice(0, 500)}` : ""}

# ESTILOS DE LAS 3 VARIANTES REQUERIDAS:
1. "mantra": [MANTRA HIPNÓTICO] — Repetición pesada de una palabra/frase clave (3-4 veces con cadencia y comas para Suno), ultra pegadizo y bailable.
2. "melodic": [MELÓDICO & CANTABLE] — Líneas fluidas con melodía vocal alargada, notas altas y ganchos armónicos ideales para autotune.
3. "punchy": [PUNCHLINES DE CALLE] — Frases secas, ego dominante, barras contundentes y actitud sin adornos.

# FORMATO DE SALIDA ESTRICTO (SOLO JSON VÁLIDO):
Devuelve EXCLUSIVAMENTE un JSON con este esquema (sin markdown, sin comentarios):
{
  "variations": [
    {
      "id": "mantra",
      "title": "Mantra Hipnótico",
      "badge": "Repetitivo · Hypnotic",
      "icon": "🔁",
      "description": "Repetición hipnótica con cadencia pesada para reventar el club",
      "hookText": "[Chorus: ${artist?.name ?? "Lead"}, Hypnotic repetitive mantra]\\nLínea 1 con ad-lib (Yeah!)\\nLínea 2...\\nLínea 3...\\nLínea 4"
    },
    {
      "id": "melodic",
      "title": "Melódico & Cantable",
      "badge": "Singable · Melodic",
      "icon": "🎵",
      "description": "Líneas cantables y pegadizas con notas abiertas",
      "hookText": "[Chorus: ${artist?.name ?? "Lead"}, Melodic flow]\\nLínea 1...\\nLínea 2...\\nLínea 3...\\nLínea 4"
    },
    {
      "id": "punchy",
      "title": "Punchlines Directas",
      "badge": "Street · Hard-hitting",
      "icon": "💥",
      "description": "Golpe seco, barras crudas y actitud dominante",
      "hookText": "[Chorus: ${artist?.name ?? "Lead"}, Hard-hitting delivery]\\nLínea 1...\\nLínea 2...\\nLínea 3...\\nLínea 4"
    }
  ]
}

REGLAS OBLIGATORIAS:
- Ad-libs SIEMPRE entre paréntesis: (Yeah!), (Brrr!).
- Usa comas ',' y puntos suspensivos '...' en los puntos de respiración natural de Suno.
- Prohibido usar clichés baratos ("el asfalto no perdona", "fuego/juego", "money sin parar").`;

    let rawText = "";

    if (body.geminiApiKey?.trim()) {
      const model = body.geminiModel || "gemini-2.0-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.geminiApiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.85,
              topP: 0.95,
            },
          }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(`Gemini: ${json.error.message}`);
      rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [{ role: "user", content: systemPrompt }],
        thinking: { type: "disabled" },
        temperature: 0.85,
      });
      rawText = completion.choices[0]?.message?.content ?? "";
    }

    const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[hook-variations] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando variantes de hook" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getArtistById, getDirtyLevel, ARTISTS_DATA } from "@/lib/trap-data";
import { getFlowProfile } from "@/lib/artist-flow-profiles";

export const runtime = "nodejs";
export const maxDuration = 60;

interface HookVariationsBody {
  artistId: string;
  targetArtistName?: string;
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

    // Clean targetArtistName in case it contains Suno hints or tags like "Morad, Melodic flow..."
    let rawSinger = body.targetArtistName?.trim() || "";
    if (rawSinger.includes(",")) rawSinger = rawSinger.split(",")[0].trim();
    if (rawSinger.includes(":")) rawSinger = rawSinger.split(":").pop()?.trim() || rawSinger;

    // Check if rawSinger resolves to an artist in trap-data
    let effectiveArtistId = body.artistId;
    if (rawSinger) {
      const foundArtist = ARTISTS_DATA.flatMap(g => g.artists).find(
        a => a.name.toLowerCase() === rawSinger.toLowerCase() || a.id === rawSinger.toLowerCase()
      );
      if (foundArtist) {
        effectiveArtistId = foundArtist.id;
      }
    }

    const artist = getArtistById(effectiveArtistId);
    const flowProfile = getFlowProfile(effectiveArtistId);
    const dirty = getDirtyLevel(body.dirtyLevel ?? 2);
    const singerName = rawSinger || artist?.name || "Lead";

    const systemPrompt = `Eres un Ghostwriter y Topliner de élite en Trap y Música Urbana.
Tu misión es componer EXACTAMENTE 3 VARIANTES DISTINTAS DE ESTRIBILLO (HOOK / CHORUS) de 4 a 8 compases optimizadas para SUNO AI.

# PERFIL DEL INTÉRPRETE DEL ESTRIBILLO
- Intérprete del Estribillo: ${singerName}
- Estilo: ${artist?.style ?? "Trap contemporáneo"}
- Timbre Vocal Suno: ${flowProfile?.sunoVocalTimbre ?? "melodic auto-tune delivery"}
- Mood: ${body.moodId}
- Spanglish objetivo: ${body.spanglishPercent}% inglés
- Tempo: ${body.bpmRange} BPM
- Nivel de actitud: ${dirty.label} (${dirty.badge})
${body.conceptOrLyrics ? `- Contexto de la Canción:\n${body.conceptOrLyrics.slice(0, 500)}` : ""}

# DIRECTIVA ESTRICTA:
- Estás escribiendo EXCLUSIVAMENTE el [Chorus / Hook / Estribillo] para ${singerName}.
- NO escribas un Pre-Chorus, ni una Intro, ni un Verso. La salida debe ser 100% un Estribillo pegadizo y bailable.

# 🏀 REGLAS MÉTRICAS DE REBOTE (AMERICAN BOUNCE & SPACE):
- Cada compás debe tener MÁXIMO entre 3 y 5 palabras (4 a 6 sílabas).
- Usa comas ',' y puntos suspensivos '...' para notas sostenidas, swing y pausas elásticas.
- Incluye ad-libs rítmicos de contrarrespuesta entre paréntesis en cada compás: (Yeah!), (Skrrt!), (Facts!).
- Prohibido redactar oraciones continuas largas o párrafos narrativos.

# ESTILOS DE LAS 3 VARIANTES REQUERIDAS:
1. "mantra": [MANTRA HIPNÓTICO] — Repetición pesada de una palabra/frase clave (3-4 veces con cadencia y comas para Suno), ultra pegadizo y bailable.
2. "melodic": [MELÓDICO & CANTABLE] — Líneas fluidas con melodía vocal alargada con '...', notas abiertas y ganchos armónicos ideales para autotune.
3. "punchy": [PUNCHLINES DE CALLE] — Frases secas, ego dominante, barras contundentes de pocas palabras y actitud sin adornos.

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
      "hookText": "[Chorus: ${singerName}, Hypnotic repetitive mantra, layered harmonies]\\nLínea 1 con ad-lib (Yeah!)\\nLínea 2...\\nLínea 3...\\nLínea 4"
    },
    {
      "id": "melodic",
      "title": "Melódico & Cantable",
      "badge": "Singable · Melodic",
      "icon": "🎵",
      "description": "Líneas cantables y pegadizas con notas abiertas",
      "hookText": "[Chorus: ${singerName}, Melodic auto-tune flow, soaring harmonics]\\nLínea 1...\\nLínea 2...\\nLínea 3...\\nLínea 4"
    },
    {
      "id": "punchy",
      "title": "Punchlines Directas",
      "badge": "Street · Hard-hitting",
      "icon": "💥",
      "description": "Golpe seco, barras crudas y actitud dominante",
      "hookText": "[Chorus: ${singerName}, Hard-hitting punchline hook, anthemic energy]\\nLínea 1...\\nLínea 2...\\nLínea 3...\\nLínea 4"
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

    let variations: HookVariationOption[] = [];
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.variations) && parsed.variations.length > 0) {
        variations = parsed.variations;
      } else if (Array.isArray(parsed)) {
        variations = parsed;
      }
    } catch (parseErr) {
      console.warn("[hook-variations] JSON parse warning, rawText:", rawText, parseErr);
    }

    if (!variations || variations.length === 0) {
      return NextResponse.json({
        variations: [
          {
            id: "mantra",
            title: "Mantra Hipnótico",
            badge: "Repetitivo · Hypnotic",
            icon: "🔁",
            description: "Repetición hipnótica con cadencia pesada para reventar el club",
            hookText: `[Chorus: ${singerName}, Hypnotic repetitive mantra]\nMoney en la mesa, contando de nuevo (Yeah!)\nMoney en la mesa, no paro, me muevo (Skrrt)\nTo' lo que toco lo vuelvo dinero\nMoney en la mesa, siempre de primero (Let's go!)`
          },
          {
            id: "melodic",
            title: "Melódico & Cantable",
            badge: "Singable · Melodic",
            icon: "🎵",
            description: "Líneas cantables y pegadizas con notas abiertas",
            hookText: `[Chorus: ${singerName}, Melodic auto-tune flow]\nVolando alto donde no me alcanzas tú (No, no...)\nBrillando en la noche como noche en South Beach (Yeah!)\nBaby tú sabes que me convertí en la movie\nAhora me llaman el rey de la ciudad (Oh yeah)`
          },
          {
            id: "punchy",
            title: "Punchlines Directas",
            badge: "Street · Hard-hitting",
            icon: "💥",
            description: "Golpe seco, barras crudas y actitud dominante",
            hookText: `[Chorus: ${singerName}, Hard-hitting punchline hook]\nNo llamo a nadie, yo cierro los tratos (Facts)\nDiamantes fríos, callando a los sapos (Brrr)\nNací pa' mandar, no sigo mandatos\nTodo en efectivo, directos al banco (Gang!)`
          }
        ]
      });
    }

    return NextResponse.json({ variations });
  } catch (err) {
    console.error("[hook-variations] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando variantes de hook" },
      { status: 500 }
    );
  }
}

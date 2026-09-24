import { NextRequest, NextResponse } from "next/server";
import { PRODUCER_TAG_ARCHETYPES, getProducerTagArchetypeById } from "@/lib/trap-data";
import { callGeminiResilient } from "@/lib/gemini-config";

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

function getProducerTagFallback(producerName: string, archetypeId?: string): GeneratedTag[] {
  const p = producerName || "Markoff";
  switch (archetypeId) {
    case "metro":
      return [
        {
          text: `If ${p} don't trust you, I'm gon' shoot you`,
          style: "Amenazante / Oscuro",
          language: "en",
          archetypeName: "Metro Boomin",
          sunoFormatted: `[Intro: Whispered Producer Tag]\n"If ${p} don't trust you, I'm gon' shoot you"\n(Yeah!)\n\n[Beat Drop - Heavy 808]`,
        },
        {
          text: `${p} want some more, turn it up!`,
          style: "Dark Hype",
          language: "en",
          archetypeName: "Metro Boomin",
          sunoFormatted: `[Intro: Distorted Pitch-Shifted Tag]\n"${p} want some more!"\n\n[Beat Drop]`,
        },
        {
          text: `Si ${p} no confía, no sales de este bloque`,
          style: "Cinematográfico",
          language: "es",
          archetypeName: "Metro Boomin",
          sunoFormatted: `[Intro: Dark Atmospheric Tag]\n"Si ${p} no confía, no sales de este bloque"\n(Shhh...)\n\n[Beat Drop]`,
        },
        {
          text: `${p} got the keys to the city, tranquilo...`,
          style: "Minimal Cold",
          language: "spanglish",
          archetypeName: "Metro Boomin",
          sunoFormatted: `[Intro: Filtered Telephone Tag]\n"${p} got the keys, tranquilo..."\n\n[Beat Drop]`,
        },
      ];
    case "tay_keith":
      return [
        {
          text: `${p}, fuck these niggas up!`,
          style: "Hype & Agresivo",
          language: "en",
          archetypeName: "Tay Keith",
          sunoFormatted: `[Intro: Memphis Screamer Tag]\n"${p}, fuck these niggas up!"\n(Grrt, bah!)\n\n[Beat Drop]`,
        },
        {
          text: `${p}, revienta este bloque ya!`,
          style: "Agresivo Drill",
          language: "es",
          archetypeName: "Tay Keith",
          sunoFormatted: `[Intro: Shouted Aggressive Tag]\n"${p}, revienta este bloque ya!"\n(Fah, fah!)\n\n[Beat Drop]`,
        },
        {
          text: `${p} on the beat, you already know what's up`,
          style: "Raw Street",
          language: "en",
          archetypeName: "Tay Keith",
          sunoFormatted: `[Intro: Clean Vocal Shout]\n"${p} on the beat, you know what's up!"\n\n[Beat Drop]`,
        },
        {
          text: `${p} soltó el bajo, all gas no brakes!`,
          style: "Street Bounce",
          language: "spanglish",
          archetypeName: "Tay Keith",
          sunoFormatted: `[Intro: Distorted Megaphone Tag]\n"${p} soltó el bajo, all gas no brakes!"\n\n[Beat Drop]`,
        },
      ];
    case "pierre":
      return [
        {
          text: `Yo ${p}, you wanna come out here?`,
          style: "Trippy & Chill",
          language: "en",
          archetypeName: "Pi'erre Bourne",
          sunoFormatted: `[Intro: Reverb Sitcom Sample Tag]\n"Yo ${p}, you wanna come out here?"\n(Screaming FX - Plugg!)\n\n[Beat Drop]`,
        },
        {
          text: `Oye ${p}, súbele a la nave`,
          style: "Cloud Rap",
          language: "es",
          archetypeName: "Pi'erre Bourne",
          sunoFormatted: `[Intro: Ethereal Echo Tag]\n"Oye ${p}, súbele a la nave..."\n\n[Beat Drop]`,
        },
        {
          text: `${p} floating on the track, celestial`,
          style: "Psychedelic",
          language: "spanglish",
          archetypeName: "Pi'erre Bourne",
          sunoFormatted: `[Intro: High Pitch Cartoon Tag]\n"${p} floating on the track..."\n\n[Beat Drop]`,
        },
      ];
    case "southside":
      return [
        {
          text: `Southside on the track, ${p} got the heat`,
          style: "Seco & Directo",
          language: "en",
          archetypeName: "Southside / 808 Mafia",
          sunoFormatted: `[Intro: 808 Mafia Siren Tag]\n"${p} on the track, 808 Mafia!"\n\n[Beat Drop - Hard 808]`,
        },
        {
          text: `${p} en los controles, esto no es un juego`,
          style: "Seco Street",
          language: "es",
          archetypeName: "Southside / 808 Mafia",
          sunoFormatted: `[Intro: Cold Siren Tag]\n"${p} en los controles, esto no es un juego..."\n\n[Beat Drop]`,
        },
      ];
    case "f1lthy":
      return [
        {
          text: `Wake up ${p}!`,
          style: "Rage & Caos",
          language: "en",
          archetypeName: "F1lthy / BNYX",
          sunoFormatted: `[Intro: Distorted Vamp Screamer Tag]\n"Wake up ${p}!"\n(Overblown 808 Distortion)\n\n[Beat Drop]`,
        },
        {
          text: `${p}! Don't play with me!`,
          style: "Hyperpop Rage",
          language: "en",
          archetypeName: "F1lthy / BNYX",
          sunoFormatted: `[Intro: Pitch Shifted Screamer]\n"${p}! Don't play with me!"\n\n[Beat Drop]`,
        },
      ];
    case "wheezy":
      return [
        {
          text: `${p} outta here!`,
          style: "Wave & Slatt",
          language: "en",
          archetypeName: "Wheezy",
          sunoFormatted: `[Intro: Smooth Reverb Vocal]\n"${p} outta here..."\n(Slatt!)\n\n[Beat Drop]`,
        },
        {
          text: `${p} se fue lejos, en otra frecuencia`,
          style: "Wave Melódico",
          language: "es",
          archetypeName: "Wheezy",
          sunoFormatted: `[Intro: Soft Autotune Echo]\n"${p} se fue lejos, otra liga..."\n\n[Beat Drop]`,
        },
      ];
    default:
      return [
        {
          text: `${p} on the beat, handle your business`,
          style: "Hitmaker Classic",
          language: "en",
          archetypeName: "Studio Legend",
          sunoFormatted: `[Intro: Whispered Producer Tag]\n"${p} on the beat..."\n(Yeah!)\n\n[Beat Drop - Heavy 808]`,
        },
        {
          text: `Dímelo ${p}, la calle está encendida`,
          style: "Latin Street",
          language: "es",
          archetypeName: "Latin Urban",
          sunoFormatted: `[Intro: Street Tag]\n"Dímelo ${p}, la calle está encendida..."\n\n[Beat Drop]`,
        },
        {
          text: `${p} in the lab, heavy artillery`,
          style: "Dark Menacing",
          language: "spanglish",
          archetypeName: "Dark Trap",
          sunoFormatted: `[Intro: Distorted Voice Tag]\n"${p} in the lab, otro palo..."\n\n[Beat Drop]`,
        },
        {
          text: `Hold up, that's ${p} behind the glass`,
          style: "Luxury Flex",
          language: "en",
          archetypeName: "Executive Flex",
          sunoFormatted: `[Intro: Smooth Telephone Filter]\n"Hold up, that's ${p} behind the glass..."\n\n[Beat Drop]`,
        },
      ];
  }
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
PERFIL ACÚSTICO Y ENERGÍA DEL TAG:
- Arquetipo de producción: ${archetype.name}
- Atmósfera e intensidad: ${archetype.vibe}
- Enfoque sonoro: ${archetype.description}
- Directiva estilística: Compón una firma sonora original que capture con máxima precisión la cadencia, la síncopa y la presencia vocal de esta atmósfera, centrada exclusivamente en el nombre "${producerName}". Queda estrictamente prohibido plagiar o copiar frases célebres existentes; crea frases 100% inéditas y exclusivas sin copiar ningún tag ajeno.`;
    } else if (archetype && archetype.id === "smart") {
      archetypeConstraint = `
PERFIL ACÚSTICO Y ENERGÍA DEL TAG:
- Arquetipo: Fusión Contextual Narrativa
- Directiva estilística: Analiza la atmósfera, el conflicto y la imaginería dominante de la letra adjunta. Extrae la tensión central y formula firmas sonoras originales para "${producerName}" que actúen como preludio orgánico a la narrativa de la canción, sin citar categorías genéricas.`;
    } else {
      archetypeConstraint = `
PERFIL ACÚSTICO Y ENERGÍA DEL TAG:
- Arquetipo: Diversidad Sonora de Estudio
- Directiva estilística: Genera una variedad balanceada de entregas vocales (susurrada de baja frecuencia, grito distorsionado de alta energía, fraseo melódico con reverberación espacial, y staccato seco y percusivo), todas construidas alrededor del nombre "${producerName}".`;
    }

    const prompt = `Eres un productor de audio legendario y ghostwriter de trap. Genera entre 4 y 5 Producer Tags icónicos para el productor "${producerName}".

# 🎯 CONTEXTO DE LA CANCIÓN:
- Productor: "${producerName}"
- Artista: ${artistName}
- Mood / Vibra: ${mood}
${lyricsSnippet ? `- Letra / Barras de la canción (para extraer conceptos y jerga):\n${lyricsSnippet}` : ""}

# 🎛️ REGLAS DE GENERACIÓN (PRINCIPIOS ABSTRACTOS):
${archetypeConstraint}
1. El nombre "${producerName}" DEBE aparecer en cada tag.
2. Cada tag debe ser CORTO y CONTUNDENTE (máximo 4 a 8 palabras).
3. Debe sonar extremadamente pegadizo, callejero, original e inédito.
4. Genera variedad de idiomas: al menos uno en inglés americano (US Trap), uno en español callejero y uno en Spanglish orgánico.
5. Queda TERMINANTEMENTE PROHIBIDO copiar o reproducir tags famosos existentes de otros productores. Crea frases completamente nuevas y distintivas.
6. Formatea cada tag para que en Suno AI actúe como directiva acústica perfecta de intro antes de la caída del beat.

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura (sin markdown, sin explicaciones):
{
  "tags": [
    {
      "text": "Frase del tag",
      "style": "Descriptor del estilo sonoro",
      "language": "en | es | spanglish",
      "archetypeName": "Arquetipo de entrega vocal",
      "sunoFormatted": "[Intro: Descriptor acústico para Suno]\\n\\\"Frase del tag\\\"\\n(Ad-lib rítmico)\\n\\n[Beat Drop]"
    }
  ]
}`;

    try {
      const geminiResult = await callGeminiResilient({
        prompt,
        apiKey: body.geminiApiKey,
        preferredModel: body.geminiModel,
        temperature: 0.9,
        responseMimeType: "application/json",
        timeoutMs: 18000,
        thinkingBudget: 0,
      });

      let tags: GeneratedTag[] = [];
      if (Array.isArray(geminiResult.rawJson)) {
        tags = geminiResult.rawJson;
      } else if (geminiResult.rawJson?.tags && Array.isArray(geminiResult.rawJson.tags)) {
        tags = geminiResult.rawJson.tags;
      }

      if (tags.length > 0) {
        return NextResponse.json({
          tags,
          modelUsed: geminiResult.modelUsed,
          durationMs: geminiResult.durationMs,
        });
      }
    } catch (llmErr) {
      console.warn("[producer-tag] Gemini cascade error, falling back to studio presets:", llmErr);
    }

    // High quality algorithmic fallback if LLM is unavailable
    const fallbackTags = getProducerTagFallback(producerName, body.archetypeId);
    return NextResponse.json({
      tags: fallbackTags,
      isFallback: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generando producer tag";
    console.error("[producer-tag] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



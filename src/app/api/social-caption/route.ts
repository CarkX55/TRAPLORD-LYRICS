import { NextRequest, NextResponse } from "next/server";
import { getArtistById, MOODS, BPM_VIBES, getProducerById } from "@/lib/trap-data";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CaptionBody {
  artistId: string;
  moodId: string;
  bpmVibeId: string;
  producerId?: string;
  spanglishPercent: number;
  qualityScore?: number;
  punchlineText?: string;
  platform: "instagram" | "twitter" | "tiktok";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CaptionBody;

    const artist = getArtistById(body.artistId);
    const mood = MOODS.find(m => m.id === body.moodId);
    const bpm = BPM_VIBES.find(b => b.id === body.bpmVibeId);
    const producer = body.producerId && body.producerId !== "none" ? getProducerById(body.producerId) : null;

    if (!artist) {
      return NextResponse.json({ error: "Artista no encontrado." }, { status: 400 });
    }

    const platformConfig = {
      instagram: {
        maxLength: 2200,
        style: "Visual, con emojis, hashtags al final, tono enérgico",
        hashtags: 10,
      },
      twitter: {
        maxLength: 280,
        style: "Conciso, punchy, máximo 280 caracteres, pocos hashtags",
        hashtags: 3,
      },
      tiktok: {
        maxLength: 300,
        style: "Trending, gen Z, emojis virales, llamado a la acción (duet/stitch)",
        hashtags: 5,
      },
    };

    const config = platformConfig[body.platform];

    const prompt = `Eres un social media manager experto en música trap/rap. Genera un caption para ${body.platform} sobre una nueva canción de trap generada.

DATOS DE LA CANCIÓN:
- Artista: ${artist.name} (${artist.origin})
- Mood: ${mood?.label ?? body.moodId}
- BPM: ${bpm?.range ?? "130-145"} (${bpm?.label ?? "Atlanta Standard"})
- Productor: ${producer?.name ?? "auto"}
- Spanglish: ${body.spanglishPercent}% EN / ${100 - body.spanglishPercent}% ES
- Quality Score: ${body.qualityScore ?? "?"}/100
- Mejor punchline: "${body.punchlineText ?? "n/a"}"

REQUISITOS:
- Plataforma: ${body.platform}
- Estilo: ${config.style}
- Máximo ${config.maxLength} caracteres
- Incluye ${config.hashtags} hashtags relevantes (#trap #rap #newmusic etc.)
- Tono: auténtico del estilo trap, no corporativo
- No menciones que fue generada con IA
- Incluye un CTA (call to action) natural

Devuelve SOLO el caption (sin explicaciones, sin metadatos):`;

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
      temperature: 0.9, // creative for social media
    });

    const caption = completion.choices[0]?.message?.content;
    if (!caption || !caption.trim()) {
      return NextResponse.json({ error: "No se pudo generar el caption." }, { status: 502 });
    }

    return NextResponse.json({
      caption: caption.trim(),
      platform: body.platform,
      artistName: artist.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en el caption.";
    console.error("[social-caption] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

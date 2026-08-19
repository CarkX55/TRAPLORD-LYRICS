import { NextRequest, NextResponse } from "next/server";
import { getArtistById, MOODS, BPM_VIBES, getProducerById } from "@/lib/trap-data";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CoverArtBody {
  artistId: string;
  moodId: string;
  bpmVibeId: string;
  producerId?: string;
  spanglishPercent: number;
  songTitle?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CoverArtBody;

    const artist = getArtistById(body.artistId);
    const mood = MOODS.find(m => m.id === body.moodId);
    const bpm = BPM_VIBES.find(b => b.id === body.bpmVibeId);
    const producer = body.producerId && body.producerId !== "none" ? getProducerById(body.producerId) : null;

    if (!artist) {
      return NextResponse.json({ error: "Artista no encontrado." }, { status: 400 });
    }

    // Build a detailed image prompt for cover art
    const moodVisualMap: Record<string, string> = {
      agresivo: "dark, aggressive, red and black, fire and smoke, intense energy, urban warfare aesthetic",
      melancolico: "melancholic, blue and purple tones, rain, neon lights reflecting on wet streets, lonely atmosphere",
      flex: "luxurious, gold and diamond accents, expensive cars, champagne, diamond chains, wealth aesthetic",
      fiesta: "vibrant, neon pink and green, club lights, party atmosphere, energetic, colorful smoke",
      introspectivo: "contemplative, deep blue and teal, silhouette in fog, minimalist, introspective mood",
      oscuro: "dark, demonic, black and red, shadowy figures, occult imagery, sinister atmosphere",
      romantico: "romantic, pink and purple gradients, roses, soft lighting, sensual atmosphere",
      calle: "gritty, urban, concrete and graffiti, street lights, raw documentary photography style",
    };

    const moodVisual = moodVisualMap[body.moodId] ?? "dark trap aesthetic, neon accents";

    // Artist visual style
    const artistVisualMap: Record<string, string> = {
      future: "purple lean aesthetic, codeine cup, futuristic auto-tune vibe, glitchy distortion",
      young_thug: "slime green, quirky fashion, avant-garde, eccentric colorful",
      "21_savage": "knife tattoo aesthetic, cold dark minimal, london fog, menacing",
      playboi_carti: "vampire aesthetic, red eyes, gothic punk, chaotic energy",
      gunna: "drip fashion, luxury brands, clean minimal, high fashion",
      lil_baby: "atlanta street, emotional lighting, documentary style",
      drake: "toronto night, clean cinematic, emotional lighting",
      travis_scott: "psychedelic, astroworld aesthetic, neon carnival, chaotic",
      don_tolver: "houston night, R&B smooth, seductive lighting",
      lil_uzi: "emo punk, colorful hair, anime aesthetic, energetic",
      yung_beef: "barcelona street, raw gritty, florida barrial",
      cruz_cafune: "canary islands, warm sunset, beach urban, reflective",
      recycled_j: "madrid street, boom bap, vintage film grain",
      hard_gz: "madrid drill, dark alley, menacing shadows",
      quevedo: "summer party, beach club, vibrant young",
      beny_jr: "moroccan patterns, barcelona street, multicultural",
      agnus_tris: "drill dark, madrid night, threatening shadows",
      pnl: "cloud rap, atmospheric, melancholic sky, ethereal",
      booba: "paris street, french rap, gritty urban",
      ninho: "paris night, cinematic, luxury street",
      central_cee: "london drill, grey skies, uk street",
      anuel_aa: "puerto rico, latin trap, real hasta la muerte, tropical dark",
      bad_bunny: "puerto rico, colorful reggaeton, eccentric fashion",
      yovngchimi: "drill pr, dark menacing, glizzy gang aesthetic",
      myke_towers: "puerto rico, elegant street, luxury latin",
      kidd_keo: "spanglish dark, rockport aesthetic, street gothic",
      morad: "madrid multicultural, raw street, documentary",
    };

    const artistVisual = artistVisualMap[body.artistId] ?? "trap aesthetic, urban, dark with neon accents";

    const prompt = `Album cover art for a trap song. Style: ${artistVisual}. Mood: ${moodVisual}. BPM: ${bpm?.range ?? "130-145"}. ${producer ? `Producer vibe: ${producer.name} (${producer.style}).` : ""} Spanglish ratio: ${body.spanglishPercent}% EN. Square format, high quality, professional album cover, no text, no words, no letters, pure visual art, dramatic lighting, cinematic composition.`;

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: "1024x1024",
    });

    const imageBase64 = response.data[0]?.base64;
    if (!imageBase64) {
      return NextResponse.json({ error: "La generación de imagen no devolvió contenido." }, { status: 502 });
    }

    return NextResponse.json({
      imageBase64,
      prompt,
      artistName: artist.name,
      moodLabel: mood?.label ?? body.moodId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en la generación de cover art.";
    console.error("[cover-art] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

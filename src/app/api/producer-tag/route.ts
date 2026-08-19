import { NextRequest, NextResponse } from "next/server";
import { getProducerById } from "@/lib/trap-data";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ProducerTagBody {
  producerName: string;
  producerId?: string;
  lyrics: string;
  artistName: string;
  moodId: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

const PRODUCER_TAG_STYLES: Record<string, { name: string; tag: string; style: string }> = {
  metro_boomin: { name: "Metro Boomin", tag: "If Metro don't trust you, I'm gon' shoot you", style: "amenazante, oscuro, calle" },
  tay_keith: { name: "Tay Keith", tag: "Tay Keith, fuck these niggas up!", style: "agresivo, hype, directo" },
  southside: { name: "Southside", tag: "Southside on the track", style: "simple, directo, 808 Mafia" },
  wheezy: { name: "Wheezy", tag: "Wheezy out of here", style: "slatt, casual, Young Thug style" },
  pierre_bourne: { name: "Pierre Bourne", tag: "Pierre!", style: "corto, pegadizo, psicodélico" },
  zaytovan: { name: "Zaytoven", tag: "Zaytoven!", style: "clásico Atlanta, piano, simple" },
  tm88: { name: "TM88", tag: "808 Mafia", style: "oscuro, sintéticos, distorsionado" },
  dr_dre: { name: "Dr. Dre", tag: "Dre", style: "West Coast, G-Funk, clásico" },
  mike_dean: { name: "Mike Dean", tag: "Mike Dean", style: "psicodélico, sintetizadores, mastering" },
  markoff: { name: "Markoff", tag: "Markoff on the beat", style: "trap madrileño, plugg, drill" },
  bizarrap: { name: "Bizarrap", tag: "BZRP Music Sessions", style: "minimalista, crecimiento progresivo" },
  bnyx: { name: "BNYX", tag: "BNYX!", style: "rage, sintetizadores brillantes" },
  f1lthy: { name: "F1lthy", tag: "F1lthy", style: "rage/vamp, caótico" },
  mustard: { name: "Mustard", tag: "Mustard", style: "West Coast bounce, hyphy" },
  hit_boy: { name: "Hit-Boy", tag: "Hit-Boy", style: "versátil, boom bap moderno" },
  ovy_on_drums: { name: "Ovy on the Drums", tag: "Ovy on the Drums", style: "reggaeton/trap latino, dembow" },
  tainy: { name: "Tainy", tag: "Tainy", style: "reggaeton/trap latino, dembow moderno" },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProducerTagBody;
    const producerName = body.producerName?.trim() || "Markoff";
    const producer = body.producerId ? getProducerById(body.producerId) : null;
    const producerStyle = producer && producer.id !== "none" ? producer : PRODUCER_TAG_STYLES[body.producerId ?? "markoff"] ?? PRODUCER_TAG_STYLES.markoff;

    // Construir el prompt
    const prompt = `Eres un experto en producer tags de trap. Genera 5 variantes de producer tag para el productor "${producerName}".

CONTEXTO:
- Artista: ${body.artistName}
- Mood: ${body.moodId}
- Estilo del productor original: ${producerStyle?.name ?? "Markoff"} (${producerStyle?.style ?? "trap madrileño"})
- Tag original de referencia: "${producerStyle?.tag ?? "Markoff on the beat"}"
- Letra de la canción (para adaptar el tag a la vibra):
${body.lyrics.slice(0, 500)}

REGLAS:
1. Genera 5 variantes DIFERENTES de producer tag para "${producerName}"
2. Cada tag debe ser CORTO (máximo 10 palabras)
3. Debe ser pegadizo y memorable
4. Adapta el estilo al mood de la canción
5. Usa el nombre "${producerName}" en cada tag
6. Estilos variados: uno amenazante, uno hype, uno minimalista, uno con humor calle, uno melódico
7. En español, inglés o spanglish según el mood
8. NO uses el nombre real del productor original, solo el estilo

Ejemplos de referencia:
- "If Metro don't trust you, I'm gon' shoot you" (amenazante)
- "Tay Keith, fuck these niggas up!" (hype)
- "Southside on the track" (minimalista)
- "Wheezy out of here" (casual)
- "Pierre!" (corto)

Devuelve SOLO un JSON con esta estructura:
{
  "tags": [
    { "text": "tag aquí", "style": "amenazante" },
    { "text": "tag aquí", "style": "hype" },
    { "text": "tag aquí", "style": "minimalista" },
    { "text": "tag aquí", "style": "humor calle" },
    { "text": "tag aquí", "style": "melódico" }
  ]
}`;

    let result: { tags: { text: string; style: string }[] };

    if (body.geminiApiKey?.trim()) {
      // Modo Gemini directo
      const model = body.geminiModel || "gemini-2.0-flash";
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.geminiApiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 1.0, topP: 0.95 },
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
      // Modo Z.ai SDK
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        thinking: { type: "disabled" },
        temperature: 1.0,
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

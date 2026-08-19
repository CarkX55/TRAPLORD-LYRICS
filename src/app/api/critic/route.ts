import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CriticBody {
  lyrics: string;
  artistName: string;
  moodLabel: string;
  spanglishTarget: number;
}

interface CriticFeedback {
  type: "strength" | "weakness" | "suggestion";
  line?: string;       // line number reference
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CriticBody;

    if (!body.lyrics || !body.lyrics.trim()) {
      return NextResponse.json({ error: "No se proporcionó letra para criticar." }, { status: 400 });
    }

    const prompt = `Eres un crítico experto de letras de trap/rap. Analiza la siguiente letra generada al estilo de "${body.artistName}" con mood "${body.moodLabel}" y target de spanglish ${body.spanglishTarget}%.

DEBES devolver EXCLUSIVAMENTE un JSON válido con esta estructura (sin markdown, sin explicaciones):
{
  "overallScore": <número 0-100>,
  "summary": "<resumen de 1-2 frases>",
  "feedback": [
    {
      "type": "strength" | "weakness" | "suggestion",
      "line": "<referencia a línea o sección, opcional>",
      "text": "<feedback específico y accionable>"
    }
  ]
}

Criterios de análisis:
1. Coherencia narrativa (¿la historia tiene sentido?)
2. Uso de slang auténtico del artista
3. Densidad de punchlines
4. Flow y métrica (¿las frases son cantables?)
5. Ad-libs apropiados
6. Cumplimiento del ratio spanglish
7. Originalidad (¿evita clichés?)
8. Transiciones entre secciones

Proporciona 3-5 puntos de feedback mezclando strengths, weaknesses y suggestions. Sé específico (cita líneas concretas cuando sea posible).

LETRA A ANALIZAR:
${body.lyrics}`;

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
      temperature: 0.4, // low temperature for analytical consistency
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw || !raw.trim()) {
      return NextResponse.json({ error: "El crítico no devolvió contenido." }, { status: 502 });
    }

    // Try to parse JSON (the model may wrap it in markdown)
    let parsed: { overallScore: number; summary: string; feedback: CriticFeedback[] };
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return the raw text as summary
      return NextResponse.json({
        overallScore: 50,
        summary: raw.slice(0, 500),
        feedback: [],
        raw: true,
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en el crítico.";
    console.error("[critic] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

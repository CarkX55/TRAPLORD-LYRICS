import { NextRequest, NextResponse } from "next/server";
import { analyzeSunoReadiness, type SunoReadinessResult } from "@/lib/language-detector";
import { parseRawLyricsToAST, stringifyASTToSunoLyrics, type SongDocument } from "@/lib/song-document";
import type { RepairOperation } from "@/lib/repair-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CriticBody {
  lyrics?: string;
  document?: SongDocument;
  artistName: string;
  moodLabel: string;
  spanglishTarget: number;
  situationalPresetId?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

interface CriticFeedback {
  type: "strength" | "weakness" | "suggestion";
  line?: string;
  text: string;
}

interface CriticDimensions {
  flow: number;              // Rhythmic pocket & breath variance
  narrative: number;         // Progression & scene turn vs static loop
  lexical: number;           // Street jargon authenticity & register
  specificity: number;       // Physical details / concrete brands vs abstract claims
  sceneDependency: number;   // How tied the lyrics are to this specific song vs generic filler
  genericnessPenalty: number;// Penalty for clichés and empty rhymes (0 = zero generic, 100 = full cliché)
  cohesion: number;          // Transition between sections
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CriticBody;

    let doc: SongDocument;
    if (body.document && body.document.sections && body.document.sections.length > 0) {
      doc = body.document;
    } else if (body.lyrics && body.lyrics.trim()) {
      doc = parseRawLyricsToAST(body.lyrics);
    } else {
      return NextResponse.json({ error: "No se proporcionó letra o documento para criticar." }, { status: 400 });
    }

    const fullLyrics = stringifyASTToSunoLyrics(doc);
    const sunoReadiness = analyzeSunoReadiness(fullLyrics);

    // Prepare structural breakdown with bar IDs for surgical diagnosis
    const barListing = doc.sections.map(sec => {
      const barsText = sec.bars.map(b => `  [ID: ${b.id} | Compás ${b.position}${b.locked ? " 🔒 BLOQUEADO" : ""}] ${b.lyricText}`).join("\n");
      return `Sección [${sec.name} | SecID: ${sec.id}]:\n${barsText}`;
    }).join("\n\n");

    const prompt = `Eres el Multi-Crítico y Supervisor de Estudio más riguroso del Trap y Rap contemporáneo.
Analiza la siguiente canción estructurada como un AST (Abstract Syntax Tree) compás a compás.
Artista: "${body.artistName}" | Mood: "${body.moodLabel}" | Objetivo Spanglish: ${body.spanglishTarget}%

# COMPASES DE LA CANCIÓN CON IDENTIFICADORES:
${barListing}

# TAREAS DEL MULTI-CRÍTICO:
1. Evalúa críticamente las 7 Dimensiones de Calidad (cada una de 0 a 100):
   - flow: Pocket rítmico, cantabilidad y variedad de respiración.
   - narrative: Progresión de la historia y giro dramático (evita escenas estáticas en bucle).
   - lexical: Autenticidad de la jerga callejera; CERO términos formales, de oficina o clínicos (e.g. "cunnilingus").
   - specificity: Detalles visuales concretos, marcas, modelos, objetos físicos vs frases abstractas vacías.
   - sceneDependency: ¿Estas barras pertenecen de forma única a esta situación o son barras genéricas intercambiables?
   - genericnessPenalty: Penalización por clichés de IA ("el asfalto no perdona", "fuego/juego/cielo", "contando money"). (0 = original y fresco, 100 = puro cliché).
   - cohesion: Fluidez de transición entre verso, puente y estribillo.
2. Identifica entre 1 y 3 compases individuales débiles que requieran REPARACIÓN QUIRÚRGICA (NO sugieras barras que tengan 🔒 BLOQUEADO).
3. PRESERVACIÓN DE TEMAS Y MARCAS DEL USUARIO: Si la canción contiene marcas, criptomonedas, tokens o términos legítimos asociados a la temática (ej. "Cardano", "Rolex"), NO los consideres como 'contaminación corporativa' ni name-dropping forzado si encajan en la escena callejera.

DEBES devolver EXCLUSIVAMENTE un JSON válido con esta estructura exacta (sin markdown, sin texto extra fuera del JSON):
{
  "overallScore": <número 0-100>,
  "summary": "<resumen analítico de 1-2 frases>",
  "dimensions": {
    "flow": <0-100>,
    "narrative": <0-100>,
    "lexical": <0-100>,
    "specificity": <0-100>,
    "sceneDependency": <0-100>,
    "genericnessPenalty": <0-100>,
    "cohesion": <0-100>
  },
  "feedback": [
    {
      "type": "strength" | "weakness" | "suggestion",
      "line": "<referencia a compás o sección>",
      "text": "<feedback específico y accionable>"
    }
  ],
  "repairOperations": [
    {
      "id": "rep_1",
      "sectionId": "<SecID de la sección>",
      "targetBarIds": ["<ID_del_compas>"],
      "barRange": [<compas_inicio>, <compas_fin>],
      "problem": "cliche" | "register" | "repetition" | "weak_hook" | "scene_stall" | "genericness" | "rhythm",
      "instruction": "<instrucción concreta de cómo reescribir esta barra sustituyendo clichés por microdetalles físicos>"
    }
  ]
}`;

    let raw = "";

    if (body.geminiApiKey?.trim()) {
      const model = body.geminiModel || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.geminiApiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              topP: 0.9,
            },
          }),
        }
      );
      const json = await res.json();
      if (json.error) {
        throw new Error(`Gemini: ${json.error.message}`);
      }
      raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        thinking: { type: "disabled" },
        temperature: 0.3,
      });
      raw = completion.choices[0]?.message?.content ?? "";
    }

    if (!raw || !raw.trim()) {
      return NextResponse.json({ error: "El crítico no devolvió contenido." }, { status: 502 });
    }

    let parsed: {
      overallScore: number;
      summary: string;
      dimensions?: CriticDimensions;
      feedback: CriticFeedback[];
      repairOperations?: any[];
    };

    try {
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        overallScore: 50,
        summary: raw.slice(0, 500),
        dimensions: {
          flow: 50,
          narrative: 50,
          lexical: 50,
          specificity: 50,
          sceneDependency: 50,
          genericnessPenalty: 30,
          cohesion: 50,
        },
        feedback: [],
        repairOperations: [],
        sunoReadiness,
        document: doc,
        raw: true,
      });
    }

    // Hydrate repair operations with sourceVersionId and songId
    const sanitizedRepairs: RepairOperation[] = (parsed.repairOperations || []).map((op: any, idx: number) => ({
      id: op.id || `rep_${Date.now()}_${idx}`,
      songId: doc.id,
      sourceVersionId: doc.versionId,
      sectionId: op.sectionId,
      barRange: op.barRange || [1, 1],
      targetBarIds: Array.isArray(op.targetBarIds) ? op.targetBarIds : [],
      problem: op.problem || "genericness",
      instruction: op.instruction || "Reescribir con mayor concreción física y actitud callejera.",
      preserveWords: op.preserveWords || [],
    }));

    return NextResponse.json({
      overallScore: parsed.overallScore ?? 75,
      summary: parsed.summary ?? "Análisis completado.",
      dimensions: parsed.dimensions ?? {
        flow: 75,
        narrative: 75,
        lexical: 80,
        specificity: 70,
        sceneDependency: 70,
        genericnessPenalty: 20,
        cohesion: 75,
      },
      feedback: parsed.feedback ?? [],
      repairOperations: sanitizedRepairs,
      sunoReadiness,
      document: doc,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en el crítico.";
    console.error("[critic] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


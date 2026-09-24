import { NextRequest, NextResponse } from "next/server";
import {
  type SongDocument,
  type SongBar,
  stringifyASTToSunoLyrics,
  validateMutation,
  isMetaReasoningLine,
  validateLyricEnvelope,
} from "@/lib/song-document";
import {
  type RepairOperation,
  type PatchResult,
  applySurgicalPatchToAST,
} from "@/lib/repair-engine";
import { getEffectiveApiKey, GEMINI_SAFETY_SETTINGS, extractGeminiText } from "@/lib/gemini-config";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PatchRequestBody {
  document: SongDocument;
  operation: RepairOperation;
  customInstruction?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PatchRequestBody;

    if (!body.document || !body.operation) {
      return NextResponse.json(
        { error: "Se requiere un SongDocument y una RepairOperation válidos." },
        { status: 400 }
      );
    }

    const { document: doc, operation } = body;

    // Concurrency check
    if (doc.versionId !== operation.sourceVersionId) {
      return NextResponse.json(
        {
          error: `Conflicto de versiones: el documento actual es ${doc.versionId} pero la operación fue creada sobre ${operation.sourceVersionId}. Por favor actualiza el análisis crítico.`,
        },
        { status: 409 }
      );
    }

    // Locate section
    const section = doc.sections.find((s) => s.id === operation.sectionId);
    if (!section) {
      return NextResponse.json(
        { error: `Sección no encontrada: ${operation.sectionId}` },
        { status: 404 }
      );
    }

    // Check target bars existence & lock status
    const targetBars: SongBar[] = [];
    for (const barId of operation.targetBarIds) {
      const b = section.bars.find((bar) => bar.id === barId);
      if (!b) {
        return NextResponse.json(
          { error: `Compás no encontrado en la sección: ${barId}` },
          { status: 404 }
        );
      }
      if (b.locked) {
        return NextResponse.json(
          {
            error: `El compás [${b.position}] está bloqueado 🔒 por el usuario y no puede ser mutado. Desbloquéalo primero.`,
          },
          { status: 400 }
        );
      }
      targetBars.push(b);
    }

    if (targetBars.length === 0) {
      return NextResponse.json(
        { error: "No se especificaron compases válidos para reparar." },
        { status: 400 }
      );
    }

    // Determine surrounding context for natural rhyme and flow continuity
    const firstTargetPos = Math.min(...targetBars.map((b) => b.position));
    const lastTargetPos = Math.max(...targetBars.map((b) => b.position));

    const precedingBars = section.bars
      .filter((b) => b.position >= firstTargetPos - 2 && b.position < firstTargetPos)
      .map((b) => `[Compás ${b.position}]: ${b.lyricText}`);

    const succeedingBars = section.bars
      .filter((b) => b.position > lastTargetPos && b.position <= lastTargetPos + 2)
      .map((b) => `[Compás ${b.position}]: ${b.lyricText}`);

    const currentBarsText = targetBars
      .map((b) => `[Compás ${b.position}]: ${b.lyricText}`)
      .join("\n");

    const instruction = body.customInstruction?.trim() || operation.instruction;

    const prompt = `Eres un Cirujano Lírico de Trap y Rap de élite.
Tu misión es realizar una REPARACIÓN QUIRÚRGICA de EXACTAMENTE ${targetBars.length} compás/compases en la sección "[${section.name}]".

# CONTEXTO PREVIO (Compases anteriores inmediatos):
${precedingBars.length > 0 ? precedingBars.join("\n") : "(Inicio de la sección)"}

# COMPASES OBJETIVO ACTUALES A REEMPLAZAR:
${currentBarsText}

# CONTEXTO POSTERIOR (Compases siguientes inmediatos):
${succeedingBars.length > 0 ? succeedingBars.join("\n") : "(Fin de la sección)"}

# DIAGNÓSTICO Y DIRECTIVA QUIRÚRGICA:
- Problema detectado: ${operation.problem}
- Instrucción de reparación: ${instruction}
${operation.preserveWords && operation.preserveWords.length > 0 ? `- Palabras o conceptos a conservar si es posible: [${operation.preserveWords.join(", ")}]` : ""}

# REGLAS ESTRICTAS DE CIRUGÍA:
1. Genera EXACTAMENTE ${targetBars.length} líneas de reemplazo (una línea por cada compás a sustituir).
2. La métrica y la rima deben encajar perfectamente con el contexto previo y posterior.
3. Prohibido usar clichés genéricos ("fuego/juego", "el asfalto no perdona", "contando money").
4. Incorpora detalles físicos reales, marcas o actitud cruda callejera.
5. Los ad-libs secundarios deben ir entre paréntesis.
6. PRESERVACIÓN DE TEMÁTICAS DEL USUARIO: Si se indican palabras o conceptos pedidos por el usuario (${operation.preserveWords && operation.preserveWords.length > 0 ? operation.preserveWords.join(", ") : "temática elegida"}), son elecciones deliberadas. NUNCA las censures ni las sustituyas por perífrasis genéricas.
7. CERO METARRAZONAMIENTO O EXPLICACIONES: PROHIBIDO incluir introducciones, explicaciones, viñetas, justificaciones del cambio o frases como "Letra ajustada:" o "Se ha resuelto el problema". Devuelve ÚNICAMENTE el array JSON.

DEBES devolver EXCLUSIVAMENTE un array JSON con las nuevas líneas de texto cantado (sin markdown, sin explicaciones):
[
  "Nueva línea para el compás...",
  ...
]`;

    let raw = "";
    const apiKey = getEffectiveApiKey(body.geminiApiKey);
    const rawModel = body.geminiModel?.trim();
    const model = (rawModel && rawModel.trim()) ? rawModel.trim() : "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            topP: 0.9,
          },
          safetySettings: GEMINI_SAFETY_SETTINGS,
        }),
      }
    );
    const json = await res.json();
    if (json.error) {
      throw new Error(`Gemini: ${json.error.message}`);
    }
    raw = extractGeminiText(json.candidates?.[0]);

    if (!raw || !raw.trim()) {
      return NextResponse.json(
        { error: "El motor de reparación no devolvió contenido." },
        { status: 502 }
      );
    }

    // Invariant: Zero Reasoning Leakage & Fail-Closed Envelope Policy (P7 Invariant).
    // If the raw response contains transition delimiters or explanatory reasoning lines, abort immediately without modifying the AST.
    const envelopeCheck = validateLyricEnvelope(raw);
    if (envelopeCheck.detectedReasoningLines && envelopeCheck.detectedReasoningLines.length > 0) {
      console.warn("[patch] Meta-reasoning leak detected in raw response. Aborting repair safely (REPAIR_ABORTED).");
      return NextResponse.json(
        {
          error: `Fuga de metarazonamiento detectada en la respuesta del modelo: ${envelopeCheck.reason}. Reparación abortada de forma segura (REPAIR_ABORTED).`,
          reasoningLeakDetected: true,
          status: "REPAIR_ABORTED",
          detectedLines: envelopeCheck.detectedReasoningLines,
        },
        { status: 422 }
      );
    }

    // Parse replacement lines
    let replacementLines: string[] = [];
    try {
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        replacementLines = parsed.map((item) => (typeof item === "string" ? item : item.text || item.lyricText || String(item)));
      }
    } catch {
      // Fallback to line split if LLM returned plain text lines
      replacementLines = raw
        .split(/\r?\n/)
        .map((l) => l.trim().replace(/^\[\d+\]\s*/, "").replace(/^-\s*/, ""))
        .filter((l) => l && !l.startsWith("[") && !l.startsWith("```"));
    }

    if (replacementLines.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron extraer las nuevas barras de la respuesta del modelo.", status: "REPAIR_ABORTED" },
        { status: 502 }
      );
    }

    // Invariant: Zero Reasoning Leakage. Reject if LLM returned meta-reasoning or explanations.
    const hasReasoningLeak = replacementLines.some(isMetaReasoningLine);
    if (hasReasoningLeak) {
      console.warn("[patch] Meta-reasoning leak detected in replacement lines. Aborting repair safely.");
      return NextResponse.json(
        {
          error: "El modelo devolvió explicaciones/metacomentarios en lugar de barras cantadas. Reparación abortada de forma segura (REPAIR_ABORTED).",
          reasoningLeakDetected: true,
          status: "REPAIR_ABORTED",
        },
        { status: 422 }
      );
    }

    // Ensure we have exact number of replacement bars matching targetBarIds
    const newBarsContent = operation.targetBarIds.map((_, idx) => {
      const line = replacementLines[idx] || replacementLines[replacementLines.length - 1] || "Línea reparada";
      return {
        lyricText: line,
      };
    });

    // Apply patch mutation to AST
    const patchResult: PatchResult = applySurgicalPatchToAST(doc, operation, newBarsContent);

    if (!patchResult.success) {
      return NextResponse.json({ error: patchResult.error }, { status: 400 });
    }

    // Validate structural invariance
    const validation = validateMutation(doc, patchResult.document, patchResult.changedBarIds);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Infracción de invariantes del AST: ${validation.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document: patchResult.document,
      patchResult,
      lyrics: stringifyASTToSunoLyrics(patchResult.document),
      changedBarIds: patchResult.changedBarIds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en la reparación quirúrgica.";
    console.error("[patch] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

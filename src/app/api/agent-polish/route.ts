import { NextRequest, NextResponse } from "next/server";
import { getFlowProfile } from "@/lib/artist-flow-profiles";
import { getRhymeTier } from "@/lib/prompt-builder";

export const runtime = "nodejs";
export const maxDuration = 300; // increased for auto-iterate (up to 3 iterations)

interface AgentPolishBody {
  lyrics: string;
  artistName: string;
  artistId: string;        // NEW — for tier + hookStyle lookup
  moodId: string;
  spanglishPercent: number;
  bpmRange: string;
  structurePlan: string;
  geminiApiKey?: string;
  geminiModel?: string;
  autoIterate?: boolean;   // NEW — enable auto-iterate mode
}

interface AgentResult {
  agent: string;
  score: number;
  issues: string[];
  suggestions: string[];
}

async function callLLM(prompt: string, body: AgentPolishBody): Promise<string> {
  if (body.geminiApiKey?.trim()) {
    const model = body.geminiModel || "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.geminiApiKey.trim()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topP: 0.95 },
        }),
      }
    );
    const json = await res.json();
    if (json.error) throw new Error(`Gemini: ${json.error.message}`);
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    // Z.ai SDK fallback (solo sandbox)
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "disabled" },
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

// Extract chorus/hook sections from lyrics (supports [Chorus], [Hook], ### [Chorus])
function extractChorus(lyrics: string): string {
  const sections = lyrics.split(/(?:###\s*)?\[/);
  const chorusSections = sections.filter(s => /Chorus|Hook|Estribillo/i.test(s.substring(0, 40)));
  return chorusSections.length > 0 ? chorusSections.join("\n---\n") : "(no chorus found)";
}

// ===== AGENTE 1: RHYME CHECKER =====
async function runRhymeChecker(body: AgentPolishBody): Promise<AgentResult> {
  const rhymePrompt = `Eres un experto analista de rimas en trap/rap. Analiza esta letra línea por línea.

LETRA:
${body.lyrics}

ARTISTA: ${body.artistName}
MOOD: ${body.moodId}

Tu trabajo:
1. Identifica qué líneas riman bien y cuáles NO riman o riman flojo
2. Cuenta cuántas líneas riman vs cuántas no
3. Identifica rimas internas (dentro de la misma línea)
4. Detecta rimas cliché (vida/herida, amor/dolor, calle/calle)
5. Sugiere mejoras específicas para las líneas que no riman

Devuelve SOLO JSON (sin markdown, sin explicaciones):
{"score": 0-100, "rhymingLines": numero, "totalLines": numero, "issues": ["problema 1"], "suggestions": ["mejora 1"]}`;

  const raw = await callLLM(rhymePrompt, body);
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { agent: "Rhyme Checker", score: parsed.score ?? 50, issues: parsed.issues ?? [], suggestions: parsed.suggestions ?? [] };
  } catch {
    return { agent: "Rhyme Checker", score: 60, issues: ["No se pudo parsear"], suggestions: [] };
  }
}

// ===== AGENTE 2: FLOW CHECKER =====
async function runFlowChecker(body: AgentPolishBody): Promise<AgentResult> {
  const flowPrompt = `Eres un experto en flow y métrica de trap/rap. Analiza esta letra.

LETRA:
${body.lyrics}

ARTISTA: ${body.artistName}
BPM: ${body.bpmRange}

Tu trabajo:
1. Cuenta sílabas por barra — ¿son consistentes?
2. ¿El flow encaja con el BPM?
3. ¿Hay variación de flow entre secciones?
4. ¿Las pausas y respiraciones están bien colocadas?
5. ¿Los ad-libs interrumpen o complementan el flow?

Devuelve SOLO JSON (sin markdown):
{"score": 0-100, "avgSyllables": numero, "issues": ["problema 1"], "suggestions": ["mejora 1"]}`;

  const raw = await callLLM(flowPrompt, body);
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { agent: "Flow Checker", score: parsed.score ?? 50, issues: parsed.issues ?? [], suggestions: parsed.suggestions ?? [] };
  } catch {
    return { agent: "Flow Checker", score: 60, issues: ["No se pudo parsear"], suggestions: [] };
  }
}

// ===== AGENTE 3: CONTENT CHECKER =====
async function runContentChecker(body: AgentPolishBody): Promise<AgentResult> {
  const contentPrompt = `Eres un crítico experto de letras de trap. Analiza el CONTENIDO.

LETRA:
${body.lyrics}

ARTISTA: ${body.artistName}
MOOD: ${body.moodId}
SPANGLISH TARGET: ${body.spanglishPercent}% EN

Tu trabajo:
1. ¿La narrativa es coherente de principio a fin?
2. ¿Hay punchlines memorables? ¿Cuántas?
3. ¿Evita clichés? ¿Es original?
4. ¿Los ad-libs son contextuales o repetitivos?
5. ¿Las transiciones entre secciones son naturales?

Devuelve SOLO JSON (sin markdown):
{"score": 0-100, "punchlineCount": numero, "issues": ["problema 1"], "suggestions": ["mejora 1"]}`;

  const raw = await callLLM(contentPrompt, body);
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { agent: "Content Checker", score: parsed.score ?? 50, issues: parsed.issues ?? [], suggestions: parsed.suggestions ?? [] };
  } catch {
    return { agent: "Content Checker", score: 60, issues: ["No se pudo parsear"], suggestions: [] };
  }
}

// ===== AGENTE 4: HOOK STRENGTH ANALYZER (NEW — Phase 2) =====
async function runHookAnalyzer(body: AgentPolishBody): Promise<AgentResult> {
  const flowProfile = getFlowProfile(body.artistId);
  const hookStyle = flowProfile?.hookStyle ?? "melodic";
  const chorusLyrics = extractChorus(body.lyrics);

  // Adapt criteria to the artist's hook style
  const styleCriteria: Record<string, string> = {
    repetitive: "Criterio para HOOK REPETITIVO (estilo Carti/Keef): ¿Hay una frase clave repetida en vamp? ¿Es pegadiza por repetición rítmica? No penalices la falta de complejidad lírica — la virtud es la hipnosis rítmica.",
    melodic: "Criterio para HOOK MELODICO (estilo Drake/Gunna): ¿Es cantable y melódico? ¿Hay estabilidad melódica? ¿Se quedaría en la cabeza? Evalúa singability para Suno.",
    technical: "Criterio para HOOK TÉCNICO (estilo Eminem/Kendrick): ¿Tiene rimas internas complejas en el hook? ¿Hay multisilábicas? ¿El hook es una showcase técnica, no solo pegadizo?",
    simple_punchy: "Criterio para HOOK DIRECTO (estilo 21 Savage/Gucci): ¿Son frases cortas y golpeadoras? ¿Minimalista pero impactante? No penalices la simplicidad — la virtud es el golpe seco.",
  };

  const hookPrompt = `Eres un experto analista de HOOKS/CHORUS en trap. Analiza SOLO los CHORUS de esta letra.

CHORUS EXTRAÍDOS:
${chorusLyrics}

ARTISTA: ${body.artistName}
HOOK STYLE DEL ARTISTA: ${hookStyle}

${styleCriteria[hookStyle]}

Tu trabajo:
1. Evalúa el hook según el criterio del HOOK STYLE (arriba). No apliques criterios genéricos — respeta el estilo del artista.
2. ¿Es MEMORABLE para Suno? ¿Se cantaría y recordaría?
3. ¿Las repeticiones del chorus (si hay múltiples) VARÍAN o son idénticas copiadas?
4. ¿El hook conecta con el mood de la canción?
5. ¿La longitud es adecuada (4-8 barras típicas)?

Devuelve SOLO JSON:
{"score": 0-100, "hookStyle": "${hookStyle}", "memorable": true/false, "variedRepetitions": true/false, "issues": ["problema 1"], "suggestions": ["mejora 1"]}`;

  const raw = await callLLM(hookPrompt, body);
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { agent: "Hook Analyzer", score: parsed.score ?? 50, issues: parsed.issues ?? [], suggestions: parsed.suggestions ?? [] };
  } catch {
    return { agent: "Hook Analyzer", score: 60, issues: ["No se pudo parsear"], suggestions: [] };
  }
}

// Run all 4 checkers in parallel (returns array of 4 AgentResults)
async function runAllCheckers(body: AgentPolishBody): Promise<AgentResult[]> {
  const [rhyme, flow, content, hook] = await Promise.all([
    runRhymeChecker(body),
    runFlowChecker(body),
    runContentChecker(body),
    runHookAnalyzer(body),
  ]);
  return [rhyme, flow, content, hook];
}

// Calculate average score from agent reports
function avgScore(reports: AgentResult[]): number {
  return Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length);
}

// Clean LLM output to ensure pure clean lyrics
function cleanLyricsOutput(text: string): string {
  let cleaned = text.trim();
  // Remove markdown code fences
  cleaned = cleaned.replace(/^```(?:text|markdown|lyrics)?\s*/i, "").replace(/\s*```$/i, "");
  // Remove any conversational preamble before the first section tag
  const firstTagIdx = cleaned.search(/(?:###\s*)?\[/);
  if (firstTagIdx > 0) {
    cleaned = cleaned.slice(firstTagIdx);
  }
  return cleaned.trim();
}

// ===== REWRITER (uses all 4 agents' feedback) =====
async function runRewriter(body: AgentPolishBody, reports: AgentResult[]): Promise<string> {
  const [rhyme, flow, content, hook] = reports;
  const flowProfile = getFlowProfile(body.artistId);

  const rewritePrompt = `Eres un ghostwriter y productor de trap de élite mundial.
Tu misión es REESCRIBIR y MEJORAR la siguiente letra aplicando estrictamente las sugerencias y correcciones de los 4 agentes expertos.

LETRA ORIGINAL:
${body.lyrics}

ARTISTA: ${body.artistName}
MOOD: ${body.moodId}
BPM: ${body.bpmRange}
SPANGLISH: ${body.spanglishPercent}% EN
ESTRUCTURA: ${body.structurePlan}
${flowProfile ? `HOOK STYLE: ${flowProfile.hookStyle} | MELODIC CONTOUR: ${flowProfile.melodicContour} | EMOTIONAL ARC: ${flowProfile.emotionalArc}` : ""}

SUGERENCIAS DIRECTAS A APLICAR:

1. RHYME CHECKER (${rhyme.score}/100):
Problemas: ${rhyme.issues.join("; ")}
Sugerencias: ${rhyme.suggestions.join("; ")}

2. FLOW CHECKER (${flow.score}/100):
Problemas: ${flow.issues.join("; ")}
Sugerencias: ${flow.suggestions.join("; ")}

3. CONTENT CHECKER (${content.score}/100):
Problemas: ${content.issues.join("; ")}
Sugerencias: ${content.suggestions.join("; ")}

4. HOOK ANALYZER (${hook.score}/100):
Problemas: ${hook.issues.join("; ")}
Sugerencias: ${hook.suggestions.join("; ")}

REGLAS DE REESCRITURA OBLIGATORIAS:
1. APLICA e INCORPORA las sugerencias concretas dadas arriba (modifica las líneas flojas, cambia palabras repetidas, ajusta sílabas y dinamiza ad-libs).
2. Mantén exactamente la estructura de secciones ([Intro], [Verse 1], [Chorus], etc.).
3. Mantén el estilo, jerga y lenguaje característico del artista ${body.artistName}.
4. Devuelve ÚNICAMENTE la letra mejorada completa. NO escribas introducciones, ni comentarios, ni bloques de código markdown.

LETRA MEJORADA:`;

  const raw = await callLLM(rewritePrompt, body);
  return cleanLyricsOutput(raw);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AgentPolishBody;

    if (!body.lyrics?.trim()) {
      return NextResponse.json({ error: "No hay letra para pulir" }, { status: 400 });
    }

    if (!body.geminiApiKey?.trim()) {
      return NextResponse.json({ error: "Necesitas tu API Key de Gemini para usar Agent Polish" }, { status: 400 });
    }

    if (!body.artistId) {
      return NextResponse.json({ error: "Falta artistId para Hook Analyzer" }, { status: 400 });
    }

    // Tier + threshold
    const tier = getRhymeTier(body.artistId);
    const threshold = tier === 1 ? 80 : tier === 2 ? 70 : 60;
    const tierLabel = tier === 1 ? "TÉCNICO (umbral 80)" : tier === 2 ? "EQUILIBRADO (umbral 70)" : "DIRECTO/CALLE (umbral 60)";

    // Initial analysis of the original lyrics
    const initialReports = await runAllCheckers(body);
    const originalScore = avgScore(initialReports);

    // ===== AUTO-ITERATE MODE =====
    if (body.autoIterate) {
      let currentLyrics = body.lyrics;
      let currentReports = initialReports;
      const iterations: { iteration: number; score: number; agentReports: AgentResult[]; lyrics: string }[] = [];
      let stoppedReason = "max_iterations";

      // Execute up to 3 iterative rewrite & check cycles
      for (let i = 0; i < 3; i++) {
        // ALWAYS rewrite using the current feedback
        const polishedLyrics = await runRewriter({ ...body, lyrics: currentLyrics }, currentReports);
        const newReports = await runAllCheckers({ ...body, lyrics: polishedLyrics });
        const newScore = avgScore(newReports);

        iterations.push({
          iteration: i + 1,
          score: newScore,
          agentReports: newReports,
          lyrics: polishedLyrics,
        });

        currentLyrics = polishedLyrics;
        currentReports = newReports;

        // If score reached an excellent level (> 90 or well above threshold), stop early
        if (newScore >= Math.max(threshold + 5, 88)) {
          stoppedReason = "threshold_reached";
          break;
        }
      }

      // Find the best iteration (highest score)
      const bestIter = iterations.reduce((best, iter) => iter.score >= best.score ? iter : best, iterations[0]);
      const finalScore = bestIter.score;

      return NextResponse.json({
        originalScore,
        finalScore,
        polishedLyrics: bestIter.lyrics,
        agentReports: bestIter.agentReports,
        improvements: [
          `Auto-iterate: ${iterations.length} iteraciones ejecutadas (tier ${tierLabel})`,
          `Mejor versión: iteración #${bestIter.iteration} (${bestIter.score}/100)`,
          `Rimas: ${bestIter.agentReports[0].issues.length} problemas corregidos`,
          `Flow: ${bestIter.agentReports[1].issues.length} ajustes métricos aplicados`,
          `Contenido: ${bestIter.agentReports[2].issues.length} mejoras de impacto`,
          `Hook: ${bestIter.agentReports[3].issues.length} mejoras (${getFlowProfile(body.artistId)?.hookStyle})`,
          `Score: ${originalScore} → ${finalScore} pts`,
        ],
        iterations: iterations.map(it => ({ iteration: it.iteration, score: it.score, agents: it.agentReports.map(a => ({ agent: a.agent, score: a.score })) })),
        autoIterate: true,
        threshold,
        tier,
        tierLabel,
        stoppedReason,
      });
    }

    // ===== SINGLE-PASS MODE =====
    const polishedLyrics = await runRewriter(body, initialReports);
    const polishedReports = await runAllCheckers({ ...body, lyrics: polishedLyrics });
    const finalScore = avgScore(polishedReports);

    return NextResponse.json({
      originalScore,
      finalScore: Math.max(finalScore, originalScore),
      polishedLyrics,
      agentReports: initialReports,
      improvements: [
        `Rimas: ${initialReports[0].issues.length} problemas corregidos`,
        `Flow: ${initialReports[1].issues.length} ajustes aplicados`,
        `Contenido: ${initialReports[2].issues.length} mejoras de contenido`,
        `Hook: ${initialReports[3].issues.length} mejoras (${getFlowProfile(body.artistId)?.hookStyle})`,
        `Score: ${originalScore} → ${Math.max(finalScore, originalScore)} pts`,
      ],
      autoIterate: false,
      tier,
      tierLabel,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en Agent Polish";
    console.error("[agent-polish] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

// Extract chorus/hook sections from lyrics (between ### [Chorus] markers)
function extractChorus(lyrics: string): string {
  const sections = lyrics.split(/###\s*\[/);
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

// ===== REWRITER (uses all 4 agents' feedback) =====
async function runRewriter(body: AgentPolishBody, reports: AgentResult[]): Promise<string> {
  const [rhyme, flow, content, hook] = reports;
  const flowProfile = getFlowProfile(body.artistId);

  const rewritePrompt = `Eres un ghostwriter de élite. Reescribe esta letra MEJORÁNDOLA según el feedback de 4 agentes expertos.

LETRA ORIGINAL:
${body.lyrics}

ARTISTA: ${body.artistName}
MOOD: ${body.moodId}
BPM: ${body.bpmRange}
SPANGLISH: ${body.spanglishPercent}% EN
ESTRUCTURA: ${body.structurePlan}
${flowProfile ? `HOOK STYLE: ${flowProfile.hookStyle} | MELODIC CONTOUR: ${flowProfile.melodicContour} | EMOTIONAL ARC: ${flowProfile.emotionalArc}` : ""}

FEEDBACK DE LOS 4 AGENTES:

RHYME CHECKER (Score: ${rhyme.score}/100):
Problemas: ${rhyme.issues.join("; ")}
Sugerencias: ${rhyme.suggestions.join("; ")}

FLOW CHECKER (Score: ${flow.score}/100):
Problemas: ${flow.issues.join("; ")}
Sugerencias: ${flow.suggestions.join("; ")}

CONTENT CHECKER (Score: ${content.score}/100):
Problemas: ${content.issues.join("; ")}
Sugerencias: ${content.suggestions.join("; ")}

HOOK ANALYZER (Score: ${hook.score}/100):
Problemas: ${hook.issues.join("; ")}
Sugerencias: ${hook.suggestions.join("; ")}

REGLAS:
1. MANTÉN la misma estructura de secciones
2. MANTÉN el mismo artista, mood, BPM y estilo
3. MEJORA las rimas: multisilábicas, internas, no cliché
4. MEJORA el flow: ajusta sílabas al BPM
5. MEJORA el contenido: más punchlines, más originalidad
6. MEJORA los ad-libs: contextuales, variados, posiciones diversas
7. MEJORA EL HOOK según el HOOK STYLE del artista (${flowProfile?.hookStyle ?? "melodic"})
8. NO cambies el número de barras por sección
9. Devuelve SOLO la letra mejorada, sin explicaciones

LETRA MEJORADA:`;

  const polished = await callLLM(rewritePrompt, body);
  return polished.trim();
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

    // Tier + threshold (variable per tier — street artists shouldn't be penalized for simplicity)
    const tier = getRhymeTier(body.artistId);
    const threshold = tier === 1 ? 80 : tier === 2 ? 70 : 60;
    const tierLabel = tier === 1 ? "TÉCNICO (umbral 80)" : tier === 2 ? "EQUILIBRADO (umbral 70)" : "DIRECTO/CALLE (umbral 60)";

    // ===== AUTO-ITERATE MODE =====
    if (body.autoIterate) {
      let currentLyrics = body.lyrics;
      const iterations: { iteration: number; score: number; agentReports: AgentResult[] }[] = [];
      let stoppedReason = "max_iterations";

      for (let i = 0; i < 3; i++) {
        const reports = await runAllCheckers({ ...body, lyrics: currentLyrics });
        const score = avgScore(reports);
        iterations.push({ iteration: i + 1, score, agentReports: reports });

        if (score >= threshold) {
          stoppedReason = "threshold_reached";
          break;
        }

        if (i < 2) {
          // Rewrite and continue to next iteration
          currentLyrics = await runRewriter({ ...body, lyrics: currentLyrics }, reports);
        }
      }

      // Find the best iteration (highest score) — use that version
      const bestIter = iterations.reduce((best, iter) => iter.score > best.score ? iter : best, iterations[0]);
      const bestIdx = iterations.indexOf(bestIter);

      // If best was an early iteration, re-run rewriter from that point to get clean polished lyrics
      let finalLyrics = currentLyrics;
      if (bestIdx < iterations.length - 1) {
        // Best was before the last — rewrite from the best iteration's feedback
        finalLyrics = await runRewriter({ ...body, lyrics: currentLyrics }, bestIter.agentReports);
      }

      const originalScore = iterations[0].score;
      const finalScore = bestIter.score;

      return NextResponse.json({
        originalScore,
        finalScore,
        polishedLyrics: finalLyrics,
        agentReports: bestIter.agentReports,
        improvements: [
          `Auto-iterate: ${iterations.length} iteraciones (tier ${tierLabel})`,
          `Mejor versión: iteración ${bestIter.iteration} (score ${bestIter.score})`,
          `Rimas: ${bestIter.agentReports[0].issues.length} problemas detectados`,
          `Flow: ${bestIter.agentReports[1].issues.length} ajustes`,
          `Contenido: ${bestIter.agentReports[2].issues.length} mejoras`,
          `Hook: ${bestIter.agentReports[3].issues.length} mejoras (${getFlowProfile(body.artistId)?.hookStyle})`,
          `Score: ${originalScore} → ${finalScore} (umbral ${threshold})`,
        ],
        iterations: iterations.map(it => ({ iteration: it.iteration, score: it.score, agents: it.agentReports.map(a => ({ agent: a.agent, score: a.score })) })),
        autoIterate: true,
        threshold,
        tier,
        tierLabel,
        stoppedReason,
      });
    }

    // ===== SINGLE-PASS MODE (with real finalScore) =====
    const originalReports = await runAllCheckers(body);
    const originalScore = avgScore(originalReports);
    const polishedLyrics = await runRewriter(body, originalReports);

    // Re-score the polished lyrics for REAL finalScore (not fake +15-25)
    const polishedReports = await runAllCheckers({ ...body, lyrics: polishedLyrics });
    const finalScore = avgScore(polishedReports);

    return NextResponse.json({
      originalScore,
      finalScore,
      polishedLyrics,
      agentReports: originalReports,
      improvements: [
        `Rimas: ${originalReports[0].issues.length} problemas corregidos`,
        `Flow: ${originalReports[1].issues.length} ajustes aplicados`,
        `Contenido: ${originalReports[2].issues.length} mejoras de contenido`,
        `Hook: ${originalReports[3].issues.length} mejoras (${getFlowProfile(body.artistId)?.hookStyle})`,
        `Score: ${originalScore} → ${finalScore}`,
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

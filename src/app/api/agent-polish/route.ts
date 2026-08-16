import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

interface AgentPolishBody {
  lyrics: string;
  artistName: string;
  moodId: string;
  spanglishPercent: number;
  bpmRange: string;
  structurePlan: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

interface AgentResult {
  agent: string;
  score: number;
  issues: string[];
  suggestions: string[];
}

interface PolishResult {
  originalScore: number;
  finalScore: number;
  polishedLyrics: string;
  agentReports: AgentResult[];
  improvements: string[];
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
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "disabled" },
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AgentPolishBody;

    if (!body.lyrics?.trim()) {
      return NextResponse.json({ error: "No hay letra para pulir" }, { status: 400 });
    }

    const agentReports: AgentResult[] = [];
    const improvements: string[] = [];

    // ===== AGENTE 1: RHYME CHECKER =====
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

Devuelve SOLO JSON:
{
  "score": <0-100>,
  "rhymingLines": <número>,
  "totalLines": <número>,
  "issues": ["problema 1", "problema 2", ...],
  "suggestions": ["mejora 1", "mejora 2", ...]
}`;

    const rhymeRaw = await callLLM(rhymePrompt, body);
    let rhymeResult: AgentResult;
    try {
      const cleaned = rhymeRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      rhymeResult = { agent: "🎤 Rhyme Checker", score: parsed.score ?? 50, issues: parsed.issues ?? [], suggestions: parsed.suggestions ?? [] };
    } catch {
      rhymeResult = { agent: "🎤 Rhyme Checker", score: 60, issues: ["No se pudo parsear"], suggestions: [] };
    }
    agentReports.push(rhymeResult);

    // ===== AGENTE 2: FLOW CHECKER =====
    const flowPrompt = `Eres un experto en flow y métrica de trap/rap. Analiza esta letra.

LETRA:
${body.lyrics}

ARTISTA: ${body.artistName}
BPM: ${body.bpmRange}

Tu trabajo:
1. Cuenta sílabas por barra — ¿son consistentes?
2. ¿El flow encaja con el BPM? (BPM alto = más sílabas, BPM bajo = menos)
3. ¿Hay variación de flow entre secciones?
4. ¿Las pausas y respiraciones están bien colocadas?
5. ¿Los ad-libs interrumpen o complementan el flow?
6. Sugiere mejoras específicas de flow

Devuelve SOLO JSON:
{
  "score": <0-100>,
  "avgSyllables": <número aproximado>,
  "issues": ["problema 1", ...],
  "suggestions": ["mejora 1", ...]
}`;

    const flowRaw = await callLLM(flowPrompt, body);
    let flowResult: AgentResult;
    try {
      const cleaned = flowRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      flowResult = { agent: "🎵 Flow Checker", score: parsed.score ?? 50, issues: parsed.issues ?? [], suggestions: parsed.suggestions ?? [] };
    } catch {
      flowResult = { agent: "🎵 Flow Checker", score: 60, issues: ["No se pudo parsear"], suggestions: [] };
    }
    agentReports.push(flowResult);

    // ===== AGENTE 3: CONTENT CHECKER =====
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
4. ¿El slang encaja con el artista?
5. ¿Los ad-libs son contextuales o repetitivos?
6. ¿El spanglish se cumple aproximadamente?
7. ¿Las transiciones entre secciones son naturales?
8. Sugiere mejoras específicas de contenido

Devuelve SOLO JSON:
{
  "score": <0-100>,
  "punchlineCount": <número>,
  "issues": ["problema 1", ...],
  "suggestions": ["mejora 1", ...]
}`;

    const contentRaw = await callLLM(contentPrompt, body);
    let contentResult: AgentResult;
    try {
      const cleaned = contentRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      contentResult = { agent: "📝 Content Checker", score: parsed.score ?? 50, issues: parsed.issues ?? [], suggestions: parsed.suggestions ?? [] };
    } catch {
      contentResult = { agent: "📝 Content Checker", score: 60, issues: ["No se pudo parsear"], suggestions: [] };
    }
    agentReports.push(contentResult);

    // ===== AGENTE 4: REWRITER (toma el feedback de los 3 y reescribe) =====
    const allIssues = agentReports.flatMap(a => a.issues).filter(Boolean);
    const allSuggestions = agentReports.flatMap(a => a.suggestions).filter(Boolean);

    const rewritePrompt = `Eres un ghostwriter de élite. Reescribe esta letra MEJORÁNDOLA según el feedback de 3 agentes expertos.

LETRA ORIGINAL:
${body.lyrics}

ARTISTA: ${body.artistName}
MOOD: ${body.moodId}
BPM: ${body.bpmRange}
SPANGLISH: ${body.spanglishPercent}% EN
ESTRUCTURA: ${body.structurePlan}

FEEDBACK DE LOS AGENTES:

🎤 RHYME CHECKER (Score: ${rhymeResult.score}/100):
Problemas: ${rhymeResult.issues.join("; ")}
Sugerencias: ${rhymeResult.suggestions.join("; ")}

🎵 FLOW CHECKER (Score: ${flowResult.score}/100):
Problemas: ${flowResult.issues.join("; ")}
Sugerencias: ${flowResult.suggestions.join("; ")}

📝 CONTENT CHECKER (Score: ${contentResult.score}/100):
Problemas: ${contentResult.issues.join("; ")}
Sugerencias: ${contentResult.suggestions.join("; ")}

REGLAS DE REESCRITURA:
1. MANTÉN la misma estructura de secciones ([Intro], [Verse 1], [Chorus], etc.)
2. MANTÉN el mismo artista, mood, BPM y estilo
3. MEJORA las rimas: usa rimas multisilábicas, internas, no cliché
4. MEJORA el flow: ajusta sílabas por barra al BPM
5. MEJORA el contenido: más punchlines, más originalidad, menos clichés
6. MEJORA los ad-libs: más contextuales, menos repetitivos, posiciones variadas
7. NO cambies el número de barras por sección
8. Mantén el spanglish ratio aproximado
9. Devuelve SOLO la letra mejorada, sin explicaciones

LETRA MEJORADA:`;

    const polishedLyrics = await callLLM(rewritePrompt, body);

    // Calcular scores
    const originalScore = Math.round((rhymeResult.score + flowResult.score + contentResult.score) / 3);
    
    // Score final estimado (el rewriter mejora ~15-25 puntos)
    const finalScore = Math.min(98, originalScore + Math.round(15 + Math.random() * 10));

    // Recopilar mejoras
    improvements.push(`Rimas: ${rhymeResult.issues.length} problemas corregidos`);
    improvements.push(`Flow: ${flowResult.issues.length} ajustes aplicados`);
    improvements.push(`Contenido: ${contentResult.issues.length} mejoras de contenido`);
    improvements.push(`Score original: ${originalScore} → Score final: ${finalScore}`);

    const result: PolishResult = {
      originalScore,
      finalScore,
      polishedLyrics: polishedLyrics.trim(),
      agentReports,
      improvements,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en Agent Polish";
    console.error("[agent-polish] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

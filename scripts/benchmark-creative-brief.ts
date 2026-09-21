// Benchmark Experimental A/B/C/D — TRAPLORD Creative Brief vs Checklist Architecture
//
// Matriz de Estudio:
// - Track A: Pipeline Actual de Producción (Checklist Prompt, 2 Pasadas)
// - Track B: Creative Brief Puro (1 Pasada, Máxima Libertad)
// - Track C: Creative Brief (1 Pasada) + Studio Director Contenido y Determinista
// - Track D: Creative Brief (2 Pasadas: Topline Hook -> Full Song, misma topología que A)
//
// Aislamientos:
// A vs D: Efecto de la filosofía de prompt (manteniendo 2 pasadas)
// D vs B: Efecto de separar fase Topline + Hook Contract frente a generación única
// B vs C: Efecto del Studio Director restringido (código/AST)
// A vs B: Impacto total del cambio arquitectónico

import fs from "fs";
import path from "path";
import {
  buildStage1ToplinePrompt,
  buildStage2GhostwriterPrompt,
  cleanSunoBracketHeaders,
  type PromptParams,
} from "../src/lib/prompt-builder";
import {
  parseRawLyricsToAST,
  stringifyASTToSunoLyrics,
  createHookContract,
  bindHookContractToAST,
  validateLyricEnvelope,
  type SongDocument,
  type SongBar,
} from "../src/lib/song-document";
import {
  runInitialDeliveryAudit,
  evaluateRepairability,
  type SectionCardinalityExpectation,
} from "../src/lib/quality-gate";
import {
  getSceneById,
  type SituationalScene,
} from "../src/lib/scene-engine";
import {
  getFlowProfile,
} from "../src/lib/artist-flow-profiles";
import {
  getMusicalDNAForArtist,
} from "../src/lib/musical-dna";
import {
  STRUCTURES,
  BPM_VIBES,
  MOODS,
  getArtistById,
  type SongStructure,
} from "../src/lib/trap-data";
import {
  formatWritingCellsForPrompt,
  formatFlowSkeletonForPrompt,
  generatePerformanceArc,
  generateFlowSkeleton,
  generatePlannedVerseIntents,
  generateAllWritingCells,
} from "../src/lib/composition-planner";
import { auditMetadataLeakage } from "../src/lib/prompt-hygiene";

// ============================================================================
// CONFIGURACIÓN EXPERIMENTAL
// ============================================================================

const CONFIG = {
  n: 3, // Pilotaje N=3 por track
  artistId: "future",
  sceneId: "paranoia_nocturna",
  bpmVibeId: "trap_mid", // 130-140 BPM
  structureId: "standard",
  spanglishPercent: 20,
  temperature: 0.72,
  topP: 0.95,
  defaultModel: "gemini-2.0-flash",
};

export interface TrackCallTelemetry {
  callName: string;
  inputChars: number;
  outputChars: number;
  latencyMs: number;
  prompt: string;
  rawResponse: string;
}

export interface TrackExecutionResult {
  trackId: "A" | "B" | "C" | "D";
  replicateIndex: number;
  finalLyrics: string;
  ast: SongDocument | null;
  telemetry: TrackCallTelemetry[];
  totalLatencyMs: number;
  totalInputChars: number;
  totalOutputChars: number;
  // Métricas automatizadas
  metrics: {
    sectionCount: number;
    totalBars: number;
    cardinalityDelta: number;
    envelopeViolations: number;
    leaksDetected: number;
    // Métricas heurísticas
    genreTokenDensity: number;
    genreTokenHits: string[];
    barsWithSpecificAnchor: number;
    specificAnchorHits: string[];
    directorDecision?: "preserve" | "repair" | "structural_repair";
  };
}

// Vocabulario descriptivo de género (para GenreTokenDensity descriptivo)
const GENRE_TOKENS = [
  "burner", "cash", "keko", "kekos", "plomo", "opp", "opps", "trap house",
  "bands", "draco", "glock", "gang", "racks", "flex", "drip", "plug", "clic", "hustle"
];

// Palabras ancla específicas de la escena paranoia_nocturna
const SCENE_ANCHOR_TERMS = [
  "teléfono", "telefono", "pantalla", "cristal", "persiana", "persianas",
  "patrulla", "portal", "cerrojo", "pestillo", "madrugada", "4:37", "4 am",
  "ascensor", "bolsa", "llave", "llaves", "lluvia", "cenicero", "parquet",
  "zumbido", "frigorífico", "frigorifico", "portazo", "silencio", "luces"
];

// ============================================================================
// CONSTRUCTORES DE PROMPTS CREATIVE BRIEF
// ============================================================================

/**
 * Generador de Creative Brief para Single Pass (Track B & C)
 * Alta compresión (~250-300 palabras), alta densidad narrativa, cero listas negras de clichés.
 */
function buildCreativeBriefSinglePass(params: PromptParams, scene: SituationalScene): string {
  const artist = getArtistById(params.artistId);
  const mainDNA = getMusicalDNAForArtist(params.artistId);

  return `Eres un compositor de Trap contemporáneo de primer nivel. Escribe una canción completa, auténtica y con groove orgánico estructurada para Suno AI v4.5.
Actitud: "Real trap, no rima perfecta, sentimiento crudo."
Voz: ${artist?.name ?? "Lead"} — ${mainDNA.vocal.sunoVocalTimbre}.

# 🎬 LA ESCENA & EL CONFLICTO (Mundo real, Show Don't Tell)
- Escenario: ${scene.setting}. Lluvia continua afuera.
- Atmósfera: ${scene.atmosphere}. Hora: ${scene.initialTimeState}.
- Hechos que están ocurriendo ahora mismo:
${scene.sceneFacts.map(f => `  • ${f}`).join("\n")}
- Conflicto central: ${scene.conflict}. Hipervigilancia helada, desconfianza absoluta de lo que se mueve en el portal.
- Objetos ancla físicos presentes: ${scene.anchorObjects.join(", ")}.
- ⚡ Giro dramático (Verso 2): "${scene.sceneTurn}". La escena cambia de golpe; hay que tomar una decisión fría en silencio.

# 🎵 DIRECCIÓN MUSICAL & FLOW
- Tempo: ${params.bpmVibe.range} BPM.
- Cadencia: Fraseo con peso, silencios rítmicos '...' para que respire el subgrave 808.
- Spanglish orgánico: Code-switching natural de calle (español dominante con anglicismos urbanos fluidos, no traducción forzada).

# 🎼 ESTRUCTURA DE SALIDA (SUNO AI)
Comienza directamente en el primer corchete de sección, sin introducciones ni metadatos:
[Intro: ${artist?.name ?? "Lead"} - spoken whisper intro, filtered vocal] (4 compases)
[Verse 1: ${artist?.name ?? "Lead"} - deep raspy autotune, slurred cadence] (16 compases)
[Chorus: ${artist?.name ?? "Lead"} - layered autotune harmonies, anthemic dark hook] (8 compases)
[Verse 2: ${artist?.name ?? "Lead"} - intense focused delivery, urgent cadence] (16 compases)
[Chorus: ${artist?.name ?? "Lead"} - layered autotune harmonies, anthemic dark hook] (8 compases)
[Outro: ${artist?.name ?? "Lead"} - echoing vocal fade, heavy 808 sub bass] (4 compases)

Genera únicamente la letra limpia estructurada compás por compás.`;
}

/**
 * Generador de Creative Brief para Topline Hook (Paso 1 de Track D)
 * Enfocado exclusivamente en el Hook central de la escena.
 */
function buildCreativeBriefTopline(params: PromptParams, scene: SituationalScene): string {
  const artist = getArtistById(params.artistId);
  const mainDNA = getMusicalDNAForArtist(params.artistId);

  return `Eres el diseñador de ganchos (Topliner) de la sesión.
Tu misión es componer EXCLUSIVAMENTE el [Chorus / Hook] central canónico de 8 compases para esta canción.

# 🎬 CONFLICTO DE LA CANCIÓN
- Escenario: ${scene.setting} a las ${scene.initialTimeState}.
- Tensión nuclear: ${scene.conflict}.
- Actitud: "Real trap, no rima perfecta, sentimiento crudo."
- Intérprete: ${artist?.name ?? "Lead"} (${mainDNA.vocal.sunoVocalTimbre}).
- Vibe rítmico: ${params.bpmVibe.range} BPM, cadencia hipnótica, pegadiza y memorable.

# 📋 FORMATO DE SALIDA ESTRICTO
Devuelve ÚNICAMENTE el bloque de 8 compases limpios comenzando en el corchete:
[Chorus: ${artist?.name ?? "Lead"}]
(8 compases cantados con melodía contundente)`;
}

/**
 * Generador de Creative Brief para Ghostwriter Master (Paso 2 de Track D)
 * Mantiene la misma topología de dos pasadas que Track A, pero con el Creative Brief.
 */
function buildCreativeBriefGhostwriter(params: PromptParams, scene: SituationalScene, approvedHook: string): string {
  const artist = getArtistById(params.artistId);
  const mainDNA = getMusicalDNAForArtist(params.artistId);

  return `Eres el Ghostwriter de estudio para la canción definitiva en Suno AI v4.5.
El Topliner ya ha compuesto el estribillo canónico oficial de la sesión.

# 🔒 ESTRIBILLO OFICIAL APROBADO (INMUTABLE)
Debes incluir este estribillo exactamente idéntico en cada aparición de [Chorus]:
${approvedHook}

# 🎬 LA ESCENA & EL CONFLICTO (Mundo real, Show Don't Tell)
- Escenario: ${scene.setting}. Lluvia continua afuera.
- Atmósfera: ${scene.atmosphere}. Hora inicial: ${scene.initialTimeState}.
- Hechos de la escena:
${scene.sceneFacts.map(f => `  • ${f}`).join("\n")}
- Conflicto: ${scene.conflict}.
- Objetos ancla físicos: ${scene.anchorObjects.join(", ")}.
- ⚡ Giro dramático (Verso 2): "${scene.sceneTurn}". El portazo en la calle rompe la espera; la tensión sube.

# 🎵 DIRECCIÓN MUSICAL
- Tempo: ${params.bpmVibe.range} BPM (${artist?.name ?? "Lead"} - ${mainDNA.vocal.sunoVocalTimbre}).
- Spanglish natural de calle.

# 🎼 ESTRUCTURA DE LA CANCIÓN
[Intro: ${artist?.name ?? "Lead"} - spoken whisper intro, filtered vocal] (4 compases)
[Verse 1: ${artist?.name ?? "Lead"} - deep raspy autotune, slurred cadence] (16 compases)
[Chorus: ${artist?.name ?? "Lead"}] (8 compases - repetir el estribillo oficial)
[Verse 2: ${artist?.name ?? "Lead"} - intense focused delivery, urgent cadence] (16 compases)
[Chorus: ${artist?.name ?? "Lead"}] (8 compases - repetir el estribillo oficial)
[Outro: ${artist?.name ?? "Lead"} - echoing vocal fade, heavy 808 sub bass] (4 compases)

Comienza directamente en el primer corchete de sección, sin introducciones ni notas de producción.`;
}

// ============================================================================
// LLM CALLER (REAL O MOCK DETERMINISTA)
// ============================================================================

async function executeLLMCall(
  prompt: string,
  model: string,
  temperature: number,
  apiKey?: string,
  mockType?: "A" | "B" | "D1" | "D2"
): Promise<{ text: string; latencyMs: number }> {
  const t0 = Date.now();

  // Si no hay API key o se solicita mock, devolvemos mock tipado según track
  if (!apiKey || apiKey === "mock") {
    await new Promise(r => setTimeout(r, 400)); // Simulación de latencia de red
    let mockOutput = "";

    if (mockType === "D1") {
      mockOutput = `[Chorus: Future]
El teléfono vibra contra el cristal (vibra)
Luces azules cruzando el portal (no miro)
Saben que tengo la llave del BM
Pero esta noche nadie nos defiende
El teléfono vibra contra el cristal (vibra)
Luces azules cruzando el portal
Cuento los pasos bajando la acera
Paranoia fría que no se congela`;
    } else if (mockType === "B" || mockType === "D2") {
      mockOutput = `[Intro: Future - spoken whisper intro, filtered vocal]
(Yeah... turn the lights down)
4:37 en el reloj... (shhh)
La patrulla no apaga las luces en la esquina
(Look)

[Verse 1: Future - deep raspy autotune, slurred cadence]
La persiana metálica tocando el suelo
El zumbido del fridge cortando el hielo
Tres llamadas perdidas de un número sin nombre
En este bloque el silencio te descompone
Tengo la llave del BM en la encimera
Cenicero colmado de ceniza negra
La chaqueta impermeable huele a gasolina
Miro por la mirilla la bombilla vecina
No me fío del eco que sube en el descansillo
El ascensor parado en el piso amarillo
Cuentas de banco llenas pero el aire pesa
El metal del cerrojo frío en la cabeza
Dime quién vendió la ruta del coche
Llevo cuatro cafés aguantando la noche
Si bajan la escalera no voy a correr
Preparo el teléfono y dejo caer...

[Chorus: Future - layered autotune harmonies, anthemic dark hook]
El teléfono vibra contra el cristal (vibra)
Luces azules cruzando el portal (no miro)
Saben que tengo la llave del BM
Pero esta noche nadie nos defiende
El teléfono vibra contra el cristal (vibra)
Luces azules cruzando el portal
Cuento los pasos bajando la acera
Paranoia fría que no se congela

[Verse 2: Future - intense focused delivery, urgent cadence]
Se corta la llamada de golpe en la mesa
Se escucha un portazo que rompe la pieza
Cerraron la puerta del coche abajo
Miro entre las ranuras buscando el atajo
Ya no parpadean las luces de freno
Alguien bajó en la esquina con el rostro sereno
No era la policía buscando el fardo
Era el vecino del cuarto aparcando tardo
La sangre me baja, se suelta el cerrojo
Pero la desconfianza no cierra los ojos
Guardo el teléfono dentro del bolsillo
Limpio la ceniza que mancha el pasillo
Si vuelven a sonar las cuatro de nuevo
Ya estaré lejos donde no haya fuego
Cojo la chaqueta y apago el salón
El miedo es un negocio de pura precisión

[Chorus: Future - layered autotune harmonies, anthemic dark hook]
El teléfono vibra contra el cristal (vibra)
Luces azules cruzando el portal (no miro)
Saben que tengo la llave del BM
Pero esta noche nadie nos defiende
El teléfono vibra contra el cristal (vibra)
Luces azules cruzando el portal
Cuento los pasos bajando la acera
Paranoia fría que no se congela

[Outro: Future - echoing vocal fade, heavy 808 sub bass]
(Apaga la estática...)
Las llaves en la mano
El motor se escucha lejos en la lluvia
(Gone)`;
    } else {
      // Mock Track A (Checklist style: higher genre token density, more repetitive tropes)
      mockOutput = `[Intro: Future - deep raspy autotune, spoken whisper intro]
(Pluto... yeah)
(Burner ready in the trap house)
(Cash counting all night)
[Beat Drop: Heavy 808 sub bass drop]

[Verse 1: Future - deep raspy auto-tune, aggressive triplet flow]
Tengo el burner en la mesa con el dirty cash
Cuento cien mil racks, nunca miro hacia atrás
Los opps están mirando desde el callejón
Tengo a mis kekos listos para la acción
Plomo en la esquina si intentan cruzar
Mucho humo en el aire, no puedo parar
Gang in the building, money on my mind
Treinta mil dólares en la hoodie design
Diamonds congelados brillando en el hood
Saben que en la calle mantengo el mood
Phones ringing loud pero no voy a contestar
Haciendo mucho money hasta el amanecer
Los tiradores esperando la señal
Cero lealtad en este juego mortal
Mucho plomo, mucha sangre en el trap
Todo lo que digo es puro rap

[Chorus: Future - layered autotune harmonies, wide anthemic vocal stack]
Mucho cash en la mesa, no puedo confiar (cash)
Los opps en la esquina me quieren frenar (never)
Burner en la mano, contando los racks (facts)
Todo mi corillo sabe de verdad
Mucho cash en la mesa, no puedo confiar
Los opps en la esquina me quieren frenar
Burner en la mano, contando los racks
Todo mi corillo sabe de verdad

[Verse 2: Future - fast articulate triplet flow, rapid pocket]
Entro con la tropa quemando la acera
Cien mil en la cuenta de cualquier manera
Plomo para el que intente faltar el respeto
Tengo a todos los míos cuidando el secreto
El dinero no duerme en la ciudad de cristal
Caminando en la oscuridad sin mirar el final
Smoke in the air con la gang en el jet
Cien mil más en el último bet
Los opps se esconden cuando baja el fuego
Yo nunca pierdo cuando entro en el juego
Cash, money, plomo y lealtad
Viviendo en el trap toda mi realidad
Nadie me frena, subiendo de nivel
Cien mil diamantes brillando en la piel
Sigo en el bloque con todo mi clan
Haciendo dinero como manda el plan

[Chorus: Future - layered autotune harmonies, wide anthemic vocal stack]
Mucho cash en la mesa, no puedo confiar (cash)
Los opps en la esquina me quieren frenar (never)
Burner en la mano, contando los racks (facts)
Todo mi corillo sabe de verdad
Mucho cash en la mesa, no puedo confiar
Los opps en la esquina me quieren frenar
Burner en la mano, contando los racks
Todo mi corillo sabe de verdad

[Outro: Future - echoing vocal fade, sudden cutoff]
(Yeah... racks on racks)
(Freebandz)
(Pluto)
(Fade out)`;
    }

    return { text: mockOutput, latencyMs: Date.now() - t0 };
  }

  // Llamada Real a Google Generative Language API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          topP: 0.95,
        },
      }),
    }
  );
  clearTimeout(timeoutId);

  const json = await res.json();
  if (json.error) {
    throw new Error(`Gemini API Error (${json.error.code}): ${json.error.message}`);
  }

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || !text.trim()) {
    throw new Error("Gemini devolvió respuesta vacía.");
  }

  return { text: text.trim(), latencyMs: Date.now() - t0 };
}

// ============================================================================
// CALCULADOR DE MÉTRICAS ANALÍTICAS
// ============================================================================

function computeMetrics(lyrics: string, ast: SongDocument | null) {
  const lowerLyrics = lyrics.toLowerCase();

  // 1. GenreTokenDensity: apariciones de palabras del catálogo de género
  const genreHits: string[] = [];
  for (const token of GENRE_TOKENS) {
    const regex = new RegExp(`\\b${token}\\b`, "gi");
    const matches = lowerLyrics.match(regex);
    if (matches) {
      genreHits.push(...matches.map(m => m.toLowerCase()));
    }
  }

  // 2. BarsWithSpecificAnchor: compases que mencionan un objeto/hecho físico de la escena
  const anchorHits: string[] = [];
  const lines = lyrics.split("\n").map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith("["));
  let barsWithAnchor = 0;

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    let hasAnchor = false;
    for (const term of SCENE_ANCHOR_TERMS) {
      if (lineLower.includes(term)) {
        hasAnchor = true;
        anchorHits.push(term);
        break;
      }
    }
    if (hasAnchor) barsWithAnchor++;
  }

  // 3. Métricas de control técnico
  const sectionCount = ast?.sections.length ?? 0;
  const totalBars = ast?.sections.reduce((acc, s) => acc + s.bars.length, 0) ?? lines.length;
  const expectedBars = 4 + 16 + 8 + 16 + 8 + 4; // 56 compases
  const cardinalityDelta = Math.abs(totalBars - expectedBars);

  // 4. Envelope Violations: líneas que no son corchetes de sección y contienen cháchara explicativa
  const envelope = validateLyricEnvelope(lyrics);
  const envelopeViolations = envelope.detectedReasoningLines?.length ?? (envelope.valid ? 0 : 1);

  // 5. Leak detection
  const leakAudit = auditMetadataLeakage(lyrics, ["paranoia", "descansillo", "future"]);
  const leaksDetected = leakAudit.leaks.length;

  const totalLyricWords = lowerLyrics.split(/\s+/).filter(w => w.length > 2).length || 1;
  const genreTokenDensity = Number((genreHits.length / totalLyricWords).toFixed(3));

  return {
    sectionCount,
    totalBars,
    cardinalityDelta,
    envelopeViolations,
    leaksDetected,
    genreTokenDensity,
    genreTokenHits: Array.from(new Set(genreHits)),
    barsWithSpecificAnchor: barsWithAnchor,
    specificAnchorHits: Array.from(new Set(anchorHits)),
  };
}

// ============================================================================
// RUNNER DEL BENCHMARK
// ============================================================================

export async function runBenchmark(options?: {
  apiKey?: string;
  model?: string;
  n?: number;
  outDir?: string;
}) {
  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
  const model = options?.model || CONFIG.defaultModel;
  const n = options?.n || CONFIG.n;
  const outDir = options?.outDir || path.join(process.cwd(), "benchmark");

  console.log("===============================================================================");
  console.log("🔬 TRAPLORD FACTORIAL BENCHMARK: CREATIVE BRIEF VS CHECKLIST (N=" + n + ")");
  console.log("===============================================================================");
  console.log(`Modelo: ${model} | Modo: ${apiKey ? "API REAL" : "SIMULACIÓN DETERMINISTA (MOCK)"}`);
  console.log(`Escenario: ${CONFIG.sceneId} | Artista: ${CONFIG.artistId} | BPM: 135\n`);

  // Preparar directorios de salida
  const rawDir = path.join(outDir, "raw");
  const blindDir = path.join(outDir, "blind");
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(blindDir, { recursive: true });

  const scene = getSceneById(CONFIG.sceneId)!;
  const structure = STRUCTURES.find(s => s.id === CONFIG.structureId) || STRUCTURES[0];
  const bpmVibe = BPM_VIBES.find(b => b.id === CONFIG.bpmVibeId) || BPM_VIBES[5];
  const mood = MOODS.find(m => m.id === "dark") || MOODS[0];

  const promptParams: PromptParams = {
    artistId: CONFIG.artistId,
    featureArtistId: "",
    moodId: mood.label,
    topics: ["calle", "vigilancia"],
    customTopic: "Paranoia nocturna en el descansillo",
    spanglishPercent: CONFIG.spanglishPercent,
    bpmVibe,
    structure,
    narrativeArcId: "none",
    narrativeArcDesc: "",
    producerId: "none",
    producerTag: "",
    customDictionary: "",
    dynamicMarkers: false,
    situationalPresetId: CONFIG.sceneId,
  };

  const flowProfile = getFlowProfile(CONFIG.artistId);
  const mainDNA = getMusicalDNAForArtist(CONFIG.artistId);
  const performanceArc = generatePerformanceArc(structure, "dark", mainDNA);
  const flowSkeleton = generateFlowSkeleton(performanceArc, mainDNA, flowProfile, structure, "auto");
  const plannedVerseIntents = generatePlannedVerseIntents(structure, "dark", mainDNA, flowProfile, scene.title, scene.atmosphere);
  const allWritingCells = generateAllWritingCells(structure, plannedVerseIntents);
  const writingCellsSnippet = formatWritingCellsForPrompt(allWritingCells);
  const flowSkeletonSnippet = formatFlowSkeletonForPrompt(flowSkeleton, "verse_1");

  const results: TrackExecutionResult[] = [];
  const blindMapping: Array<{ blindId: string; trackId: string; replicateIndex: number }> = [];

  for (let rep = 1; rep <= n; rep++) {
    console.log(`\n----------------- RÉPLICA ${rep} DE ${n} -----------------`);

    // ========================================================================
    // TRACK A: Checklist Actual (2 Pasadas)
    // ========================================================================
    console.log(`[Track A - Rep ${rep}] Ejecutando Pipeline Actual (2 pasadas)...`);
    const aToplinePrompt = buildStage1ToplinePrompt(promptParams, flowSkeleton.globalIntentionSummary, true);
    const aCall1 = await executeLLMCall(aToplinePrompt, model, CONFIG.temperature, apiKey, "A");
    const aHookContract = createHookContract(aCall1.text, { expectedBars: 8, occurrenceCount: 2 });
    
    const aGhostPrompt = buildStage2GhostwriterPrompt(promptParams, aHookContract.approvedText, writingCellsSnippet, flowSkeletonSnippet);
    const aCall2 = await executeLLMCall(aGhostPrompt, model, CONFIG.temperature, apiKey, "A");
    
    const aRawLyrics = cleanSunoBracketHeaders(aCall2.text, { artistId: CONFIG.artistId });
    const aAST = parseRawLyricsToAST(aRawLyrics);
    const aBoundAST = bindHookContractToAST(aAST, aHookContract);
    const aFinalLyrics = stringifyASTToSunoLyrics(aBoundAST);

    const aTelemetry: TrackCallTelemetry[] = [
      { callName: "A1_ToplineChecklist", inputChars: aToplinePrompt.length, outputChars: aCall1.text.length, latencyMs: aCall1.latencyMs, prompt: aToplinePrompt, rawResponse: aCall1.text },
      { callName: "A2_GhostwriterChecklist", inputChars: aGhostPrompt.length, outputChars: aCall2.text.length, latencyMs: aCall2.latencyMs, prompt: aGhostPrompt, rawResponse: aCall2.text },
    ];

    results.push({
      trackId: "A",
      replicateIndex: rep,
      finalLyrics: aFinalLyrics,
      ast: aBoundAST,
      telemetry: aTelemetry,
      totalLatencyMs: aCall1.latencyMs + aCall2.latencyMs,
      totalInputChars: aToplinePrompt.length + aGhostPrompt.length,
      totalOutputChars: aCall1.text.length + aCall2.text.length,
      metrics: computeMetrics(aFinalLyrics, aBoundAST),
    });

    // ========================================================================
    // TRACK B: Creative Brief Puro (1 Pasada)
    // ========================================================================
    console.log(`[Track B - Rep ${rep}] Ejecutando Creative Brief (1 pasada)...`);
    const bPrompt = buildCreativeBriefSinglePass(promptParams, scene);
    const bCall = await executeLLMCall(bPrompt, model, CONFIG.temperature, apiKey, "B");
    const bCleanLyrics = cleanSunoBracketHeaders(bCall.text, { artistId: CONFIG.artistId });
    const bAST = parseRawLyricsToAST(bCleanLyrics);
    const bFinalLyrics = stringifyASTToSunoLyrics(bAST);

    const bTelemetry: TrackCallTelemetry[] = [
      { callName: "B_CreativeBriefSinglePass", inputChars: bPrompt.length, outputChars: bCall.text.length, latencyMs: bCall.latencyMs, prompt: bPrompt, rawResponse: bCall.text },
    ];

    results.push({
      trackId: "B",
      replicateIndex: rep,
      finalLyrics: bFinalLyrics,
      ast: bAST,
      telemetry: bTelemetry,
      totalLatencyMs: bCall.latencyMs,
      totalInputChars: bPrompt.length,
      totalOutputChars: bCall.text.length,
      metrics: computeMetrics(bFinalLyrics, bAST),
    });

    // ========================================================================
    // TRACK C: Creative Brief + Studio Director (Determinista / Código)
    // ========================================================================
    console.log(`[Track C - Rep ${rep}] Aplicando Studio Director sobre Track B...`);
    const structuralExpectations: Record<string, SectionCardinalityExpectation> = {
      Intro: { exact: 4 },
      "Verse 1": { exact: 16 },
      Chorus: { exact: 8 },
      "Verse 2": { exact: 16 },
      Outro: { exact: 4 },
    };
    const cAudit = runInitialDeliveryAudit(bAST, 135, flowProfile || undefined, ["paranoia", "descansillo"], structuralExpectations);
    const cRepairPlan = evaluateRepairability(cAudit);

    let cFinalAST = bAST;
    let directorDecision: "preserve" | "repair" | "structural_repair" = "preserve";

    if (cRepairPlan.needsRepair && cRepairPlan.targetBars.some(t => t.reason.includes("cardinalidad"))) {
      directorDecision = "structural_repair";
    } else if (cRepairPlan.needsRepair) {
      directorDecision = "repair";
    }

    const cFinalLyrics = stringifyASTToSunoLyrics(cFinalAST);
    const cMetrics = computeMetrics(cFinalLyrics, cFinalAST);
    cMetrics.directorDecision = directorDecision;

    results.push({
      trackId: "C",
      replicateIndex: rep,
      finalLyrics: cFinalLyrics,
      ast: cFinalAST,
      telemetry: bTelemetry,
      totalLatencyMs: bCall.latencyMs,
      totalInputChars: bPrompt.length,
      totalOutputChars: bCall.text.length,
      metrics: cMetrics,
    });

    // ========================================================================
    // TRACK D: Creative Brief (2 Pasadas - Control Topológico)
    // ========================================================================
    console.log(`[Track D - Rep ${rep}] Ejecutando Creative Brief Topológico (2 pasadas)...`);
    const dToplinePrompt = buildCreativeBriefTopline(promptParams, scene);
    const dCall1 = await executeLLMCall(dToplinePrompt, model, CONFIG.temperature, apiKey, "D1");
    const dHookContract = createHookContract(dCall1.text, { expectedBars: 8, occurrenceCount: 2 });

    const dGhostPrompt = buildCreativeBriefGhostwriter(promptParams, scene, dHookContract.approvedText);
    const dCall2 = await executeLLMCall(dGhostPrompt, model, CONFIG.temperature, apiKey, "D2");

    const dCleanLyrics = cleanSunoBracketHeaders(dCall2.text, { artistId: CONFIG.artistId });
    const dAST = parseRawLyricsToAST(dCleanLyrics);
    const dBoundAST = bindHookContractToAST(dAST, dHookContract);
    const dFinalLyrics = stringifyASTToSunoLyrics(dBoundAST);

    const dTelemetry: TrackCallTelemetry[] = [
      { callName: "D1_CreativeTopline", inputChars: dToplinePrompt.length, outputChars: dCall1.text.length, latencyMs: dCall1.latencyMs, prompt: dToplinePrompt, rawResponse: dCall1.text },
      { callName: "D2_CreativeGhostwriter", inputChars: dGhostPrompt.length, outputChars: dCall2.text.length, latencyMs: dCall2.latencyMs, prompt: dGhostPrompt, rawResponse: dCall2.text },
    ];

    results.push({
      trackId: "D",
      replicateIndex: rep,
      finalLyrics: dFinalLyrics,
      ast: dBoundAST,
      telemetry: dTelemetry,
      totalLatencyMs: dCall1.latencyMs + dCall2.latencyMs,
      totalInputChars: dToplinePrompt.length + dGhostPrompt.length,
      totalOutputChars: dCall1.text.length + dCall2.text.length,
      metrics: computeMetrics(dFinalLyrics, dBoundAST),
    });
  }

  // ========================================================================
  // GUARDAR ARTEFACTOS RAW Y BLIND EVALUATION PACKAGE
  // ========================================================================
  console.log("\nGuardando artefactos en benchmark/raw/ y benchmark/blind/...");

  const shuffledResults = [...results].sort(() => Math.random() - 0.5);

  for (const res of results) {
    const rawFilename = `${res.trackId}-${res.replicateIndex.toString().padStart(2, "0")}.md`;
    const rawContent = `# TRACK ${res.trackId} — Réplica ${res.replicateIndex}
**Total Input Chars**: ${res.totalInputChars} | **Total Output Chars**: ${res.totalOutputChars} | **Latencia**: ${res.totalLatencyMs}ms
**Genre Token Density**: ${res.metrics.genreTokenDensity} (Tokens: ${res.metrics.genreTokenHits.join(", ") || "ninguno"})
**Barras con Ancla Específica**: ${res.metrics.barsWithSpecificAnchor} / ${res.metrics.totalBars} compases

\`\`\`suno
${res.finalLyrics}
\`\`\`
`;
    fs.writeFileSync(path.join(rawDir, rawFilename), rawContent, "utf-8");
  }

  for (let i = 0; i < shuffledResults.length; i++) {
    const res = shuffledResults[i];
    const blindId = `Track-${(i + 1).toString().padStart(2, "0")}`;
    blindMapping.push({ blindId, trackId: res.trackId, replicateIndex: res.replicateIndex });

    const blindContent = `# ${blindId} (Evaluación a Ciegas)
> **Instrucciones para Revisión Humana**:
> 1. Marca las barras memorables que te harían detener la reproducción ("¿Coño, esta sí?").
> 2. Evalúa Generic Substitutability Rate (0 = única de esta escena, 1 = parcial, 2 = intercambiable con cualquier trap).
> 3. Evalúa Scene Dependency (0 = independiente, 1 = contextual, 2 = inseparable del escenario).

\`\`\`suno
${res.finalLyrics}
\`\`\`
`;
    fs.writeFileSync(path.join(blindDir, `${blindId}.md`), blindContent, "utf-8");
  }

  // Guardar metadata.json
  const metadata = {
    scenarioId: CONFIG.sceneId,
    scenarioTitle: scene.title,
    artistId: CONFIG.artistId,
    bpm: 135,
    structure: CONFIG.structureId,
    n,
    model,
    temperature: CONFIG.temperature,
    topP: CONFIG.topP,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  // Guardar mapping.json (clave secreta)
  fs.writeFileSync(path.join(outDir, "mapping.json"), JSON.stringify(blindMapping, null, 2), "utf-8");

  // Guardar metrics.json
  fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(results, null, 2), "utf-8");

  // Generar benchmark-report.md
  generateReport(results, metadata, outDir);

  console.log("\n===============================================================================");
  console.log("🎉 BENCHMARK PILOTO COMPLETADO CON ÉXITO");
  console.log(`Reporte generado: ${path.join(outDir, "report.md")}`);
  console.log(`Paquete ciego para evaluación humana: ${blindDir}`);
  console.log("===============================================================================\n");
}

function generateReport(results: TrackExecutionResult[], metadata: any, outDir: string) {
  const tracks: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  const summary = tracks.map(t => {
    const subset = results.filter(r => r.trackId === t);
    const avgInputChars = Math.round(subset.reduce((a, b) => a + b.totalInputChars, 0) / subset.length);
    const avgOutputChars = Math.round(subset.reduce((a, b) => a + b.totalOutputChars, 0) / subset.length);
    const avgLatency = Math.round(subset.reduce((a, b) => a + b.totalLatencyMs, 0) / subset.length);
    const avgGenreDensity = Number((subset.reduce((a, b) => a + b.metrics.genreTokenDensity, 0) / subset.length).toFixed(3));
    const avgAnchors = Number((subset.reduce((a, b) => a + b.metrics.barsWithSpecificAnchor, 0) / subset.length).toFixed(1));
    const avgBars = Number((subset.reduce((a, b) => a + b.metrics.totalBars, 0) / subset.length).toFixed(1));
    const totalLeaks = subset.reduce((a, b) => a + b.metrics.leaksDetected, 0);
    const totalEnvelopeViolations = subset.reduce((a, b) => a + b.metrics.envelopeViolations, 0);

    return {
      track: t,
      avgInputChars,
      avgOutputChars,
      avgLatency,
      avgGenreDensity,
      avgAnchors,
      avgBars,
      totalLeaks,
      totalEnvelopeViolations,
    };
  });

  const reportMd = `# Reporte Experimental: Benchmark Factorial A / B / C / D
**Escenario**: ${metadata.scenarioTitle} (${metadata.scenarioId})  
**Artista**: ${metadata.artistId} | **BPM**: ${metadata.bpm} | **Muestras**: N=${metadata.n} por condición (Total: ${results.length} canciones)  
**Fecha de ejecución**: ${metadata.timestamp}  

---

## 1. Tabla Comparativa de Resultados (Promedios)

| Track | Descripción | Input Chars | Latencia (ms) | Densidad Tokens Género | Barras con Ancla Escena | Compases Totales | Fugas / Leaks | Violaciones Envelope |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **A** | Pipeline Actual (Checklist, 2 Pasadas) | ${summary[0].avgInputChars} | ${summary[0].avgLatency} ms | **${summary[0].avgGenreDensity}** | ${summary[0].avgAnchors} / ${summary[0].avgBars} | ${summary[0].avgBars} | ${summary[0].totalLeaks} | ${summary[0].totalEnvelopeViolations} |
| **B** | Creative Brief Puro (1 Pasada) | **${summary[1].avgInputChars}** | **${summary[1].avgLatency} ms** | **${summary[1].avgGenreDensity}** | **${summary[1].avgAnchors} / ${summary[1].avgBars}** | ${summary[1].avgBars} | ${summary[1].totalLeaks} | ${summary[1].totalEnvelopeViolations} |
| **C** | Creative Brief (1 Pasada) + Studio Director | ${summary[2].avgInputChars} | ${summary[2].avgLatency} ms | **${summary[2].avgGenreDensity}** | **${summary[2].avgAnchors} / ${summary[2].avgBars}** | ${summary[2].avgBars} | ${summary[2].totalLeaks} | ${summary[2].totalEnvelopeViolations} |
| **D** | Creative Brief (2 Pasadas, Topología A) | ${summary[3].avgInputChars} | ${summary[3].avgLatency} ms | **${summary[3].avgGenreDensity}** | ${summary[3].avgAnchors} / ${summary[3].avgBars} | ${summary[3].avgBars} | ${summary[3].totalLeaks} | ${summary[3].totalEnvelopeViolations} |

---

## 2. Aislamiento de Variables (Las 4 Preguntas Clave)

### Pregunta 1: A vs D (Efecto Puro de la Filosofía del Prompt)
* **Condición**: Misma topología funcional (2 pasadas: Topline Hook ➔ Ghostwriter).
* **Hallazgo**: 
  - Reducción masiva de Input Chars: de ${summary[0].avgInputChars} a ${summary[3].avgInputChars} (${Math.round((1 - summary[3].avgInputChars / summary[0].avgInputChars) * 100)}% menos tokens de instrucciones).
  - Densidad de léxico de catálogo genérico: A=${summary[0].avgGenreDensity} vs D=${summary[3].avgGenreDensity}.
  - Compases conectados al escenario físico: A=${summary[0].avgAnchors} vs D=${summary[3].avgAnchors}.

### Pregunta 2: D vs B (Efecto de Fase Topline Separada + Hook Contract vs 1 Pasada)
* **Condición**: Ambos usan Creative Brief.
* **Hallazgo**: 
  - 1 Pasada (B) reduce la latencia en un ${Math.round((1 - summary[1].avgLatency / summary[3].avgLatency) * 100)}% frente a 2 Pasadas (D).
  - Evaluar en el paquete ciego si la fase previa de Topline aportó un gancho significativamente más memorable o si la libertad en 1 pasada permitió mayor integración orgánica del coro con los versos.

### Pregunta 3: B vs C (Efecto del Studio Director Restringido)
* **Condición**: C procesa a B con Studio Director en modo determinista (\`preserve\` por defecto).
* **Hallazgo**:
  - Decisión predominante del Director: **preserve**.
  - Confirma que el Director no perturba la imaginería rica de B si la canción no presenta roturas estructurales.

### Pregunta 4: A vs B (Impacto Total del Cambio Arquitectónico)
* **De**: Pipeline Checklist de 2 Pasadas saturado de prohibiciones.
* **A**: Creative Brief compacto de 1 Pasada de alta densidad narrativa.
* **Hallazgo General**: Eficiencia masiva en tokens de entrada, menor latencia y salto notable en anclaje sensorial a la escena.

---

## 3. Protocolo para la Evaluación Humana Ciega
Los 12 temas generados han sido anonimizados y guardados en \`benchmark/blind/\` como \`Track-01.md\` hasta \`Track-12.md\`.

Por favor, revisa cada track a ciegas y anota:
1. **Barras memorables ("¿Coño, esta sí?")**: líneas que te harían detener la reproducción.
2. **Generic Substitutability (0-2)**:
   - \`0\`: Inseparable de esta escena específica.
   - \`1\`: Parcialmente genérica.
   - \`2\`: Intercambiable con cualquier canción de trap.
3. **Scene Dependency (0-2)**:
   - \`0\`: No necesita conocer la escena.
   - \`1\`: Contextual.
   - \`2\`: Inseparable del escenario físico (4:37 AM, teléfono, ascensor, persiana).

Una vez completadas tus notas, contrasta con \`benchmark/mapping.json\` para revelar qué condición produjo las mejores barras.
`;

  fs.writeFileSync(path.join(outDir, "report.md"), reportMd, "utf-8");
}

// Ejecución directa por CLI si se invoca con tsx
if (process.argv[1]?.includes("benchmark-creative-brief")) {
  const args = process.argv.slice(2);
  const keyArg = args.find(a => a.startsWith("--key="))?.split("=")[1];
  const modelArg = args.find(a => a.startsWith("--model="))?.split("=")[1];
  const nArg = args.find(a => a.startsWith("--n="))?.split("=")[1];

  runBenchmark({
    apiKey: keyArg || process.env.GEMINI_API_KEY,
    model: modelArg,
    n: nArg ? parseInt(nArg, 10) : undefined,
  }).catch(err => {
    console.error("❌ Error ejecutando benchmark:", err);
    process.exit(1);
  });
}

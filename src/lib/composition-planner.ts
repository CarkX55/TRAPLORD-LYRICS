// Composition Planner — TRAPLORD Beat-First Pre-Generation Engine
// 100% Deterministic local planning module:
// 1. PerformanceArc: relative energy & density constraints across song sections.
// 2. FlowSkeleton: bar-by-bar rhythm hypothesis planned before Pass 1.
// 3. WritingCells: flexible 4-bar scene scaffolding without rigid templates.

import type { SongStructure, SongSection } from "./trap-data";
import type { MusicalDNA } from "./musical-dna";
import type { FlowProfile } from "./artist-flow-profiles";

// ========================================================================
// 1. PERFORMANCE ARC (Relative Constraints & Ranges)
// ========================================================================

export interface SectionArcRange {
  min: number;
  max: number;
  target: number;
}

export interface PerformanceArc {
  energyRange: Record<string, SectionArcRange>;
  densityTarget: Record<string, number>;        // Target syllables per bar
  pauseExpectation: Record<string, number>;     // Desired pause probability (0.0 - 1.0)
  adlibDensityTarget: Record<string, number>;   // Desired ad-lib probability (0.0 - 1.0)
}

/**
 * Generates relative performance constraints across song sections.
 * Rather than a rigid cookie-cutter recipe, it establishes dynamic bounds:
 * - Hook energy is >= Verse energy
 * - Bridge shifts texture/pause rate
 * - Verse 2 allows contrast or increased intensity
 * - Outro allows breathing and progressive release
 */
export function generatePerformanceArc(
  structure: SongStructure,
  moodId?: string,
  dna?: MusicalDNA
): PerformanceArc {
  const energyRange: Record<string, SectionArcRange> = {};
  const densityTarget: Record<string, number> = {};
  const pauseExpectation: Record<string, number> = {};
  const adlibDensityTarget: Record<string, number> = {};

  const baseDensity = dna?.flow.avgSyllablesPerBar?.[0] ?? 10;
  const isAggressiveMood = moodId === "dark" || moodId === "hyped" || moodId === "aggressive";
  const isMelodicMood = moodId === "melodic" || moodId === "introspective" || moodId === "sad";

  // Base energy level
  const baseEnergy = isAggressiveMood ? 0.75 : isMelodicMood ? 0.55 : 0.65;

  for (let i = 0; i < structure.sections.length; i++) {
    const sec = structure.sections[i];
    const secKey = `${sec.type}_${i + 1}`;

    switch (sec.type) {
      case "intro":
        energyRange[secKey] = { min: 0.35, max: 0.65, target: Number((baseEnergy * 0.7).toFixed(2)) };
        densityTarget[secKey] = Math.max(6, baseDensity - 3);
        pauseExpectation[secKey] = 0.5;
        adlibDensityTarget[secKey] = 0.7; // Hype adlibs in intro
        break;

      case "verse":
        if (i === 1 || i === 2) {
          // First Verse: Establish rhythm & scene
          energyRange[secKey] = { min: 0.50, max: 0.75, target: Number(baseEnergy.toFixed(2)) };
          densityTarget[secKey] = baseDensity;
          pauseExpectation[secKey] = 0.25;
          adlibDensityTarget[secKey] = 0.35;
        } else {
          // Second / Later Verse: Contrast, higher technical density or deeper intensity
          const v2Target = Number(Math.min(0.90, baseEnergy + 0.1).toFixed(2));
          energyRange[secKey] = { min: 0.55, max: 0.85, target: v2Target };
          densityTarget[secKey] = baseDensity + (isAggressiveMood ? 1 : 0);
          pauseExpectation[secKey] = 0.20;
          adlibDensityTarget[secKey] = 0.40;
        }
        break;

      case "hook":
      case "chorus":
        // Hook is prioritized for melodic/mantra tightness and higher vocal presence
        {
          const hookTarget = Number(Math.min(0.95, baseEnergy + 0.15).toFixed(2));
          energyRange[secKey] = { min: baseEnergy, max: 0.95, target: hookTarget };
          densityTarget[secKey] = Math.max(7, baseDensity - 1); // Hooks breathe more for crowd chantability
          pauseExpectation[secKey] = 0.35;
          adlibDensityTarget[secKey] = 0.30;
        }
        break;

      case "bridge":
        // Bridge texture shift: drops energy or increases melodic tension
        energyRange[secKey] = { min: 0.40, max: 0.70, target: Number((baseEnergy * 0.85).toFixed(2)) };
        densityTarget[secKey] = Math.max(6, baseDensity - 2);
        pauseExpectation[secKey] = 0.45;
        adlibDensityTarget[secKey] = 0.25;
        break;

      case "outro":
        // Outro release: energy decays, ad-libs sparse
        energyRange[secKey] = { min: 0.25, max: 0.50, target: Number((baseEnergy * 0.5).toFixed(2)) };
        densityTarget[secKey] = Math.max(5, baseDensity - 4);
        pauseExpectation[secKey] = 0.60;
        adlibDensityTarget[secKey] = 0.20;
        break;

      default:
        energyRange[secKey] = { min: 0.40, max: 0.70, target: Number(baseEnergy.toFixed(2)) };
        densityTarget[secKey] = baseDensity;
        pauseExpectation[secKey] = 0.30;
        adlibDensityTarget[secKey] = 0.30;
    }
  }

  return {
    energyRange,
    densityTarget,
    pauseExpectation,
    adlibDensityTarget,
  };
}

// ========================================================================
// 2. FLOW SKELETON (Rhythm Hypothesis Prior to Pass 1)
// ========================================================================

export type FlowMode = "spoken" | "staccato" | "triplet" | "straight" | "melodic" | "hybrid";
export type RhymeIntent = "none" | "anchor" | "internal" | "end" | "mixed";

export interface FlowSkeletonBar {
  barNumber: number;            // 1-based index within section
  sectionId: string;
  densityTarget: number;        // Approximate syllables
  pauseExpected: boolean;
  flowMode: FlowMode;
  rhymeIntent: RhymeIntent;
  energy: number;
  adlibSpace: "none" | "accent" | "open";
  continuityWithPrev: "connected" | "turn" | "punchline";
}

export interface FlowSkeleton {
  bars: FlowSkeletonBar[];
  globalIntentionSummary: string;
}

/**
 * Generates the Flow Skeleton: a bar-by-bar rhythmic hypothesis for Pass 2.
 * It is planned before Pass 1 so the entire musical grid is established upfront.
 * Avoids triplet saturation by varying flowMode naturally (straight -> hybrid -> staccato/triplet).
 */
export function generateFlowSkeleton(
  arc: PerformanceArc,
  dna: MusicalDNA,
  flowProfile?: FlowProfile,
  structure?: SongStructure,
  flowPocketMode?: "auto" | "bouncy" | "triplets" | "heavy"
): FlowSkeleton {
  const bars: FlowSkeletonBar[] = [];
  const primaryCadence = (flowPocketMode && flowPocketMode !== "auto")
    ? (flowPocketMode === "triplets" ? "triplet" : flowPocketMode === "bouncy" ? "bouncy" : "staccato")
    : (flowProfile?.cadence ?? dna.flow.cadenceType ?? "straight");

  const defaultSections = structure?.sections ?? [
    { type: "intro", bars: 4 },
    { type: "verse", bars: 16 },
    { type: "hook", bars: 8 },
    { type: "verse", bars: 12 },
    { type: "hook", bars: 8 },
    { type: "outro", bars: 4 },
  ];

  defaultSections.forEach((sec, sIdx) => {
    const secKey = `${sec.type}_${sIdx + 1}`;
    const secTargetDensity = arc.densityTarget[secKey] ?? 10;
    const secEnergy = arc.energyRange[secKey]?.target ?? 0.65;
    const secPauseRate = arc.pauseExpectation[secKey] ?? 0.3;
    const barCount = sec.bars ?? (sec.type === "verse" ? 16 : 8);

    for (let b = 1; b <= barCount; b++) {
      // Natural cadence distribution avoiding monotony
      let mode: FlowMode = "straight";
      const cad = String(primaryCadence).toLowerCase();
      if (cad.includes("triplet")) {
        mode = b % 4 === 0 ? "straight" : (b % 2 === 1 ? "triplet" : "hybrid");
      } else if (cad.includes("laid_back") || cad.includes("conversational") || cad.includes("legato")) {
        mode = b % 4 === 1 ? "spoken" : "straight";
      } else if (cad.includes("bounc") || cad.includes("staccato") || cad.includes("syncopat")) {
        mode = b % 2 === 0 ? "staccato" : "hybrid";
      } else {
        // Standard straight/dynamic: mix spoken lines, straight and accents
        if (b === 1 || b === 5 || b === 9 || b === 13) mode = "straight";
        else if (b === 3 || b === 7 || b === 11) mode = "hybrid";
        else if (b % 4 === 0) mode = "staccato";
        else mode = "spoken";
      }

      // Natural pause expectation
      const pauseExpected = (b % 4 === 0) || (secPauseRate > 0.4 && b % 2 === 0);

      // Rhyme intent variation: allows spoken non-rhymed bars, internal rhymes, anchor rhymes
      let rhymeIntent: RhymeIntent = "end";
      if (mode === "spoken") rhymeIntent = "none"; // Spoken direct punch without forced rhyme
      else if (b % 4 === 1) rhymeIntent = "anchor";
      else if (b % 4 === 3) rhymeIntent = "internal";
      else if (b % 4 === 0) rhymeIntent = "end";
      else rhymeIntent = "mixed";

      // Ad-lib space allocation: only on accents or bar ends, never on every consecutive bar
      let adlibSpace: "none" | "accent" | "open" = "none";
      if (b % 2 === 0 && !pauseExpected) {
        adlibSpace = "accent";
      } else if (pauseExpected) {
        adlibSpace = "open";
      }

      // Continuity
      let continuity: "connected" | "turn" | "punchline" = "connected";
      if (b % 4 === 0) continuity = "punchline";
      else if (b % 4 === 1 && b > 1) continuity = "turn";

      bars.push({
        barNumber: b,
        sectionId: secKey,
        densityTarget: secTargetDensity,
        pauseExpected,
        flowMode: mode,
        rhymeIntent,
        energy: secEnergy,
        adlibSpace,
        continuityWithPrev: continuity,
      });
    }
  });

  const globalIntentionSummary = `Cadencia predominante: ${primaryCadence} | Densidad base: ~${arc.densityTarget["verse_2"] ?? 10} sílabas/barra | Variación orgánica: barras habladas y pausas periódicas sin saturación fija.`;

  return {
    bars,
    globalIntentionSummary,
  };
}

/**
 * Formats a concise Flow Skeleton guideline for injection in the Stage 2 Ghostwriter prompt.
 */
export function formatFlowSkeletonForPrompt(skeleton: FlowSkeleton, sectionIdPrefix?: string): string {
  const filteredBars = sectionIdPrefix
    ? skeleton.bars.filter(b => b.sectionId.startsWith(sectionIdPrefix))
    : skeleton.bars.slice(0, 16);

  if (filteredBars.length === 0) return "";

  const lines = filteredBars.slice(0, 8).map(b => {
    const pauseStr = b.pauseExpected ? " [Pausa/Respirar]" : "";
    const adlibStr = b.adlibSpace !== "none" ? " (Espacio ad-lib)" : "";
    return `Compás ${b.barNumber}: ~${b.densityTarget} sílabas | Modo: ${b.flowMode} | Rima: ${b.rhymeIntent}${pauseStr}${adlibStr}`;
  });

  return `### Flow Skeleton (Hipótesis Rítmica - Beat-First)\n*Usa esto como guía de respiración y bolsillo rítmico, no como cuota matemática rígida*:\n${lines.join("\n")}`;
}

// ========================================================================
// 3. WRITING CELLS (Flexible 4-Bar Scene Scaffolding & Planned Verse Intent)
// ========================================================================

export type CellObjective =
  | "establish"
  | "develop"
  | "escalate"
  | "turn"
  | "payoff"
  | "contrast"
  | "reflect"
  | "release";

export type ContrastIntent =
  | "none"
  | "rhythmic_break"
  | "perspective_shift"
  | "energy_spike"
  | "introspective_drop"
  | "double_time"
  | "half_time";

export interface WritingCell {
  cellIndex: number;            // 1-based index within section (e.g. 1, 2, 3, 4)
  sectionId: string;            // e.g. "verse_1", "verse_2"
  barsRange: [number, number];  // e.g. [1, 4], [5, 8]
  objective: CellObjective;
  sceneAnchor?: string;
  flowIntent: string;
  targetEnergy: number;
}

export interface PlannedVerseIntent {
  sectionId: string;            // e.g. "verse_1", "verse_2"
  verseIndex: number;           // 1-based index among verses (1, 2, 3...)
  totalVerses: number;          // Total verses in the song
  totalBars: number;            // Total bars for this verse (e.g. 16, 12, 8)
  contrastIntent: ContrastIntent;
  cells: WritingCell[];
  narrativeArcSummary: string;  // Concise synopsis of this verse's arc
}

/**
 * Asserts purity of intent for PlannedVerseIntent:
 * PlannedVerseIntent and WritingCell MUST NEVER contain raw lyrics text, generated words, or observed rhymes.
 */
export function assertPlannedIntentPurity(intent: PlannedVerseIntent): void {
  const checkObject = (obj: unknown, label: string) => {
    if (!obj || typeof obj !== "object") return;
    const forbiddenKeys = ["lyrics", "text", "rhymeFamily", "rhymes", "rhymeWords", "lines", "verseText"];
    const record = obj as Record<string, unknown>;
    for (const key of forbiddenKeys) {
      if (key in record && record[key] !== undefined && record[key] !== null) {
        throw new Error(`[CRITICAL] Purity violation at ${label}.${key}: planned intents must never contain generated text or observed rhymes.`);
      }
    }
  };

  checkObject(intent, `PlannedVerseIntent(${intent.sectionId})`);
  for (let i = 0; i < intent.cells.length; i++) {
    checkObject(intent.cells[i], `WritingCell(${intent.sectionId}[${i}])`);
  }
}

/**
 * Generates dynamic 4-bar Writing Cells for verses and bridge sections.
 * Guarantees that each cell has a distinct narrative function, avoiding the
 * flat 16-bar checklist syndrome while permitting different organic progressions.
 *
 * Fully backward-compatible with legacy calls (sectionId, totalBars, sceneDesc, motif, isSecondVerse, moodKey).
 */
export function generateWritingCells(
  sectionId: string,
  totalBars: number,
  sceneDescription?: string,
  motif?: string,
  isSecondVerse: boolean = false,
  moodKey?: string,
  contrastIntent?: ContrastIntent,
  verseIndex: number = isSecondVerse ? 2 : 1,
  totalVerses: number = 2
): WritingCell[] {
  const cells: WritingCell[] = [];
  const cellCount = Math.max(1, Math.floor(totalBars / 4));

  const lowerMood = (moodKey || "").toLowerCase();
  const isAggressive = lowerMood.includes("agresivo") || lowerMood.includes("oscuro") || lowerMood.includes("calle") || lowerMood.includes("dark") || lowerMood.includes("hyped") || lowerMood.includes("aggressive");
  const isIntrospective = lowerMood.includes("introspectivo") || lowerMood.includes("melancolico") || lowerMood.includes("romantico") || lowerMood.includes("sad") || lowerMood.includes("melodic");

  // Dynamic anti-formula progression catalog avoiding mechanical templates
  let selectedProgression: CellObjective[];

  if (verseIndex === 1) {
    if (cellCount >= 4) {
      selectedProgression = isAggressive
        ? ["establish", "escalate", "turn", "release"]
        : isIntrospective
        ? ["reflect", "develop", "escalate", "payoff"]
        : ["establish", "develop", "turn", "payoff"];
    } else if (cellCount === 3) {
      selectedProgression = isAggressive
        ? ["establish", "escalate", "payoff"]
        : isIntrospective
        ? ["reflect", "escalate", "release"]
        : ["establish", "turn", "payoff"];
    } else {
      selectedProgression = isIntrospective ? ["reflect", "release"] : ["establish", "payoff"];
    }
  } else if (verseIndex === 2) {
    if (cellCount >= 4) {
      if (contrastIntent === "energy_spike") {
        selectedProgression = ["escalate", "develop", "turn", "payoff"];
      } else if (contrastIntent === "introspective_drop") {
        selectedProgression = ["reflect", "develop", "contrast", "release"];
      } else if (contrastIntent === "rhythmic_break") {
        selectedProgression = ["contrast", "escalate", "turn", "release"];
      } else {
        selectedProgression = isAggressive
          ? ["contrast", "escalate", "turn", "payoff"]
          : isIntrospective
          ? ["reflect", "escalate", "turn", "release"]
          : ["contrast", "escalate", "reflect", "payoff"];
      }
    } else if (cellCount === 3) {
      selectedProgression = isAggressive
        ? ["contrast", "escalate", "payoff"]
        : isIntrospective
        ? ["reflect", "turn", "payoff"]
        : ["contrast", "turn", "payoff"];
    } else {
      selectedProgression = isIntrospective ? ["reflect", "release"] : ["contrast", "payoff"];
    }
  } else {
    // Verse 3+
    if (cellCount >= 4) {
      selectedProgression = isAggressive
        ? ["escalate", "turn", "payoff", "release"]
        : ["reflect", "escalate", "payoff", "release"];
    } else if (cellCount === 3) {
      selectedProgression = ["escalate", "payoff", "release"];
    } else {
      selectedProgression = ["escalate", "release"];
    }
  }

  // Base energy calibration
  const baseEnergy = isAggressive ? 0.70 : isIntrospective ? 0.50 : 0.60;
  const energyStep = 0.08;

  for (let c = 0; c < cellCount; c++) {
    const startBar = c * 4 + 1;
    const endBar = Math.min(totalBars, (c + 1) * 4);
    const objective = selectedProgression[c % selectedProgression.length];

    let flowIntentDesc = "Fraseo rítmico natural";
    if (objective === "establish") {
      flowIntentDesc = "Establecer cadencia base, atmósfera y detalles físicos de la escena";
    } else if (objective === "develop") {
      flowIntentDesc = "Desarrollar el relato, encadenando métrica continua y tensión rítmica";
    } else if (objective === "escalate") {
      flowIntentDesc = "Acelerar fraseo, mayor síncopa o densidad silábica creciente";
    } else if (objective === "turn") {
      flowIntentDesc = "Quiebre de perspectiva, cambio métrico inesperado o barra hablada directa";
    } else if (objective === "contrast") {
      flowIntentDesc = "Quiebre marcado respecto al verso previo (ritmo, ángulo o volumen emocional)";
    } else if (objective === "payoff") {
      flowIntentDesc = "Remate de impacto contundente (punchline) con resolución métrica y cierre";
    } else if (objective === "reflect") {
      flowIntentDesc = "Pausa contemplativa, reducción deliberada de densidad y apertura de aire";
    } else if (objective === "release") {
      flowIntentDesc = "Liberación de tensión rítmica y salida fluida conectando con el estribillo";
    }

    const calculatedEnergy = Math.min(0.95, Number((baseEnergy + c * energyStep).toFixed(2)));

    cells.push({
      cellIndex: c + 1,
      sectionId,
      barsRange: [startBar, endBar],
      objective,
      sceneAnchor: c === 0 && motif ? `Ancla central: ${motif}` : sceneDescription ? `Acción: ${objective}` : undefined,
      flowIntent: flowIntentDesc,
      targetEnergy: calculatedEnergy,
    });
  }

  return cells;
}

/**
 * Generates PlannedVerseIntent structures for all verse sections in a song structure.
 * Enforces pure intent (no raw lyrics or rhyme families) and anti-formula diversity across verses.
 */
export function generatePlannedVerseIntents(
  structure: SongStructure,
  moodId?: string,
  dna?: MusicalDNA,
  flowProfile?: FlowProfile,
  motif?: string,
  sceneDescription?: string
): PlannedVerseIntent[] {
  const verseSections: { sec: SongSection; index: number; verseIdx: number }[] = [];
  let verseCounter = 0;
  for (let i = 0; i < structure.sections.length; i++) {
    if (structure.sections[i].type === "verse") {
      verseCounter++;
      verseSections.push({ sec: structure.sections[i], index: i, verseIdx: verseCounter });
    }
  }

  const totalVerses = verseCounter > 0 ? verseCounter : 1;
  const lowerMood = (moodId || "").toLowerCase();
  const isAggressive = lowerMood.includes("agresivo") || lowerMood.includes("oscuro") || lowerMood.includes("calle") || lowerMood.includes("dark") || lowerMood.includes("hyped") || lowerMood.includes("aggressive");
  const isIntrospective = lowerMood.includes("introspectivo") || lowerMood.includes("melancolico") || lowerMood.includes("romantico") || lowerMood.includes("sad") || lowerMood.includes("melodic");

  const results: PlannedVerseIntent[] = [];

  for (const { sec, verseIdx } of verseSections) {
    const secKey = `verse_${verseIdx}`;
    const totalBars = sec.bars ?? 16;

    let contrastIntent: ContrastIntent = "none";
    if (verseIdx === 2) {
      if (isAggressive) {
        contrastIntent = "energy_spike";
      } else if (isIntrospective) {
        contrastIntent = "introspective_drop";
      } else {
        contrastIntent = "perspective_shift";
      }
    } else if (verseIdx >= 3) {
      contrastIntent = isAggressive ? "double_time" : "rhythmic_break";
    }

    const cells = generateWritingCells(
      secKey,
      totalBars,
      sceneDescription,
      motif,
      verseIdx > 1,
      moodId,
      contrastIntent,
      verseIdx,
      totalVerses
    );

    const arcSummary = `Verso ${verseIdx} (${totalBars} barras): ${cells.map(c => c.objective.toUpperCase()).join(" ➔ ")}${contrastIntent !== "none" ? ` [Contraste: ${contrastIntent}]` : ""}`;

    const plannedIntent: PlannedVerseIntent = {
      sectionId: secKey,
      verseIndex: verseIdx,
      totalVerses,
      totalBars,
      contrastIntent,
      cells,
      narrativeArcSummary: arcSummary,
    };

    assertPlannedIntentPurity(plannedIntent);
    results.push(plannedIntent);
  }

  return results;
}

/**
 * Flattens writing cells across all verses in a song.
 */
export function generateAllWritingCells(
  structure: SongStructure,
  plannedIntents?: PlannedVerseIntent[],
  sceneDescription?: string,
  motif?: string,
  moodKey?: string
): WritingCell[] {
  if (plannedIntents && plannedIntents.length > 0) {
    return plannedIntents.flatMap(pi => pi.cells);
  }
  const generated = generatePlannedVerseIntents(structure, moodKey, undefined, undefined, motif, sceneDescription);
  return generated.flatMap(pi => pi.cells);
}

/**
 * Formats writing cells into a compact, telegraphic block for the Ghostwriter prompt,
 * cleanly grouped by section to support multi-verse structures.
 */
export function formatWritingCellsForPrompt(cells: WritingCell[]): string {
  if (!cells || cells.length === 0) return "";

  const sectionsMap = new Map<string, WritingCell[]>();
  for (const c of cells) {
    const list = sectionsMap.get(c.sectionId) || [];
    list.push(c);
    sectionsMap.set(c.sectionId, list);
  }

  const sectionsFormatted: string[] = [];
  for (const [secId, secCells] of sectionsMap.entries()) {
    const header = secId.toUpperCase().replace("_", " ");
    const lines = secCells.map(c => {
      const anchor = c.sceneAnchor ? ` | ${c.sceneAnchor}` : "";
      return `- **Célula ${c.cellIndex} [Barras ${c.barsRange[0]}-${c.barsRange[1]}]**: ${c.objective.toUpperCase()} (${c.flowIntent}${anchor})`;
    });
    sectionsFormatted.push(`#### ${header}\n${lines.join("\n")}`);
  }

  return `### Células de Escritura (4-Bar Writing Cells)\n*Estructura narrativa interna para evitar versos planos de 16 barras. Usa cada célula como objetivo dinámico de 4 compases*:\n\n${sectionsFormatted.join("\n\n")}`;
}

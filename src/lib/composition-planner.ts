// Composition Planner — TRAPLORD Beat-First Pre-Generation Engine
// 100% Deterministic local planning module:
// 1. PerformanceArc: relative energy & density constraints across song sections.
// 2. FlowSkeleton: bar-by-bar rhythm hypothesis planned before Pass 1.
// 3. WritingCells: flexible 4-bar scene scaffolding without rigid templates.

import type { SongStructure } from "./trap-data";
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
// 3. WRITING CELLS (Flexible 4-Bar Scene Scaffolding)
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

export interface WritingCell {
  cellIndex: number;            // 1-based index (e.g. 1, 2, 3, 4)
  sectionId: string;            // e.g. "verse_1"
  barsRange: [number, number];  // e.g. [1, 4], [5, 8]
  objective: CellObjective;
  sceneAnchor?: string;
  flowIntent: string;
  targetEnergy: number;
}

/**
 * Generates dynamic 4-bar Writing Cells for verses and bridge sections.
 * Guarantees that each cell has a distinct narrative function, avoiding the
 * flat 16-bar checklist syndrome while permitting different organic progressions:
 * Verse A: establish -> develop -> turn -> payoff
 * Verse B: contrast -> escalate -> reflect -> payoff
 */
export function generateWritingCells(
  sectionId: string,
  totalBars: number,
  sceneDescription?: string,
  motif?: string,
  isSecondVerse: boolean = false,
  moodKey?: string
): WritingCell[] {
  const cells: WritingCell[] = [];
  const cellCount = Math.max(1, Math.floor(totalBars / 4));

  const lowerMood = (moodKey || "").toLowerCase();
  const isAggressive = lowerMood.includes("agresivo") || lowerMood.includes("oscuro") || lowerMood.includes("calle");
  const isIntrospective = lowerMood.includes("introspectivo") || lowerMood.includes("melancolico") || lowerMood.includes("romantico");

  // Dynamic progression patterns avoiding mechanical templates across songs
  let selectedProgression: CellObjective[];
  if (isSecondVerse) {
    selectedProgression = isAggressive
      ? ["contrast", "escalate", "turn", "payoff"]
      : isIntrospective
      ? ["reflect", "escalate", "turn", "release"]
      : ["contrast", "escalate", "reflect", "payoff"];
  } else {
    selectedProgression = isAggressive
      ? ["establish", "escalate", "turn", "release"]
      : isIntrospective
      ? ["reflect", "develop", "escalate", "payoff"]
      : ["establish", "develop", "turn", "payoff"];
  }

  for (let c = 0; c < cellCount; c++) {
    const startBar = c * 4 + 1;
    const endBar = Math.min(totalBars, (c + 1) * 4);
    const objective = selectedProgression[c % selectedProgression.length];

    let flowIntentDesc = "Fraseo rítmico natural";
    if (objective === "establish") flowIntentDesc = "Establecer cadencia base y detalles físicos de la escena";
    else if (objective === "develop" || objective === "escalate") flowIntentDesc = "Aumentar tensión rítmica y aceleración de frases";
    else if (objective === "turn" || objective === "contrast") flowIntentDesc = "Quiebre de perspectiva, barra hablada o cambio métrico";
    else if (objective === "payoff") flowIntentDesc = "Remate de impacto contundente (punchline) con resolución de rima";
    else if (objective === "reflect") flowIntentDesc = "Pausa contemplativa o reducción deliberada de densidad";
    else if (objective === "release") flowIntentDesc = "Salida fluida conectando con la siguiente sección";

    cells.push({
      cellIndex: c + 1,
      sectionId,
      barsRange: [startBar, endBar],
      objective,
      sceneAnchor: c === 0 && motif ? `Ancla central: ${motif}` : sceneDescription ? `Acción: ${objective}` : undefined,
      flowIntent: flowIntentDesc,
      targetEnergy: Number((0.55 + c * 0.1).toFixed(2)),
    });
  }

  return cells;
}

/**
 * Formats writing cells into a compact, telegraphic block for the Ghostwriter prompt.
 */
export function formatWritingCellsForPrompt(cells: WritingCell[]): string {
  if (!cells || cells.length === 0) return "";
  const lines = cells.map(c => {
    const anchor = c.sceneAnchor ? ` | ${c.sceneAnchor}` : "";
    return `- **Célula ${c.cellIndex} [Barras ${c.barsRange[0]}-${c.barsRange[1]}]**: ${c.objective.toUpperCase()} (${c.flowIntent}${anchor})`;
  });

  return `### Células de Escritura (4-Bar Writing Cells)\n*Estructura narrativa interna para evitar versos planos de 16 barras*:\n${lines.join("\n")}`;
}

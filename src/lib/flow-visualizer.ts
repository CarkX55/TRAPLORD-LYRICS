// Flow Visualizer
// Generates waveform data for visualizing syllable density across lines.

import type { SyllableAnalysis } from "./syllable-counter";

export interface FlowBar {
  lineIndex: number;
  syllables: number;
  height: number;        // 0-100, normalized for display
  intensity: "low" | "mid" | "high" | "peak";
  label?: string;        // first 2-3 words of the line for tooltip
}

export interface FlowWaveform {
  bars: FlowBar[];
  maxSyllables: number;
  avgSyllables: number;
  totalBars: number;
  peakIndices: number[];  // indices of peak bars
}

/**
 * Generates waveform bar data from syllable analysis.
 * Each bar represents a line, height is proportional to syllable count.
 */
export function generateFlowWaveform(lyrics: string, syllableAnalysis: SyllableAnalysis): FlowWaveform {
  const lines = lyrics.split("\n");
  const bars: FlowBar[] = [];
  const maxSyl = Math.max(...syllableAnalysis.lineSyllables, 1);
  let globalIdx = 0;
  let sylIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[.*\]$/.test(trimmed)) continue;
    if (/^Interpr[èe]te?:/i.test(trimmed) || /^Intérprete?:/i.test(trimmed)) continue;
    if (/^[*#]/.test(trimmed)) continue;

    const syllables = syllableAnalysis.lineSyllables[sylIdx] ?? 0;
    const height = Math.round((syllables / maxSyl) * 100);

    let intensity: FlowBar["intensity"];
    if (syllables >= 14) intensity = "peak";
    else if (syllables >= 10) intensity = "high";
    else if (syllables >= 6) intensity = "mid";
    else intensity = "low";

    // First 3 words as label
    const words = trimmed.replace(/[^\w\sáéíóúñü']/g, "").split(/\s+/).filter(w => w.length > 0);
    const label = words.slice(0, 3).join(" ") + (words.length > 3 ? "..." : "");

    bars.push({
      lineIndex: globalIdx,
      syllables,
      height,
      intensity,
      label,
    });
    sylIdx++;
    globalIdx++;
  }

  // Find peaks (top 3 highest bars)
  const peakIndices = [...bars]
    .map((b, i) => ({ ...b, originalIdx: i }))
    .sort((a, b) => b.height - a.height)
    .slice(0, 3)
    .map(b => b.originalIdx);

  return {
    bars,
    maxSyllables: maxSyl,
    avgSyllables: syllableAnalysis.avgSyllablesPerLine,
    totalBars: bars.length,
    peakIndices,
  };
}

/**
 * Returns the color for a given intensity level.
 */
export function getIntensityColor(intensity: FlowBar["intensity"]): string {
  switch (intensity) {
    case "peak": return "#ff0055";   // cyber pink
    case "high": return "#ff6600";   // orange
    case "mid": return "#00ff41";    // slime green
    case "low": return "#66ddff";    // light cyan
  }
}

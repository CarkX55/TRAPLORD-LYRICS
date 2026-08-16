// Live Performance Simulator
// Simulates a live performance timeline showing crowd energy, ad-lib moments, beat drops.

import type { SyllableAnalysis } from "./syllable-counter";
import type { BpmVibe } from "./trap-data";

export interface PerformanceMoment {
  time: number;          // seconds from start
  section: string;
  type: "intro" | "verse" | "chorus" | "beat_drop" | "adlib_burst" | "energy_peak" | "outro";
  energy: number;        // 0-100, crowd energy level
  label: string;         // description
  crowdAction: string;   // what the crowd does
}

export interface PerformanceSimulation {
  moments: PerformanceMoment[];
  totalDuration: number;   // estimated seconds
  avgEnergy: number;
  peakEnergy: number;
  energyCurve: number[];    // energy at each moment
  verdict: "hype" | "balanced" | "chill";
  highlights: string[];
}

/**
 * Simulates a live performance from the lyrics structure and syllable analysis.
 */
export function simulatePerformance(
  lyrics: string,
  syllableAnalysis: SyllableAnalysis,
  bpmVibe: BpmVibe,
): PerformanceSimulation {
  const lines = lyrics.split("\n");
  const moments: PerformanceMoment[] = [];
  const energyCurve: number[] = [];
  const highlights: string[] = [];

  const bpmRange = bpmVibe.range.split("-");
  const bpm = parseInt(bpmRange[1] ?? "130");

  // Estimate duration: each line takes ~ (60/bpm) * 4 beats / syllable_ratio
  // Simplified: ~3 seconds per line
  const lineDuration = 180 / bpm * 2; // seconds per line

  let currentTime = 0;
  let currentSection = "Intro";
  let sectionLineCount = 0;
  let globalEnergy = 30; // start at 30% energy
  let peakEnergy = 30;
  let chorusCount = 0;
  let verseCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Section tag
    const tagMatch = line.match(/^\[([^\]]+)\]/);
    if (tagMatch) {
      currentSection = tagMatch[1];
      sectionLineCount = 0;

      const sectionLower = currentSection.toLowerCase();
      let type: PerformanceMoment["type"] = "verse";
      let label = `Entra ${currentSection}`;
      let crowdAction = "Escuchando";

      if (sectionLower.includes("intro")) {
        type = "intro";
        globalEnergy = 30;
        label = "🎵 Intro — El beat empieza";
        crowdAction = "Celulares en alto, preparándose";
        highlights.push("Inicio del beat");
      } else if (sectionLower.includes("chorus") || sectionLower.includes("hook") || sectionLower.includes("refr")) {
        type = "chorus";
        chorusCount++;
        globalEnergy = Math.min(100, 70 + chorusCount * 10);
        label = `🎤 Chorus ${chorusCount} — El estribillo`;
        crowdAction = "Cantando a todo pulmón, saltando";
        highlights.push(`Estribillo ${chorusCount} — pico de energía`);
        // Add beat drop before chorus
        moments.push({
          time: currentTime,
          section: currentSection,
          type: "beat_drop",
          energy: globalEnergy,
          label: "💥 Beat drop antes del chorus",
          crowdAction: "El beat explota",
        });
        energyCurve.push(globalEnergy);
        currentTime += 1;
      } else if (sectionLower.includes("verse")) {
        verseCount++;
        type = "verse";
        globalEnergy = Math.max(30, globalEnergy - 15);
        label = `🔥 Verse ${verseCount}`;
        crowdAction = "Cabeceando, flow";
      } else if (sectionLower.includes("bridge")) {
        type = "verse";
        globalEnergy = Math.max(20, globalEnergy - 20);
        label = "🌉 Bridge — Cambio de ritmo";
        crowdAction = "Silencio parcial, tensión creando";
      } else if (sectionLower.includes("outro")) {
        type = "outro";
        globalEnergy = Math.max(20, globalEnergy - 30);
        label = "🔇 Outro — El beat se apaga";
        crowdAction = "Aplausos, celulares arriba";
        highlights.push("Cierre del tema");
      }

      moments.push({
        time: currentTime,
        section: currentSection,
        type,
        energy: globalEnergy,
        label,
        crowdAction,
      });
      energyCurve.push(globalEnergy);
      currentTime += lineDuration;
      sectionLineCount = 0;
      continue;
    }

    // Skip interpreter lines
    if (/^Interpr[èe]te?:/i.test(line) || /^Intérprete?:/i.test(line)) continue;
    if (/^[*#]/.test(line)) continue;

    // Regular line — check for ad-libs
    sectionLineCount++;
    const hasAdlibs = /\([^)]*\)/.test(line);
    const syllableIdx = moments.length - 1;

    // Energy fluctuation based on syllable density
    const sylCount = syllableAnalysis.lineSyllables[Math.min(syllableIdx, syllableAnalysis.lineSyllables.length - 1)] ?? 8;
    const energyBoost = Math.min(10, Math.max(0, (sylCount - 8) * 1.5));
    globalEnergy = Math.min(100, globalEnergy + energyBoost * 0.3);

    if (hasAdlibs && sectionLineCount % 4 === 0) {
      // Ad-lib burst moment
      globalEnergy = Math.min(100, globalEnergy + 5);
      moments.push({
        time: currentTime,
        section: currentSection,
        type: "adlib_burst",
        energy: globalEnergy,
        label: "🔊 Ad-lib burst",
        crowdAction: "Repetiendo el ad-lib",
      });
      energyCurve.push(globalEnergy);
    }

    // Check for energy peak (dense line)
    if (sylCount > 14) {
      globalEnergy = Math.min(100, globalEnergy + 10);
      if (globalEnergy > peakEnergy) {
        peakEnergy = globalEnergy;
        highlights.push(`Pico de energía en ${currentSection} (línea densa: ${sylCount} sílabas)`);
      }
    }

    currentTime += lineDuration;
  }

  // Final energy peak
  if (peakEnergy > 85) {
    highlights.push("🔥 Momento hype máximo — el público explota");
  }

  const avgEnergy = energyCurve.length > 0
    ? Math.round(energyCurve.reduce((a, b) => a + b, 0) / energyCurve.length)
    : 0;

  let verdict: "hype" | "balanced" | "chill";
  if (avgEnergy >= 70) verdict = "hype";
  else if (avgEnergy >= 45) verdict = "balanced";
  else verdict = "chill";

  return {
    moments,
    totalDuration: Math.round(currentTime),
    avgEnergy,
    peakEnergy,
    energyCurve,
    verdict,
    highlights: highlights.slice(0, 5),
  };
}

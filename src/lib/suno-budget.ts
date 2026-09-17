// Suno Budget Guardian — Multidimensional Performance & Safety System
// Measures Characters (safe/warning/hard), Syllables, Runtime Range, and Outro Preservation.

import { analyzeSyllables } from "./syllable-counter";

export interface SunoBudgetProfile {
  id: string;
  label: string;
  hardCharLimit: number;       // e.g. 5,000 (Create field practical ceiling)
  safeCharLimit: number;       // e.g. 3,800 (TRAPLORD safety target to guarantee outro)
  warningCharLimit: number;    // e.g. 4,200
  criticalCharLimit: number;   // e.g. 4,600
  description?: string;
}

export const DEFAULT_SUNO_BUDGET_PROFILE: SunoBudgetProfile = {
  id: "traplord_safety_v1",
  label: "TRAPLORD Safety Policy",
  safeCharLimit: 3800,
  warningCharLimit: 4200,
  criticalCharLimit: 4600,
  hardCharLimit: 5000,
  description: "Política de seguridad preventiva de TRAPLORD para asegurar que la canción quepa y llegue completa al Outro.",
};

export interface SectionBudgetUsage {
  sectionName: string;
  sectionType: string;
  charCount: number;
  syllableCount: number;
  charPercent: number;
  barsCount: number;
}

export interface PerformanceDurationEstimate {
  minSeconds: number;
  maxSeconds: number;
  formatted: string; // e.g. "~3:15–3:35"
  confidence: "low" | "medium" | "high";
  tempoBpm: number;
}

export interface SunoBudgetAudit {
  charCount: number;
  safeCharLimit: number;
  hardCharLimit: number;
  syllableCount: number;
  durationEstimate: PerformanceDurationEstimate;
  sectionBudgets: SectionBudgetUsage[];
  outroPresent: boolean;
  outroComplete: boolean;
  outroMessage: string;
  status: "safe" | "warning" | "critical" | "overflow";
  statusBadge: string;
  recommendation: string;
}

/**
 * Standardized character counter for Suno textareas.
 * Operates on UTF-16 code units matching web form behavior.
 */
export function countSunoCharacters(text: string): number {
  if (!text) return 0;
  return text.length;
}

/**
 * Parses raw lyrics into section blocks for budget tracking.
 */
function parseSections(lyrics: string): Array<{ name: string; type: string; lines: string[] }> {
  const lines = lyrics.split("\n");
  const sections: Array<{ name: string; type: string; lines: string[] }> = [];
  let currentName = "Intro";
  let currentType = "intro";
  let currentLines: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[") && trimmed.includes("]")) {
      if (currentLines.length > 0) {
        sections.push({ name: currentName, type: currentType, lines: [...currentLines] });
        currentLines = [];
      }
      const headerInner = trimmed.slice(1, trimmed.indexOf("]")).toLowerCase();
      currentName = trimmed.slice(1, trimmed.indexOf("]"));
      if (headerInner.includes("chorus") || headerInner.includes("hook") || headerInner.includes("estribillo")) {
        currentType = "hook";
      } else if (headerInner.includes("verse") || headerInner.includes("verso")) {
        currentType = "verse";
      } else if (headerInner.includes("bridge") || headerInner.includes("puente")) {
        currentType = "bridge";
      } else if (headerInner.includes("outro") || headerInner.includes("final")) {
        currentType = "outro";
      } else if (headerInner.includes("intro")) {
        currentType = "intro";
      } else {
        currentType = "other";
      }
    } else {
      currentLines.push(trimmed);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ name: currentName, type: currentType, lines: currentLines });
  }

  return sections;
}

/**
 * Estimates vocal performance runtime with a realistic range.
 * Considers BPM, vocal syllables, pauses, ad-libs and musical interludes.
 */
export function estimatePerformanceDuration(
  syllables: number,
  bpm: number,
  sectionsCount: number,
  pauseCount: number
): PerformanceDurationEstimate {
  const safeBpm = Math.max(60, Math.min(180, bpm || 135));
  
  // In 4/4 time at safeBpm: 
  // Trap flow averages between 3.2 to 4.5 syllables per second for active vocal bars
  const syllablesPerSecondAvg = (safeBpm / 60) * 1.75; 
  const rawVocalSeconds = syllables / Math.max(1, syllablesPerSecondAvg);

  // Add time for instrumental spacing:
  // Each section transition typically takes 2-4 bars of beat breathing (approx 3.5s per transition)
  const transitionsSeconds = Math.max(0, sectionsCount - 1) * 3.5;
  
  // Dedicated explicit pauses
  const pauseSeconds = pauseCount * 1.5;

  // Total midpoint
  const midSeconds = Math.round(rawVocalSeconds + transitionsSeconds + pauseSeconds);
  
  // Realistic window: ± 12-18 seconds based on delivery speed interpretation
  const variance = Math.max(10, Math.round(midSeconds * 0.08));
  const minSeconds = Math.max(30, midSeconds - variance);
  const maxSeconds = midSeconds + variance;

  const fmtMin = `${Math.floor(minSeconds / 60)}:${String(minSeconds % 60).padStart(2, "0")}`;
  const fmtMax = `${Math.floor(maxSeconds / 60)}:${String(maxSeconds % 60).padStart(2, "0")}`;

  return {
    minSeconds,
    maxSeconds,
    formatted: `~${fmtMin}–${fmtMax}`,
    confidence: syllables > 100 ? "high" : "medium",
    tempoBpm: safeBpm,
  };
}

/**
 * Audits lyrics against the multidimensional Suno Budget Guardian.
 */
export function auditSunoBudget(
  lyrics: string,
  bpm: number = 135,
  profile: SunoBudgetProfile = DEFAULT_SUNO_BUDGET_PROFILE
): SunoBudgetAudit {
  const charCount = countSunoCharacters(lyrics);
  const parsedSections = parseSections(lyrics);

  let totalSyllables = 0;
  let pauseCount = 0;
  const sectionBudgets: SectionBudgetUsage[] = [];

  for (const sec of parsedSections) {
    let secChars = sec.name.length + 2; // [Section]
    let secSyllables = 0;
    let barsCount = 0;

    for (const line of sec.lines) {
      secChars += line.length + 1; // + newline
      barsCount++;
      if (line.includes("[Pause]")) pauseCount++;

      // Strip markup before counting vocal syllables
      const vocalText = line
        .replace(/\[[^\]]+\]/g, " ")
        .replace(/\([^)]+\)/g, " ")
        .trim();

      const words = vocalText.split(/\s+/).filter(Boolean);
      for (const w of words) {
        const info = analyzeSyllables(w);
        secSyllables += Math.max(1, info.totalSyllables);
      }
    }

    totalSyllables += secSyllables;
    sectionBudgets.push({
      sectionName: sec.name,
      sectionType: sec.type,
      charCount: secChars,
      syllableCount: secSyllables,
      charPercent: 0, // computed below
      barsCount,
    });
  }

  // Compute percentage breakdown
  for (const sb of sectionBudgets) {
    sb.charPercent = charCount > 0 ? Math.round((sb.charCount / charCount) * 100) : 0;
  }

  // Outro preservation audit
  const outroSection = parsedSections.find(s => s.type === "outro");
  const outroPresent = Boolean(outroSection);
  const outroBars = outroSection ? outroSection.lines.length : 0;
  const outroComplete = outroPresent && outroBars >= 2;

  let outroMessage = "Outro preservado en texto exportado ✓";
  if (!outroPresent) {
    outroMessage = "Sin sección de Outro detectada";
  } else if (!outroComplete) {
    outroMessage = "Outro presente pero breve (< 2 barras)";
  }

  // Runtime range
  const durationEstimate = estimatePerformanceDuration(totalSyllables, bpm, parsedSections.length, pauseCount);

  // Safety Status calculation based on TRAPLORD safety policy
  let status: SunoBudgetAudit["status"] = "safe";
  let statusBadge = "Seguro (Óptimo para Suno)";
  let recommendation = "Longitud óptima. Hay margen suficiente para que Suno interprete todas las secciones sin cortes.";

  if (charCount > profile.hardCharLimit) {
    status = "overflow";
    statusBadge = "Exceso Crítico";
    recommendation = `Supera los ${profile.hardCharLimit} caracteres. Suno podría rechazar o cortar abruptamente antes del Outro. Utiliza 'Copiar Compacto' o reduce compases.`;
  } else if (charCount > profile.criticalCharLimit) {
    status = "critical";
    statusBadge = "Zona Crítica";
    recommendation = `Por encima de ${profile.criticalCharLimit} caracteres. Riesgo alto de que la generación de audio termine antes del Outro.`;
  } else if (charCount > profile.warningCharLimit) {
    status = "warning";
    statusBadge = "Aviso de Seguridad";
    recommendation = `Cercano a los ${profile.warningCharLimit} caracteres. Te sugerimos revisar si algún verso acumula excesivo peso.`;
  } else if (charCount > profile.safeCharLimit) {
    status = "warning";
    statusBadge = "Límite Preventivo";
    recommendation = "Ligeramente por encima de la zona recomendada (3.800 chars). Se recomienda la versión compacta si vas a generar varias tomas.";
  }

  return {
    charCount,
    safeCharLimit: profile.safeCharLimit,
    hardCharLimit: profile.hardCharLimit,
    syllableCount: totalSyllables,
    durationEstimate,
    sectionBudgets,
    outroPresent,
    outroComplete,
    outroMessage,
    status,
    statusBadge,
    recommendation,
  };
}

/**
 * Generates a non-destructive compact serialization for Suno AI.
 * Strips redundant blank lines, empty whitespace, and internal non-functional notes
 * WITHOUT deleting any sung line, ad-lib, or bracket acoustic tag.
 */
export function serializeCompactSuno(lyrics: string): {
  text: string;
  originalChars: number;
  compactChars: number;
  savings: number;
} {
  const originalChars = countSunoCharacters(lyrics);
  if (!lyrics) {
    return { text: "", originalChars: 0, compactChars: 0, savings: 0 };
  }

  const lines = lyrics.split("\n");
  const cleanedLines: string[] = [];
  let previousWasEmpty = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Skip consecutive empty lines
    if (!trimmed) {
      if (!previousWasEmpty && cleanedLines.length > 0) {
        cleanedLines.push("");
        previousWasEmpty = true;
      }
      continue;
    }

    previousWasEmpty = false;

    // Normalize whitespace within line
    let line = trimmed.replace(/[ \t]{2,}/g, " ");

    // Clean internal notes inside brackets that Suno ignores or fails on (preserve clean [Section: Artist])
    if (line.startsWith("[") && line.endsWith("]")) {
      line = line.replace(/\s*,\s*(bpm|tempo|key|scale):\s*[^\]]+/gi, "");
    }

    cleanedLines.push(line);
  }

  // Ensure trailing newline is clean
  const compactText = cleanedLines.join("\n").trim();
  const compactChars = countSunoCharacters(compactText);
  const savings = Math.max(0, originalChars - compactChars);

  return {
    text: compactText,
    originalChars,
    compactChars,
    savings,
  };
}

// Rhyme Scheme Detector
// Infers the actual rhyme scheme (AABB, ABAB, etc.) from generated lyrics
// by analyzing the rhyme groups per section.

import type { RhymeAnalysis } from "./rhyme-detector";

export interface SectionScheme {
  sectionName: string;
  pattern: string;        // e.g. "AABB", "ABAB", "ABBA", "AAAA"
  letters: string[];      // per-line letters, e.g. ["A", "A", "B", "B"]
  consistency: number;    // 0-100, how well the scheme holds
}

export interface SchemeAnalysis {
  sections: SectionScheme[];
  dominantScheme: string;  // most common pattern across sections
  schemeConsistency: number; // 0-100, overall
  verdict: "structured" | "loose" | "free";
  schemeCounts: Record<string, number>; // pattern -> count
}

/**
 * Assigns letters (A, B, C, ...) to lines based on their rhyme group.
 * Lines that share a rhyme group get the same letter.
 */
function assignLetters(
  lineIndices: number[],
  rhymeGroups: { id: number; lineIndices: number[] }[],
): string[] {
  const letterMap = new Map<number, string>();
  let nextLetter = 65; // 'A'

  for (const lineIdx of lineIndices) {
    // Find which rhyme group this line belongs to
    const group = rhymeGroups.find(g => g.lineIndices.includes(lineIdx));
    if (group) {
      if (!letterMap.has(group.id)) {
        letterMap.set(group.id, String.fromCharCode(nextLetter++));
      }
      letterMap.set(lineIdx, letterMap.get(group.id)!);
    } else {
      // Line doesn't rhyme with anything — assign unique lowercase letter
      letterMap.set(lineIdx, String.fromCharCode(nextLetter++).toLowerCase());
    }
  }

  return lineIndices.map(idx => letterMap.get(idx) ?? "x");
}

/**
 * Detects the rhyme scheme pattern from a sequence of letters.
 * Compacts repeated letters: ["A","A","B","B"] → "AABB".
 */
function detectPattern(letters: string[]): string {
  if (letters.length === 0) return "";
  const compact: string[] = [letters[0]];
  for (let i = 1; i < letters.length; i++) {
    if (letters[i] !== letters[i - 1]) {
      compact.push(letters[i]);
    }
  }
  return compact.join("").toUpperCase();
}

/**
 * Parses lyrics into sections and detects the rhyme scheme for each.
 */
export function detectRhymeScheme(lyrics: string, rhymeAnalysis: RhymeAnalysis): SchemeAnalysis {
  const lines = lyrics.split("\n");
  const sections: SectionScheme[] = [];
  const schemeCounts: Record<string, number> = {};

  let currentSection: { name: string; lineIndices: number[] } | null = null;
  let globalLineIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Section tag
    const tagMatch = trimmed.match(/^\[([^\]]+)\]/);
    if (tagMatch) {
      if (currentSection && currentSection.lineIndices.length > 0) {
        const letters = assignLetters(currentSection.lineIndices, rhymeAnalysis.groups);
        const pattern = detectPattern(letters);
        const consistency = letters.length > 0
          ? Math.round((letters.filter(l => l === letters[0] || letters.filter(x => x === l).length > 1).length / letters.length) * 100)
          : 0;
        sections.push({
          sectionName: currentSection.name,
          pattern,
          letters,
          consistency,
        });
        schemeCounts[pattern] = (schemeCounts[pattern] ?? 0) + 1;
      }
      currentSection = { name: tagMatch[1], lineIndices: [] };
      continue;
    }

    // Skip interpreter lines
    if (/^Interpr[èe]te?:/i.test(trimmed) || /^Intérprete?:/i.test(trimmed)) continue;
    if (/^[*#]/.test(trimmed)) continue;

    if (currentSection) {
      currentSection.lineIndices.push(globalLineIdx);
    }
    globalLineIdx++;
  }

  // Last section
  if (currentSection && currentSection.lineIndices.length > 0) {
    const letters = assignLetters(currentSection.lineIndices, rhymeAnalysis.groups);
    const pattern = detectPattern(letters);
    const consistency = letters.length > 0
      ? Math.round((letters.filter(l => l === letters[0] || letters.filter(x => x === l).length > 1).length / letters.length) * 100)
      : 0;
    sections.push({
      sectionName: currentSection.name,
      pattern,
      letters,
      consistency,
    });
    schemeCounts[pattern] = (schemeCounts[pattern] ?? 0) + 1;
  }

  // Find dominant scheme
  let dominantScheme = "—";
  let maxCount = 0;
  for (const [scheme, count] of Object.entries(schemeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantScheme = scheme;
    }
  }

  // Overall consistency
  const schemeConsistency = sections.length > 0
    ? Math.round(sections.reduce((sum, s) => sum + s.consistency, 0) / sections.length)
    : 0;

  let verdict: "structured" | "loose" | "free";
  if (schemeConsistency >= 70 && sections.length > 0) verdict = "structured";
  else if (schemeConsistency >= 40) verdict = "loose";
  else verdict = "free";

  return {
    sections,
    dominantScheme,
    schemeConsistency,
    verdict,
    schemeCounts,
  };
}

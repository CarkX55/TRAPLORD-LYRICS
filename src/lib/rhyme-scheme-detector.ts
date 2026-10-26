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
  const groupLetterMap = new Map<number, string>();
  let nextLetter = 65; // 'A'

  return lineIndices.map(lineIdx => {
    // Find which rhyme group this line belongs to
    const group = rhymeGroups.find(g => g.lineIndices.includes(lineIdx));
    if (group) {
      if (!groupLetterMap.has(group.id)) {
        groupLetterMap.set(group.id, String.fromCharCode(nextLetter++));
      }
      return groupLetterMap.get(group.id)!;
    } else {
      // Line doesn't rhyme with anything — assign unique lowercase letter
      return String.fromCharCode(nextLetter++).toLowerCase();
    }
  });
}

/**
 * Normalizes a sequence of up to 4 letters into a canonical quatrain pattern (AABB, ABAB, ABBA, AAAA).
 */
function normalizeQuatrain(fourLetters: string[]): string {
  if (fourLetters.length < 2) return fourLetters.join("").toUpperCase();
  const map = new Map<string, string>();
  let next = 65; // 'A'
  return fourLetters.map(l => {
    // lowercase letters denote non-rhyming lines
    if (l === l.toLowerCase() && l !== l.toUpperCase()) {
      return "X";
    }
    const upper = l.toUpperCase();
    if (!map.has(upper)) {
      map.set(upper, String.fromCharCode(next++));
    }
    return map.get(upper)!;
  }).join("");
}

/**
 * Detects the rhyme scheme pattern from a sequence of letters (e.g. AABB, ABAB, ABBA, AAAA).
 */
export function detectPattern(letters: string[]): string {
  if (letters.length === 0) return "—";
  if (letters.length <= 4) {
    const norm = normalizeQuatrain(letters);
    if (norm === "AAAA") return "AAAA";
    if (norm === "AABB") return "AABB";
    if (norm === "ABAB") return "ABAB";
    if (norm === "ABBA") return "ABBA";
    if (norm === "AAAB") return "AAAB";
    if (norm.includes("X") && !norm.includes("A")) return "Free";
    return norm;
  }

  // For longer sections (e.g. 8, 12, 16 bars), evaluate quatrains (chunks of 4)
  const quatrainPatterns: string[] = [];
  for (let i = 0; i < letters.length; i += 4) {
    const chunk = letters.slice(i, i + 4);
    if (chunk.length >= 2) {
      quatrainPatterns.push(normalizeQuatrain(chunk));
    }
  }

  const counts: Record<string, number> = {};
  for (const p of quatrainPatterns) {
    counts[p] = (counts[p] || 0) + 1;
  }
  let best = quatrainPatterns[0] || "—";
  let max = 0;
  for (const [p, c] of Object.entries(counts)) {
    if (c > max) {
      max = c;
      best = p;
    }
  }

  if (best === "AAAA") return "AAAA";
  if (best === "AABB") return "AABB";
  if (best === "ABAB") return "ABAB";
  if (best === "ABBA") return "ABBA";
  return best;
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

    // Skip standalone audio cues that are not structural sections
    if (/^\[\s*(?:Pause|Vocal Cut|Pausa|Corte Vocal|Dog Barking|Gunshots|Pistols)\s*\]$/i.test(trimmed)) {
      continue;
    }

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

    if (!currentSection) {
      currentSection = { name: "Intro", lineIndices: [] };
    }

    currentSection.lineIndices.push(globalLineIdx);
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

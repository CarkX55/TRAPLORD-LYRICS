// Syllable Counter
// Counts syllables per line for flow analysis. Handles Spanish + English.

export interface SyllableAnalysis {
  totalSyllables: number;
  lineSyllables: number[];      // syllable count per non-empty line
  avgSyllablesPerLine: number;
  maxSyllables: number;
  minSyllables: number;
  denseLines: number[];         // line indices with > 12 syllables (too dense)
  sparseLines: number[];        // line indices with < 4 syllables (too sparse)
  flowScore: number;            // 0-100, based on consistency
  verdict: "tight" | "balanced" | "loose";
}

/**
 * Counts syllables in a Spanish word.
 * Spanish syllable rules: a syllable = a vowel or vowel group (diphthong/triphthong).
 * Strong vowels: a, e, o. Weak vowels: i, u, ü.
 * A diphthong = strong + weak (or weak + weak) = 1 syllable.
 * A hiatus = strong + strong = 2 syllables.
 */
function countSyllablesSpanish(word: string): number {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 2) return 1;

  const strong = "aeoáéó";
  const weak = "iuüíú";
  let count = 0;
  let i = 0;

  while (i < w.length) {
    const ch = w[i];
    if (strong.includes(ch) || weak.includes(ch)) {
      count++;
      // Check for diphthong: if next char is a weak vowel, consume it
      if (i + 1 < w.length && weak.includes(w[i + 1])) {
        i += 2;
        // Check for triphthong
        if (i < w.length && weak.includes(w[i])) {
          i++;
        }
        continue;
      }
      // Check for hiatus: strong + strong = 2 syllables (don't consume next)
    }
    i++;
  }

  // Accent on last syllable doesn't change count
  // Unaccented word ending in consonant (not n/s) → last syllable is stressed (no count change)
  return Math.max(1, count);
}

/**
 * Counts syllables in an English word using a heuristic.
 * English syllable rules are complex; we use a simplified approach:
 * count vowel groups, subtract silent 'e' at end, handle 'le' ending.
 */
function countSyllablesEnglish(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;

  let count = 0;
  let prevWasVowel = false;

  for (const ch of w) {
    const isVowel = "aeiouy".includes(ch);
    if (isVowel && !prevWasVowel) {
      count++;
    }
    prevWasVowel = isVowel;
  }

  // Silent 'e' at end
  if (w.endsWith("e") && count > 1) count--;
  // 'le' ending (e.g., "table", "little")
  if (w.endsWith("le") && w.length > 2 && !("aeiou".includes(w[w.length - 3]))) count++;
  // 'ed' ending (usually doesn't add a syllable unless preceded by d/t)
  if (w.endsWith("ed") && !w.endsWith("ted") && !w.endsWith("ded")) count--;

  return Math.max(1, count);
}

/**
 * Counts syllables in a word, auto-detecting ES vs EN.
 * Simple heuristic: if word has accents (áéíóúñ) → Spanish; else try both.
 */
function countSyllables(word: string): number {
  const w = word.toLowerCase();
  if (/[áéíóúñü]/.test(w)) {
    return countSyllablesSpanish(w);
  }
  // Default: try English (works reasonably for Spanish too since both are syllable-based)
  return countSyllablesEnglish(w);
}

/**
 * Analyzes syllables across all lines in lyrics.
 */
export function analyzeSyllables(lyrics: string): SyllableAnalysis {
  const lines = lyrics.split("\n");
  const lineSyllables: number[] = [];
  const denseLines: number[] = [];
  const sparseLines: number[] = [];
  let globalIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[.*\]$/.test(trimmed)) continue;
    if (/^Interpr[èe]te?:/i.test(trimmed) || /^Intérprete?:/i.test(trimmed)) continue;
    if (/^[*#]/.test(trimmed)) continue;

    // Strip ad-libs (parenthetical) and tags
    const cleanLine = trimmed.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ");
    const words = cleanLine.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    lineSyllables.push(syllables);

    if (syllables > 12) denseLines.push(globalIdx);
    if (syllables > 0 && syllables < 4) sparseLines.push(globalIdx);
    globalIdx++;
  }

  const totalSyllables = lineSyllables.reduce((a, b) => a + b, 0);
  const avgSyllablesPerLine = lineSyllables.length > 0
    ? Math.round((totalSyllables / lineSyllables.length) * 10) / 10
    : 0;
  const maxSyllables = lineSyllables.length > 0 ? Math.max(...lineSyllables) : 0;
  const minSyllables = lineSyllables.length > 0 ? Math.min(...lineSyllables.filter(s => s > 0)) : 0;

  // Flow score: based on consistency (low variance = tight flow)
  const variance = lineSyllables.length > 0
    ? lineSyllables.reduce((sum, s) => sum + Math.pow(s - avgSyllablesPerLine, 2), 0) / lineSyllables.length
    : 0;
  const stdDev = Math.sqrt(variance);
  // Score: 100 = no variance, 0 = huge variance. Ideal stdDev < 3.
  const flowScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 10)));

  let verdict: "tight" | "balanced" | "loose";
  if (stdDev < 2) verdict = "tight";
  else if (stdDev < 4) verdict = "balanced";
  else verdict = "loose";

  return {
    totalSyllables,
    lineSyllables,
    avgSyllablesPerLine,
    maxSyllables,
    minSyllables,
    denseLines,
    sparseLines,
    flowScore,
    verdict,
  };
}

// Lyrics Quality Score — recalibrado para trap/rap
// Fix: rhyme detection is more generous, lexical diversity is adjusted for trap,
// ad-lib scoring is more forgiving, and spanglish deviation is less harsh.

import type { WordStats } from "./word-stats";
import type { RhymeAnalysis } from "./rhyme-detector";

export interface QualityScore {
  total: number;
  grade: string;
  rhymeDensity: number;
  lexicalDiversity: number;
  adlibRatio: number;
  structureScore: number;
  consistencyScore: number;
  breakdown: { label: string; score: number; weight: number; description: string }[];
}

export function computeQualityScore(
  wordStats: WordStats,
  rhymeAnalysis: RhymeAnalysis,
  nonEmptyLines: number,
  spanglishDeviation: number,
  expectedSections: number,
  actualSections: number,
): QualityScore {
  // 1. Rhyme density — more generous: assume 70% of lines rhyme if detector found any
  // The phonetic detector misses many rhymes, so we boost the score
  const detectorRhymeRatio = nonEmptyLines > 0 ? (rhymeAnalysis.totalRhymes / nonEmptyLines) : 0;
  // If detector found 30%+, assume real rhyme density is much higher
  let rhymeDensity: number;
  if (detectorRhymeRatio >= 0.5) {
    rhymeDensity = Math.min(95, Math.round(detectorRhymeRatio * 100 + 20));
  } else if (detectorRhymeRatio >= 0.2) {
    // Detector found some rhymes — real density is probably 60-80%
    rhymeDensity = Math.min(80, Math.round(detectorRhymeRatio * 100 + 35));
  } else if (nonEmptyLines > 4) {
    // Detector found few rhymes but there are enough lines — assume some rhymes exist
    rhymeDensity = 45;
  } else {
    rhymeDensity = 30;
  }

  // 2. Lexical diversity — adjusted for trap (trap uses repetition intentionally)
  // Instead of raw uniqueRatio, we give credit for having SOME diversity but don't penalize repetition
  const rawDiversity = wordStats.uniqueRatio;
  // Ideal range for trap: 40-70% unique words. Below 30% is too repetitive, above 85% is too scattered
  let lexicalDiversity: number;
  if (rawDiversity >= 40 && rawDiversity <= 75) {
    lexicalDiversity = Math.min(90, rawDiversity + 10); // good range, boost
  } else if (rawDiversity < 40) {
    lexicalDiversity = Math.max(40, rawDiversity + 15); // too repetitive but give credit
  } else if (rawDiversity > 75) {
    lexicalDiversity = Math.min(85, rawDiversity); // too many unique words, cap
  } else {
    lexicalDiversity = rawDiversity;
  }

  // 3. Ad-lib ratio — more forgiving, ideal range is wider (0.2-0.7)
  const adlibPerLine = nonEmptyLines > 0 ? wordStats.adlibCount / nonEmptyLines : 0;
  let adlibRatio: number;
  if (adlibPerLine >= 0.2 && adlibPerLine <= 0.7) {
    // Good range
    adlibRatio = 85;
  } else if (adlibPerLine > 0.7) {
    // Too many ad-libs but still has them
    adlibRatio = 60;
  } else if (adlibPerLine > 0) {
    // Some ad-libs, not many
    adlibRatio = 55;
  } else {
    // No ad-libs at all — penalty but not zero
    adlibRatio = 30;
  }

  // 4. Structure score — more forgiving
  const structureRatio = expectedSections > 0 ? actualSections / expectedSections : 1;
  const structureScore = Math.min(100, Math.round(structureRatio * 100));
  // Boost if structure is at least 80% complete
  const finalStructureScore = structureRatio >= 0.8 ? Math.min(95, structureScore + 10) : structureScore;

  // 5. Consistency — less harsh penalty for spanglish deviation
  // Deviation of 20% should give 80, not 60
  const consistencyScore = Math.max(40, Math.min(100, 100 - spanglishDeviation * 1.5));

  // Weighted composite — adjusted weights for trap
  const breakdown = [
    { label: "Densidad de rima", score: rhymeDensity, weight: 25, description: `${rhymeAnalysis.totalRhymes} rimas detectadas en ${nonEmptyLines} líneas` },
    { label: "Diversidad léxica", score: lexicalDiversity, weight: 20, description: `${wordStats.uniqueWords} palabras únicas de ${wordStats.totalWords}` },
    { label: "Ratio de ad-libs", score: adlibRatio, weight: 15, description: `${wordStats.adlibCount} ad-libs en ${nonEmptyLines} líneas` },
    { label: "Estructura", score: finalStructureScore, weight: 25, description: `${actualSections}/${expectedSections} secciones presentes` },
    { label: "Consistencia de idioma", score: consistencyScore, weight: 15, description: `Desviación: ${spanglishDeviation}%` },
  ];

  const total = Math.round(breakdown.reduce((sum, b) => sum + (b.score * b.weight) / 100, 0));

  let grade: string;
  if (total >= 85) grade = "S";
  else if (total >= 75) grade = "A";
  else if (total >= 65) grade = "B";
  else if (total >= 55) grade = "C";
  else if (total >= 45) grade = "D";
  else grade = "F";

  return {
    total,
    grade,
    rhymeDensity,
    lexicalDiversity,
    adlibRatio,
    structureScore: finalStructureScore,
    consistencyScore,
    breakdown,
  };
}

// Lyrics Quality Score
// Computes a composite 0-100 quality score based on multiple factors.

import type { WordStats } from "./word-stats";
import type { RhymeAnalysis } from "./rhyme-detector";

export interface QualityScore {
  total: number;          // 0-100 composite score
  grade: string;          // S, A, B, C, D, F
  rhymeDensity: number;   // 0-100: % of lines that rhyme
  lexicalDiversity: number; // 0-100: uniqueRatio
  adlibRatio: number;     // 0-100: ad-libs per line ratio (normalized)
  structureScore: number; // 0-100: section completeness
  consistencyScore: number; // 0-100: spanglish deviation penalty
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
  // 1. Rhyme density: % of lines that participate in a rhyme group
  const rhymingLines = rhymeAnalysis.totalRhymes;
  const rhymeDensity = nonEmptyLines > 0 ? Math.min(100, Math.round((rhymingLines / nonEmptyLines) * 100)) : 0;

  // 2. Lexical diversity: uniqueRatio (already 0-100)
  const lexicalDiversity = wordStats.uniqueRatio;

  // 3. Ad-lib ratio: ad-libs per line, normalized (ideal ~0.3-0.5 = 1 ad-lib per 2-3 lines)
  const adlibPerLine = nonEmptyLines > 0 ? wordStats.adlibCount / nonEmptyLines : 0;
  // Score peaks at 0.4 ad-libs/line, falls off on either side
  const adlibRatio = Math.round(Math.min(100, (1 - Math.abs(adlibPerLine - 0.4) * 2) * 100));

  // 4. Structure score: how many expected sections are present
  const structureScore = expectedSections > 0 ? Math.min(100, Math.round((actualSections / expectedSections) * 100)) : 0;

  // 5. Consistency: penalty for spanglish deviation (100 = perfect, 0 = way off)
  const consistencyScore = Math.max(0, 100 - spanglishDeviation * 2);

  // Weighted composite (weights sum to 100)
  const breakdown = [
    { label: "Densidad de rima", score: rhymeDensity, weight: 30, description: `${rhymingLines}/${nonEmptyLines} líneas riman` },
    { label: "Diversidad léxica", score: lexicalDiversity, weight: 25, description: `${wordStats.uniqueWords} palabras únicas de ${wordStats.totalWords}` },
    { label: "Ratio de ad-libs", score: adlibRatio, weight: 15, description: `${wordStats.adlibCount} ad-libs en ${nonEmptyLines} líneas` },
    { label: "Estructura", score: structureScore, weight: 20, description: `${actualSections}/${expectedSections} secciones presentes` },
    { label: "Consistencia de idioma", score: consistencyScore, weight: 10, description: `Desviación: ${spanglishDeviation}%` },
  ];

  const total = Math.round(breakdown.reduce((sum, b) => sum + (b.score * b.weight) / 100, 0));

  let grade: string;
  if (total >= 90) grade = "S";
  else if (total >= 80) grade = "A";
  else if (total >= 70) grade = "B";
  else if (total >= 60) grade = "C";
  else if (total >= 50) grade = "D";
  else grade = "F";

  return {
    total,
    grade,
    rhymeDensity,
    lexicalDiversity,
    adlibRatio,
    structureScore,
    consistencyScore,
    breakdown,
  };
}

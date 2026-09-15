import { parseRawLyricsToAST, stringifyASTToSunoLyrics, type SongDocument, type SongBar } from "./song-document";
import { type LanguageTarget, calculateSyllableLanguageRatio } from "./language-dna";
import type { RepairOperation } from "./repair-engine";

export interface LanguageRepairDecision {
  action: "pass" | "eval_pass" | "eval_patch" | "hard_patch";
  reason: string;
  initialEnglishPercent: number;
  targetEnglishPercent: number;
  deviation: number;
  confidence: number;
  netScore: number;
  targetBarIds: string[];
  repairedLyrics?: string;
}

/**
 * Evaluates language drift against the target interval.
 * Enforces the core architectural principle:
 * repairScore = languageCorrectionGain - lyricalQualityLoss - sceneDamage - flowDamage
 * Only applies surgical patching when net repairScore > 0 or in hard_fail with high confidence.
 */
export function evaluateAndPlanLanguageRepair(
  lyrics: string,
  target: LanguageTarget
): LanguageRepairDecision {
  const doc = parseRawLyricsToAST(lyrics);
  const measurement = calculateSyllableLanguageRatio(lyrics, target);
  const targetPct = Math.round(target.center * 100);
  const actualPct = measurement.englishPercent;
  const deviation = measurement.deviationFromTarget;

  // CASE 1: Inside Soft Band (±5%) -> Zero touches, pass immediately
  if (measurement.bandDecision === "soft_pass") {
    return {
      action: "pass",
      reason: `Dentro de la banda soft de tolerancia (${Math.round(target.softMin * 100)}%–${Math.round(target.softMax * 100)}%). Cero reparaciones necesarias.`,
      initialEnglishPercent: actualPct,
      targetEnglishPercent: targetPct,
      deviation,
      confidence: measurement.confidence,
      netScore: 0,
      targetBarIds: [],
    };
  }

  // Identify non-chorus bars that deviate most from the desired language
  const targetBars: SongBar[] = [];
  const isTargetEnDominant = target.center >= 0.5;

  for (const sec of doc.sections) {
    if (sec.type === "chorus" || sec.name.toLowerCase().includes("chorus") || sec.name.toLowerCase().includes("hook")) {
      continue; // Never touch locked hook toplines
    }
    for (const bar of sec.bars) {
      const barMeas = calculateSyllableLanguageRatio(bar.rawText, target);
      if (isTargetEnDominant && barMeas.englishPercent < 35 && bar.rawText.trim().length > 10) {
        targetBars.push(bar);
      } else if (!isTargetEnDominant && barMeas.spanishPercent < 35 && bar.rawText.trim().length > 10) {
        targetBars.push(bar);
      }
      if (targetBars.length >= 4) break;
    }
    if (targetBars.length >= 4) break;
  }

  // Estimate net repair score
  const languageCorrectionGain = deviation * 0.2;
  const lyricalQualityLoss = 1.5; // Baseline cost of touching written bars
  const sceneDamage = 1.0;
  const flowDamage = 1.0;
  const netScore = Number((languageCorrectionGain - lyricalQualityLoss - sceneDamage - flowDamage).toFixed(2));

  // CASE 2: Low confidence (<0.55) -> Do NOT force destructive repair on heavy slang
  if (measurement.confidence < 0.55) {
    return {
      action: "eval_pass",
      reason: `Desviación de ${deviation}% detectada, pero con alta ambigüedad de slang (confianza ${measurement.confidence}). Se protege la calidad lírica original.`,
      initialEnglishPercent: actualPct,
      targetEnglishPercent: targetPct,
      deviation,
      confidence: measurement.confidence,
      netScore,
      targetBarIds: [],
    };
  }

  // CASE 3: Evaluative Band
  if (measurement.bandDecision === "eval_band") {
    if (netScore <= 0 || targetBars.length === 0) {
      return {
        action: "eval_pass",
        reason: `En banda evaluativa. Beneficio lingüístico (+${languageCorrectionGain.toFixed(1)}) no supera el coste de daño lírico/flow (-3.5). Se preserva la versión de estudio.`,
        initialEnglishPercent: actualPct,
        targetEnglishPercent: targetPct,
        deviation,
        confidence: measurement.confidence,
        netScore,
        targetBarIds: [],
      };
    }
  }

  // CASE 4: Hard Fail (<65% or >89%) or positive net repair in eval band
  return {
    action: measurement.bandDecision === "hard_fail" ? "hard_patch" : "eval_patch",
    reason: `${measurement.bandDecision === "hard_fail" ? "Desviación severa fuera de la banda hard" : "Beneficio neto positivo"} (Desviación: ${deviation}%, confianza: ${measurement.confidence}). Parcheo quirúrgico en ${targetBars.length} compases seleccionados.`,
    initialEnglishPercent: actualPct,
    targetEnglishPercent: targetPct,
    deviation,
    confidence: measurement.confidence,
    netScore,
    targetBarIds: targetBars.map(b => b.id),
  };
}

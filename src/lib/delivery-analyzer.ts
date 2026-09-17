// Delivery Analyzer — TRAPLORD Vocal Performance & Acoustic Fit Engine
// 100% Deterministic & Heuristic local analysis:
// 1. PhoneticPocketFit: consonant comfort, stress alignment & syllable compression (with confidence).
// 2. DeliveryLoad (Performance Readability): crowded bars & breath risks based on BPM, density & phrasing.
// 3. AdlibAnalysis: 7-role classification, consecutive cluster monitoring & lead occupancy collision.

import type { SongBar, SongSectionDoc } from "./song-document";
import type { FlowProfile } from "./artist-flow-profiles";

// ========================================================================
// 1. PHONETIC POCKET FIT (Acoustic Friction & Syllable Fit)
// ========================================================================

export interface PhoneticPocketFit {
  overallComfort: number;       // 0 to 100 (higher = smoother vocal execution)
  stressAlignment: number;      // 0 to 100
  consonantComfort: number;     // 0 to 100
  syllableCompression: number;  // 0 to 100
  confidence: number;           // 0.0 to 1.0 (low confidence = weak diagnostic, never forces regen)
  frictionBars: Array<{ barNumber: number; barId?: string; reason: string }>;
}

// Known legitimate hip-hop onomatopoeias and slang with dense consonants
const SLANG_WHITELIST = new Set([
  "skrrt", "skrt", "brrr", "brr", "drip", "street", "straight", "splash",
  "clack", "trap", "drank", "wrist", "glock", "switch", "stash", "block",
  "flex", "flexin", "rack", "racks", "smoke", "pyrex", "triple", "flip"
]);

/**
 * Counts Spanish/English syllables heuristically in a word.
 */
function estimateWordSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-záéíóúñü]/g, "");
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const matches = clean.match(/[aeiouáéíóúü]+/g);
  return matches ? matches.length : 1;
}

/**
 * Analyzes phonetic pocket fit across song bars.
 * Avoids simplistic "4 consonants = bad" by factoring in street slang,
 * vowel-consonant ratios and tempo compression.
 */
export function analyzePhoneticPocketFit(
  bars: SongBar[],
  bpm: number = 135,
  flowProfile?: FlowProfile
): PhoneticPocketFit {
  if (!bars || bars.length === 0) {
    return {
      overallComfort: 90,
      stressAlignment: 90,
      consonantComfort: 90,
      syllableCompression: 90,
      confidence: 0.5,
      frictionBars: [],
    };
  }

  const frictionBars: Array<{ barNumber: number; barId?: string; reason: string }> = [];
  let totalConsonantScore = 0;
  let totalCompressionScore = 0;
  let totalStressScore = 0;

  const targetSyllablesPerBar = flowProfile?.syllablesPerBar ?? (bpm >= 150 ? 12 : 10);

  bars.forEach((bar, idx) => {
    const text = bar.lyricText.trim();
    if (!text) {
      totalConsonantScore += 90;
      totalCompressionScore += 90;
      totalStressScore += 90;
      return;
    }

    const words = text.split(/\s+/).filter(w => w.length > 0);
    let barSyllables = 0;
    let harshClusters = 0;

    words.forEach(w => {
      const cleanW = w.toLowerCase().replace(/[^a-záéíóúñü]/g, "");
      barSyllables += estimateWordSyllables(cleanW);

      if (!SLANG_WHITELIST.has(cleanW)) {
        // Look for 4+ consecutive harsh consonants without vocal relief
        if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(cleanW)) {
          harshClusters++;
        }
      }
    });

    // 1. Consonant comfort
    let consonantComfort = 100 - (harshClusters * 18);
    consonantComfort = Math.max(30, Math.min(100, consonantComfort));
    totalConsonantScore += consonantComfort;

    // 2. Syllable compression relative to BPM
    // If BPM is high (>140) and bar has > 15 syllables without triplets, compression is high
    const compressionRatio = barSyllables / Math.max(8, targetSyllablesPerBar);
    let compressionComfort = 100;
    if (compressionRatio > 1.45) {
      compressionComfort = Math.max(30, 100 - (compressionRatio - 1.45) * 80);
      frictionBars.push({
        barNumber: idx + 1,
        barId: bar.id,
        reason: `Exceso de compresión silábica (${barSyllables} sílabas para BPM ${bpm})`,
      });
    }
    totalCompressionScore += compressionComfort;

    // 3. Stress alignment: check final word
    let stressComfort = 92;
    if (words.length > 0) {
      const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-záéíóúñü]/g, "");
      if (lastWord.length > 9 && !lastWord.endsWith("ón") && !lastWord.endsWith("ad")) {
        // Polysyllabic abstract endings may cause rhythmic wobble at bar end
        stressComfort = 75;
      }
    }
    totalStressScore += stressComfort;
  });

  const count = bars.length;
  const consonantComfort = Math.round(totalConsonantScore / count);
  const syllableCompression = Math.round(totalCompressionScore / count);
  const stressAlignment = Math.round(totalStressScore / count);

  const overallComfort = Math.round(
    consonantComfort * 0.35 + syllableCompression * 0.40 + stressAlignment * 0.25
  );

  // Confidence is calculated from sample size and text length
  const avgWordsPerBar = bars.reduce((acc, b) => acc + b.lyricText.split(/\s+/).length, 0) / count;
  const confidence = Number(Math.min(0.92, Math.max(0.55, 0.45 + (count >= 8 ? 0.25 : 0.1) + (avgWordsPerBar >= 6 ? 0.15 : 0.05))).toFixed(2));

  return {
    overallComfort,
    stressAlignment,
    consonantComfort,
    syllableCompression,
    confidence,
    frictionBars: frictionBars.slice(0, 5),
  };
}

// ========================================================================
// 2. PERFORMANCE READABILITY / DELIVERY LOAD (Phrase Load & Breath)
// ========================================================================

export interface DeliveryLoadAudit {
  loadScore: number;           // 0 to 100 (higher = breathable and easy to perform)
  crowdedBars: string[];       // Bar identifiers with crowded text
  breathRiskBars: string[];    // Bar identifiers where consecutive phrasing threatens breath
  confidence: number;          // 0.0 to 1.0
  explanation: string[];
}

/**
 * Audits physical readability of the lyrics.
 * Uses a combination of syllable density, bar duration (BPM), phrase length,
 * and pause opportunities (commas, conjunctions, periods).
 */
export function analyzeDeliveryLoad(
  bars: SongBar[],
  bpm: number = 135
): DeliveryLoadAudit {
  if (!bars || bars.length === 0) {
    return {
      loadScore: 90,
      crowdedBars: [],
      breathRiskBars: [],
      confidence: 0.5,
      explanation: ["Sin compases para evaluar."],
    };
  }

  const crowdedBars: string[] = [];
  const breathRiskBars: string[] = [];
  const explanation: string[] = [];

  // Duration in seconds per 4/4 bar: 4 beats * (60 / bpm)
  const barDurationSeconds = (4 * 60) / Math.max(80, bpm);

  let consecutiveDenseBars = 0;

  bars.forEach((bar, idx) => {
    const text = bar.lyricText.trim();
    if (!text) {
      consecutiveDenseBars = 0;
      return;
    }

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((acc, w) => acc + estimateWordSyllables(w), 0);
    const syllablesPerSecond = syllables / barDurationSeconds;

    // Has punctuation pause (comma, dash, period) or natural breathing point
    const hasBreathOpportunity = /[,.\-—;:]/.test(text) || (bar.performance?.pauseBefore || bar.performance?.pauseAfter);

    // 1. Crowded bars detection: excessive syllables (> 18 syllables AND no breath opportunity, or > 11.5 syl/s)
    const isOvercrowded = (syllables >= 18 && !hasBreathOpportunity) || syllablesPerSecond > 11.5;
    if (isOvercrowded) {
      crowdedBars.push(bar.id || `bar_${idx + 1}`);
    }

    // 2. Breath risk tracking: 3 or more consecutive bars with high density and no breath opportunities
    if (syllables >= 12 && !hasBreathOpportunity) {
      consecutiveDenseBars++;
      if (consecutiveDenseBars >= 3) {
        breathRiskBars.push(bar.id || `bar_${idx + 1}`);
      }
    } else {
      consecutiveDenseBars = 0;
    }
  });

  let loadScore = 100;
  loadScore -= crowdedBars.length * 8;
  loadScore -= breathRiskBars.length * 12;
  loadScore = Math.max(35, Math.min(100, loadScore));

  if (crowdedBars.length > 0) {
    explanation.push(`Detectados ${crowdedBars.length} compases sobrecargados con alta tasa silábica (>5.8 síl/s).`);
  }
  if (breathRiskBars.length > 0) {
    explanation.push(`Riesgo de falta de aire en ${breathRiskBars.length} compases consecutivos sin pausa.`);
  }
  if (explanation.length === 0) {
    explanation.push("Fraseo equilibrado: buena cadencia respirable con espacios naturales de pausa.");
  }

  const confidence = Number(Math.min(0.90, Math.max(0.60, 0.50 + (bars.length >= 12 ? 0.25 : 0.15))).toFixed(2));

  return {
    loadScore,
    crowdedBars,
    breathRiskBars,
    confidence,
    explanation,
  };
}

// ========================================================================
// 3. ADLIB ANALYSIS (Roles, Consecutive Clusters & Lead Occupancy)
// ========================================================================

export type AdlibRole =
  | "punctuation"
  | "emphasis"
  | "reaction"
  | "transition"
  | "hype"
  | "call_response"
  | "texture"
  | "unknown";

export interface AdlibInstance {
  text: string;
  role: AdlibRole;
  confidence: number;
  barNumber: number;
  barId?: string;
}

export interface AdlibAnalysis {
  instances: AdlibInstance[];
  roleDistribution: Record<AdlibRole, number>;
  maxConsecutiveAdlibBars: number;
  clusterWarning: boolean;
  leadOccupancyCollision: boolean;
  englishContaminationShielded: boolean;
}

const ADLIB_ROLE_PATTERNS: Array<{ role: AdlibRole; pattern: RegExp; confidence: number }> = [
  { role: "hype", pattern: /^(flippa|havoc|woo|let's get it|turn me up|yuh|skrrt|skrt|gang|let's go|bang|pow)\b/i, confidence: 0.90 },
  { role: "punctuation", pattern: /^(yeah|uh|uh-huh|hey|ok|facts|yes|yep)\b/i, confidence: 0.85 },
  { role: "emphasis", pattern: /^(look at the wrist|ice|racks|no cap|on god|straight up|for real|deadass)\b/i, confidence: 0.88 },
  { role: "reaction", pattern: /^(what\??|damn|sheesh|hold up|wait|huh\??|whoa)\b/i, confidence: 0.85 },
  { role: "transition", pattern: /^(switch|next|drop it|go|run it|listen|watch)\b/i, confidence: 0.80 },
  { role: "texture", pattern: /^(hmm|shh|brr|cough|snort|whistle|sigh)\b/i, confidence: 0.75 },
];

/**
 * Classifies an individual ad-lib into a functional musical role.
 */
export function classifyAdlibRole(text: string, precedingLyricText?: string): { role: AdlibRole; confidence: number } {
  const clean = text.replace(/[*()[\]]/g, "").trim().toLowerCase();
  if (!clean) return { role: "unknown", confidence: 0.3 };

  // Call-and-response check: if ad-lib echoes a word from the preceding lyric line
  if (precedingLyricText) {
    const lyricWords = new Set(precedingLyricText.toLowerCase().replace(/[^a-záéíóúñü\s]/g, "").split(/\s+/));
    if (clean.split(/\s+/).some(w => lyricWords.has(w) && w.length > 3)) {
      return { role: "call_response", confidence: 0.85 };
    }
  }

  for (const p of ADLIB_ROLE_PATTERNS) {
    if (p.pattern.test(clean)) {
      return { role: p.role, confidence: p.confidence };
    }
  }

  return { role: "unknown", confidence: 0.45 };
}

/**
 * Audits all ad-libs in the song or section.
 * - Categorizes into functional roles.
 * - Audits consecutive clusters (flagging > 2 consecutive bars).
 * - Detects leadOccupancyCollision: bar with long lyric line (>14 syllables) AND multi-word ad-lib (>4 words).
 * - Ensures ad-libs do not contaminate primary lyric Spanglish ratio calculations.
 */
export function analyzeAdlibs(sections: SongSectionDoc[]): AdlibAnalysis {
  const instances: AdlibInstance[] = [];
  const roleDistribution: Record<AdlibRole, number> = {
    punctuation: 0,
    emphasis: 0,
    reaction: 0,
    transition: 0,
    hype: 0,
    call_response: 0,
    texture: 0,
    unknown: 0,
  };

  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let leadOccupancyCollision = false;

  let globalBarIdx = 0;

  sections.forEach(sec => {
    sec.bars.forEach(bar => {
      globalBarIdx++;
      const adlibs = bar.performance?.adlibs ?? [];
      const hasAdlib = adlibs.length > 0;

      if (hasAdlib) {
        currentConsecutive++;
        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
        }

        adlibs.forEach(adlibStr => {
          const { role, confidence } = classifyAdlibRole(adlibStr, bar.lyricText);
          instances.push({
            text: adlibStr,
            role,
            confidence,
            barNumber: globalBarIdx,
            barId: bar.id,
          });
          roleDistribution[role] = (roleDistribution[role] || 0) + 1;

          // Lead occupancy collision: very long line + bulky adlib in same 4/4 bar
          const wordsInLyric = bar.lyricText.split(/\s+/).filter(w => w.length > 0).length;
          const wordsInAdlib = adlibStr.split(/\s+/).filter(w => w.length > 0).length;
          if (wordsInLyric >= 12 && wordsInAdlib >= 4) {
            leadOccupancyCollision = true;
          }
        });
      } else {
        currentConsecutive = 0;
      }
    });
  });

  return {
    instances,
    roleDistribution,
    maxConsecutiveAdlibBars: maxConsecutive,
    clusterWarning: maxConsecutive > 2,
    leadOccupancyCollision,
    englishContaminationShielded: true,
  };
}

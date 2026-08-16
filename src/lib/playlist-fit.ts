// Playlist Fit Analyzer
// Checks if the generated song fits popular playlist vibes.

import type { WordStats } from "./word-stats";
import type { RhymeAnalysis } from "./rhyme-detector";
import type { ThemeResult } from "./theme-analyzer";

export interface PlaylistVibe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  matchScore: number;     // 0-100
  reasons: string[];
  targetBpm: [number, number];  // [min, max]
  targetSpanglish: [number, number];
  preferredThemes: string[];
  preferredMoods: string[];
}

export interface PlaylistFitResult {
  playlists: PlaylistVibe[];
  bestFit: PlaylistVibe | null;
}

const PLAYLISTS: Omit<PlaylistVibe, "matchScore" | "reasons">[] = [
  {
    id: "trap_latino",
    name: "Trap Latino Hits",
    emoji: "🌎",
    description: "Trap en español con sabor latino, reggaeton y drill PR",
    targetBpm: [90, 130],
    targetSpanglish: [10, 50],
    preferredThemes: ["violence", "money", "love", "party"],
    preferredMoods: ["agresivo", "fiesta", "calle", "romantico"],
  },
  {
    id: "us_trap",
    name: "US Trap Bangers",
    emoji: "🇺🇸",
    description: "Trap americano puro de Atlanta, rage y drill",
    targetBpm: [130, 180],
    targetSpanglish: [80, 100],
    preferredThemes: ["money", "violence", "drugs", "success"],
    preferredMoods: ["agresivo", "oscuro", "flex", "fiesta"],
  },
  {
    id: "drill_uk",
    name: "UK Drill & Street",
    emoji: "🇬🇧",
    description: "Drill londinense, dark y agresivo",
    targetBpm: [140, 160],
    targetSpanglish: [85, 100],
    preferredThemes: ["violence", "loyalty", "money"],
    preferredMoods: ["agresivo", "oscuro", "calle"],
  },
  {
    id: "melodic_trap",
    name: "Melodic Trap & R&B",
    emoji: "💜",
    description: "Trap melódico, emocional, R&B sad vibes",
    targetBpm: [70, 110],
    targetSpanglish: [50, 100],
    preferredThemes: ["love", "pain", "drugs", "success"],
    preferredMoods: ["melancolico", "romantico", "introspectivo"],
  },
  {
    id: "rage_moshpit",
    name: "Rage & Moshpit",
    emoji: "🔥",
    description: "Rage, moshpit, punk trap energético",
    targetBpm: [160, 180],
    targetSpanglish: [85, 100],
    preferredThemes: ["party", "drugs", "money", "success"],
    preferredMoods: ["fiesta", "agresivo", "flex"],
  },
  {
    id: "spanglish_global",
    name: "Spanglish Global",
    emoji: "🌐",
    description: "Spanglish balanceado, internacional, bailable",
    targetBpm: [100, 140],
    targetSpanglish: [40, 60],
    preferredThemes: ["money", "party", "love", "success"],
    preferredMoods: ["flex", "fiesta", "romantico"],
  },
  {
    id: "trap_espanol",
    name: "Trap Español Real",
    emoji: "🇪🇸",
    description: "Trap español crudo, barrio, drill madrileño",
    targetBpm: [120, 150],
    targetSpanglish: [0, 20],
    preferredThemes: ["violence", "loyalty", "money", "pain"],
    preferredMoods: ["agresivo", "calle", "oscuro", "introspectivo"],
  },
];

/**
 * Analyzes how well the song fits each playlist vibe.
 */
export function analyzePlaylistFit(
  bpm: number,
  spanglishPercent: number,
  moodId: string,
  themeResult: ThemeResult | null,
  wordStats: WordStats | null,
  rhymeAnalysis: RhymeAnalysis | null,
): PlaylistFitResult {
  const playlists = PLAYLISTS.map(playlist => {
    let score = 0;
    const reasons: string[] = [];

    // BPM fit (30 points)
    const [minBpm, maxBpm] = playlist.targetBpm;
    if (bpm >= minBpm && bpm <= maxBpm) {
      score += 30;
      reasons.push(`BPM ${bpm} encaja en rango ${minBpm}-${maxBpm}`);
    } else {
      const distance = bpm < minBpm ? minBpm - bpm : bpm - maxBpm;
      const partial = Math.max(0, 30 - distance * 2);
      score += partial;
      if (partial > 15) reasons.push(`BPM ${bpm} cerca del rango ${minBpm}-${maxBpm}`);
    }

    // Spanglish fit (25 points)
    const [minSp, maxSp] = playlist.targetSpanglish;
    if (spanglishPercent >= minSp && spanglishPercent <= maxSp) {
      score += 25;
      reasons.push(`Spanglish ${spanglishPercent}% EN encaja en rango ${minSp}-${maxSp}%`);
    } else {
      const distance = spanglishPercent < minSp ? minSp - spanglishPercent : spanglishPercent - maxSp;
      const partial = Math.max(0, 25 - distance);
      score += partial;
    }

    // Mood fit (20 points)
    if (playlist.preferredMoods.includes(moodId)) {
      score += 20;
      reasons.push(`Mood ${moodId} es preferido para esta playlist`);
    }

    // Theme fit (15 points)
    if (themeResult && themeResult.dominantTheme) {
      if (playlist.preferredThemes.includes(themeResult.dominantTheme)) {
        score += 15;
        reasons.push(`Tema dominante "${themeResult.dominantLabel}" encaja`);
      } else {
        // Check if any preferred theme is in the top themes
        const hasPreferred = themeResult.themes
          .slice(0, 3)
          .some(t => playlist.preferredThemes.includes(t.id));
        if (hasPreferred) {
          score += 8;
          reasons.push("Algunos temas coinciden");
        }
      }
    }

    // Bonus: rhyme density + ad-lib ratio (10 points)
    if (rhymeAnalysis && wordStats) {
      const rhymeRatio = rhymeAnalysis.totalRhymes / Math.max(wordStats.nonEmptyLines, 1);
      if (rhymeRatio > 0.4) {
        score += 5;
        reasons.push("Buena densidad de rima");
      }
      if (wordStats.adlibCount > 3) {
        score += 5;
        reasons.push("Ad-libs suficientes");
      }
    }

    score = Math.min(100, Math.round(score));

    return {
      ...playlist,
      matchScore: score,
      reasons: reasons.slice(0, 4),
    };
  });

  playlists.sort((a, b) => b.matchScore - a.matchScore);

  return {
    playlists,
    bestFit: playlists[0] ?? null,
  };
}

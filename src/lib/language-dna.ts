import { analyzeSyllables } from "./syllable-counter";

export interface LanguageTarget {
  center: number;      // e.g. 0.77 (77% EN)
  softMin: number;     // e.g. 0.72
  softMax: number;     // e.g. 0.82
  hardMin: number;     // e.g. 0.65
  hardMax: number;     // e.g. 0.89
}

export function buildLanguageTarget(spanglishPercent: number): LanguageTarget {
  const center = Math.max(0, Math.min(100, spanglishPercent)) / 100;
  return {
    center,
    softMin: Math.max(0, center - 0.05),
    softMax: Math.min(1, center + 0.05),
    hardMin: Math.max(0, center - 0.12),
    hardMax: Math.min(1, center + 0.12),
  };
}

import {
  type SpanishFlavor,
  type SpanishFlavorProfile,
  type SpeakerDialectProfile,
  type LanguageAllocationPlan,
  resolveSpanishFlavor,
  resolveSpeakerDialectProfile,
  buildDialectPromptDirectives,
  buildLanguageAllocationPlan,
} from "./dialect-engine";

export interface LanguageDNA {
  primaryLanguage: "en" | "es";
  englishRatio: number;
  spanishRatio: number;
  target: LanguageTarget;
  switchingFrequency: "low" | "medium" | "high" | "dynamic";
  switchPosition: "bar_start" | "bar_end" | "mid_bar" | "variable";
  switchDensity: number; // 0.0 to 1.0
  spanishFunction: "punchline" | "slang" | "emphasis" | "emotion" | "adlib" | "variable";
  spanishFlavor?: SpanishFlavor;
  leadDialectProfile?: SpeakerDialectProfile;
  featureDialectProfile?: SpeakerDialectProfile | null;
  flavorProfile?: SpanishFlavorProfile;
  allocationPlan?: LanguageAllocationPlan;
  instructionBlock: string;
}

/**
 * Constructs continuous Language DNA (6th Layer of Musical DNA)
 * Uses smooth sigmoidal/linear curves without abrupt jumps at 35% or 65%.
 * Enriched with Speaker Dialect Engine & Regional Spanish Flavor realization.
 */
export function buildLanguageDNA(
  spanglishPercent: number,
  artistId: string,
  featureId?: string,
  spanishFlavor?: SpanishFlavor,
  sections?: Array<{ id: string; name: string; type: string; voiceArtistId?: string }>
): LanguageDNA {
  const target = buildLanguageTarget(spanglishPercent);
  const ratio = target.center;
  const isEnDominant = ratio >= 0.5;

  // Resolve Dialect & Regional Flavor Profiles with cascading precedence
  const leadDialectProfile = resolveSpeakerDialectProfile(artistId);
  const featureDialectProfile = featureId ? resolveSpeakerDialectProfile(featureId) : null;
  const flavorProfile = resolveSpanishFlavor(spanishFlavor, leadDialectProfile, featureDialectProfile);

  // Deterministic Language Allocation Plan across sections
  const allocationPlan = buildLanguageAllocationPlan(ratio, leadDialectProfile, featureDialectProfile, sections);

  // Smooth continuous switch density: highest around 50%, lowest at 0% and 100%
  const switchDensity = Number((Math.sin(ratio * Math.PI) * 0.85).toFixed(2));

  let switchingFrequency: LanguageDNA["switchingFrequency"] = "medium";
  if (switchDensity < 0.25) switchingFrequency = "low";
  else if (switchDensity > 0.65) switchingFrequency = "high";
  else switchingFrequency = "dynamic";

  // Switch position continuous curve
  let switchPosition: LanguageDNA["switchPosition"] = "variable";
  if (ratio >= 0.70) switchPosition = "bar_end";
  else if (ratio <= 0.30) switchPosition = "bar_end";
  else switchPosition = "variable";

  // Spanish function role
  let spanishFunction: LanguageDNA["spanishFunction"] = "variable";
  if (ratio >= 0.75) spanishFunction = "punchline";
  else if (ratio >= 0.60) spanishFunction = "emphasis";
  else if (ratio <= 0.30) spanishFunction = "slang";
  else spanishFunction = "variable";

  // Build dialect-aware prompt instruction
  const dialectDirectives = buildDialectPromptDirectives(
    leadDialectProfile,
    featureDialectProfile,
    flavorProfile,
    ratio,
    allocationPlan
  );

  let flowGuideline = "";
  if (ratio >= 0.70) {
    flowGuideline = `El cuerpo melódico y las barras métricas se escriben predominantemente en inglés con la identidad del intérprete. El español entra como remate de barra o punchline final bajo el registro ${flavorProfile.label}, sin partir cada compás rígidamente por la mitad.`;
  } else if (ratio <= 0.30) {
    flowGuideline = `El peso narrativo y barras métricas se componen en español bajo el registro ${flavorProfile.label}. El inglés entra como jerga urbana y ad-libs orgánicos de contratiempo sin forzar cambios artificiales en cada línea.`;
  } else {
    flowGuideline = `Code-switching orgánico y musical derivado del discurso callejero real: trabaja bloques fluidos, barras completas en un idioma seguidas de barras en otro, o español con préstamos nativos de hip-hop. Queda desaconsejada la alternancia matemática rígida compás a compás.`;
  }

  const instruction = `${dialectDirectives}\n\n### 5. DINÁMICA DE FLUJO LINGÜÍSTICO\n${flowGuideline}`;

  return {
    primaryLanguage: isEnDominant ? "en" : "es",
    englishRatio: ratio,
    spanishRatio: 1 - ratio,
    target,
    switchingFrequency,
    switchPosition,
    switchDensity,
    spanishFunction,
    spanishFlavor: flavorProfile.flavor,
    leadDialectProfile,
    featureDialectProfile,
    flavorProfile,
    allocationPlan,
    instructionBlock: instruction,
  };
}

export interface LanguageTokenAnalysis {
  token: string;
  syllables: number;
  classification: "en" | "es" | "ambiguous";
  confidence: number;
}

export interface LanguageRatioResult {
  englishSyllables: number;
  spanishSyllables: number;
  ambiguousSyllables: number;
  totalSyllables: number;
  englishPercent: number;
  spanishPercent: number;
  ambiguousPercent: number;
  deviationFromTarget: number;
  confidence: number;
  bandDecision: "soft_pass" | "eval_band" | "hard_fail";
  tokenBreakdownSample: LanguageTokenAnalysis[];
  // Organic Code-Switching & Mechanicity metrics
  switchDensity: number;            // Total language switches / bars count
  switchPositionVariance: number;   // Variance of switch positions
  switchEntropy: number;            // Entropy of transitions
  mechanicityScore: number;         // 0.0 (discurso natural) a 1.0 (algoritmo rígido 50/50)
  adlibEnglishPercent?: number;     // Secondary adlib language tracking
  adlibSpanishPercent?: number;
}

// Curated high-frequency bilingual Trap & Slang dictionaries
const SPANISH_MARKERS = new Set([
  "el", "la", "los", "las", "un", "una", "de", "del", "en", "por", "para", "con", "sin", "sobre",
  "que", "qué", "como", "cómo", "cuando", "donde", "quien", "pero", "porque", "si", "no", "yo", "tu",
  "tú", "él", "ella", "nosotros", "ellos", "mi", "mis", "tu", "tus", "su", "sus", "este", "esta",
  "veo", "ando", "tengo", "quiero", "puedo", "hago", "fumo", "prendo", "compro", "meto", "salgo",
  "muertos", "hermanos", "familia", "cuenta", "calle", "grasa", "feria", "dinero", "coche", "mesa",
  "chulita", "puta", "putas", "pablo", "plata", "trono", "cielo", "noche", "nota", "oro", "carne"
]);

const ENGLISH_MARKERS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "by", "for", "with", "without", "about", "to", "from",
  "that", "what", "when", "where", "who", "why", "how", "but", "because", "if", "and", "or", "i", "you",
  "he", "she", "we", "they", "my", "your", "his", "her", "our", "their", "this", "these", "is", "are",
  "was", "were", "been", "have", "has", "had", "do", "does", "did", "can", "could", "will", "would",
  "smoke", "see", "clear", "future", "green", "checks", "never", "always", "facts", "wallet", "charts",
  "penthouse", "candles", "burn", "dark", "phantom", "switching", "lanes", "packing", "weed", "bag",
  "suck", "leave", "blood", "talk", "cheap", "verse", "costs", "mine", "robe", "chains", "steak",
  "suite", "staking", "paying", "condo", "dirty", "clean", "ruby", "tongue", "sheets", "bounce",
  "seats", "candles", "rising", "portfolio", "screaming", "touch", "paper", "demons", "fallen", "roof"
]);

const AMBIGUOUS_TRAP_SLANG = new Set([
  "money", "shorty", "shawty", "mami", "baby", "drip", "flex", "plug", "trap", "flow",
  "ice", "gang", "hood", "bitch", "nigga", "niggas", "bro", "draco", "glock", "sauce",
  "whip", "lean", "perk", "clout", "gucci", "prada", "maybach", "r.i.p", "rip", "truuu",
  "cardano", "ada", "crypto", "beat", "drop", "cut", "bars", "zoom", "cloud", "hit"
]);

/**
 * Calculates the Syllable-Weighted Language Ratio with confidence & organic mechanicity tracking.
 * Separates primary lyricText from secondary ad-libs to avoid ratio skew.
 */
export function calculateSyllableLanguageRatio(lyrics: string, target: LanguageTarget): LanguageRatioResult {
  const lines = lyrics.split("\n").filter(l => l.trim() && !l.trim().startsWith("["));
  let enSyllables = 0;
  let esSyllables = 0;
  let ambSyllables = 0;
  let adlibEnSyllables = 0;
  let adlibEsSyllables = 0;
  const tokenSamples: LanguageTokenAnalysis[] = [];

  const barClassifications: Array<"en" | "es" | "mixed" | "neutral"> = [];
  let mixedBarsCount = 0;

  for (const line of lines) {
    // Separate secondary adlibs from primary sung lyric
    const adlibMatches = line.match(/\(([^)]+)\)/g) || [];
    const lyricOnly = line
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/\(([^)]+)\)/g, " ")
      .trim();

    let barEnSyllables = 0;
    let barEsSyllables = 0;

    // Process primary lyric words
    const words = lyricOnly
      .replace(/[()[\]*.,!?:;"'~]/g, " ")
      .split(/\s+/)
      .map(w => w.toLowerCase().trim())
      .filter(w => w.length > 0);

    for (const word of words) {
      const sylInfo = analyzeSyllables(word);
      const sylCount = Math.max(1, sylInfo.totalSyllables);

      let classification: "en" | "es" | "ambiguous" = "ambiguous";
      let tokenConfidence = 0.5;

      if (AMBIGUOUS_TRAP_SLANG.has(word)) {
        classification = "ambiguous";
        tokenConfidence = 0.5;
        ambSyllables += sylCount;
      } else if (SPANISH_MARKERS.has(word) || /([áéíóúñ]|mente$|ando$|iendo$|amos$|ieron$)/i.test(word)) {
        classification = "es";
        tokenConfidence = 0.95;
        esSyllables += sylCount;
        barEsSyllables += sylCount;
      } else if (ENGLISH_MARKERS.has(word) || /(ing$|tion$|ed$|ness$|ight$)/i.test(word)) {
        classification = "en";
        tokenConfidence = 0.95;
        enSyllables += sylCount;
        barEnSyllables += sylCount;
      } else {
        if (/[bcdfghjklmnpqrstvwxyz]{3,}/i.test(word)) {
          classification = "en";
          tokenConfidence = 0.65;
          enSyllables += sylCount;
          barEnSyllables += sylCount;
        } else {
          classification = "ambiguous";
          tokenConfidence = 0.4;
          ambSyllables += sylCount;
        }
      }

      if (tokenSamples.length < 30) {
        tokenSamples.push({ token: word, syllables: sylCount, classification, confidence: tokenConfidence });
      }
    }

    // Process secondary adlibs
    for (const adMatch of adlibMatches) {
      const adWords = adMatch.replace(/[()]/g, "").split(/\s+/).filter(Boolean);
      for (const aw of adWords) {
        const sylCount = Math.max(1, analyzeSyllables(aw).totalSyllables);
        const low = aw.toLowerCase();
        if (ENGLISH_MARKERS.has(low) || /(yeah|facts|hold|up|look|wrist|let's|get|it|money)/i.test(low)) {
          adlibEnSyllables += sylCount;
        } else if (SPANISH_MARKERS.has(low) || /(dime|claro|nunca|siempre|pablo|oro)/i.test(low)) {
          adlibEsSyllables += sylCount;
        }
      }
    }

    // Classify bar nature
    if (barEnSyllables > 0 && barEsSyllables > 0) {
      barClassifications.push("mixed");
      mixedBarsCount++;
    } else if (barEnSyllables > barEsSyllables) {
      barClassifications.push("en");
    } else if (barEsSyllables > barEnSyllables) {
      barClassifications.push("es");
    } else {
      barClassifications.push("neutral");
    }
  }

  const totalSyllables = enSyllables + esSyllables + ambSyllables || 1;
  const classifiedSyllables = enSyllables + esSyllables || 1;
  
  const rawEnPercent = Math.round((enSyllables / classifiedSyllables) * 100);
  const rawEsPercent = Math.round((esSyllables / classifiedSyllables) * 100);
  const ambPercent = Math.round((ambSyllables / totalSyllables) * 100);

  const deviation = Math.abs(rawEnPercent - Math.round(target.center * 100));
  const confidence = Math.max(0.3, Number((1 - (ambPercent / 100) * 0.7).toFixed(2)));

  // Compute code-switching mechanicity and entropy
  const totalBars = Math.max(1, barClassifications.length);
  let switchesCount = 0;
  let rigidAlternations = 0; // count of A -> B -> A -> B patterns

  for (let i = 1; i < barClassifications.length; i++) {
    const prev = barClassifications[i - 1];
    const curr = barClassifications[i];
    if (prev !== curr && prev !== "neutral" && curr !== "neutral") {
      switchesCount++;
    }
    if (i >= 2) {
      const prev2 = barClassifications[i - 2];
      if (prev2 === curr && prev !== curr && curr !== "neutral") {
        rigidAlternations++;
      }
    }
  }

  const switchDensity = Number((switchesCount / totalBars).toFixed(2));
  const midBarRatio = mixedBarsCount / totalBars;
  
  // Mechanicity: high if either almost every line is cut mid-bar (>65%) OR alternating strictly every bar
  let mechanicity = 0.15;
  if (midBarRatio > 0.65) {
    mechanicity += 0.55 * ((midBarRatio - 0.65) / 0.35);
  }
  if (rigidAlternations > totalBars * 0.40) {
    mechanicity += 0.30;
  }
  const mechanicityScore = Number(Math.min(1.0, Math.max(0.0, mechanicity)).toFixed(2));

  // Switch entropy: higher is healthier / less robotic
  const switchEntropy = Number((1.0 - mechanicityScore * 0.7).toFixed(2));
  const switchPositionVariance = Number((1.0 - midBarRatio * 0.5).toFixed(2));

  // Adlib language breakdown
  const totalAdlibSyllables = adlibEnSyllables + adlibEsSyllables || 1;
  const adlibEnglishPercent = Math.round((adlibEnSyllables / totalAdlibSyllables) * 100);
  const adlibSpanishPercent = Math.round((adlibEsSyllables / totalAdlibSyllables) * 100);

  // Band decision
  let bandDecision: LanguageRatioResult["bandDecision"] = "soft_pass";
  const enRatio = rawEnPercent / 100;
  if (enRatio >= target.softMin && enRatio <= target.softMax) {
    bandDecision = "soft_pass";
  } else if (enRatio < target.hardMin || enRatio > target.hardMax) {
    bandDecision = "hard_fail";
  } else {
    bandDecision = "eval_band";
  }

  return {
    englishSyllables: enSyllables,
    spanishSyllables: esSyllables,
    ambiguousSyllables: ambSyllables,
    totalSyllables,
    englishPercent: rawEnPercent,
    spanishPercent: rawEsPercent,
    ambiguousPercent: ambPercent,
    deviationFromTarget: deviation,
    confidence,
    bandDecision,
    tokenBreakdownSample: tokenSamples,
    switchDensity,
    switchPositionVariance,
    switchEntropy,
    mechanicityScore,
    adlibEnglishPercent,
    adlibSpanishPercent,
  };
}

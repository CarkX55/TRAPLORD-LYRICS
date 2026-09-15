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

export interface LanguageDNA {
  primaryLanguage: "en" | "es";
  englishRatio: number;
  spanishRatio: number;
  target: LanguageTarget;
  switchingFrequency: "low" | "medium" | "high" | "dynamic";
  switchPosition: "bar_start" | "bar_end" | "mid_bar" | "variable";
  switchDensity: number; // 0.0 to 1.0
  spanishFunction: "punchline" | "slang" | "emphasis" | "emotion" | "adlib" | "variable";
  instructionBlock: string;
}

/**
 * Constructs continuous Language DNA (6th Layer of Musical DNA)
 * Uses smooth sigmoidal/linear curves without abrupt jumps at 35% or 65%.
 */
export function buildLanguageDNA(spanglishPercent: number, artistId: string, featureId?: string): LanguageDNA {
  const target = buildLanguageTarget(spanglishPercent);
  const ratio = target.center;
  const isEnDominant = ratio >= 0.5;

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

  // Continuous prompt instruction
  let instruction = "";
  if (ratio >= 0.70) {
    instruction = `LENGUAJE CONTINUO: Dominio anglosajón prioritario (~${Math.round(ratio * 100)}% EN). El cuerpo melódico y las barras métricas se escriben predominantemente en inglés callejero (Atlanta/US Trap). El español entra de forma quirúrgica (${Math.round((1 - ratio) * 100)}% ES) como remate de barra, punchline final o frase de peso callejero. Queda PROHIBIDO redactar estrofas enteras en español.`;
  } else if (ratio <= 0.30) {
    instruction = `LENGUAJE CONTINUO: Dominio español prioritario (~${Math.round((1 - ratio) * 100)}% ES). El peso narrativo, rimas y barras métricas se componen en español callejero/latino. El inglés (~${Math.round(ratio * 100)}% EN) actúa como inserción de jerga, marcas, flex y ad-libs de contratiempo.`;
  } else {
    instruction = `LENGUAJE CONTINUO: Code-switching equilibrado (~${Math.round(ratio * 100)}% EN / ~${Math.round((1 - ratio) * 100)}% ES). Alternancia fluida y bilingüe compás a compás con naturalidad caribeña/urbana, evitando patrones mecánicos.`;
  }

  return {
    primaryLanguage: isEnDominant ? "en" : "es",
    englishRatio: ratio,
    spanishRatio: 1 - ratio,
    target,
    switchingFrequency,
    switchPosition,
    switchDensity,
    spanishFunction,
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
 * Calculates the Syllable-Weighted Language Ratio with confidence & ambiguity tracking.
 */
export function calculateSyllableLanguageRatio(lyrics: string, target: LanguageTarget): LanguageRatioResult {
  const lines = lyrics.split("\n").filter(l => l.trim() && !l.trim().startsWith("["));
  let enSyllables = 0;
  let esSyllables = 0;
  let ambSyllables = 0;
  const tokenSamples: LanguageTokenAnalysis[] = [];

  for (const line of lines) {
    const words = line
      .replace(/[()[\]*.,!?:;"'~]/g, " ")
      .split(/\s+/)
      .map(w => w.toLowerCase().trim())
      .filter(w => w.length > 0);

    for (const word of words) {
      // Estimate syllable count using existing syllable counter
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
      } else if (ENGLISH_MARKERS.has(word) || /(ing$|tion$|ed$|ness$|ight$)/i.test(word)) {
        classification = "en";
        tokenConfidence = 0.95;
        enSyllables += sylCount;
      } else {
        // Fallback: Latin phonetics bias vs Anglo consonants
        if (/[bcdfghjklmnpqrstvwxyz]{3,}/i.test(word)) {
          classification = "en";
          tokenConfidence = 0.65;
          enSyllables += sylCount;
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
  }

  const totalSyllables = enSyllables + esSyllables + ambSyllables || 1;
  const classifiedSyllables = enSyllables + esSyllables || 1;
  
  // Normalized ratios: ambiguous syllables split according to target lean
  const rawEnPercent = Math.round((enSyllables / classifiedSyllables) * 100);
  const rawEsPercent = Math.round((esSyllables / classifiedSyllables) * 100);
  const ambPercent = Math.round((ambSyllables / totalSyllables) * 100);

  const deviation = Math.abs(rawEnPercent - Math.round(target.center * 100));
  const confidence = Math.max(0.3, Number((1 - (ambPercent / 100) * 0.7).toFixed(2)));

  // Determine band decision
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
  };
}

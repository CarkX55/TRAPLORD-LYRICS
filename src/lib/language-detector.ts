// Language Detector for Spanglish Ratio Verification
// Counts Spanish vs English words in generated lyrics using dictionary-based detection.

// Common Spanish stopwords and function words (high signal)
const SPANISH_WORDS = new Set([
  // articles
  "el", "la", "los", "las", "un", "una", "unos", "unas", "lo", "al", "del",
  // pronouns
  "yo", "tu", "el", "ella", "nosotros", "nosotras", "vosotros", "vosotras", "ellos", "ellas",
  "me", "te", "se", "nos", "os", "le", "les", "su", "sus", "mi", "mis", "tu", "tus",
  "mio", "mia", "mios", "mias", "tuyo", "tuya", "suyo", "suya",
  "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "aquel", "aquella",
  "esto", "eso", "aquello", "aqui", "alli", "alla", "ahi",
  // verbs (high frequency)
  "es", "son", "era", "fueron", "ser", "estar", "estoy", "estas", "esta", "estan",
  "estaba", "estaban", "estare", "estaran", "estaria", "estarian",
  "tener", "tengo", "tienes", "tiene", "tienen", "tenia", "tenian", "tendré", "tendran",
  "haber", "he", "has", "ha", "han", "hube", "hubo", "habia", "habian", "habre", "habran",
  "hacer", "hago", "haces", "hace", "hacen", "hacia", "hacian", "hare", "haran",
  "ir", "voy", "vas", "va", "van", "iba", "iban", "ire", "iran",
  "decir", "digo", "dices", "dice", "dicen", "decia", "decian", "dire", "diran",
  "ver", "veo", "ves", "ve", "ven", "veia", "veian", "vere", "veran",
  "dar", "doy", "das", "da", "dan", "daba", "daban", "dare", "daran",
  "saber", "se", "sabes", "sabe", "saben", "sabia", "sabian",
  "querer", "quiero", "quieres", "quiere", "quieren", "queria", "querian",
  "poder", "puedo", "puedes", "puede", "pueden", "podia", "podian",
  "deber", "debo", "debes", "debe", "deben",
  "vengo", "vienes", "viene", "vienen", "venir",
  "salgo", "sales", "sale", "salen", "salir",
  "digo", "dices", "dice", "dicen",
  "fui", "fue", "fuimos", "fueron",
  "soy", "eres", "somos", "sois",
  "estoy", "estas", "esta", "estamos", "estais", "estan",
  "tengo", "tienes", "tiene", "tenemos", "teneis", "tienen",
  // prepositions & conjunctions
  "de", "en", "con", "por", "para", "sin", "sobre", "bajo", "entre", "hasta", "desde",
  "y", "o", "pero", "porque", "aunque", "si", "no", "ni", "que", "como", "cuando",
  "donde", "quien", "cual", "cuyo", "mientras", "antes", "despues", "luego", "pues",
  "muy", "mucho", "mucha", "muchos", "muchas", "poco", "poca", "pocos", "pocas",
  "todo", "toda", "todos", "todas", "nada", "algo", "alguien", "nadie",
  "tambien", "tampoco", "siempre", "nunca", "jamás", "ya", "aun", "todavia",
  "mas", "menos", "tanto", "tan", "casi", "solo", "sola", "bien", "mal",
  "aqui", "alli", "alla", "cerca", "lejos", "dentro", "fuera", "arriba", "abajo",
  // common nouns/adjectives
  "hombre", "mujer", "nino", "nina", "chico", "chica", "tipo", "gente", "mundo",
  "vida", "muerte", "calle", "barrio", "casa", "dinero", "tiempo", "noche", "dia",
  "amigo", "amiga", "hermano", "hermana", "padre", "madre", "hijo", "hija",
  "perro", "gato", "coche", "moto", "arma", "pistola", "sangre", "fuego",
  "grande", "pequeno", "bueno", "malo", "nuevo", "viejo", "bonito", "feo",
  "blanco", "negro", "rojo", "azul", "verde", "amarillo",
  "primero", "ultimo", "mucho", "poco", "todo", "nada",
  "verdad", "mentira", "amor", "odio", "miedo", "rabia", "paz", "guerra",
  // interrogatives
  "que", "cual", "cuales", "quien", "quienes", "como", "cuando", "donde", "porque",
  // contractions & slang
  "pa", "pa'l", "pal", "na", "nah", "tá", "toy", "ta", "ven", "memo",
]);

// Common English stopwords and function words (high signal)
const ENGLISH_WORDS = new Set([
  // articles
  "the", "a", "an",
  // pronouns
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs",
  "this", "that", "these", "those", "here", "there",
  // verbs (high frequency)
  "is", "are", "was", "were", "be", "been", "being", "am",
  "have", "has", "had", "having",
  "do", "does", "did", "doing", "done",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "get", "got", "getting", "go", "going", "went", "gone",
  "make", "made", "making", "take", "took", "taken", "taking",
  "see", "saw", "seen", "seeing", "know", "knew", "known", "knowing",
  "want", "wanted", "wanting", "need", "needed", "needing",
  "feel", "felt", "feeling", "think", "thought", "thinking",
  "say", "said", "saying", "tell", "told", "telling",
  "come", "came", "coming", "give", "gave", "given", "giving",
  "look", "looked", "looking", "find", "found", "finding",
  "put", "putting", "let", "letting",
  // prepositions & conjunctions
  "of", "in", "on", "at", "to", "for", "with", "by", "from", "about", "into", "onto",
  "over", "under", "between", "through", "during", "before", "after", "above", "below",
  "up", "down", "out", "off", "away", "back",
  "and", "or", "but", "because", "if", "when", "while", "although", "though", "unless",
  "so", "than", "as", "like",
  "not", "no", "nor", "neither", "either", "both",
  "very", "much", "more", "most", "less", "least", "enough", "too",
  "all", "some", "any", "none", "each", "every", "few", "many", "several",
  "also", "always", "never", "ever", "often", "sometimes", "usually", "now", "then",
  "just", "only", "even", "still", "yet", "already", "almost",
  // common nouns/adjectives
  "man", "woman", "boy", "girl", "guy", "people", "world", "life", "death",
  "street", "hood", "block", "house", "money", "cash", "time", "night", "day",
  "friend", "brother", "sister", "father", "mother", "son", "daughter",
  "dog", "cat", "car", "gun", "blood", "fire", "water",
  "big", "small", "good", "bad", "new", "old", "young", "real", "fake",
  "white", "black", "red", "blue", "green", "yellow",
  "first", "last", "true", "false", "love", "hate", "fear", "war", "peace",
  // slang / trap vocabulary (English)
  "money", "cash", "guap", "bands", "racks", "stacks", "hunnit", "thousand", "milli",
  "lean", "codeine", "syrup", "cup", "mud", "drank", "purple",
  "gun", "glock", "choppa", "stick", "iron", "fifteen", "draco", "rifle",
  "whip", "ride", "benz", "bentley", "rolls", "lambo", "ferrari",
  "ice", "diamonds", "chain", "watch", "ring", "grill", "gold", "platinum",
  "flex", "drip", "swag", "fly", "fresh", "clean",
  "bro", "homie", "dawg", "nigga", "bruh", "fam", "gang", "crew", "squad",
  "bitch", "hoe", "shawty", "shorty", "lil",
  "trap", "hustle", "grind", "flip", "serve", "cop", "buy", "sell",
  "smoke", "drink", "pop", "snort", "high", "faded", "wasted", "lit",
  "yuh", "yeah", "ayy", "skrrt", "brrr", "slatt", "woo", "gang", "rah",
]);

// Words that exist in both languages (ambiguous) - low signal, skip
const AMBIGUOUS_WORDS = new Set([
  "no", "si", "tu", "el", "la", "los", "las", "un", "una", "de", "en", "con",
  "sol", "mi", "ti", "gas", "radio", "bar", "cruz", "final", "real", "natural",
  "angel", "doctor", "color", "horror", "tropical", "central", "general",
]);

// Brand names / proper nouns that should be excluded from language counting
const BRAND_NAMES = new Set([
  "glock", "ferrari", "lamborghini", "lambo", "bentley", "rolls", "royce",
  "rolex", "patek", "ap", "cartier", "bustin", "burberry", "gucci", "prada",
  "louis", "vuitton", "dior", "balenciaga", "off", "white", "nike", "adidas",
  "yamaha", "mercedes", "benz", "bmw", "audi", "porsche", "bugatti",
]);

export interface LanguageAnalysis {
  totalWords: number;
  spanishWords: number;
  englishWords: number;
  ambiguousWords: number;
  spanishPercent: number;
  englishPercent: number;
  targetEnglishPercent: number;
  deviation: number; // absolute difference between actual and target english %
  status: "perfect" | "close" | "off";
  sampleSpanish: string[];
  sampleEnglish: string[];
}

/**
 * Analyzes the language ratio of a lyrics text.
 * @param text The lyrics to analyze
 * @param targetEnglishPercent The target English percentage (0-100) from the slider
 */
export function analyzeLanguageRatio(text: string, targetEnglishPercent: number): LanguageAnalysis {
  // Normalize: remove section tags [Verse 1], ad-libs in parens, asterisks, markdown
  const cleaned = text
    .replace(/\[[^\]]*\]/g, " ")   // remove [Section tags]
    .replace(/\([^)]*\)/g, " ")    // remove (ad-libs) - they're often universal
    .replace(/[*#>_~`]/g, " ")      // remove markdown
    .replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ']/g, " ") // keep letters + accents
    .toLowerCase();

  const words = cleaned.split(/\s+/).filter(w => w.length > 1);

  let spanishCount = 0;
  let englishCount = 0;
  let ambiguousCount = 0;
  const sampleSpanish: string[] = [];
  const sampleEnglish: string[] = [];

  for (const word of words) {
    // Skip pure numbers
    if (/^\d+$/.test(word)) continue;
    // Skip brand names
    if (BRAND_NAMES.has(word)) continue;

    const isSpanish = SPANISH_WORDS.has(word);
    const isEnglish = ENGLISH_WORDS.has(word);

    // Words with Spanish accents are definitely Spanish
    const hasAccent = /[áéíóúñü]/.test(word);

    if (hasAccent) {
      spanishCount++;
      if (sampleSpanish.length < 8 && !SPANISH_WORDS.has(word)) sampleSpanish.push(word);
      continue;
    }

    if (isSpanish && isEnglish) {
      ambiguousCount++;
    } else if (isSpanish) {
      spanishCount++;
    } else if (isEnglish) {
      englishCount++;
      if (sampleEnglish.length < 8) sampleEnglish.push(word);
    } else if (AMBIGUOUS_WORDS.has(word)) {
      ambiguousCount++;
    } else {
      // Unknown word - try a heuristic: words ending in -ción/-sión/-dad/-mente/-ando/-iendo are Spanish
      if (/(ción|sión|dad|mente|ando|iendo|amos|emos|imos|áis|éis|aba|ían|ara|ase)$/.test(word)) {
        spanishCount++;
        if (sampleSpanish.length < 8) sampleSpanish.push(word);
      } else if (/(ing|ed|tion|sion|ly|ness|ment|ful|less|able|ible)$/.test(word)) {
        englishCount++;
        if (sampleEnglish.length < 8) sampleEnglish.push(word);
      } else {
        // truly unknown - count as ambiguous
        ambiguousCount++;
      }
    }
  }

  const counted = spanishCount + englishCount;
  const totalWords = words.length;
  const spanishPercent = counted > 0 ? Math.round((spanishCount / counted) * 100) : 0;
  const englishPercent = counted > 0 ? Math.round((englishCount / counted) * 100) : 0;
  const deviation = Math.abs(englishPercent - targetEnglishPercent);

  let status: "perfect" | "close" | "off";
  if (deviation <= 10) status = "perfect";
  else if (deviation <= 20) status = "close";
  else status = "off";

  return {
    totalWords,
    spanishWords: spanishCount,
    englishWords: englishCount,
    ambiguousWords: ambiguousCount,
    spanishPercent,
    englishPercent,
    targetEnglishPercent,
    deviation,
    status,
    sampleSpanish: sampleSpanish.slice(0, 6),
    sampleEnglish: sampleEnglish.slice(0, 6),
  };
}

/**
 * Generates a corrective instruction when the language ratio is off.
 */
export function buildCorrectionInstruction(analysis: LanguageAnalysis): string {
  const needMoreEnglish = analysis.englishPercent < analysis.targetEnglishPercent;
  const diff = analysis.deviation;

  if (needMoreEnglish) {
    return `INSTRUCCIÓN CORRECTIVA DE IDIOMA: En el intento anterior, la letra contenía solo ${analysis.englishPercent}% de inglés, pero el objetivo era ${analysis.targetEnglishPercent}%. ` +
      `DEBES aumentar drásticamente el uso de inglés. Convierte al menos ${diff}% más del contenido a inglés. ` +
      `Técnicas: traduce frases completas al inglés, usa slang americano (bands, drip, opp, slime), ` +
      `termina las rimas en inglés, y haz que el chorus sea mayoritariamente en inglés.`;
  } else {
    return `INSTRUCCIÓN CORRECTIVA DE IDIOMA: En el intento anterior, la letra contenía ${analysis.englishPercent}% de inglés, pero el objetivo era solo ${analysis.targetEnglishPercent}%. ` +
      `DEBES reducir el uso de inglés y aumentar el español. Convierte al menos ${diff}% del contenido a español. ` +
      `Técnicas: traduce frases al español, usa slang español/barrial (pana, chaval, vale, tío, loco), ` +
      `termina las rimas en español, y mantén el chorus en español.`;
  }
}

export interface SunoReadinessCheck {
  id: string;
  name: string;
  passed: boolean;
  score: number; // 0 to 100
  feedback: string;
}

export interface SunoReadinessResult {
  score: number; // 0 to 100
  grade: "S+" | "A" | "B" | "C" | "D";
  checks: SunoReadinessCheck[];
  hasMarkdownHeaders: boolean;
  hasUnprotectedAdlibs: boolean;
  hasLeakedMetaText: boolean;
  bracketQuality: "perfect" | "good" | "needs_attention";
}

/**
 * Evaluates lyrics for 100% Suno AI v4 / v4.5 audio rendering readiness.
 */
export function analyzeSunoReadiness(lyrics: string): SunoReadinessResult {
  if (!lyrics || !lyrics.trim()) {
    return {
      score: 0,
      grade: "D",
      checks: [],
      hasMarkdownHeaders: false,
      hasUnprotectedAdlibs: false,
      hasLeakedMetaText: false,
      bracketQuality: "needs_attention",
    };
  }

  const lines = lyrics.split("\n");
  const checks: SunoReadinessCheck[] = [];

  // Check 1: No Markdown Headers (### [Verse])
  const markdownHeaderLines = lines.filter(l => /^\s*#{1,6}\s*\[?/.test(l));
  const noMarkdownHeaders = markdownHeaderLines.length === 0;
  checks.push({
    id: "no_markdown",
    name: "Sin cabeceras Markdown (###)",
    passed: noMarkdownHeaders,
    score: noMarkdownHeaders ? 100 : Math.max(0, 100 - markdownHeaderLines.length * 25),
    feedback: noMarkdownHeaders
      ? "Estructura limpia sin markdown '###' que Suno pueda cantar por error."
      : `Se detectaron ${markdownHeaderLines.length} líneas con '###'. Suno intentará cantarlas si no se eliminan.`,
  });

  // Check 2: Brackets Structure Quality & Tags
  const sectionBracketLines = lines.filter(l => /^\s*\[.+\]\s*$/.test(l));
  const hasBrackets = sectionBracketLines.length >= 3;
  const hasPerformanceHints = sectionBracketLines.some(l => l.includes(",") || l.includes(":"));
  checks.push({
    id: "bracket_structure",
    name: "Estructura de Secciones [Brackets]",
    passed: hasBrackets,
    score: hasBrackets ? (hasPerformanceHints ? 100 : 85) : 40,
    feedback: hasBrackets
      ? (hasPerformanceHints
          ? "Excelente: Secciones con etiquetas de interpretación y corchetes estándar."
          : "Secciones delimitadas con corchetes estándar.")
      : "Faltan etiquetas de sección entre corchetes [Intro], [Verse], [Chorus].",
  });

  // Check 3: Leaked Meta Text (e.g. "Intérprete:", "Producer Tag:", "Letra:")
  const leakedMetaLines = lines.filter(l => 
    /^\s*(?:Int[ée]rprete|Producer Tag|Verso \d+:|Estribillo:|Letra:|BPM:|Beat:)\s*/i.test(l) && !l.startsWith("[")
  );
  const noLeakedMeta = leakedMetaLines.length === 0;
  checks.push({
    id: "no_leaked_meta",
    name: "Sin fugas de texto meta fuera de corchetes",
    passed: noLeakedMeta,
    score: noLeakedMeta ? 100 : Math.max(0, 100 - leakedMetaLines.length * 30),
    feedback: noLeakedMeta
      ? "Sin texto explicativo suelto que pueda ser vocalizado."
      : `Atención: Hay ${leakedMetaLines.length} líneas con texto meta fuera de corchetes.`,
  });

  // Check 4: Ad-libs in Parentheses
  const linesWithContent = lines.filter(l => l.trim().length > 0 && !l.startsWith("["));
  const linesWithAdlibs = linesWithContent.filter(l => /\([A-Za-z0-9\s!'?]+\)/.test(l));
  const hasStereoAdlibs = linesWithAdlibs.length > 0;
  checks.push({
    id: "stereo_adlibs",
    name: "Ad-libs protegidos en estéreo ( )",
    passed: hasStereoAdlibs,
    score: hasStereoAdlibs ? 100 : 75,
    feedback: hasStereoAdlibs
      ? "Ad-libs entre paréntesis detectados, Suno los renderizará en los canales laterales."
      : "No se detectaron ad-libs entre paréntesis. Añadir (Yeah!), (Brrr!) mejorará el sonido estéreo.",
  });

  // Check 5: Rhythmic Punctuation (Commas, Ellipsis)
  const linesWithRhythmPunctuation = linesWithContent.filter(l => l.includes(",") || l.includes("...") || l.includes("—"));
  const rhythmicRatio = linesWithContent.length > 0 ? linesWithRhythmPunctuation.length / linesWithContent.length : 0;
  const goodRhythmPunctuation = rhythmicRatio >= 0.35;
  checks.push({
    id: "rhythmic_punctuation",
    name: "Puntuación de Respiración (Comas / Pausas)",
    passed: goodRhythmPunctuation,
    score: Math.min(100, Math.round(rhythmicRatio * 200)),
    feedback: goodRhythmPunctuation
      ? "Buen uso de pausas y comas para guiar la respiración y el groove del cantante en Suno."
      : "Añadir más comas y puntos suspensivos '...' ayudará a que Suno no atropelle las barras.",
  });

  // Calculate weighted overall score
  const totalScore = Math.round(
    checks[0].score * 0.25 +
    checks[1].score * 0.25 +
    checks[2].score * 0.20 +
    checks[3].score * 0.15 +
    checks[4].score * 0.15
  );

  let grade: "S+" | "A" | "B" | "C" | "D";
  if (totalScore >= 95) grade = "S+";
  else if (totalScore >= 85) grade = "A";
  else if (totalScore >= 70) grade = "B";
  else if (totalScore >= 50) grade = "C";
  else grade = "D";

  return {
    score: totalScore,
    grade,
    checks,
    hasMarkdownHeaders: !noMarkdownHeaders,
    hasUnprotectedAdlibs: false,
    hasLeakedMetaText: !noLeakedMeta,
    bracketQuality: hasBrackets && hasPerformanceHints ? "perfect" : hasBrackets ? "good" : "needs_attention",
  };
}

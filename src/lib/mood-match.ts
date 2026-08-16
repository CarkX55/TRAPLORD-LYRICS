// Mood Match Detector
// Checks if the generated lyrics actually match the selected mood via keyword analysis.

export interface MoodMatchResult {
  score: number;           // 0-100, how well the lyrics match the mood
  matched: string[];       // keywords found in the lyrics
  missing: string[];       // keywords NOT found (suggestions)
  moodId: string;
  moodLabel: string;
  verdict: "perfect" | "good" | "weak" | "off";
}

// Mood keyword libraries (ES + EN)
const MOOD_KEYWORDS: Record<string, { label: string; keywords: string[] }> = {
  agresivo: {
    label: "Agresivo / Disstrack",
    keywords: [
      // Spanish
      "mato", "muerto", "sangre", "bala", "pistola", "arma", "mata", "golpe", "guerra", "enemigo",
      "odio", "rabia", "furia", "destrozo", "rompo", "parto", "acabo", "destruyo", "violencia", "peligro",
      // English
      "kill", "dead", "blood", "bullet", "gun", "shoot", "fight", "war", "enemy", "hate",
      "rage", "destroy", "break", "smash", "violence", "danger", "beef", "opp", "bang", "clap",
    ],
  },
  melancolico: {
    label: "Melancólico / Pain",
    keywords: [
      "triste", "dolor", "lloro", "lágrima", "soledad", "vacío", "pena", "herida", "perdido", "extraño",
      "nostalgia", "amor", "roto", "ausencia", "memoria", "ayer", "adiós", "fin", "oscuro", "sombra",
      "sad", "pain", "cry", "tear", "lonely", "empty", "hurt", "wound", "lost", "miss",
      "memory", "yesterday", "gone", "goodbye", "end", "dark", "shadow", "broken", "alone", "blue",
    ],
  },
  flex: {
    label: "Flex / Hustle",
    keywords: [
      "dinero", "billete", "lujo", "coche", "joya", "oro", "diamante", "rico", "cuesta", "caro",
      "marca", "gucci", "prada", "flex", "presumo", "tengo", "mio", "éxito", "gané", "subí",
      "money", "cash", "bands", "racks", "whip", "chain", "ice", "diamond", "gold", "rich",
      "flex", "drip", "swag", "fly", "fresh", "luxury", "gucci", "prada", "bought", "paid",
    ],
  },
  fiesta: {
    label: "Fiesta / Club",
    keywords: [
      "fiesta", "baile", "noche", "copa", "bebé", "mujer", "club", "disco", "ritmo", "baila",
      "alcohol", "fume", "humo", "pasa", "bueno", "locura", "energía", "caliente", "piso", "moja",
      "party", "dance", "night", "drink", "club", "bottle", "vibe", "lit", "turn", "up",
      "shawty", "shorty", "bounce", "beat", "bass", "crazy", "fun", "wild", "drunk", "high",
    ],
  },
  introspectivo: {
    label: "Introspectivo / Reflexivo",
    keywords: [
      "pienso", "siento", "dentro", "alma", "mente", "reflexión", "pregunta", "respuesta", "verdad", "vida",
      "camino", "destino", "motivo", "razón", "existo", "sé", "calma", "silencio", "profundo", "recuerdo",
      "think", "feel", "inside", "soul", "mind", "reflect", "question", "answer", "truth", "life",
      "path", "destiny", "reason", "why", "calm", "silence", "deep", "remember", "wonder", "know",
    ],
  },
  oscuro: {
    label: "Oscuro / Demonic",
    keywords: [
      "oscuro", "sombra", "demonio", "infierno", "muerte", "miedo", "terror", "siniestro", "malvado", "diablo",
      "noche", "negro", "abismo", "pesadilla", "parca", "sangre", "ritual", "maldición", "posesión", "infernal",
      "dark", "shadow", "demon", "hell", "death", "fear", "terror", "sinister", "evil", "devil",
      "night", "black", "abyss", "nightmare", "blood", "ritual", "curse", "possession", "infernal", "grim",
    ],
  },
  romantico: {
    label: "Romántico / R&B Trap",
    keywords: [
      "amor", "corazón", "te quiero", "bebé", "tuyo", "mío", "bésame", "abrázame", "pasion", "deseo",
      "hermosa", "bella", "princesa", "reina", "romance", "siento", "duele", "extraño", "recuerdo", "siempre",
      "love", "heart", "baby", "yours", "mine", "kiss", "hug", "passion", "desire", "beautiful",
      "queen", "romance", "feel", "hurt", "miss", "remember", "forever", "sweet", "honey", "darling",
    ],
  },
  calle: {
    label: "Calle / Real",
    keywords: [
      "calle", "barrio", "piso", "bloque", "esquina", "hermano", "loyal", "real", "callejero", "supervivencia",
      "hambre", "lucha", "trapo", "vendo", "sirvo", "guapo", "peligro", "territorio", "banda", "crew",
      "street", "hood", "block", "corner", "brother", "loyal", "real", "survive", "hustle", "grind",
      "trap", "serve", "cop", "block", "gang", "crew", "thug", "ghetto", "concrete", "pavement",
    ],
  },
};

/**
 * Analyzes how well the lyrics match the selected mood.
 */
export function analyzeMoodMatch(lyrics: string, moodId: string, expectedSections: number): MoodMatchResult {
  const moodData = MOOD_KEYWORDS[moodId];
  if (!moodData) {
    return {
      score: 50,
      matched: [],
      missing: [],
      moodId,
      moodLabel: moodId,
      verdict: "weak",
    };
  }

  const lowerLyrics = lyrics.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of moodData.keywords) {
    if (lowerLyrics.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  // Score: % of keywords found, but with diminishing returns (logarithmic)
  const matchRatio = matched.length / moodData.keywords.length;
  // Use sqrt to reward even partial matches, but cap at 100
  const score = Math.min(100, Math.round(Math.sqrt(matchRatio) * 100));

  let verdict: "perfect" | "good" | "weak" | "off";
  if (score >= 70) verdict = "perfect";
  else if (score >= 50) verdict = "good";
  else if (score >= 30) verdict = "weak";
  else verdict = "off";

  return {
    score,
    matched: matched.slice(0, 10),    // show top 10 matches
    missing: missing.slice(0, 8),      // show 8 suggestions
    moodId,
    moodLabel: moodData.label,
    verdict,
  };
}

/**
 * Returns the list of all available mood IDs (for iteration).
 */
export function getAvailableMoods(): string[] {
  return Object.keys(MOOD_KEYWORDS);
}

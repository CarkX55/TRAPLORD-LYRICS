// Theme Analyzer
// Detects the actual theme(s) of lyrics regardless of the selected mood.
// Uses keyword frequency analysis across multiple theme categories.

export interface ThemeResult {
  themes: { id: string; label: string; score: number; matched: string[] }[];
  dominantTheme: string;      // theme id with highest score
  dominantLabel: string;       // human-readable label
  themeCount: number;         // number of themes detected (score > 0)
}

interface ThemeKeywords {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
}

const THEMES: ThemeKeywords[] = [
  {
    id: "money",
    label: "Dinero & Flex",
    emoji: "💰",
    keywords: [
      "dinero", "billete", "lujo", "coche", "joya", "oro", "diamante", "rico", "cuesta", "caro",
      "gucci", "prada", "flex", "presumo", "tengo", "éxito", "gané", "subí", "fama", "lujo",
      "money", "cash", "bands", "racks", "whip", "chain", "ice", "diamond", "gold", "rich",
      "drip", "swag", "fly", "fresh", "luxury", "bought", "paid", "stack", "guap", "milli",
    ],
  },
  {
    id: "violence",
    label: "Violencia & Calle",
    emoji: "🔪",
    keywords: [
      "mato", "muerto", "sangre", "bala", "pistola", "arma", "golpe", "guerra", "enemigo",
      "odio", "rabia", "furia", "destrozo", "rompo", "parto", "acabo", "destruyo", "violencia",
      "calle", "barrio", "piso", "bloque", "esquina", "hambre", "lucha", "trapo", "vendo",
      "kill", "dead", "blood", "bullet", "gun", "shoot", "fight", "war", "enemy", "hate",
      "rage", "destroy", "break", "smash", "violence", "beef", "opp", "bang", "clap", "gang",
    ],
  },
  {
    id: "love",
    label: "Amor & Romance",
    emoji: "💘",
    keywords: [
      "amor", "corazón", "quiero", "bebé", "tuyo", "mío", "bésame", "abrázame", "pasion", "deseo",
      "hermosa", "bella", "princesa", "reina", "romance", "siento", "duele", "extraño", "recuerdo",
      "mujer", "chica", "novia", "enamorado", "flechazo", "caricias",
      "love", "heart", "baby", "yours", "mine", "kiss", "hug", "passion", "desire", "beautiful",
      "queen", "romance", "feel", "hurt", "miss", "remember", "girl", "shawty", "shorty", "darling",
    ],
  },
  {
    id: "drugs",
    label: "Drogas & Adicción",
    emoji: "💊",
    keywords: [
      "lean", "codeína", "jarabe", "fumo", "humo", "verde", "hierba", "porro", "blunt",
      "pastilla", "perkys", "xanax", "molly", "coca", "blanca", "polvo", "droga", "adicción",
      "faded", "high", "smoke", "weed", "kush", "pills", "perc", "xan", "molly", "coke",
      "drank", "syrup", "cup", "mud", "purple", "sippin", "drugged", "wasted", "stoned",
    ],
  },
  {
    id: "party",
    label: "Fiesta & Club",
    emoji: "🎉",
    keywords: [
      "fiesta", "baile", "noche", "copa", "bebé", "club", "disco", "ritmo", "baila",
      "alcohol", "fume", "pasa", "bueno", "locura", "energía", "caliente", "moja", "piso",
      "party", "dance", "night", "drink", "club", "bottle", "vibe", "lit", "turn", "up",
      "bounce", "beat", "bass", "crazy", "fun", "wild", "drunk", "high", "wasted", "dj",
    ],
  },
  {
    id: "pain",
    label: "Dolor & Melancolía",
    emoji: "💔",
    keywords: [
      "triste", "dolor", "lloro", "lágrima", "soledad", "vacío", "pena", "herida", "perdido",
      "extraño", "nostalgia", "roto", "ausencia", "memoria", "ayer", "adiós", "fin", "oscuro",
      "depresión", "ansiedad", "miedo", "sombra", "llanto", "sufrimiento",
      "sad", "pain", "cry", "tear", "lonely", "empty", "hurt", "wound", "lost", "miss",
      "memory", "yesterday", "gone", "goodbye", "end", "dark", "shadow", "broken", "alone",
      "depressed", "anxiety", "fear", "suffer", "agony", "sorrow", "grief", "regret",
    ],
  },
  {
    id: "success",
    label: "Éxito & Fama",
    emoji: "⭐",
    keywords: [
      "éxito", "fama", "subí", "llegué", "top", "estrella", "brillo", "gané", "triunfo",
      "arriba", "cima", "peak", "sé", "puedo", "logro", "meta", "sueño", "realidad",
      "success", "fame", "star", "shine", "win", "triumph", "top", "peak", "rise", "climb",
      "made", "it", "achieved", "goal", "dream", "reality", "best", "number", "one", "champion",
    ],
  },
  {
    id: "loyalty",
    label: "Lealtad & Crew",
    emoji: "🤝",
    keywords: [
      "hermano", "loyal", "real", "crew", "banda", "squad", "team", "gang", "familia",
      "fieles", "lealtad", "siempre", "juntos", "nunca", "solo", "cuento", "confío",
      "brother", "loyal", "real", "crew", "squad", "team", "gang", "family", "ride", "die",
      "bro", "homie", "dawg", "fam", "brothers", "together", "trust", "loyalty", "faithful",
    ],
  },
];

/**
 * Analyzes the themes present in lyrics.
 * Returns scores for each theme based on keyword frequency.
 */
export function analyzeThemes(lyrics: string): ThemeResult {
  const lowerLyrics = lyrics.toLowerCase();
  const themes = THEMES.map(theme => {
    const matched: string[] = [];
    let score = 0;
    for (const keyword of theme.keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      const matches = lowerLyrics.match(regex);
      if (matches) {
        score += matches.length;
        matched.push(keyword);
      }
    }
    return {
      id: theme.id,
      label: `${theme.emoji} ${theme.label}`,
      score,
      matched: matched.slice(0, 8),
    };
  });

  // Sort by score descending
  themes.sort((a, b) => b.score - a.score);

  const dominant = themes[0];
  const themeCount = themes.filter(t => t.score > 0).length;

  return {
    themes,
    dominantTheme: dominant?.id ?? "money",
    dominantLabel: dominant?.label ?? "💰 Dinero & Flex",
    themeCount,
  };
}

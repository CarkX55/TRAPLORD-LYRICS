// Punchline Detector
// Detects the strongest/most memorable lines based on wordplay, metaphors,
// cultural references, and punchline patterns.

export interface Punchline {
  lineIndex: number;
  text: string;
  score: number;          // 0-100
  reasons: string[];      // why it's a punchline
  type: "metaphor" | "wordplay" | "reference" | "braggadocio" | "threat" | "emotional" | "imagery";
}

export interface PunchlineAnalysis {
  punchlines: Punchline[];
  totalLines: number;
  punchlineDensity: number;  // 0-100, % of lines that are punchlines
  topPunchline: Punchline | null;
}

// Patterns that indicate a punchline
const PUNCHLINE_PATTERNS: { type: Punchline["type"]; patterns: RegExp[]; points: number; reason: string }[] = [
  {
    type: "metaphor",
    patterns: [
      /\bcomo\s+\w+/i, /\bsomos?\s+\w+/i, /\bes\s+(un|una)\s+\w+/i,
      /\blike\s+(a|the)\s+\w+/i, /\bi'?m\s+(like|a)\s+\w+/i,
    ],
    points: 25,
    reason: "Metáfora",
  },
  {
    type: "wordplay",
    patterns: [
      /\b\d+k\b/i, /\b\d+m\b/i, /(.{3,}).*\1/i,  // repeated word/phrase
      /\bpunto\s+y\s+coma/i, /\bdoble\s+sentido/i,
    ],
    points: 30,
    reason: "Juego de palabras",
  },
  {
    type: "reference",
    patterns: [
      /\b(glock|ferrari|lamborghini|lambo|bentley|rolex|patek|cartier|gucci|prada|dior|balenciaga|nike|adidas)\b/i,
      /\b(aim|scope|headshot|bando|trap|plug|opps)\b/i,
      /\b(2001|los\s+kekos|glizzy|real\s+hasta\s+la\s+muerte)\b/i,
    ],
    points: 20,
    reason: "Referencia cultural",
  },
  {
    type: "braggadocio",
    patterns: [
      /\b(tengo|soy|estoy|llegué|subí|gané|mi\s+\w+\s+es)\b/i,
      /\bi\s+(got|am|'?m|have|run|own)\b/i, /\bmy\s+\w+\s+(is|are)\b/i,
      /\b(flex|drip|swag|ice|chain|bands|racks)\b/i,
    ],
    points: 15,
    reason: "Braggadocio/flex",
  },
  {
    type: "threat",
    patterns: [
      /\b(mato|matamos|disparo|tiro|bala|pistol|arma|cuchillo)\b/i,
      /\b(kill|shoot|gun|bullet|blade|knife|aim|clap)\b/i,
      /\b(opp|beef|war|fight)\b/i,
    ],
    points: 20,
    reason: "Amenaza/agresión",
  },
  {
    type: "emotional",
    patterns: [
      /\b(lloro|dolor|triste|soledad|vacío|pena|herida|nostalgia)\b/i,
      /\b(cry|pain|sad|lonely|empty|hurt|miss|alone|broken)\b/i,
      /\b(corazón|alma|siento|duele)\b/i,
    ],
    points: 22,
    reason: "Carga emocional",
  },
  {
    type: "imagery",
    patterns: [
      /\b(sangre|fuego|hielo|oro|sombra|noche|lluvia)\b/i,
      /\b(blood|fire|ice|gold|shadow|night|rain)\b/i,
      /\b(rojo|negro|blanco|verde)\b/i,
    ],
    points: 12,
    reason: "Imaginería visual",
  },
];

// Bonus for alliteration (repeated starting sounds)
function checkAlliteration(line: string): { points: number; reason: string } | null {
  const words = line.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length < 3) return null;
  const firstLetters = words.map(w => w[0]);
  const counts: Record<string, number> = {};
  for (const l of firstLetters) {
    counts[l] = (counts[l] ?? 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));
  if (maxCount >= 3) {
    return { points: 18, reason: "Aliteración" };
  }
  return null;
}

// Bonus for internal rhyme
function checkInternalRhyme(line: string): { points: number; reason: string } | null {
  const words = line.toLowerCase().replace(/[^\w\sáéíóúñ]/g, "").split(/\s+/).filter(w => w.length > 2);
  if (words.length < 3) return null;
  const endings = words.map(w => w.slice(-2));
  const counts: Record<string, number> = {};
  for (const e of endings) {
    counts[e] = (counts[e] ?? 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));
  if (maxCount >= 2) {
    return { points: 20, reason: "Rima interna" };
  }
  return null;
}

/**
 * Analyzes lyrics and detects punchlines (strongest lines).
 */
export function detectPunchlines(lyrics: string): PunchlineAnalysis {
  const lines = lyrics.split("\n");
  const punchlines: Punchline[] = [];
  let totalLines = 0;
  let globalIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[.*\]$/.test(trimmed)) continue;
    if (/^Interpr[èe]te?:/i.test(trimmed) || /^Intérprete?:/i.test(trimmed)) continue;
    if (/^[*#]/.test(trimmed)) continue;

    totalLines++;
    const reasons: string[] = [];
    let score = 0;
    let type: Punchline["type"] = "imagery";

    // Check each pattern
    for (const pattern of PUNCHLINE_PATTERNS) {
      for (const regex of pattern.patterns) {
        if (regex.test(trimmed)) {
          score += pattern.points;
          if (!reasons.includes(pattern.reason)) {
            reasons.push(pattern.reason);
          }
          if (score === pattern.points) type = pattern.type; // first match sets type
          break;
        }
      }
    }

    // Check alliteration
    const allit = checkAlliteration(trimmed);
    if (allit) {
      score += allit.points;
      reasons.push(allit.reason);
    }

    // Check internal rhyme
    const internal = checkInternalRhyme(trimmed);
    if (internal) {
      score += internal.points;
      reasons.push(internal.reason);
    }

    // Length bonus: lines between 6-15 words are ideal punchline length
    const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount >= 6 && wordCount <= 15) {
      score += 8;
    }

    // Cap score at 100
    score = Math.min(100, score);

    // Only consider lines with score > 25 as punchlines
    if (score > 25) {
      punchlines.push({
        lineIndex: globalIdx,
        text: trimmed,
        score,
        reasons,
        type,
      });
    }
    globalIdx++;
  }

  // Sort by score descending
  punchlines.sort((a, b) => b.score - a.score);

  const punchlineDensity = totalLines > 0 ? Math.round((punchlines.length / totalLines) * 100) : 0;
  const topPunchline = punchlines[0] ?? null;

  return {
    punchlines,
    totalLines,
    punchlineDensity,
    topPunchline,
  };
}

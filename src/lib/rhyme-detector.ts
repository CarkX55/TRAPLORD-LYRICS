// Rhyme Detector & Heatmap
// Detects rhyming word endings in lyrics and assigns color groups for visualization.

export interface RhymeGroup {
  id: number;
  ending: string;     // the rhyming suffix (e.g. "-ado", "-ation")
  color: string;      // hex color for this group
  lineIndices: number[]; // indices of lines that contain a word from this group
  words: string[];
}

export interface RhymeAnalysis {
  groups: RhymeGroup[];
  totalRhymes: number;
}

// Color palette for rhyme groups (cycle through)
const RHYME_COLORS = [
  "#00ff41", // slime green
  "#ff0055", // cyber pink
  "#00d4ff", // cyan
  "#ffaa00", // orange
  "#bb00ff", // purple
  "#ffff00", // yellow
  "#ff4477", // light pink
  "#44ff88", // light green
  "#ff6600", // dark orange
  "#66ddff", // light cyan
];

/**
 * Extracts the "rhymable" ending of a word.
 * Spanish and English have different rhyme patterns, so we handle both.
 */
function getRhymeEnding(word: string): string {
  const w = word.toLowerCase().replace(/[^a-záéíóúñü]/gi, "");
  if (w.length < 2) return w;

  // Spanish endings (more agglutinated, rhyme from the last stressed vowel)
  // Common: -ar, -er, -ir, -ado, -ido, -ada, -ida, -ción, -sión, -dad, -mente, -ano, -eno
  const esPatterns = [
    /(.{2,}ado)$/, /(.{2,}ido)$/, /(.{2,}ada)$/, /(.{2,}ida)$/,
    /(.{2,}ación)$/, /(.{2,}isión)$/, /(.{1,}ción)$/, /(.{1,}sión)$/,
    /(.{2,}dad)$/, /(.{2,}mente)$/, /(.{2,}ano)$/, /(.{2,}eno)$/,
    /(.{2,}ero)$/, /(.{2,}era)$/, /(.{2,}ito)$/, /(.{2,}ita)$/,
    /(.{2,}ón)$/, /(.{2,}an)$/, /(.{2,}en)$/, /(.{2,}in)$/,
    /(.{1,}ar)$/, /(.{1,}er)$/, /(.{1,}ir)$/,
  ];
  for (const p of esPatterns) {
    const m = w.match(p);
    if (m && m[1]) {
      // Return from the last stressed vowel (simplified: last 3-4 chars)
      const ending = m[1];
      return ending.slice(-3);
    }
  }

  // English endings
  const enPatterns = [
    /(.{2,}ing)$/, /(.{2,}tion)$/, /(.{2,}sion)$/, /(.{2,}ness)$/,
    /(.{2,}ment)$/, /(.{2,}able)$/, /(.{2,}ible)$/, /(.{2,}ful)$/,
    /(.{2,}less)$/, /(.{2,}ous)$/, /(.{2,}ed)$/, /(.{2,}er)$/,
    /(.{2,}est)$/, /(.{2,}ly)$/, /(.{2,}ay)$/, /(.{2,}ee)$/,
  ];
  for (const p of enPatterns) {
    const m = w.match(p);
    if (m && m[1]) {
      return m[1].slice(-3);
    }
  }

  // Fallback: last 2-3 chars
  return w.slice(-3);
}

/**
 * Phonetic encoding (simplified Soundex-like).
 * Converts a word to its sound-alike representation so words that rhyme
 * but spell differently (e.g. "love"/"move", "night"/"knight") are grouped.
 */
function phoneticEncode(word: string): string {
  let w = word.toLowerCase().replace(/[^a-záéíóúñü]/gi, "");
  if (w.length < 2) return w;

  // Normalize Spanish accents to their base vowels for phonetic matching
  w = w
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ü/g, "u");

  // Silent letters / homophones
  w = w
    .replace(/^kn/, "n")      // knight -> night
    .replace(/^wr/, "r")      // write -> rite
    .replace(/^ps/, "s")      // psychology -> sychology
    .replace(/^wh/, "w")      // where -> were
    .replace(/mb$/, "m")     // climb -> clim
    .replace(/gh/g, "")       // through -> thru
    .replace(/ph/g, "f")      // phone -> fone
    .replace(/ck/g, "k")      // back -> bak
    .replace(/qu/g, "k")      // queen -> keen
    .replace(/ce/g, "se")     // center -> senter
    .replace(/ci/g, "si")     // city -> sity
    .replace(/c/g, "k")       // cat -> kat
    .replace(/z/g, "s")       // zero -> sero
    .replace(/y/g, "i")       // my -> mi
    .replace(/h/g, "")        // silent h
    .replace(/w/g, "u")      // sound-alike
    .replace(/v/g, "b")      // v/b confusion in Spanish
    .replace(/ll/g, "y")     // llamo -> yamo
    .replace(/ñ/g, "ni")     // ñ -> ni
    .replace(/x/g, "ks");    // x -> ks

  // Collapse duplicate consonants
  w = w.replace(/(.)\1+/g, "$1");

  // Return the phonetic ending (last 3 chars)
  return w.slice(-3);
}

/**
 * Analyzes lyrics and groups lines by rhyming endings.
 * Uses BOTH suffix matching AND phonetic encoding for better rhyme detection.
 */
export function analyzeRhymes(lyrics: string): RhymeAnalysis {
  const lines = lyrics.split("\n");
  // Map: phoneticKey -> { words, lineIndices }
  const endingMap = new Map<string, { words: Set<string>; lineIndices: Set<number> }>();

  lines.forEach((line, idx) => {
    // Skip section tags [Verse 1], interpreter lines, empty lines
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/^\[.*\]$/.test(trimmed)) return;
    if (/^Interpr[èe]te?:/i.test(trimmed) || /^Intérprete?:/i.test(trimmed)) return;
    if (/^[*#]/.test(trimmed)) return;

    // Get the last word of the line (the rhyming word)
    const words = trimmed.replace(/[^\w\sáéíóúñü']/g, " ").split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return;
    const lastWord = words[words.length - 1].toLowerCase();
    // Use phonetic encoding as the primary key (catches love/move, night/knight)
    const phonetic = phoneticEncode(lastWord);

    if (!endingMap.has(phonetic)) {
      endingMap.set(phonetic, { words: new Set(), lineIndices: new Set() });
    }
    const entry = endingMap.get(phonetic)!;
    entry.words.add(lastWord);
    entry.lineIndices.add(idx);
  });

  // Filter: only keep endings that appear in 2+ lines (actual rhymes)
  const groups: RhymeGroup[] = [];
  let colorIdx = 0;
  for (const [phonetic, data] of endingMap) {
    if (data.lineIndices.size >= 2) {
      groups.push({
        id: groups.length,
        ending: phonetic,
        color: RHYME_COLORS[colorIdx % RHYME_COLORS.length],
        lineIndices: Array.from(data.lineIndices).sort((a, b) => a - b),
        words: Array.from(data.words),
      });
      colorIdx++;
    }
  }

  // Sort groups by number of lines (most rhymes first)
  groups.sort((a, b) => b.lineIndices.length - a.lineIndices.length);
  // Reassign IDs after sort
  groups.forEach((g, i) => { g.id = i; });

  return {
    groups,
    totalRhymes: groups.reduce((sum, g) => sum + g.lineIndices.length, 0),
  };
}

/**
 * Given a line index, returns the rhyme group it belongs to (if any).
 */
export function getRhymeGroupForLine(analysis: RhymeAnalysis, lineIdx: number): RhymeGroup | null {
  for (const group of analysis.groups) {
    if (group.lineIndices.includes(lineIdx)) return group;
  }
  return null;
}

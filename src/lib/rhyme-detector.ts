// Rhyme Detector & Heatmap
// Detects rhyming word endings in lyrics and assigns color groups for visualization.

export interface RhymeGroup {
  id: number;
  ending: string;     // the rhyming suffix (e.g. "-ado", "-ation", "aso: a-o")
  color: string;      // hex color for this group
  lineIndices: number[]; // indices of lines that contain a word from this group
  words: string[];
  type?: "consonant" | "assonant";
}

export interface InternalRhymeMatch {
  lineIndex: number;
  word1: string;
  word2: string;
  ending: string;
}

export interface RhymeAnalysis {
  groups: RhymeGroup[];
  totalRhymes: number;
  internalRhymes: InternalRhymeMatch[];
  internalRhymesCount: number;
  assonantRhymeCount: number;
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
  "#a855f7", // violet
  "#10b981", // emerald
];

/**
 * Extracts the "rhymable" ending of a word.
 * Spanish and English have different rhyme patterns, so we handle both.
 */
function getRhymeEnding(word: string): string {
  const w = word.toLowerCase().replace(/[^a-záéíóúñü]/gi, "");
  if (w.length < 2) return w;

  // Spanish endings (more agglutinated, rhyme from the last stressed vowel)
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
      return m[1].slice(-3);
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
 * Extracts the assonant vowel pattern of a Spanish/Spanglish word (e.g., "noche" -> "o-e", "fiesta" -> "e-a")
 */
function extractVowelAssonance(word: string): string {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/gi, "");
  if (w.length < 2) return "";

  const norm = w
    .replace(/á/g, "A").replace(/é/g, "E").replace(/í/g, "I")
    .replace(/ó/g, "O").replace(/ú/g, "U");

  // Check if explicit tonic vowel exists
  const explicitTonic = norm.search(/[AEIOU]/);
  let vowels: string[] = [];

  if (explicitTonic !== -1) {
    // Collect from tonic vowel onward
    const sub = norm.slice(explicitTonic).toLowerCase();
    vowels = [...sub].filter(c => "aeiou".includes(c));
  } else {
    // Standard Spanish tonic position rule:
    // Ends in vowel, n, s -> tonic is penultimate vowel
    // Ends in other consonant -> tonic is last vowel
    const allVowels = [...norm.toLowerCase()].filter(c => "aeiou".includes(c));
    if (allVowels.length <= 1) {
      vowels = allVowels;
    } else {
      const endsInVowelOrNS = /[aeiou][ns]?$/i.test(w);
      if (endsInVowelOrNS && allVowels.length >= 2) {
        vowels = allVowels.slice(-2);
      } else {
        vowels = allVowels.slice(-1);
      }
    }
  }

  if (vowels.length === 0) return "";
  return vowels.join("-");
}

/**
 * Phonetic encoding (simplified Soundex-like).
 */
function phoneticEncode(word: string): string {
  let w = word.toLowerCase().replace(/[^a-záéíóúñü]/gi, "");
  if (w.length < 2) return w;

  w = w
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ü/g, "u");

  w = w
    .replace(/^kn/, "n")
    .replace(/^wr/, "r")
    .replace(/^ps/, "s")
    .replace(/^wh/, "w")
    .replace(/mb$/, "m")
    .replace(/gh/g, "")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/qu/g, "k")
    .replace(/ce/g, "se")
    .replace(/ci/g, "si")
    .replace(/c/g, "k")
    .replace(/z/g, "s")
    .replace(/y/g, "i")
    .replace(/h/g, "")
    .replace(/w/g, "u")
    .replace(/v/g, "b")
    .replace(/ll/g, "y")
    .replace(/ñ/g, "ni")
    .replace(/x/g, "ks");

  w = w.replace(/(.)\1+/g, "$1");
  return w.slice(-3);
}

const COMMON_STOPWORDS = new Set([
  "que", "los", "las", "por", "para", "con", "una", "uno", "del", "sin", "the", "and", "you", "for", "with"
]);

/**
 * Analyzes lyrics and groups lines by rhyming endings (consonant + assonant + internal).
 */
export function analyzeRhymes(lyrics: string): RhymeAnalysis {
  const lines = lyrics.split("\n");
  const endingMap = new Map<string, { words: Set<string>; lineIndices: Set<number> }>();
  const assonantMap = new Map<string, { words: Set<string>; lineIndices: Set<number> }>();
  const internalRhymes: InternalRhymeMatch[] = [];

  const matchedLineIndices = new Set<number>();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/^\[.*\]$/.test(trimmed)) return;
    if (/^Interpr[èe]te?:/i.test(trimmed) || /^Intérprete?:/i.test(trimmed)) return;
    if (/^[*#]/.test(trimmed)) return;

    // Words in line
    const words = trimmed
      .replace(/[^\w\sáéíóúñü']/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 1);

    if (words.length === 0) return;

    // 1. Check internal rhymes within this line
    if (words.length >= 4) {
      for (let i = 0; i < words.length - 1; i++) {
        const w1 = words[i].toLowerCase();
        if (COMMON_STOPWORDS.has(w1) || w1.length < 3) continue;
        const p1 = phoneticEncode(w1);
        for (let j = i + 1; j < words.length; j++) {
          const w2 = words[j].toLowerCase();
          if (COMMON_STOPWORDS.has(w2) || w2.length < 3 || w1 === w2) continue;
          const p2 = phoneticEncode(w2);
          if (p1 === p2 && p1.length >= 2) {
            internalRhymes.push({
              lineIndex: idx,
              word1: w1,
              word2: w2,
              ending: p1,
            });
            break;
          }
        }
      }
    }

    // 2. Consonant end-rhyme
    const lastWord = words[words.length - 1].toLowerCase();
    const phonetic = phoneticEncode(lastWord);

    if (!endingMap.has(phonetic)) {
      endingMap.set(phonetic, { words: new Set(), lineIndices: new Set() });
    }
    const entry = endingMap.get(phonetic)!;
    entry.words.add(lastWord);
    entry.lineIndices.add(idx);

    // 3. Assonant end-rhyme key (for fallback)
    const assonance = extractVowelAssonance(lastWord);
    if (assonance.length >= 2) {
      if (!assonantMap.has(assonance)) {
        assonantMap.set(assonance, { words: new Set(), lineIndices: new Set() });
      }
      const aEntry = assonantMap.get(assonance)!;
      aEntry.words.add(lastWord);
      aEntry.lineIndices.add(idx);
    }
  });

  const groups: RhymeGroup[] = [];
  let colorIdx = 0;

  // A. Consonant Rhyme Groups (2+ lines)
  for (const [phonetic, data] of endingMap) {
    if (data.lineIndices.size >= 2) {
      const lineIndices = Array.from(data.lineIndices).sort((a, b) => a - b);
      lineIndices.forEach(idx => matchedLineIndices.add(idx));

      groups.push({
        id: groups.length,
        ending: phonetic,
        color: RHYME_COLORS[colorIdx % RHYME_COLORS.length],
        lineIndices,
        words: Array.from(data.words),
        type: "consonant",
      });
      colorIdx++;
    }
  }

  // B. Assonant Rhyme Groups (Lines not yet matched by consonant rhyme)
  let assonantRhymeCount = 0;
  for (const [vowels, data] of assonantMap) {
    const unmatchedLines = Array.from(data.lineIndices).filter(idx => !matchedLineIndices.has(idx));
    if (unmatchedLines.length >= 2) {
      unmatchedLines.forEach(idx => matchedLineIndices.add(idx));
      assonantRhymeCount += unmatchedLines.length;

      groups.push({
        id: groups.length,
        ending: `~${vowels}`,
        color: RHYME_COLORS[colorIdx % RHYME_COLORS.length],
        lineIndices: unmatchedLines.sort((a, b) => a - b),
        words: Array.from(data.words),
        type: "assonant",
      });
      colorIdx++;
    }
  }

  // Sort groups by line count
  groups.sort((a, b) => b.lineIndices.length - a.lineIndices.length);
  groups.forEach((g, i) => { g.id = i; });

  return {
    groups,
    totalRhymes: groups.reduce((sum, g) => sum + g.lineIndices.length, 0),
    internalRhymes,
    internalRhymesCount: internalRhymes.length,
    assonantRhymeCount,
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

/**
 * Given a line index, returns the first internal rhyme match found for that line (if any).
 */
export function getInternalRhymeForLine(analysis: RhymeAnalysis, lineIdx: number): InternalRhymeMatch | null {
  if (!analysis.internalRhymes) return null;
  return analysis.internalRhymes.find(m => m.lineIndex === lineIdx) || null;
}

// Beat Fit Calculator & Vocal Range Estimator
// Maps syllable density to BPM and estimates vocal range from artist style.

import type { SyllableAnalysis } from "./syllable-counter";
import type { Artist, BpmVibe } from "./trap-data";

export interface BeatFitResult {
  bpm: number;
  avgSyllablesPerLine: number;
  idealSyllablesPerLine: number;  // ideal for this BPM
  fitScore: number;               // 0-100, how well the flow fits the beat
  verdict: "perfect" | "good" | "tight" | "sparse";
  recommendation: string;
  beatsPerSyllable: number;       // how many beats per syllable (lower = faster flow)
}

/**
 * Calculates how well the syllable density fits the BPM.
 * Rule of thumb: at 130 BPM, ~8 syllables/line is ideal.
 * Faster BPM → more syllables needed; slower → fewer.
 */
export function calculateBeatFit(syllableAnalysis: SyllableAnalysis, bpmVibe: BpmVibe): BeatFitResult {
  const bpmRange = bpmVibe.range.split("-");
  const bpm = parseInt(bpmRange[1] ?? "130"); // use upper bound

  // Ideal syllables per line scales inversely with BPM
  // At 70 BPM: ~4-6 syllables. At 180 BPM: ~12-16 syllables.
  const idealSyllablesPerLine = Math.round((bpm / 130) * 8);
  const actual = syllableAnalysis.avgSyllablesPerLine;

  // Fit score: closer to ideal = higher score
  const diff = Math.abs(actual - idealSyllablesPerLine);
  const fitScore = Math.max(0, Math.min(100, Math.round(100 - diff * 12)));

  let verdict: "perfect" | "good" | "tight" | "sparse";
  let recommendation: string;

  if (diff <= 1) {
    verdict = "perfect";
    recommendation = "El flow encaja perfectamente con el BPM. Densidad ideal.";
  } else if (diff <= 3) {
    verdict = "good";
    recommendation = "El flow encaja bien con el beat. Pequeñas variaciones son naturales.";
  } else if (actual > idealSyllablesPerLine) {
    verdict = "tight";
    recommendation = `Demasiadas sílabas para ${bpm} BPM. Considera frases más cortas o un BPM más alto (${bpm + 20}+).`;
  } else {
    verdict = "sparse";
    recommendation = `Muy pocas sílabas para ${bpm} BPM. Alarga las frases o baja el BPM a ${Math.max(70, bpm - 20)}.`;
  }

  const beatsPerSyllable = actual > 0 ? Math.round((bpm / 60 / actual) * 10) / 10 : 0;

  return {
    bpm,
    avgSyllablesPerLine: actual,
    idealSyllablesPerLine,
    fitScore,
    verdict,
    recommendation,
    beatsPerSyllable,
  };
}

// ===== Vocal Range Estimator =====

export interface VocalRange {
  register: "low" | "mid" | "high" | "mixed";
  tone: "aggressive" | "melodic" | "melancholic" | "energetic" | "cold" | "warm";
  techniques: string[];
  description: string;
  difficulty: number; // 1-5, how hard to replicate
}

const ARTIST_VOCAL_PROFILES: Record<string, VocalRange> = {
  future: { register: "mid", tone: "melancholic", techniques: ["Auto-tune pesado", "Flow arrastrado", "Ad-libs melódicos"], description: "Voz media con auto-tune, flow arrastrado por el lean, tono melancólico", difficulty: 3 },
  young_thug: { register: "high", tone: "energetic", techniques: ["Voz aguda", "Melodías caóticas", "Ad-libs excitados"], description: "Voz aguda impredecible, melodías slime caóticas", difficulty: 5 },
  "21_savage": { register: "low", tone: "cold", techniques: ["Susurro frío", "Flow monótono", "Ad-libs cortos"], description: "Voz grave y susurrada, tono frío y amenazante", difficulty: 2 },
  playboi_carti: { register: "high", tone: "energetic", techniques: ["Baby voice", "Vamp", "Ad-libs repetitivos"], description: "Voz aguda vamp, baby voice, ad-libs obsesivos", difficulty: 4 },
  gunna: { register: "high", tone: "melodic", techniques: ["Flow suave", "Drip", "Tono elevado"], description: "Voz aguda melódica, flow suave y fluido", difficulty: 3 },
  lil_baby: { register: "mid", tone: "energetic", techniques: ["Rapid fire", "Confesional", "Flow breathless"], description: "Voz media rapid fire, confesiones emocionales", difficulty: 4 },
  drake: { register: "mid", tone: "melodic", techniques: ["Versátil", "Canto + rapeo", "Confesional"], description: "Voz media versátil, alterna canto y rapeo", difficulty: 3 },
  travis_scott: { register: "mid", tone: "energetic", techniques: ["Auto-tune psicodélico", "Flow atmosférico", "Ad-libs catastróficos"], description: "Voz media con auto-tune psicodélico, energy de moshpit", difficulty: 4 },
  don_tolver: { register: "high", tone: "melodic", techniques: ["Falseteo", "R&B sedoso", "Ad-libs etéreos"], description: "Voz aguda con falseteo, R&B trap sedoso", difficulty: 4 },
  lil_uzi: { register: "high", tone: "energetic", techniques: ["Tono agudo", "Melodías pegadizas", "Emo rap"], description: "Voz aguda energética, melodías pegadizas, emo rap", difficulty: 3 },
  yung_beef: { register: "mid", tone: "aggressive", techniques: ["Flow crudo", "Slang del 2001", "Voz rasposa"], description: "Voz media cruda, slang barrial, tono agresivo", difficulty: 2 },
  cruz_cafune: { register: "mid", tone: "warm", techniques: ["Flow melódico canario", "Slang isleño", "Reflexivo"], description: "Voz media melódica, slang canario, tono cálido", difficulty: 2 },
  recycled_j: { register: "mid", tone: "melancholic", techniques: ["Flow técnico", "Storytelling", "Rimas elaboradas"], description: "Voz media técnica, storytelling urbano, introspectivo", difficulty: 3 },
  hard_gz: { register: "low", tone: "aggressive", techniques: ["Voz grave", "Flow oscuro", "Narrativa de calle"], description: "Voz grave y oscura, narrativa de calle cruda", difficulty: 2 },
  quevedo: { register: "mid", tone: "melodic", techniques: ["Flow pegadizo", "Joven", "Bailable"], description: "Voz media pegadiza, tono joven y bailable", difficulty: 2 },
  beny_jr: { register: "mid", tone: "aggressive", techniques: ["Influencia magrebí", "Voz rasposa", "Slang multinacional"], description: "Voz media con influencia magrebí, rasposa, calle", difficulty: 3 },
  agnus_tris: { register: "low", tone: "aggressive", techniques: ["Voz grave amenazante", "Drill", "Slang del 2001"], description: "Voz grave amenazante, drill madrileño, violencia explícita", difficulty: 2 },
  pnl: { register: "mid", tone: "melancholic", techniques: ["Auto-tune pesado", "Cloud rap", "Voz susurrada"], description: "Voz media con auto-tune, cloud rap melancólico, susurrada", difficulty: 3 },
  booba: { register: "mid", tone: "aggressive", techniques: ["Flow técnico", "Punchlines cortantes", "Ego desbordado"], description: "Voz media técnica, punchlines cortantes, ego", difficulty: 3 },
  ninho: { register: "mid", tone: "melodic", techniques: ["Flow versátil", "Flex sutil", "Introspectivo"], description: "Voz media versátil, flex sutil + introspección", difficulty: 3 },
  central_cee: { register: "mid", tone: "aggressive", techniques: ["UK drill rápido", "Slang londinense", "Agresivo melódico"], description: "Voz media UK drill, slang londinense, agresivo melódico", difficulty: 4 },
  anuel_aa: { register: "low", tone: "aggressive", techniques: ["Voz grave autotuneada", "Spanglish agresivo", "Calle boricua"], description: "Voz grave autotuneada, Spanglish agresivo, calle boricua", difficulty: 3 },
  bad_bunny: { register: "low", tone: "aggressive", techniques: ["Voz rasposa", "Spanglish fluido", "Flow versátil"], description: "Voz grave rasposa, Spanglish fluido, flow versátil", difficulty: 3 },
  yovngchimi: { register: "mid", tone: "aggressive", techniques: ["Voz endemoniada", "Drill PR", "Violencia cruda"], description: "Voz media endemoniada, drill PR, violencia cruda", difficulty: 4 },
  myke_towers: { register: "mid", tone: "melodic", techniques: ["Flow técnico", "Flex con elegancia", "Spanglish balanceado"], description: "Voz media técnica, flex elegante, Spanglish balanceado", difficulty: 3 },
  kidd_keo: { register: "mid", tone: "aggressive", techniques: ["Spanglish duro", "Flow Rockport oscuro", "Calle + autodestrucción"], description: "Voz media con Spanglish duro, flow oscuro Rockport", difficulty: 3 },
  morad: { register: "mid", tone: "aggressive", techniques: ["Slang multinacional", "Voz rasposa", "Historias de exclusión"], description: "Voz media rasposa, slang multinacional, historias de exclusión", difficulty: 2 },
};

/**
 * Estimates the vocal range and techniques based on the selected artist.
 */
export function estimateVocalRange(artist: Artist | undefined): VocalRange | null {
  if (!artist) return null;
  const profile = ARTIST_VOCAL_PROFILES[artist.id];
  if (profile) return profile;

  // Fallback based on style keywords
  const style = artist.style.toLowerCase();
  let register: VocalRange["register"] = "mid";
  let tone: VocalRange["tone"] = "melodic";

  if (style.includes("grave") || style.includes("grave")) register = "low";
  else if (style.includes("aguda") || style.includes("agudo")) register = "high";

  if (style.includes("agresiv")) tone = "aggressive";
  else if (style.includes("melancól") || style.includes("triste")) tone = "melancholic";
  else if (style.includes("frío") || style.includes("fria")) tone = "cold";
  else if (style.includes("energét")) tone = "energetic";
  else if (style.includes("cálido") || style.includes("calido")) tone = "warm";

  return {
    register,
    tone,
    techniques: ["Flow del artista", "Ad-libs característicos"],
    description: artist.style,
    difficulty: 3,
  };
}

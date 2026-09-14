// Musical DNA Engine — Decoupled 5-layer parametric audio & performance profiles
// Abstracting style from raw artist imitation into true compositional attributes.

export interface FlowDNA {
  cadenceType:
    | "baritone_low_density"     // Houston / Memphis drawl, laid-back 6-8 syllables, heavy 808 space
    | "offbeat_urgent"           // Chicago drill / Detroit rush, urgent syncopation, unexpected stops
    | "bounce_sparse"            // Atlanta Gunna/Baby bounce, strict 3-5 words per bar, elastic delay
    | "minimalist_cold"          // 21 Savage cold deadpan, low tone, zero melody, sharp punctuation
    | "staccato_high_energy"     // Carti / Yeat / Rage, punchy percussive syllables, moshpit drive
    | "multisyllabic_dense"      // Eminem / Kendrick / Cole, internal rhyme cascades, metronomic
    | "melodic_slime_elastic";   // Thugger / Uzi, unpredictable pitch contour, vocal elasticity
  avgSyllablesPerBar: [number, number];
  wordsPerBarLimit?: [number, number]; // e.g. [3, 5] for American bounce
  syncopation: number;         // 0.0 to 1.0 (weight on off-beat)
  pauseFrequency: number;      // 0.0 to 1.0 (density of [Pause] tokens)
  phraseLengthVariance: number;// 0.0 to 1.0 (metric asymmetry)
  offBeatPreference: number;   // 0.0 to 1.0 (preference for entering late on the beat)
}

export interface WritingDNA {
  rhymeComplexity: "street_direct" | "internal_balanced" | "multisyllabic_surgical";
  imageryDensity: number;        // 0.0 to 1.0 (visual concrete imagery vs abstract assertions)
  directness: number;           // 0.0 to 1.0 (raw unvarnished statements vs subtle metaphors)
  metaphorDensity: number;      // 0.0 to 1.0
  repetitionTolerance: number;  // 0.0 to 1.0 (comfort with repeating catchphrases)
  narrativeDensity: number;     // 0.0 to 1.0 (storytelling thread vs punchline clusters)
}

export interface VocalDNA {
  adlibDensity: number;         // 0.0 to 1.0
  adlibStyle: "textured" | "dialectic_pingpong" | "minimal_clean";
  allowBreathTags: boolean;
  allowVocalCuts: boolean;
  melodicRange:
    | "monotone_cold"
    | "melodic_autotune"
    | "aggressive_shout"
    | "conversational_baritone"
    | "falsetto_layered"
    | "operatic_cinematic";
  sunoVocalTimbre: string;
}

export interface LexicalDNA {
  streetGritty: number;         // 0.0 to 1.0
  luxuryCold: number;           // 0.0 to 1.0
  conversationalRaw: number;    // 0.0 to 1.0
  intimateParanoid: number;     // 0.0 to 1.0
  technicalIncompatiblePenalty: number; // 0.0 to 1.0 (penalizes clinical/academic words)
}

export interface HumanTextureDNA {
  cutThoughtProbability: number; // Probability of trailing thought or interrupted sentence
  restartProbability: number;    // Probability of re-initiating bar
  pauseProbability: number;      // Probability of inserting [Pause]
  repetitionProbability: number; // Accidental conversational repetition
  asymmetry: number;             // Metric length variance from bar to bar
}

export interface MusicalDNA {
  flow: FlowDNA;
  writing: WritingDNA;
  vocal: VocalDNA;
  lexical: LexicalDNA;
  humanTexture: HumanTextureDNA;
}

export interface ArtistPreset {
  id: string;
  name: string;
  origin: string;
  dna: MusicalDNA;
}

/**
 * Section-subordinated Human Texture adjustment.
 * Modulates imperfection depending on the functional purpose of the song section.
 */
export function getSectionModulatedTexture(
  sectionType: "intro" | "verse" | "hook" | "bridge" | "outro" | "beat_drop",
  baseTexture: HumanTextureDNA
): HumanTextureDNA {
  switch (sectionType) {
    case "hook":
      // Hooks demand high memorability and rhythmic tightness: minimal human noise
      return {
        cutThoughtProbability: baseTexture.cutThoughtProbability * 0.2,
        restartProbability: 0,
        pauseProbability: baseTexture.pauseProbability * 0.5,
        repetitionProbability: baseTexture.repetitionProbability * 0.4,
        asymmetry: baseTexture.asymmetry * 0.3,
      };
    case "verse":
      // Verses allow natural conversational delivery
      return baseTexture;
    case "bridge":
      // Bridges/confessions thrive on raw vulnerability and thought-pauses
      return {
        cutThoughtProbability: Math.min(0.4, baseTexture.cutThoughtProbability * 1.8),
        restartProbability: Math.min(0.2, baseTexture.restartProbability * 1.5),
        pauseProbability: Math.min(0.45, baseTexture.pauseProbability * 1.6),
        repetitionProbability: baseTexture.repetitionProbability,
        asymmetry: Math.min(0.6, baseTexture.asymmetry * 1.4),
      };
    case "intro":
    case "outro":
      return {
        cutThoughtProbability: 0.25,
        restartProbability: 0.15,
        pauseProbability: 0.35,
        repetitionProbability: 0.2,
        asymmetry: 0.5,
      };
    default:
      return baseTexture;
  }
}

/**
 * Canonical 5-layer Musical DNA catalog for artists across all genres & eras.
 */
export const ARTIST_PRESETS: Record<string, ArtistPreset> = {
  // --- 2000s LEGENDS ---
  "2chainz": {
    id: "2chainz",
    name: "2 Chainz",
    origin: "Atlanta",
    dna: {
      flow: {
        cadenceType: "bounce_sparse",
        avgSyllablesPerBar: [8, 11],
        wordsPerBarLimit: [4, 7],
        syncopation: 0.72,
        pauseFrequency: 0.32,
        phraseLengthVariance: 0.55,
        offBeatPreference: 0.65,
      },
      writing: {
        rhymeComplexity: "internal_balanced",
        imageryDensity: 0.88,
        directness: 0.85,
        metaphorDensity: 0.82,
        repetitionTolerance: 0.75,
        narrativeDensity: 0.45,
      },
      vocal: {
        adlibDensity: 0.6,
        adlibStyle: "dialectic_pingpong",
        allowBreathTags: true,
        allowVocalCuts: true,
        melodicRange: "conversational_baritone",
        sunoVocalTimbre: "charismatic southern male drawl, animated punchline delivery, playful elastic bounce",
      },
      lexical: {
        streetGritty: 0.65,
        luxuryCold: 0.95,
        conversationalRaw: 0.85,
        intimateParanoid: 0.25,
        technicalIncompatiblePenalty: 0.9,
      },
      humanTexture: {
        cutThoughtProbability: 0.14,
        restartProbability: 0.08,
        pauseProbability: 0.25,
        repetitionProbability: 0.12,
        asymmetry: 0.42,
      },
    },
  },
  lil_wayne: {
    id: "lil_wayne",
    name: "Lil Wayne",
    origin: "New Orleans",
    dna: {
      flow: {
        cadenceType: "multisyllabic_dense",
        avgSyllablesPerBar: [11, 15],
        syncopation: 0.82,
        pauseFrequency: 0.2,
        phraseLengthVariance: 0.68,
        offBeatPreference: 0.75,
      },
      writing: {
        rhymeComplexity: "multisyllabic_surgical",
        imageryDensity: 0.94,
        directness: 0.8,
        metaphorDensity: 0.96,
        repetitionTolerance: 0.4,
        narrativeDensity: 0.65,
      },
      vocal: {
        adlibDensity: 0.5,
        adlibStyle: "textured",
        allowBreathTags: true,
        allowVocalCuts: true,
        melodicRange: "melodic_autotune",
        sunoVocalTimbre: "high raspy southern nasal male vocal, fluid auto-tune warble, razor-sharp multi-syllabic articulation",
      },
      lexical: {
        streetGritty: 0.9,
        luxuryCold: 0.85,
        conversationalRaw: 0.9,
        intimateParanoid: 0.55,
        technicalIncompatiblePenalty: 0.85,
      },
      humanTexture: {
        cutThoughtProbability: 0.16,
        restartProbability: 0.1,
        pauseProbability: 0.18,
        repetitionProbability: 0.08,
        asymmetry: 0.48,
      },
    },
  },
  "50_cent": {
    id: "50_cent",
    name: "50 Cent",
    origin: "Queens/NYC",
    dna: {
      flow: {
        cadenceType: "minimalist_cold",
        avgSyllablesPerBar: [8, 10],
        syncopation: 0.45,
        pauseFrequency: 0.28,
        phraseLengthVariance: 0.35,
        offBeatPreference: 0.35,
      },
      writing: {
        rhymeComplexity: "internal_balanced",
        imageryDensity: 0.85,
        directness: 0.95,
        metaphorDensity: 0.55,
        repetitionTolerance: 0.85,
        narrativeDensity: 0.8,
      },
      vocal: {
        adlibDensity: 0.45,
        adlibStyle: "textured",
        allowBreathTags: true,
        allowVocalCuts: false,
        melodicRange: "conversational_baritone",
        sunoVocalTimbre: "deep laid-back New York baritone male vocal, melodic street hooks, menacing relaxed smirk cadence",
      },
      lexical: {
        streetGritty: 0.95,
        luxuryCold: 0.8,
        conversationalRaw: 0.85,
        intimateParanoid: 0.65,
        technicalIncompatiblePenalty: 0.92,
      },
      humanTexture: {
        cutThoughtProbability: 0.08,
        restartProbability: 0.04,
        pauseProbability: 0.22,
        repetitionProbability: 0.06,
        asymmetry: 0.25,
      },
    },
  },
  rick_ross: {
    id: "rick_ross",
    name: "Rick Ross",
    origin: "Miami",
    dna: {
      flow: {
        cadenceType: "baritone_low_density",
        avgSyllablesPerBar: [7, 9],
        syncopation: 0.35,
        pauseFrequency: 0.35,
        phraseLengthVariance: 0.4,
        offBeatPreference: 0.25,
      },
      writing: {
        rhymeComplexity: "street_direct",
        imageryDensity: 0.96,
        directness: 0.85,
        metaphorDensity: 0.75,
        repetitionTolerance: 0.65,
        narrativeDensity: 0.7,
      },
      vocal: {
        adlibDensity: 0.5,
        adlibStyle: "textured",
        allowBreathTags: true,
        allowVocalCuts: true,
        melodicRange: "operatic_cinematic",
        sunoVocalTimbre: "commanding operatic baritone male vocal, deep chest resonance, heavy cinematic luxury drawl with signature ugh grunts",
      },
      lexical: {
        streetGritty: 0.85,
        luxuryCold: 1.0,
        conversationalRaw: 0.75,
        intimateParanoid: 0.4,
        technicalIncompatiblePenalty: 0.95,
      },
      humanTexture: {
        cutThoughtProbability: 0.1,
        restartProbability: 0.04,
        pauseProbability: 0.3,
        repetitionProbability: 0.08,
        asymmetry: 0.3,
      },
    },
  },

  // --- CONTEMPORARY US & DRILL ---
  maxo_kream: {
    id: "maxo_kream",
    name: "Maxo Kream",
    origin: "Houston",
    dna: {
      flow: {
        cadenceType: "baritone_low_density",
        avgSyllablesPerBar: [8, 12],
        syncopation: 0.65,
        pauseFrequency: 0.32,
        phraseLengthVariance: 0.52,
        offBeatPreference: 0.5,
      },
      writing: {
        rhymeComplexity: "multisyllabic_surgical",
        imageryDensity: 0.95,
        directness: 0.92,
        metaphorDensity: 0.7,
        repetitionTolerance: 0.35,
        narrativeDensity: 0.95,
      },
      vocal: {
        adlibDensity: 0.35,
        adlibStyle: "minimal_clean",
        allowBreathTags: true,
        allowVocalCuts: true,
        melodicRange: "conversational_baritone",
        sunoVocalTimbre: "deep resonant Houston baritone male vocal, heavy laid-back cadence, authentic street storytelling",
      },
      lexical: {
        streetGritty: 0.96,
        luxuryCold: 0.75,
        conversationalRaw: 0.9,
        intimateParanoid: 0.8,
        technicalIncompatiblePenalty: 0.95,
      },
      humanTexture: {
        cutThoughtProbability: 0.12,
        restartProbability: 0.06,
        pauseProbability: 0.26,
        repetitionProbability: 0.07,
        asymmetry: 0.38,
      },
    },
  },
  g_herbo: {
    id: "g_herbo",
    name: "G-Herbo",
    origin: "Chicago",
    dna: {
      flow: {
        cadenceType: "offbeat_urgent",
        avgSyllablesPerBar: [10, 14],
        syncopation: 0.88,
        pauseFrequency: 0.22,
        phraseLengthVariance: 0.65,
        offBeatPreference: 0.86,
      },
      writing: {
        rhymeComplexity: "internal_balanced",
        imageryDensity: 0.92,
        directness: 0.98,
        metaphorDensity: 0.6,
        repetitionTolerance: 0.3,
        narrativeDensity: 0.9,
      },
      vocal: {
        adlibDensity: 0.4,
        adlibStyle: "textured",
        allowBreathTags: true,
        allowVocalCuts: true,
        melodicRange: "conversational_baritone",
        sunoVocalTimbre: "urgent raspy aggressive Chicago male vocal, raw off-beat street delivery, PTSD intensity",
      },
      lexical: {
        streetGritty: 1.0,
        luxuryCold: 0.65,
        conversationalRaw: 0.95,
        intimateParanoid: 0.92,
        technicalIncompatiblePenalty: 0.98,
      },
      humanTexture: {
        cutThoughtProbability: 0.15,
        restartProbability: 0.12,
        pauseProbability: 0.2,
        repetitionProbability: 0.09,
        asymmetry: 0.55,
      },
    },
  },
  "21_savage": {
    id: "21_savage",
    name: "21 Savage",
    origin: "Atlanta",
    dna: {
      flow: {
        cadenceType: "minimalist_cold",
        avgSyllablesPerBar: [6, 8],
        syncopation: 0.3,
        pauseFrequency: 0.38,
        phraseLengthVariance: 0.28,
        offBeatPreference: 0.25,
      },
      writing: {
        rhymeComplexity: "street_direct",
        imageryDensity: 0.82,
        directness: 0.96,
        metaphorDensity: 0.45,
        repetitionTolerance: 0.8,
        narrativeDensity: 0.6,
      },
      vocal: {
        adlibDensity: 0.3,
        adlibStyle: "minimal_clean",
        allowBreathTags: true,
        allowVocalCuts: false,
        melodicRange: "monotone_cold",
        sunoVocalTimbre: "deep monotone whisper rap, cold staccato delivery, menacing deadpan male vocal",
      },
      lexical: {
        streetGritty: 0.95,
        luxuryCold: 0.8,
        conversationalRaw: 0.88,
        intimateParanoid: 0.7,
        technicalIncompatiblePenalty: 0.95,
      },
      humanTexture: {
        cutThoughtProbability: 0.06,
        restartProbability: 0.03,
        pauseProbability: 0.32,
        repetitionProbability: 0.05,
        asymmetry: 0.22,
      },
    },
  },
  gunna: {
    id: "gunna",
    name: "Gunna",
    origin: "Atlanta",
    dna: {
      flow: {
        cadenceType: "bounce_sparse",
        avgSyllablesPerBar: [8, 10],
        wordsPerBarLimit: [3, 6],
        syncopation: 0.76,
        pauseFrequency: 0.34,
        phraseLengthVariance: 0.42,
        offBeatPreference: 0.72,
      },
      writing: {
        rhymeComplexity: "internal_balanced",
        imageryDensity: 0.88,
        directness: 0.75,
        metaphorDensity: 0.68,
        repetitionTolerance: 0.75,
        narrativeDensity: 0.4,
      },
      vocal: {
        adlibDensity: 0.55,
        adlibStyle: "textured",
        allowBreathTags: true,
        allowVocalCuts: true,
        melodicRange: "melodic_autotune",
        sunoVocalTimbre: "smooth melodic male vocal, effortless clean auto-tune, luxury drip cadence",
      },
      lexical: {
        streetGritty: 0.6,
        luxuryCold: 0.98,
        conversationalRaw: 0.8,
        intimateParanoid: 0.35,
        technicalIncompatiblePenalty: 0.9,
      },
      humanTexture: {
        cutThoughtProbability: 0.09,
        restartProbability: 0.04,
        pauseProbability: 0.28,
        repetitionProbability: 0.08,
        asymmetry: 0.32,
      },
    },
  },
  eladio_carrion: {
    id: "eladio_carrion",
    name: "Eladio Carrión",
    origin: "Puerto Rico",
    dna: {
      flow: {
        cadenceType: "multisyllabic_dense",
        avgSyllablesPerBar: [9, 13],
        syncopation: 0.75,
        pauseFrequency: 0.25,
        phraseLengthVariance: 0.45,
        offBeatPreference: 0.6,
      },
      writing: {
        rhymeComplexity: "multisyllabic_surgical",
        imageryDensity: 0.9,
        directness: 0.88,
        metaphorDensity: 0.85,
        repetitionTolerance: 0.5,
        narrativeDensity: 0.75,
      },
      vocal: {
        adlibDensity: 0.45,
        adlibStyle: "dialectic_pingpong",
        allowBreathTags: true,
        allowVocalCuts: true,
        melodicRange: "conversational_baritone",
        sunoVocalTimbre: "confident energetic Latin trap male vocal, athletic American cadence in Spanish, punchy delivery",
      },
      lexical: {
        streetGritty: 0.85,
        luxuryCold: 0.85,
        conversationalRaw: 0.9,
        intimateParanoid: 0.5,
        technicalIncompatiblePenalty: 0.92,
      },
      humanTexture: {
        cutThoughtProbability: 0.1,
        restartProbability: 0.05,
        pauseProbability: 0.22,
        repetitionProbability: 0.06,
        asymmetry: 0.35,
      },
    },
  },
};

/**
 * Resolves the 5-layer Musical DNA for any given artist ID.
 * Returns a fallback balanced trap DNA if artist is not directly in the presets map.
 */
export function getMusicalDNAForArtist(artistId: string): MusicalDNA {
  if (ARTIST_PRESETS[artistId]) {
    return ARTIST_PRESETS[artistId].dna;
  }

  // Sensible default: Balanced Modern Atlanta Trap DNA
  return {
    flow: {
      cadenceType: "bounce_sparse",
      avgSyllablesPerBar: [8, 11],
      wordsPerBarLimit: [4, 7],
      syncopation: 0.65,
      pauseFrequency: 0.28,
      phraseLengthVariance: 0.45,
      offBeatPreference: 0.55,
    },
    writing: {
      rhymeComplexity: "internal_balanced",
      imageryDensity: 0.85,
      directness: 0.85,
      metaphorDensity: 0.65,
      repetitionTolerance: 0.65,
      narrativeDensity: 0.65,
    },
    vocal: {
      adlibDensity: 0.45,
      adlibStyle: "textured",
      allowBreathTags: true,
      allowVocalCuts: true,
      melodicRange: "conversational_baritone",
      sunoVocalTimbre: "modern melodic trap male vocal, autotune bounce",
    },
    lexical: {
      streetGritty: 0.8,
      luxuryCold: 0.8,
      conversationalRaw: 0.85,
      intimateParanoid: 0.5,
      technicalIncompatiblePenalty: 0.9,
    },
    humanTexture: {
      cutThoughtProbability: 0.1,
      restartProbability: 0.05,
      pauseProbability: 0.22,
      repetitionProbability: 0.07,
      asymmetry: 0.35,
    },
  };
}

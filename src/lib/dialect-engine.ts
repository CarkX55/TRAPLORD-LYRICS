/**
 * REGLA DE ORO DE TRAPLORD DIALECT ENGINE:
 * Nunca uses el conocimiento dialectal como una lista de palabras que el modelo debe insertar.
 * Úsalo como un espacio de características lingüísticas que el modelo debe realizar naturalmente.
 */

import { type SongDocument, type SongBar } from "./song-document";
import { getArtistById } from "./trap-data";

export type SpanishFlavor =
  | "auto"
  | "puerto_rico"
  | "spain"
  | "mexico"
  | "dominican"
  | "argentina"
  | "neutral_latam";

export type DialectSignalStrength = "strong" | "moderate" | "weak";

export interface SpanishFlavorProfile {
  flavor: SpanishFlavor;
  label: string;
  flag: string;
  region: string;
  linguisticDescription: string;
  syntaxCharacteristics: string[];
  phoneticCharacteristics: string[];
  culturalRegister: string[];

  // SOLO PARA EL AUDITOR / DETECTOR (NO SE INYECTAN EN EL PROMPT DE GENERACIÓN)
  strongRegionalMarkers: string[];
  weakRegionalMarkers: string[];
  contaminationMarkers: string[];
}

export interface SpeakerDialectProfile {
  artistId: string;
  primaryLanguage: "en" | "es";
  primaryDialect: string;

  englishRegister: {
    dialectName: string;
    description: string;
    syntaxGuidelines: string[];
    antiTranslationRules: string[];
  };

  spanishRegister: {
    defaultFlavor: SpanishFlavor;
    description: string;
    syntaxGuidelines: string[];
    antiTranslationRules: string[];
  };

  codeSwitchStyle: CodeSwitchStyle;

  dialectConfidence: number; // 0.0 to 1.0
}

export type CodeSwitchStyle =
  | "smooth"
  | "punctuated"
  | "bar_end"
  | "phrase_swap"
  | "bilingual_flow";

// ---------------------------------------------------------------------------
// Catálogo de Sabores de Español (Spanish Flavor)
// ---------------------------------------------------------------------------

export const SPANISH_FLAVOR_CATALOG: Record<SpanishFlavor, SpanishFlavorProfile> = {
  auto: {
    flavor: "auto",
    label: "Automático (Según Artista / Escena)",
    flag: "⚡",
    region: "Contextual",
    linguisticDescription: "Resolución contextual adaptada al origen del artista principal o al marco del proyecto.",
    syntaxCharacteristics: ["Cadencia urbana adaptada", "Estructura coloquial fluida"],
    phoneticCharacteristics: ["Articulación natural según intérprete"],
    culturalRegister: ["Trap urbano contemporáneo"],
    strongRegionalMarkers: [],
    weakRegionalMarkers: [],
    contaminationMarkers: [],
  },

  puerto_rico: {
    flavor: "puerto_rico",
    label: "Puerto Rico / Drill Caribeño",
    flag: "🇵🇷",
    region: "Puerto Rico / Caribe Urbano",
    linguisticDescription: "Drill boricua, Glizzy Gang/Caserío, compresión conversacional caribeña, anglicismos orgánicos de hip-hop y métrica sincopada.",
    syntaxCharacteristics: [
      "Compresión conversacional caribeña (elisión de sílabas finales y enlace fluido entre compases)",
      "Préstamos naturales del inglés de hip-hop sin traducción forzada (anglicismos integrados al habla cotidiana)",
      "Estructuras afirmativas directas, tono amenazante callejero y punchlines cortas",
    ],
    phoneticCharacteristics: [
      "Aspiración de sibilantes en posición final",
      "Cadencia rítmica percusiva adaptada a sliding 808s",
    ],
    culturalRegister: [
      "Caserío, lealtad de combo, piquete, códigos nocturnos y drill caribeño",
    ],
    strongRegionalMarkers: [
      "caserio", "caserío", "piquete", "bichote", "chavos", "moña", "krippy", "corta", "glizzy", "palo", "josear", "corillo",
    ],
    weakRegionalMarkers: [
      "carro", "guagua", "cabron", "cabrón", "diablo", "flow", "ticket", "combos",
    ],
    contaminationMarkers: [
      "coche", "chaval", "tio", "tío", "novato", "novatos", "pasta", "molar", "curro", "guiri", "zeta", "flipar", "pesetas",
    ],
  },

  spain: {
    flavor: "spain",
    label: "España / Peninsular & Bando",
    flag: "🇪🇸",
    region: "España (Madrid / Barcelona / Sur)",
    linguisticDescription: "Trap callejero peninsular con influencias de barrio multicultural, léxico crudo y cadencia agresiva.",
    syntaxCharacteristics: [
      "Fraseo directo de barrio peninsular con modismos multinacionales",
      "Terminaciones cerradas y consonantes marcadas",
      "Metáforas de supervivencia barrial y lealtad incondicional",
    ],
    phoneticCharacteristics: [
      "Distinción sibilante peninsular y consonantes oclusivas secas",
    ],
    culturalRegister: [
      "Bando, polígonos, motorolas, lealtad entre hermanos y desconfianza de la autoridad",
    ],
    strongRegionalMarkers: [
      "bando", "buga", "motorola", "guita", "queo", "calo", "chandal", "chándal", "plomo",
    ],
    weakRegionalMarkers: [
      "chaval", "tio", "tío", "hermano", "kilo", "movida", "pique",
    ],
    contaminationMarkers: [
      "glizzy", "caserio", "caserío", "bichote", "chavos", "guagua", "placoso", "wacho",
    ],
  },

  mexico: {
    flavor: "mexico",
    label: "México / Bélico & Callejero",
    flag: "🇲🇽",
    region: "México Urbano / Frontera",
    linguisticDescription: "Slang urbano mexicano, rítmica de barrio fronterizo, trap contemporáneo y crudeza callejera.",
    syntaxCharacteristics: [
      "Vocabulario callejero fronterizo y métrica directa",
      "Énfasis en respeto, código de palabra y territorio",
    ],
    phoneticCharacteristics: [
      "Cadencia vocal clara y percusiva con modulaciones melódicas",
    ],
    culturalRegister: [
      "Barrio fronterizo, fletes, código de honor, feria y trocas",
    ],
    strongRegionalMarkers: [
      "troca", "feria", "morra", "placoso", "belicon", "belicón", "jale", "machin", "machín", "flete",
    ],
    weakRegionalMarkers: [
      "fierro", "ranfla", "carnal", "simon", "simón", "paro",
    ],
    contaminationMarkers: [
      "coche", "chaval", "tio", "tío", "novatos", "zeta", "guiri", "chavos",
    ],
  },

  dominican: {
    flavor: "dominican",
    label: "República Dominicana / Dembow & Drill",
    flag: "🇩🇴",
    region: "Santo Domingo / Dembow",
    linguisticDescription: "Tigueraje dominicano, cadencia acelerada, drill/dembow urbano con alta energía y contrastes.",
    syntaxCharacteristics: [
      "Fraseo ultra-rápido y sincopado con saltos rítmicos",
      "Contracciones callejeras dominicanas",
    ],
    phoneticCharacteristics: [
      "Elisiones vocálicas rápidas y entonación melódica vivaz",
    ],
    culturalRegister: [
      "Tigueraje, capea, coro barrial y flex caribeño",
    ],
    strongRegionalMarkers: [
      "cualto", "capea", "popi", "tiguere", "tíguere", "wa", "matatan", "matatán", "greña",
    ],
    weakRegionalMarkers: [
      "coro", "freno", "mami", "pila", "dique",
    ],
    contaminationMarkers: [
      "coche", "chaval", "tio", "tío", "zeta", "guiri",
    ],
  },

  argentina: {
    flavor: "argentina",
    label: "Argentina / Rioplatense & Modo Diablo",
    flag: "🇦🇷",
    region: "Buenos Aires / Conurbano",
    linguisticDescription: "Trap argentino, slang rioplatense, barras incisivas, entonación sureña y juegos de palabras.",
    syntaxCharacteristics: [
      "Fraseo rioplatense con acentuación en pronombres y verbos",
      "Uso de metáforas cínicas y barras introspectivas",
    ],
    phoneticCharacteristics: [
      "Yeísmo rehilado y cadencia melódica marcada",
    ],
    culturalRegister: [
      "Modo diablo, rancho, quilombo, esquina y flex underground",
    ],
    strongRegionalMarkers: [
      "wacho", "quilombo", "rancho", "corte", "bondi", "pibe", "che", "gil",
    ],
    weakRegionalMarkers: [
      "fierro", "pariseo", "rescatate", "plata", "careta",
    ],
    contaminationMarkers: [
      "coche", "chaval", "tio", "tío", "zeta", "guiri", "chavos", "guagua",
    ],
  },

  neutral_latam: {
    flavor: "neutral_latam",
    label: "Pan-Latino / Neutral Urbano",
    flag: "🌎",
    region: "Hispanoamérica Internacional",
    linguisticDescription: "Español urbano pan-latino, sin modismos hiper-locales impenetrables pero 100% fiel a la cultura callejera del hip-hop.",
    syntaxCharacteristics: [
      "Léxico accesible en todo el mercado hispanohablante",
      "Uso estándar de modismos de trap internacional (carro, dinero, calle, negocio, flow)",
      "Prohibición de localismos regionales cerrados",
    ],
    phoneticCharacteristics: [
      "Pronunciación urbana pulida sin aspiraciones excesivas",
    ],
    culturalRegister: [
      "Hustle global, superación, códigos urbanos y autenticidad",
    ],
    strongRegionalMarkers: [
      "carro", "negocio", "hustle", "feria", "barras", "hermanos",
    ],
    weakRegionalMarkers: [
      "calle", "dinero", "combis", "flow", "gang",
    ],
    contaminationMarkers: [
      "coche", "chaval", "tio", "tío", "zeta", "curro", "molar", "flipar", "guiri",
    ],
  },
};

// ---------------------------------------------------------------------------
// Catálogo de Speaker Dialect Profiles
// ---------------------------------------------------------------------------

export const SPEAKER_DIALECT_CATALOG: Record<string, SpeakerDialectProfile> = {
  // --- ATLANTA AAVE TRAP ---
  offset: {
    artistId: "offset",
    primaryLanguage: "en",
    primaryDialect: "Atlanta US Trap / AAVE (Migos Triplet)",
    dialectConfidence: 0.95,
    englishRegister: {
      dialectName: "Atlanta AAVE Triplet Flow",
      description: "Cadencia percusiva de Atlanta, fraseo en tresillos, contracciones coloquiales y lenguaje de status/calle.",
      syntaxGuidelines: [
        "Compressed colloquial syntax with authentic AAVE street grammar",
        "Conversational contractions (ain't, tryna, gotta, lemme, watchu)",
        "Scene-motivated status and street phrasing (motion, racks, opps, spin the block, bando, flooded wrist, stand on business, straight out the mud)",
      ],
      antiTranslationRules: [
        "Never translate English hip-hop idioms literally into Spanish or vice versa.",
        "Keep native English flow natural without academic or dictionary phrasing.",
      ],
    },
    spanishRegister: {
      defaultFlavor: "puerto_rico",
      description: "Incursiones melódicas o punchlines breves en español urbano caribeño cuando el ratio lo requiere.",
      syntaxGuidelines: [
        "When spitting Spanish bars due to language mix ratio, use punchy Caribbean street syntax",
        "Keep expressions concise and natural without literal translation of American idioms",
      ],
      antiTranslationRules: [
        "Do not translate English sports terms or idioms literally into Spanish (e.g. keep 'hoopin' in the league', never literal word-for-word).",
      ],
    },
    codeSwitchStyle: "bar_end",
  },

  future: {
    artistId: "future",
    primaryLanguage: "en",
    primaryDialect: "Atlanta US Trap / Freebandz Melodic",
    dialectConfidence: 0.95,
    englishRegister: {
      dialectName: "Atlanta Melodic Slur AAVE",
      description: "Voz arrastrada, auto-tune hipnótico, toxic trap, lujos y cicatrices callejeras.",
      syntaxGuidelines: [
        "Slurred conversational phrasing with melodic trailing vowels",
        "AAVE grammar and luxury-pain dichotomy (Codeine, AP flooded, heartbroken trapper)",
      ],
      antiTranslationRules: ["Preserve toxic trap metaphors natively."],
    },
    spanishRegister: {
      defaultFlavor: "puerto_rico",
      description: "Spanish loanwords and brief dark atmospheric punchlines.",
      syntaxGuidelines: ["Atmospheric street Spanish punches."],
      antiTranslationRules: ["Never translate toxic street metaphors literally."],
    },
    codeSwitchStyle: "bar_end",
  },

  "21_savage": {
    artistId: "21_savage",
    primaryLanguage: "en",
    primaryDialect: "Atlanta Zone 6 Cold Delivery",
    dialectConfidence: 0.95,
    englishRegister: {
      dialectName: "Zone 6 Deadpan Staccato",
      description: "Violencia fría, tono monótono amenazante, números exactos y crudeza.",
      syntaxGuidelines: [
        "Short, chilling declarative sentences with understated menace",
        "Specific counts and weapons (Glock with a switch, 21, slaughter gang)",
      ],
      antiTranslationRules: ["Cold delivery without melodrama."],
    },
    spanishRegister: {
      defaultFlavor: "puerto_rico",
      description: "Deadpan street Spanish phrases.",
      syntaxGuidelines: ["Minimalist cold statements."],
      antiTranslationRules: ["Zero exaggerated slang."],
    },
    codeSwitchStyle: "phrase_swap",
  },

  // --- PUERTO RICO DRILL / LATIN TRAP ---
  yovngchimi: {
    artistId: "yovngchimi",
    primaryLanguage: "es",
    primaryDialect: "Puerto Rico Drill / Glizzy Gang Caserío",
    dialectConfidence: 0.98,
    englishRegister: {
      dialectName: "US Drill Borrowings",
      description: "Anglicismos de drill agresivo (demon, stick, opps, gang, switch).",
      syntaxGuidelines: [
        "Seamless integration of American drill terminology into Spanish flow",
      ],
      antiTranslationRules: [
        "Never translate drill loanwords back to Spanish (keep stick, opps, gang).",
      ],
    },
    spanishRegister: {
      defaultFlavor: "puerto_rico",
      description: "Drill boricua crudo, demoníaco, Glizzy Gang de Carolina/Santurce.",
      syntaxGuidelines: [
        "Authentic Puerto Rican street slang (carro, corta, palo, glizzy, caserío, moña, pasto, krippy)",
        "Elisiones caribeñas naturales (to', pa', prendía, metía)",
      ],
      antiTranslationRules: [
        "Strictly avoid peninsular Spanish terms (no coche, no chaval, no novatos, no zeta).",
      ],
    },
    codeSwitchStyle: "bilingual_flow",
  },

  anuel_aa: {
    artistId: "anuel_aa",
    primaryLanguage: "es",
    primaryDialect: "Puerto Rico Latin Trap / Real Hasta La Muerte",
    dialectConfidence: 0.95,
    englishRegister: {
      dialectName: "Spanglish Street Ad-libs",
      description: "Slang americano integrado al malianteo boricua.",
      syntaxGuidelines: ["Street English loanwords in punchlines."],
      antiTranslationRules: ["Keep English terms in original hip-hop syntax."],
    },
    spanishRegister: {
      defaultFlavor: "puerto_rico",
      description: "Latin trap puro, cárcel, calle, flex de prendas y pistolas.",
      syntaxGuidelines: [
        "Vocabulario boricua auténtico (carro, caserío, lambebicho, corta, diablo)",
      ],
      antiTranslationRules: ["Avoid European Spanish phrasing."],
    },
    codeSwitchStyle: "bilingual_flow",
  },

  // --- SPAIN STREET / BANDO ---
  morad: {
    artistId: "morad",
    primaryLanguage: "es",
    primaryDialect: "España / Bando & Florida Barrio",
    dialectConfidence: 0.95,
    englishRegister: {
      dialectName: "European Multicultural Slang",
      description: "Loanwords internacionales mínimos, narrativa local de calle.",
      syntaxGuidelines: ["Direct storytelling without forced Americanisms."],
      antiTranslationRules: ["Preserve European street narrative."],
    },
    spanishRegister: {
      defaultFlavor: "spain",
      description: "Barrio español, exclusión, lealtad de motorola, buga y bando.",
      syntaxGuidelines: [
        "Peninsular street vocabulary (bando, buga, chándal, motorola, lealtad)",
      ],
      antiTranslationRules: ["Do not force Caribbean idioms onto peninsular narrative."],
    },
    codeSwitchStyle: "punctuated",
  },

  yung_beef: {
    artistId: "yung_beef",
    primaryLanguage: "es",
    primaryDialect: "España / 2001 Raw Street",
    dialectConfidence: 0.95,
    englishRegister: {
      dialectName: "Raw Lo-Fi Spanglish",
      description: "Spanglish callejero sucio y underground.",
      syntaxGuidelines: ["Raw underground slang."],
      antiTranslationRules: ["Avoid polished commercial syntax."],
    },
    spanishRegister: {
      defaultFlavor: "spain",
      description: "Underground español crudo, kekos, 2001, sin filtros.",
      syntaxGuidelines: ["Barrio crudo peninsular."],
      antiTranslationRules: ["Maintain gritty authentic delivery."],
    },
    codeSwitchStyle: "bilingual_flow",
  },

  // --- UK DRILL ---
  central_cee: {
    artistId: "central_cee",
    primaryLanguage: "en",
    primaryDialect: "UK Drill / West London",
    dialectConfidence: 0.95,
    englishRegister: {
      dialectName: "London UK Drill Slang",
      description: "Slang británico londinense, cadencia sincopada rápida y juegos de palabras.",
      syntaxGuidelines: [
        "British street slang (mandem, bruv, ends, trap, whip, link)",
        "Fast conversational cadence with unexpected internal rhymes",
      ],
      antiTranslationRules: ["Do not Americanize distinct British expressions."],
    },
    spanishRegister: {
      defaultFlavor: "neutral_latam",
      description: "Crossover lines with catchy melodic Spanish phrases.",
      syntaxGuidelines: ["Simple, catchy Spanish punchlines."],
      antiTranslationRules: ["Keep Spanish bars melodic and direct."],
    },
    codeSwitchStyle: "bar_end",
  },
};

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

/**
 * Resolves the SpeakerDialectProfile for an artist, with fallback based on origin.
 */
export function resolveSpeakerDialectProfile(artistId: string): SpeakerDialectProfile {
  if (SPEAKER_DIALECT_CATALOG[artistId]) {
    return SPEAKER_DIALECT_CATALOG[artistId];
  }

  const artist = getArtistById(artistId);
  const origin = (artist?.origin ?? "").toLowerCase();

  // Inference from origin
  if (origin.includes("puerto rico") || origin.includes("pr") || origin.includes("caribe")) {
    return {
      artistId,
      primaryLanguage: "es",
      primaryDialect: "Puerto Rico / Caribe Urbano",
      dialectConfidence: 0.8,
      englishRegister: {
        dialectName: "Caribbean Spanglish",
        description: "English hip-hop loanwords integrated into Caribbean flow.",
        syntaxGuidelines: ["Natural hip-hop slang without forced translation"],
        antiTranslationRules: ["Preserve original English terms."],
      },
      spanishRegister: {
        defaultFlavor: "puerto_rico",
        description: "Español urbano caribeño auténtico.",
        syntaxGuidelines: ["Calle boricua natural, contracciones caribeñas"],
        antiTranslationRules: ["Avoid peninsular phrasing."],
      },
      codeSwitchStyle: "bilingual_flow",
    };
  }

  if (origin.includes("españa") || origin.includes("spain") || origin.includes("barcelona") || origin.includes("madrid") || origin.includes("hospitalet")) {
    return {
      artistId,
      primaryLanguage: "es",
      primaryDialect: "España / Peninsular Urbano",
      dialectConfidence: 0.8,
      englishRegister: {
        dialectName: "European Street Borrowings",
        description: "Selective hip-hop loanwords.",
        syntaxGuidelines: ["Direct phrasing with selective English terms"],
        antiTranslationRules: ["Avoid forced American slang."],
      },
      spanishRegister: {
        defaultFlavor: "spain",
        description: "Español de barrio peninsular.",
        syntaxGuidelines: ["Léxico urbano peninsular (bando, buga, lealtad)"],
        antiTranslationRules: ["Do not force Caribbean slang."],
      },
      codeSwitchStyle: "punctuated",
    };
  }

  if (origin.includes("london") || origin.includes("uk") || origin.includes("brit")) {
    return {
      artistId,
      primaryLanguage: "en",
      primaryDialect: "UK Drill / London",
      dialectConfidence: 0.8,
      englishRegister: {
        dialectName: "London UK Drill",
        description: "London multicultural slang and fast syncopation.",
        syntaxGuidelines: ["Authentic UK street vocabulary (mandem, bruv, whip)"],
        antiTranslationRules: ["Do not replace UK slang with US clichés."],
      },
      spanishRegister: {
        defaultFlavor: "neutral_latam",
        description: "Clean Latin urban Spanish for crossover bars.",
        syntaxGuidelines: ["Catchy, simple Spanish punches"],
        antiTranslationRules: ["Direct melodic phrases."],
      },
      codeSwitchStyle: "bar_end",
    };
  }

  // Default: Atlanta / US Trap
  return {
    artistId,
    primaryLanguage: "en",
    primaryDialect: "US Trap / AAVE",
    dialectConfidence: 0.75,
    englishRegister: {
      dialectName: "Contemporary US Trap",
      description: "Authentic colloquial syntax, street contractions and status imagery.",
      syntaxGuidelines: [
        "Compressed colloquial syntax with contemporary street vocabulary",
        "Conversational contractions (ain't, tryna, gotta)",
      ],
      antiTranslationRules: [
        "Do not translate English idioms word-for-word into Spanish.",
      ],
    },
    spanishRegister: {
      defaultFlavor: "puerto_rico",
      description: "Urban Latin Spanish for bilingual sections.",
      syntaxGuidelines: ["Natural Latin urban phrasing without awkward translation"],
      antiTranslationRules: ["Never translate idioms literally."],
    },
    codeSwitchStyle: "bar_end",
  };
}

export type AllocationStatus = "FEASIBLE" | "CLAMPED" | "INFEASIBLE";

export interface SectionLanguageAllocation {
  sectionId: string;
  sectionName: string;
  voiceId: string;
  preferredEnglishRatio: number;
  flexibility: number;
  syllableWeight: number; // W_i = expectedSyllables_i / totalExpectedSyllables
  expectedSyllables: number; // expectedSyllables_i = bars_i * expectedSyllablesPerBar_i
  linguisticBounds: { min: number; max: number }; // [l_i, u_i]
  codeSwitchStyle: CodeSwitchStyle;
  targetGuideline: string;
}

export interface LanguageAllocationPlan {
  targetEnglishRatio: number;
  effectiveTargetEnglishRatio: number; // T_eff = clip(T, T_min, T_max)
  predictedEnglishRatio: number; // sum W_i * r_i = T_eff
  observedEnglishRatio?: number;
  allocationStatus: AllocationStatus;
  boundaryConstraintActive: boolean; // exists i: r_i == l_i || r_i == u_i
  achievableRange: {
    min: number; // T_min = sum W_i * l_i
    max: number; // T_max = sum W_i * u_i
  };
  globalSoftBand: {
    min: number; // max(0, T - 0.05)
    max: number; // min(1, T + 0.05)
  };
  globalHardBand: {
    min: number; // max(0, T - 0.12)
    max: number; // min(1, T + 0.12)
  };
  allocationMode: "deterministic_voice_weighted" | "flexible_global";
  sections: SectionLanguageAllocation[];
}

/**
 * Expected average syllable density per bar according to section musical function.
 * Verses carry high narrative rap density; hooks/choruses are rhythmic and spacious;
 * intros/outros feature sparse spoken or ad-lib phrasing.
 */
export function getExpectedSyllablesPerBar(sectionType: string): number {
  const t = sectionType.toLowerCase();
  if (t === "intro" || t === "outro") return 7;
  if (t === "hook" || t === "chorus" || t === "bridge") return 9;
  return 14; // verse / dense rap delivery
}

/**
 * Builds a deterministic, voice-weighted Language Allocation Plan.
 *
 * SOLVER FORMULATION (EXPLICIT TARGET PRESERVATION):
 *   Step 1 — Effective Target:
 *     T_eff = clip(T, T_min, T_max)
 *
 *   Step 2 — Optimization:
 *     min_r sum_i W_i * (r_i - p_i)^2
 *     subject to:  l_i <= r_i <= u_i
 *     and:         sum_i W_i * r_i = T_eff
 *
 * where:
 *   expectedSyllables_i = bars_i * expectedSyllablesPerBar_i
 *   W_i    = expected syllable mass (expectedSyllables_i / sum_j expectedSyllables_j)
 *   p_i    = voice linguistic preference for section i
 *   l_i    = lower linguistic bound for voice/section i
 *   u_i    = upper linguistic bound for voice/section i
 *   T      = targetEnglishRatio requested by UI
 *   T_min  = sum_i W_i * l_i (infimum of reachable global ratio)
 *   T_max  = sum_i W_i * u_i (supremum of reachable global ratio)
 *
 * FEASIBILITY STATUS (GLOBAL TARGET REACHABILITY):
 *   FEASIBLE:   T_min + eps < T < T_max - eps
 *   CLAMPED:    |T - T_min| <= eps  or  |T - T_max| <= eps
 *   INFEASIBLE: T < T_min - eps  or  T > T_max + eps
 *
 * INDIVIDUAL BOX CONSTRAINT STATUS:
 *   boundaryConstraintActive = exists i: (r_i == l_i || r_i == u_i)
 */
export function buildLanguageAllocationPlan(
  targetEnglishRatio: number,
  leadProfile: SpeakerDialectProfile,
  featureProfile: SpeakerDialectProfile | null,
  sections?: Array<{ id: string; name: string; type: string; voiceArtistId?: string; bars?: number }>
): LanguageAllocationPlan {
  const globalSoftBand = {
    min: Number(Math.max(0, targetEnglishRatio - 0.05).toFixed(2)),
    max: Number(Math.min(1, targetEnglishRatio + 0.05).toFixed(2)),
  };
  const globalHardBand = {
    min: Number(Math.max(0, targetEnglishRatio - 0.12).toFixed(2)),
    max: Number(Math.min(1, targetEnglishRatio + 0.12).toFixed(2)),
  };

  if (!sections || sections.length === 0) {
    return {
      targetEnglishRatio,
      effectiveTargetEnglishRatio: targetEnglishRatio,
      predictedEnglishRatio: targetEnglishRatio,
      allocationStatus: "FEASIBLE",
      boundaryConstraintActive: false,
      achievableRange: { min: 0.0, max: 1.0 },
      globalSoftBand,
      globalHardBand,
      allocationMode: "flexible_global",
      sections: [],
    };
  }

  // 1. Calculate section bar count and expected syllable mass (W_i)
  const sectionMetrics = sections.map(sec => {
    let bars = 16;
    if (sec.bars && sec.bars > 0) {
      bars = sec.bars;
    } else {
      const t = sec.type.toLowerCase();
      if (t === "intro" || t === "outro") bars = 4;
      else if (t === "hook" || t === "chorus" || t === "bridge") bars = 8;
    }
    const syllablesPerBar = getExpectedSyllablesPerBar(sec.type);
    const expectedSyllables = bars * syllablesPerBar;
    return { bars, syllablesPerBar, expectedSyllables };
  });

  const totalExpectedSyllables = sectionMetrics.reduce((sum, m) => sum + m.expectedSyllables, 0);
  const weights = sectionMetrics.map(m =>
    totalExpectedSyllables > 0 ? m.expectedSyllables / totalExpectedSyllables : 1 / sections.length
  );

  // 2. Determine voice linguistic box bounds [l_i, u_i] and natural baseline preference p_i
  const sectionConstraints = sections.map(sec => {
    const isFeature = Boolean(sec.voiceArtistId && featureProfile && sec.voiceArtistId === featureProfile.artistId);
    const voiceProfile = isFeature && featureProfile ? featureProfile : leadProfile;

    let lowerBound = 0.0;
    let upperBound = 1.0;
    let pref = targetEnglishRatio;

    if (voiceProfile.primaryLanguage === "en") {
      lowerBound = 0.20;
      upperBound = 1.00;
      pref = Math.min(upperBound, Math.max(0.35, targetEnglishRatio + 0.15));
    } else if (voiceProfile.primaryLanguage === "es") {
      lowerBound = 0.00;
      upperBound = 0.70;
      pref = Math.max(lowerBound, Math.min(0.65, targetEnglishRatio - 0.20));
    }

    return {
      voiceProfile,
      lowerBound,
      upperBound,
      preference: pref,
    };
  });

  // 3. Compute reachable global target space [T_min, T_max]
  const T_min = sectionConstraints.reduce((sum, c, i) => sum + c.lowerBound * weights[i], 0);
  const T_max = sectionConstraints.reduce((sum, c, i) => sum + c.upperBound * weights[i], 0);
  const achievableRange = {
    min: Number(T_min.toFixed(2)),
    max: Number(T_max.toFixed(2)),
  };

  // 4. Compute effective target: T_eff = clip(T, T_min, T_max)
  const T_eff = Math.max(T_min, Math.min(T_max, targetEnglishRatio));
  const effectiveTargetEnglishRatio = Number(T_eff.toFixed(2));

  // 5. Global allocationStatus classification based strictly on global target reachability
  const eps = 0.02;
  let allocationStatus: AllocationStatus;
  if (targetEnglishRatio < T_min - eps || targetEnglishRatio > T_max + eps) {
    allocationStatus = "INFEASIBLE";
  } else if (Math.abs(targetEnglishRatio - T_min) <= eps || Math.abs(targetEnglishRatio - T_max) <= eps) {
    allocationStatus = "CLAMPED";
  } else {
    allocationStatus = "FEASIBLE";
  }

  // 6. Constrained optimization solver: min_r sum W_i (r_i - p_i)^2 s.t. l_i <= r_i <= u_i and sum W_i r_i = T_eff
  let resolvedRatios: number[] = [];

  if (Math.abs(T_eff - T_min) < 1e-5) {
    // Saturated at minimum boundary
    resolvedRatios = sectionConstraints.map(c => c.lowerBound);
  } else if (Math.abs(T_eff - T_max) < 1e-5) {
    // Saturated at maximum boundary
    resolvedRatios = sectionConstraints.map(c => c.upperBound);
  } else {
    const rawPreferences = sectionConstraints.map(c => c.preference);
    const initialWeightedSum = rawPreferences.reduce((acc, p, i) => acc + p * weights[i], 0);
    const initialResidual = T_eff - initialWeightedSum;

    // Shift preferences by residual and project onto box [l_i, u_i]
    resolvedRatios = rawPreferences.map((p, i) => {
      const shifted = p + initialResidual;
      const c = sectionConstraints[i];
      return Math.max(c.lowerBound, Math.min(c.upperBound, shifted));
    });

    // Iterative redistribution over unclamped coordinates to preserve sum(W_i * r_i) = T_eff exactly
    for (let iter = 0; iter < 10; iter++) {
      const currentSum = resolvedRatios.reduce((acc, r, i) => acc + r * weights[i], 0);
      const residual = T_eff - currentSum;
      if (Math.abs(residual) <= 0.0001) break;

      const unclampedIndices = resolvedRatios
        .map((r, i) => ({ r, i, c: sectionConstraints[i] }))
        .filter(x => x.r > x.c.lowerBound + 0.0001 && x.r < x.c.upperBound - 0.0001)
        .map(x => x.i);

      if (unclampedIndices.length === 0) break;

      const unclampedWeightSum = unclampedIndices.reduce((sum, idx) => sum + weights[idx], 0);
      if (unclampedWeightSum <= 0.0001) break;

      for (const idx of unclampedIndices) {
        const c = sectionConstraints[idx];
        const step = residual * (weights[idx] / unclampedWeightSum);
        resolvedRatios[idx] = Math.max(c.lowerBound, Math.min(c.upperBound, resolvedRatios[idx] + step));
      }
    }
  }

  const finalWeightedSum = resolvedRatios.reduce((acc, r, i) => acc + r * weights[i], 0);
  const predictedEnglishRatio = Number(finalWeightedSum.toFixed(2));

  // 7. Separate diagnostic flag: boundaryConstraintActive (exists i: r_i == l_i || r_i == u_i)
  const boundaryConstraintActive = resolvedRatios.some((r, i) =>
    Math.abs(r - sectionConstraints[i].lowerBound) <= 0.005 ||
    Math.abs(r - sectionConstraints[i].upperBound) <= 0.005
  );

  // 8. Build output section allocations
  const sectionAllocations: SectionLanguageAllocation[] = sections.map((sec, i) => {
    const c = sectionConstraints[i];
    const finalRatio = Number(resolvedRatios[i].toFixed(2));
    const enPct = Math.round(finalRatio * 100);
    const esPct = 100 - enPct;
    const style = c.voiceProfile.codeSwitchStyle;

    return {
      sectionId: sec.id,
      sectionName: sec.name,
      voiceId: c.voiceProfile.artistId,
      preferredEnglishRatio: finalRatio,
      flexibility: 0.05,
      syllableWeight: Number(weights[i].toFixed(3)),
      expectedSyllables: sectionMetrics[i].expectedSyllables,
      linguisticBounds: {
        min: c.lowerBound,
        max: c.upperBound,
      },
      codeSwitchStyle: style,
      targetGuideline: `[${sec.name}] (${c.voiceProfile.artistId}): ~${enPct}% EN / ~${esPct}% ES (${c.voiceProfile.primaryDialect}, transición: ${style})`,
    };
  });

  return {
    targetEnglishRatio,
    effectiveTargetEnglishRatio,
    predictedEnglishRatio,
    allocationStatus,
    boundaryConstraintActive,
    achievableRange,
    globalSoftBand,
    globalHardBand,
    allocationMode: "deterministic_voice_weighted",
    sections: sectionAllocations,
  };
}

/**
 * Resolves the effective SpanishFlavor with strict universal cascading priority:
 * 1. Explicit user selection (requestedFlavor !== "auto")
 * 2. Project-level configuration (projectDefaultFlavor !== "auto")
 * 3. Spanish-native feature artist flavor (e.g. Lead is Offset/Atlanta, Feature is Yovngchimi/PR)
 * 4. Primary Spanish-native speaker flavor (e.g. Lead is Yovngchimi or Morad)
 * 5. Universal fallback: neutral_latam (clean, pan-latino street trap without forcing localisms)
 */
export function resolveSpanishFlavor(
  requestedFlavor?: SpanishFlavor,
  leadProfile?: SpeakerDialectProfile,
  featureProfile?: SpeakerDialectProfile | null,
  projectDefaultFlavor?: SpanishFlavor
): SpanishFlavorProfile {
  // 1. Explicit user selection in UI
  if (requestedFlavor && requestedFlavor !== "auto" && SPANISH_FLAVOR_CATALOG[requestedFlavor]) {
    return SPANISH_FLAVOR_CATALOG[requestedFlavor];
  }

  // 2. Project-level configuration
  if (projectDefaultFlavor && projectDefaultFlavor !== "auto" && SPANISH_FLAVOR_CATALOG[projectDefaultFlavor]) {
    return SPANISH_FLAVOR_CATALOG[projectDefaultFlavor];
  }

  // 3. Spanish-native feature artist flavor (e.g. Lead is Offset/Atlanta, Feature is Yovngchimi/PR)
  if (featureProfile && featureProfile.primaryLanguage === "es" && featureProfile.spanishRegister.defaultFlavor !== "auto") {
    return SPANISH_FLAVOR_CATALOG[featureProfile.spanishRegister.defaultFlavor];
  }

  // 4. Primary Spanish-native speaker flavor (e.g. Lead is Yovngchimi or Morad)
  if (leadProfile && leadProfile.primaryLanguage === "es" && leadProfile.spanishRegister.defaultFlavor !== "auto") {
    return SPANISH_FLAVOR_CATALOG[leadProfile.spanishRegister.defaultFlavor];
  }

  // 5. Universal fallback: neutral_latam
  return SPANISH_FLAVOR_CATALOG.neutral_latam;
}

// ---------------------------------------------------------------------------
// Formateador de Directivas para el Prompt (Prompt Hygiene Puro)
// ---------------------------------------------------------------------------

/**
 * Builds the affirmative, descriptive dialect and language directives for the prompt.
 * STRICT PROMPT HYGIENE: CERO ejemplos negativos, CERO listas forzadas de palabras.
 */
export function buildDialectPromptDirectives(
  leadProfile: SpeakerDialectProfile,
  featureProfile: SpeakerDialectProfile | null,
  flavorProfile: SpanishFlavorProfile,
  targetEnglishRatio: number,
  allocationPlan?: LanguageAllocationPlan
): string {
  const enPct = Math.round(targetEnglishRatio * 100);
  const esPct = 100 - enPct;

  const sections: string[] = [];

  sections.push(`### 1. OBJETIVO GLOBAL DE IDIOMA Y REPARTO POR SECCIONES`);
  sections.push(`- Meta global de canción: ~${enPct}% Inglés / ~${esPct}% Español (evaluado de forma elástica a nivel de obra completa, no como cuota rígida compás a compás).`);

  if (allocationPlan && allocationPlan.sections.length > 0) {
    sections.push(`- Banda elástica: Soft ${Math.round(allocationPlan.globalSoftBand.min * 100)}% – ${Math.round(allocationPlan.globalSoftBand.max * 100)}% EN (±5%) | Hard ${Math.round(allocationPlan.globalHardBand.min * 100)}% – ${Math.round(allocationPlan.globalHardBand.max * 100)}% EN (±12%).`);
    sections.push(`- Distribución reconciliada por sección (Language Allocation Plan):`);
    for (const alloc of allocationPlan.sections) {
      sections.push(`  · ${alloc.targetGuideline}`);
    }
  }

  sections.push(`\n### 2. IDENTIDAD Y REALIZACIÓN DIALECTAL POR INTÉRPRETE`);
  sections.push(`* **Voz Principal (${leadProfile.artistId}) — Dialecto Nativo: ${leadProfile.primaryDialect}:**`);
  sections.push(`  - Registro en Inglés: ${leadProfile.englishRegister.description}`);
  for (const guide of leadProfile.englishRegister.syntaxGuidelines) {
    sections.push(`    · ${guide}`);
  }

  if (featureProfile) {
    sections.push(`* **Voz Feature (${featureProfile.artistId}) — Dialecto Nativo: ${featureProfile.primaryDialect}:**`);
    sections.push(`  - Registro en Inglés: ${featureProfile.englishRegister.description}`);
    for (const guide of featureProfile.englishRegister.syntaxGuidelines) {
      sections.push(`    · ${guide}`);
    }
  }

  sections.push(`\n### 3. REGISTRO Y SABOR REGIONAL DEL ESPAÑOL: ${flavorProfile.label}`);
  sections.push(`- Descripción lingüística: ${flavorProfile.linguisticDescription}`);
  sections.push(`- Características sintácticas:`);
  for (const s of flavorProfile.syntaxCharacteristics) {
    sections.push(`  · ${s}`);
  }

  sections.push(`\n### 4. ANTI-TRANSLATION & THEMATIC INTEGRITY PRINCIPLES (OBLIGATORIO)`);
  sections.push(`- **PRINCIPIO ANTI-TRADUCCIÓN**:
  · Nunca traduzcas modismos callejeros de forma literal entre idiomas.
  · Conserva las expresiones idiomáticas en su lengua nativa original.
  · Cuando un concepto o modismo urbano no tenga un equivalente directo y natural en el otro idioma, mantén la expresión en su idioma original en vez de forzar una traducción literal o académica.
  · La proporción de idioma (${enPct}% / ${esPct}%) guía la cadencia y el balance general, jamás obliga a traducir frases hechas.`);

  sections.push(`- **PRINCIPIO DE AUTENTICIDAD TEMÁTICA (CRYPTO / FINANZAS)**:
  · Si la temática aborda criptomonedas o finanzas callejeras, enfócalo desde la realidad urbana tangible (cold storages, billeteras cifradas, dinero digital anónimo, lavado y transferencias nocturnas).
  · PROHIBIDO nombrar altcoins o tokens específicos como eslóganes publicitarios o tutoriales financieros.`);

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Auditor de Dialecto, Contaminación y Artefactos de Traducción
// ---------------------------------------------------------------------------

export interface DialectAuditBarIssue {
  sectionId: string;
  barId: string;
  lyricText: string;
  issueType: "translation_calque" | "dialect_contamination" | "slang_overstuffing";
  reason: string;
  severity: "critical" | "warning";
  score: number; // 0.0 to 1.0
}

export interface DialectAuditResult {
  passed: boolean;
  translationArtifactScore: number;  // 0 = clean, 1 = heavy translation calques
  dialectContaminationScore: number; // 0 = consistent, 1 = severe contamination
  slangChecklistScore: number;       // 0 = organic, 1 = artificial checklist stuffing
  issues: DialectAuditBarIssue[];
  flaggedBarsForRepair: DialectAuditBarIssue[];
}

/**
 * Known translation calque triggers (checked ONLY by the auditor, NEVER injected into prompt).
 */
const AUDITOR_TRANSLATION_CALQUE_PATTERNS: Array<{ regex: RegExp; description: string; score: number }> = [
  { regex: /\bbaloncesto\s+profesional\b/i, description: "Literal translation calque of 'pro basketball'", score: 0.95 },
  { regex: /\bfuman?\s+conmigo\s+la\s+llama\b/i, description: "Literal translation calque of 'smoke the flame with me'", score: 0.95 },
  { regex: /\bno\s+mezclo\s+la\s+blood\b/i, description: "Unnatural Spanglish calque of 'don't mix blood'", score: 0.90 },
  { regex: /\bdispara(r)?\s+desde\s+la\s+cadera\b/i, description: "Literal translation calque of 'shoot from the hip'", score: 0.85 },
  { regex: /\bcontar\s+verde\s+como\s+un\s+envoltorio\b/i, description: "Confused wrapper/rapper translation calque", score: 0.90 },
  { regex: /\b(cardano|ada\s+coin|solana\s+coin|ripple|xrp)\b/i, description: "Corporate cryptocurrency token name dropped unnaturally", score: 0.85 },
  { regex: /\bno\s+compito\s+con\s+novatos\b/i, description: "Stiff television dubbing phrase in trap context", score: 0.75 },
];

/**
 * Audits a SongDocument AST for dialect contamination, translation calques, and artificial slang stuffing.
 */
export function auditDialectAndTranslationArtifacts(
  doc: SongDocument,
  flavor: SpanishFlavorProfile,
  leadProfile: SpeakerDialectProfile,
  featureProfile?: SpeakerDialectProfile | null
): DialectAuditResult {
  const issues: DialectAuditBarIssue[] = [];

  let totalBars = 0;
  let calqueScoreSum = 0;
  let contaminationScoreSum = 0;
  let overstuffingScoreSum = 0;

  const contaminationMarkersSet = new Set(flavor.contaminationMarkers.map(m => m.toLowerCase()));
  const strongMarkersSet = new Set(flavor.strongRegionalMarkers.map(m => m.toLowerCase()));

  for (const section of doc.sections) {
    for (const bar of section.bars) {
      totalBars++;
      const text = bar.lyricText.trim();
      if (!text) continue;

      const lowerText = text.toLowerCase();
      const words = lowerText.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

      // 1. Check for translation calques
      for (const pattern of AUDITOR_TRANSLATION_CALQUE_PATTERNS) {
        if (pattern.regex.test(lowerText)) {
          calqueScoreSum += pattern.score;
          issues.push({
            sectionId: section.id,
            barId: bar.id,
            lyricText: text,
            issueType: "translation_calque",
            reason: pattern.description,
            severity: "critical",
            score: pattern.score,
          });
        }
      }

      // 2. Check for dialect contamination (contextual weighting, not binary single-word penalty)
      let barContaminationCount = 0;
      const matchedContaminants: string[] = [];
      for (const word of words) {
        if (contaminationMarkersSet.has(word)) {
          barContaminationCount++;
          matchedContaminants.push(word);
        }
      }

      if (barContaminationCount >= 2) {
        // High confidence cluster of foreign dialect markers
        const score = 0.80;
        contaminationScoreSum += score;
        issues.push({
          sectionId: section.id,
          barId: bar.id,
          lyricText: text,
          issueType: "dialect_contamination",
          reason: `Cluster of foreign dialect markers: [${matchedContaminants.join(", ")}] incompatible with ${flavor.label}`,
          severity: "critical",
          score,
        });
      } else if (barContaminationCount === 1) {
        // Weak single-word signal: does not fail the song on its own (+0.15)
        contaminationScoreSum += 0.15;
      }

      // 3. Check for slang overstuffing (detecting mechanical checklist spamming: 4+ strong markers in one bar)
      let strongMarkerCount = 0;
      for (const word of words) {
        if (strongMarkersSet.has(word)) {
          strongMarkerCount++;
        }
      }

      if (strongMarkerCount >= 4) {
        const score = 0.75;
        overstuffingScoreSum += score;
        issues.push({
          sectionId: section.id,
          barId: bar.id,
          lyricText: text,
          issueType: "slang_overstuffing",
          reason: `Artificial slang concentration (${strongMarkerCount} regional markers in one bar indicates mechanical checklist behavior)`,
          severity: "warning",
          score,
        });
      }
    }
  }

  const normBars = Math.max(1, totalBars);
  const translationArtifactScore = Number(Math.min(1, calqueScoreSum / 2).toFixed(2));
  const dialectContaminationScore = Number(Math.min(1, (contaminationScoreSum * 2) / normBars).toFixed(2));
  const slangChecklistScore = Number(Math.min(1, (overstuffingScoreSum * 2) / normBars).toFixed(2));

  const flaggedBarsForRepair = issues.filter(i => i.severity === "critical" && i.score >= 0.80);
  const passed = flaggedBarsForRepair.length === 0;

  return {
    passed,
    translationArtifactScore,
    dialectContaminationScore,
    slangChecklistScore,
    issues,
    flaggedBarsForRepair,
  };
}

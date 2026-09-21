// Hook Engine — 6 Musical Strategies, Metric Evaluation and Multi-Candidate Selection
// Solves the robotic "translation" problem by treating the hook as an acoustic, rhythmic object.

export type HookStrategyType =
  | "mantra"           // Hypnotic repetition with high word economy (3-5 words)
  | "anaphora"         // Anchor phrase at bar start with variable rhyming tail
  | "call_response"    // Dialectic tension between lead vocal and background response
  | "melodic_phrase"   // Open vowel chains, sustained notes with '...', emotional contour
  | "punchline_refrain"// Hard direct statement with impact on beat 1 followed by silence
  | "triplet_ostinato" // 3 bars of rapid rhythmic motif + 1 bar payoff release
  | "anthemic";        // Massive anthemic chorus, crowd gang vocals, epic stadium energy

export interface HookDNA {
  anchorLength: number;         // 2-4 words
  repetitionRatio: number;      // 0.4 to 0.75
  phoneticCohesion: number;     // Cohesive vowel sounds (-ando, -ás, -én)
  vowelCohesion: string;        // Dominant vowel rhyme anchor
  rhythmicVariationBar5: boolean;// Bar 5 must introduce melodic or rhythmic shift
  memorabilityScore: number;    // 0-10
}

export interface HookStrategyDefinition {
  id: HookStrategyType;
  label: string;
  tagline: string;
  sunoAcousticTag: string;
  instructionPrompt: string;
}

export const HOOK_STRATEGIES: Record<HookStrategyType, HookStrategyDefinition> = {
  mantra: {
    id: "mantra",
    label: "Mantra Hipnótico",
    tagline: "Repetición rítmica y pegadiza con groove y rebote de bajo 808.",
    sunoAcousticTag: "Hypnotic repetitive mantra, heavy 808 sub-bass, wide stereo autotune",
    instructionPrompt: `ESTRATEGIA DE CORO: MANTRA RÍTMICO
- Enfoca el gancho en un motivo musical pegadizo y bailable con repetición rítmica hipnótica.
- Fraseo con swing y actitud, dejando espacio para el bajo 808 sin sonar telegráfico.
- En la barra 5, introduce una variación sutil de melodía o remate para renovar la atención antes de resolver.
- PROHIBIDO traducir palabras al inglés entre paréntesis. Los ad-libs deben ser ecos melódicos o réplicas de actitud.`,
  },
  anaphora: {
    id: "anaphora",
    label: "Anáfora de Anclaje",
    tagline: "La misma frase de anclaje al inicio de cada barra y el remate varía compás a compás.",
    sunoAcousticTag: "Catchy anchor hook, layered melodic unison, punchy trap rhythm",
    instructionPrompt: `ESTRATEGIA DE CORO: ANÁFORA DE ANCLAJE
- Establece una frase núcleo de 2-3 palabras al inicio de las barras 1, 2, 3 y 4.
- El remate de cada compás debe cambiar para generar dinamismo y rima fluida.
- Barras 5 a 8: Repite el anclaje subiendo la intensidad vocal con ad-libs en estéreo.
- PROHIBIDO usar ad-libs que traduzcan la frase principal.`,
  },
  call_response: {
    id: "call_response",
    label: "Call & Response Dialéctico",
    tagline: "Pregunta o afirmación líder en tiempo 1, réplica cínica o golpe en tiempo 3 y 4.",
    sunoAcousticTag: "Call and response dynamic vocal stack, ping-pong stereo adlibs",
    instructionPrompt: `ESTRATEGIA DE CORO: CALL & RESPONSE DIALÉCTICO
- Cada compás de la voz líder recibe una contrarréplica inmediata entre paréntesis como si fueran dos personas discutiendo o afirmando con complicidad.
- Las réplicas deben tener personalidad de calle: *(¿cuándo?)*, *(nunca)*, *(olvídalo)*, *(facts)*, *(dime dónde)*.
- PROHIBIDO rellenar con (Yeah) o traducciones literales en inglés.`,
  },
  melodic_phrase: {
    id: "melodic_phrase",
    label: "Frase Melódica Envolvente",
    tagline: "Vocales abiertas, notas sostenidas con '...' y armonías ricas en autotune.",
    sunoAcousticTag: "Lush melodic autotune hook, soaring falsetto harmonies, wide emotional pad",
    instructionPrompt: `ESTRATEGIA DE CORO: FRASE MELÓDICA ENVOLVENTE
- Construye el gancho sobre vocales abiertas y fluidas (-ía, -ar, -ás, -ando) que permitan al cantante sostener la nota con puntos suspensivos '...'.
- Estructura simétrica de 4 compases de rampa melódica + 4 compases de resolución con armonías corales.
- Ad-libs de fondo en falsete o eco melódico entre paréntesis.`,
  },
  punchline_refrain: {
    id: "punchline_refrain",
    label: "Punchline Refrain (Remate Seco)",
    tagline: "Hecho crudo y contundente en la primera barra, seguido de silencios y respuesta pesada.",
    sunoAcousticTag: "Hard-hitting punchline hook, anthemic group vocals, heavy aggressive 808",
    instructionPrompt: `ESTRATEGIA DE CORO: PUNCHLINE REFRAIN
- Compás 1: Una declaración implacable y memorable que defina la tesis del tema.
- Compás 2: Espacio y silencio rítmico con un ad-lib seco.
- Compases 3 y 4: Construcción hacia la repetición del golpe principal en el compás 5.
- Cero relleno, máxima autoridad de calle.`,
  },
  triplet_ostinato: {
    id: "triplet_ostinato",
    label: "Triplet Ostinato (3+1 Payoff)",
    tagline: "3 compases con el mismo patrón rítmico acelerado + 1 compás de remate payoff.",
    sunoAcousticTag: "Syncopated triplet bounce hook, fast articulate cadence, explosive beat drop",
    instructionPrompt: `ESTRATEGIA DE CORO: TRIPLET OSTINATO (3+1 PAYOFF)
- Barras 1, 2 y 3: Misma cadencia rítmica en tresillos con rima continua e hipnótica.
- Barra 4: Rotura de ritmo: frase corta, seca y abierta que funciona como resolución (payoff) hacia el compás siguiente.
- Repite el patrón en las barras 5 a 8 con mayor fuerza en los ad-libs de fondo.`,
  },
  anthemic: {
    id: "anthemic",
    label: "Himno de Estadio",
    tagline: "Coros masivos de multitud (gang vocals), energía gigante y melodía coreable para conciertos.",
    sunoAcousticTag: "Massive anthemic chorus, crowd gang vocals, epic stadium energy, layered unison chants",
    instructionPrompt: `ESTRATEGIA DE CORO: HIMNO DE ESTADIO (ANTHEMIC)
- Diseña el estribillo con coros masivos de multitud (gang vocals) y exclamaciones épicas diseñadas para que un estadio entero las grite al unísono.
- Melodía coreable de alta energía, líneas con punch vocal épico y remates grupales.
- Barras 5 a 8: Eleva la escala sonora al máximo con capas estéreo masivas y ad-libs de multitud.
- PROHIBIDO versos narrativos largos; cada línea debe sentirse como un cántico de estadio inmortal.`,
  },
};

/**
 * Recommends the optimal Hook Strategy based on the artist's Musical DNA and UI selection.
 */
export function recommendHookStrategy(cadenceType: string, hookStyle?: string): HookStrategyType {
  if (hookStyle === "mantra" || hookStyle === "repetitive") return "mantra";
  if (hookStyle === "punchy" || hookStyle === "simple_punchy") return "punchline_refrain";
  if (hookStyle === "melodic" || hookStyle === "melodic_phrase") return "melodic_phrase";
  if (hookStyle === "call_response") return "call_response";
  if (hookStyle === "anthemic") return "anthemic";
  if (hookStyle === "anaphora") return "anaphora";
  if (hookStyle === "triplet_ostinato" || hookStyle === "triplet") return "triplet_ostinato";

  switch (cadenceType) {
    case "bounce_sparse":
      return "mantra";
    case "baritone_low_density":
      return "punchline_refrain";
    case "offbeat_urgent":
      return "call_response";
    case "multisyllabic_dense":
      return "triplet_ostinato";
    case "minimalist_cold":
      return "anaphora";
    case "staccato_high_energy":
      return "mantra";
    default:
      return "anaphora";
  }
}

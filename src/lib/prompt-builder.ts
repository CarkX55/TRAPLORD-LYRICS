import { getAllArtists, getArtistById, getProducerById, getRhymeSchemeById, getBeatTypeById, getFeatureSimById, getDirtyLevel, getRepetitionPatternById, getHookStyleOptionById, getIntroStyleOptionById, OUTRO_STYLE_OPTIONS, getOutroStyleOptionById, MOODS, getSituationalPresetById, getFlowPocketOptionById, type SongStructure, type BpmVibe, type BeatType, type FlowPocketOption, type IntroStyleId, type IntroStyleOption, type OutroStyleId, type OutroStyleOption } from "./trap-data";
export { OUTRO_STYLE_OPTIONS, getOutroStyleOptionById, type OutroStyleId, type OutroStyleOption };
import {
  getFlowProfile,
  getBreathInstruction,
  getCadenceLabel,
  getRhymeTier,
  getHookDensityProfile,
  getCompositionalGoldExamples,
  type FlowProfile,
  type HookDensityProfile,
} from "./artist-flow-profiles";
import { getArtistReference, type ArtistReference } from "./artist-references";
import type { TrackAnalysis } from "./track-analyzer";
import { getSceneById, type SituationalScene } from "./scene-engine";
import { getMusicalDNAForArtist, getSectionModulatedTexture, ARTIST_PRESETS, type MusicalDNA } from "./musical-dna";
import { HOOK_STRATEGIES, recommendHookStrategy, type HookStrategyType } from "./hook-engine";
import {
  classifyTopicIntent,
  resolveSemanticSceneFraming,
  type SemanticAnchor,
  type TopicIntent,
  type SemanticSceneFraming,
} from "./motif-engine";
import type { LanguageDNA } from "./language-dna";
import { formatSectionHeader, resolveSectionSpec, stripMetaReasoning } from "./song-document";

export { getRhymeTier, getHookDensityProfile, type HookDensityProfile };

export type CompositionMode = "holistic" | "guided" | "multipass";

export interface FunctionalArtistStyle {
  timbre: string;
  cadence: string;
  rhymeTexture: string;
  emotionalPosture: string;
  dialectAndVocabulary: string;
}

export interface LockedSection {
  name: string;
  content: string;
}

export interface SectionAnchors {
  requiredPhrases?: string[]; // Frase ancla del hook
  requiredFacts?: string[];   // Hechos fácticos obligatorios
  allowedAdlibs?: string[];   // Ad-libs distintivos aprobados
  lockedLines?: string[];     // Compases bloqueados por el usuario
}

export interface SectionRegenerationParams {
  sectionName: string;
  sectionType?: "lyrical" | "spoken" | "instrumental" | "adlib";
  artistStyle?: string;
  exactLines?: number;         // Obligatorio para lyrical, omitido para instrumental/spoken
  fullLyrics: string;          // Canción previa completa
  narrativeRole?: string;      // Función narrativa breve de la sección
  factsToPreserve?: string[];  // Máximo 5-8 hechos normalizados
  previousSectionTail?: string;// Últimas 2 líneas del bloque previo (empalme de entrada)
  nextSectionHead?: string;    // Primeras 2 líneas del bloque posterior (empalme de salida)
  neighborHookAnchor?: string; // Frase ancla si el vecino es un Chorus
  anchors?: SectionAnchors;
}

export interface RegenerateSectionParams {
  sectionName: string;
  keepContext: string;
  sectionType?: "lyrical" | "spoken" | "instrumental" | "adlib";
  artistStyle?: string;
  exactLines?: number;
  narrativeRole?: string;
  factsToPreserve?: string[];
  previousSectionTail?: string;
  nextSectionHead?: string;
  neighborHookAnchor?: string;
  anchors?: SectionAnchors;
}

export interface SectionVoiceAssignment {
  sectionName: string;
  voice: string;
  bars?: number;
  density?: "sparse" | "normal" | "dense" | "extra_dense";
  repetitionPattern?: string; // "none" | "mantra" | "staccato" | "call_response" | "stutter" | "echo"
  customKeyword?: string; // optional custom word or phrase to repeat
  hookStyle?: string; // "auto" | "melodic" | "mantra" | "punchy" | "call_response" | "anthemic"
  hookMood?: string; // "auto" | moodId from MOODS
  introStyle?: IntroStyleId; // archetypes from INTRO_STYLE_OPTIONS in trap-data.ts
  outroStyle?: OutroStyleId; // archetypes from OUTRO_STYLE_OPTIONS in trap-data.ts
}


export interface PromptParams {
  artistId: string;
  featureArtistId: string;
  moodId: string;
  dirtyLevel?: number;
  topics: string[];
  customTopic: string;
  spanglishPercent: number;
  bpmVibe: BpmVibe;
  beatType?: BeatType;
  structure: SongStructure;
  narrativeArcId: string;
  narrativeArcDesc: string;
  producerId: string;
  producerTag: string;
  producerName?: string;
  customDictionary: string;
  dynamicMarkers: boolean;
  featureSimId?: string;
  customIntro?: string;
  collabInteraction?: boolean;
  altVoiceAsterisks?: boolean;
  syllableSync?: boolean;
  phoneticAdlibs?: boolean;
  smartBarsMode?: boolean;
  sectionVoices?: SectionVoiceAssignment[];
  chorusLanguageOverride?: "es" | "en" | "auto";
  versesLanguageOverride?: "es" | "en" | "auto";
  barCountOverride?: number;
  rhymeSchemeId?: string;
  lockedSections?: LockedSection[];
  regenerateSection?: RegenerateSectionParams;
  correctionInstruction?: string;
  mainArtistReference?: ArtistReference | null;
  featureArtistReference?: ArtistReference | null;
  referenceTrack?: TrackAnalysis | null;
  dynamicSongForm?: boolean;
  sunoTagsMode?: "detailed" | "minimal";
  dynamismMode?: "classic" | "vanguard";
  adlibStyle?: "textured" | "classic" | "minimal";
  situationalPresetId?: string;
  flowPocketMode?: "auto" | "bouncy" | "triplets" | "heavy";
  semanticAnchor?: SemanticAnchor;
  languageDNA?: LanguageDNA;
  spanishFlavor?: import("./dialect-engine").SpanishFlavor;
  hideArtistNames?: boolean;
}

export interface VocalGuideResult {
  artistName: string;
  vocalGuide: string;
  fullHeaderTag: string;
}

/**
 * Resuelve la guía vocal concisa optimizada para Suno AI a partir del artista o rol asignado.
 * Guía al modelo de Suno con timbre, género vocal, autotune, efectos y cadencia.
 */
export function resolveArtistVocalGuide(
  voiceId: string = "auto",
  options: {
    mainArtistId?: string;
    featureArtistId?: string;
    sectionType?: string;
    sectionName?: string;
    isChorus?: boolean;
    isIntro?: boolean;
    isTrading2x2?: boolean;
    isHype?: boolean;
    introStyle?: IntroStyleId;
  } = {}
): VocalGuideResult {
  const mainArtist = options.mainArtistId ? getArtistById(options.mainArtistId) : null;
  const featArtist = options.featureArtistId ? getArtistById(options.featureArtistId) : null;
  const mainName = mainArtist?.name ?? "Lead";
  const featName = featArtist?.name ?? "Feature";

  const getGuideForId = (id?: string): string => {
    if (!id || id === "none") return "male vocal, modern autotune";
    const profile = getFlowProfile(id);
    if (profile?.sunoVocalTimbre) return profile.sunoVocalTimbre;
    const dna = getMusicalDNAForArtist(id);
    if (dna?.vocal?.sunoVocalTimbre) return dna.vocal.sunoVocalTimbre;
    return "male vocal, modern autotune bounce";
  };

  let artistName = mainName;
  let vocalGuide = getGuideForId(options.mainArtistId);

  const isChorus = options.isChorus || options.sectionType === "chorus" || options.sectionType === "hook" || options.sectionName?.toLowerCase().includes("chorus") || options.sectionName?.toLowerCase().includes("hook") || options.sectionName?.toLowerCase().includes("estribillo");
  const isIntro = options.isIntro || options.sectionType === "intro" || options.sectionName?.toLowerCase().includes("intro");

  if (voiceId === "main" || voiceId === "auto") {
    artistName = mainName;
    vocalGuide = getGuideForId(options.mainArtistId);
  } else if (voiceId === "feature") {
    artistName = featName;
    vocalGuide = getGuideForId(options.featureArtistId);
  } else if (voiceId === "both") {
    artistName = `${mainName} & ${featName}`;
    vocalGuide = "dual vocals in unison, wide stereo mix, stacked autotune harmonies";
  } else if (voiceId === "trading_2x2" || options.isTrading2x2) {
    artistName = `${mainName} & ${featName}`;
    vocalGuide = "trading bars 2x2, rapid vocal back-and-forth, contrasting vocal flows";
  } else if (voiceId === "hype" || options.isHype) {
    artistName = mainName;
    vocalGuide = "hype man ad-libs, raw energetic background shouts, filtered vocal effect";
  } else if (voiceId.startsWith("instrumental:")) {
    const instName = voiceId.replace("instrumental:", "");
    return {
      artistName: instName,
      vocalGuide: "instrumental solo",
      fullHeaderTag: instName,
    };
  } else {
    const assignedArtist = getArtistById(voiceId);
    if (assignedArtist) {
      artistName = assignedArtist.name;
      vocalGuide = getGuideForId(assignedArtist.id);
    }
  }

  // Contextual nuance for Chorus / Intro
  if (isChorus && voiceId !== "both" && voiceId !== "trading_2x2") {
    const primaryTimbre = vocalGuide.split(",")[0]?.trim() || "melodic male vocal";
    vocalGuide = `${primaryTimbre}, layered stereo autotune harmonies, anthemic vocal stack`;
  } else if (isIntro && voiceId !== "hype") {
    const primaryTimbre = vocalGuide.split(",")[0]?.trim() || "spoken male vocal";
    if (options.introStyle && options.introStyle !== "auto") {
      const introOpt = getIntroStyleOptionById(options.introStyle);
      if (introOpt?.sunoAcousticTag) {
        vocalGuide = `${primaryTimbre}, ${introOpt.sunoAcousticTag}`;
      } else {
        vocalGuide = `${primaryTimbre}, spoken whisper intro, filtered vocal texture`;
      }
    } else {
      vocalGuide = `${primaryTimbre}, spoken whisper intro, filtered vocal texture`;
    }
  }

  return {
    artistName,
    vocalGuide,
    fullHeaderTag: `${artistName} - ${vocalGuide}`,
  };
}

export function getSunoSectionHint(
  sectionType: string,
  artistId: string,
  moodId: string,
  bpmVibe: BpmVibe,
  isDetailed: boolean = true
): string {
  if (!isDetailed) return "";
  const profile = getFlowProfile(artistId);
  const cadence = profile?.cadence ?? "triplet";
  const hookStyle = profile?.hookStyle ?? "melodic";

  const lowerType = sectionType.toLowerCase();
  if (lowerType.includes("intro")) {
    return "Atmospheric filtered pad, spoken intro";
  }
  if (lowerType.includes("pre-chorus") || lowerType.includes("pre chorus") || lowerType.includes("prechorus")) {
    return "Rising melodic tension, vocal crescendo";
  }
  if (lowerType.includes("post-chorus") || lowerType.includes("post chorus") || lowerType.includes("postchorus")) {
    return "Catchy melodic bounce, stripped 808 groove, repeating hook echo";
  }
  if (lowerType.includes("chorus") || lowerType.includes("hook") || lowerType.includes("estribillo")) {
    if (hookStyle === "repetitive") return "Hypnotic repetitive mantra, layered stereo autotune harmonies, wide stereo mix";
    if (hookStyle === "simple_punchy") return "Hard-hitting punchline hook, anthemic energy, stacked group vocals";
    return "Layered stereo autotune harmonies, wide anthemic vocal stack";
  }
  if (lowerType.includes("bridge") || lowerType.includes("puente")) {
    return "Half-time beat switch, stripped vocal texture";
  }
  if (lowerType.includes("interlude") || lowerType.includes("skit") || lowerType.includes("interludio")) {
    return "Spoken word, ambient filtered pad, telephone vocal effect";
  }
  if (lowerType.includes("beat drop") || lowerType.includes("beat switch") || lowerType.includes("beat_drop")) {
    return "Dramatic tempo & key shift, pitch-shifted sliding 808s, half-time rhythm breakdown";
  }
  if (lowerType.includes("outro") || lowerType.includes("final")) {
    return "Heavy 808 breakdown, echoing vocal fade, sudden cutoff";
  }
  if (lowerType.includes("verse") || lowerType.includes("verso")) {
    if (cadence === "rapid_fire") return "Fast articulate triplet flow, rapid pocket";
    if (cadence === "staccato") return "Sharp staccato delivery, hard-hitting cadence";
    if (cadence === "legato") return "Slurred legato flow, smooth melodic pocket";
    if (cadence === "conversational") return "Conversational storytelling flow, natural rhythm";
    if (cadence === "syncopated") return "Syncopated off-beat bounce, rhythmic pocket";
    return "Dynamic rhythmic flow, locked in the pocket";
  }
  return "";
}

export function buildSpanglishInstruction(percent: number): {
  label: string;
  prompt: string;
} {
  const englishPct = percent;
  const spanishPct = 100 - percent;

  let vibeLabel: string;
  let organicRule: string;

  if (englishPct === 0) {
    vibeLabel = "100% Español puro";
    organicRule = "IDIOMA: 100% Español puro. Prohibido usar frases o palabras en inglés (salvo marcas registradas). Las rimas, la métrica y la jerga deben fluir con naturalidad en español.";
  } else if (englishPct <= 20) {
    vibeLabel = `🇪🇸 Español dominante con Loanwords (${spanishPct}% ES / ${englishPct}% EN)`;
    organicRule = `CODE-SWITCHING ORGÁNICO: Español dominante. Escribe las estrofas y narrativa en español con sintaxis natural de calle, integrando anglicismos auténticos (drip, opps, motion, racks, plug, flex) en puntos rítmicos naturales o remates. Los estribillos en español. Prohibido partir oraciones con traducciones mecánicas mitad-y-mitad ('fast in my carro'); la alternancia debe fluir como un hispanohablante nativo.`;
  } else if (englishPct <= 45) {
    vibeLabel = `🔌 Español con Rhyme Anchors en inglés (${spanishPct}% ES / ${englishPct}% EN)`;
    organicRule = `CODE-SWITCHING ORGÁNICO: La columna vertebral de la narrativa debe tener la sintaxis natural, el dialecto y la fluidez del español callejero. Los anglicismos entran de forma orgánica como préstamos directos de la cultura trap (drip, racks, plug, opps, foreign, switch) o como ráfagas de remate y punchline de actitud en la rima ('big racks, no cap', 'all gas, no brakes'). 🚫 PROHIBIDO EL CORTE MITAD-Y-MITAD DENTRO DEL SINTAGMA: Queda terminantemente prohibido partir oraciones con traducciones ortopédicas de máquina ('fast in my carro', 'lo cuido en el saco', 'I am the boss, me miran como jefe'). Los estribillos en español.`;
  } else if (englishPct <= 65) {
    vibeLabel = `⚖️ Spanglish balanceado 50/50 (${spanishPct}% ES / ${englishPct}% EN)`;
    organicRule = `CODE-SWITCHING ORGÁNICO DINÁMICO (50/50): Alternancia constante y fluida de barras completas en inglés y español, o cambios de código naturales estilo Eladio Carrión / Myke Towers. 🚫 PROHIBIDA LA TRADUCCIÓN MECÁNICA POR COMPÁS: Queda terminantemente prohibido partir cada compás a la mitad con esquemas ortopédicos de '[palabra en inglés] + [frase en español]'. Cada frase debe sonar como habla un bilingüe nativo, no un traductor automático.`;
  } else if (englishPct <= 85) {
    vibeLabel = `🇺🇸 Inglés dominante con barras en español (${englishPct}% EN / ${spanishPct}% ES)`;
    organicRule = `CODE-SWITCHING ORGÁNICO: Inglés americano dominante (75-80%). Estructura principal en inglés con puentes, remates o frases callejeras directas en español. Mezcla orgánica sin plantillas rígidas por compás.`;
  } else if (englishPct < 100) {
    vibeLabel = `🇺🇸 Inglés casi puro (${englishPct}% EN / ${spanishPct}% ES)`;
    organicRule = `IDIOMA: 90% Inglés americano (US Trap). Prácticamente todo en inglés con algún modismo aislado en español.`;
  } else {
    vibeLabel = "100% English puro";
    organicRule = "IDIOMA: 100% Inglés americano puro (US Trap). Prohibido usar español. Toda la lírica, slang y métrica debe ser estrictamente en inglés de Atlanta/US.";
  }

  return {
    label: vibeLabel,
    prompt: `**Patrón de Idioma**: ${vibeLabel}. ${organicRule}`,
  };
}

/**
 * Resuelve la descripción funcional abstracta del artista (timbre, cadencia, rima, actitud, dialecto).
 * Evita la parodia nominal ("escribe como X") proporcionando los rasgos acústicos y estilísticos reales.
 */
export function resolveFunctionalArtistStyle(artistId: string): FunctionalArtistStyle {
  const artist = getArtistById(artistId);
  const flow = getFlowProfile(artistId);
  const dna = getMusicalDNAForArtist(artistId);

  const timbre = dna?.vocal?.sunoVocalTimbre || flow?.sunoVocalTimbre || "voz frontal y cruda de trap con autotune sutil";
  const cadence = flow?.cadenceInstruction || (flow?.cadence ? `cadencia ${flow.cadence} en tiempo ${flow.speedLabel || "natural"}` : "pocket clásico de trap con pausas naturales");
  const rhymeTexture = dna?.writing?.rhymeComplexity
    ? `complejidad ${dna.writing.rhymeComplexity}, asonancias callejeras e internas sin consonancias forzadas`
    : "asonancias directas, rimas internas orgánicas y remates secos";
  const emotionalPosture = flow?.storytellingStyle || artist?.style || "actitud desafiante, directa y cruda";
  const dialectAndVocabulary = artist?.origin ? `jerga, modismos y tics verbales auténticos de la escena ${artist.origin}` : "slang urbano contemporáneo";

  return {
    timbre,
    cadence,
    rhymeTexture,
    emotionalPosture,
    dialectAndVocabulary,
  };
}

/**
 * Compila el mapa de estructura sin sobrecargar de reglas punitivas.
 * Trata las barras como líneas aproximadas de interpretación.
 */
export function buildStructurePlan(params: PromptParams): string {
  const featureArtist = params.featureArtistId ? getArtistById(params.featureArtistId) : null;

  return params.structure.sections.map((s) => {
    if (s.type === "instrumental" || s.type === "beat_drop") {
      if (s.name.toLowerCase().includes("switch")) {
        return `[${s.name}: Dramatic tempo & key shift, pitch-shifted sliding 808s] — 🚫 NO LYRICS (Solo de producción instrumental)`;
      }
      return `[${s.name}] — 🚫 NO LYRICS (Solo de producción instrumental)`;
    }

    const voiceAssign = params.sectionVoices?.find(v => v.sectionName === s.name);
    const isTrading2x2 = voiceAssign?.voice === "trading_2x2" || (s.name.toLowerCase().includes("trading") && !!featureArtist);
    const isHype = voiceAssign?.voice === "hype";

    const vocalGuideResult = resolveArtistVocalGuide(
      voiceAssign?.voice ?? (s.name.toLowerCase().includes("feature") && featureArtist ? "feature" : isTrading2x2 ? "trading_2x2" : "auto"),
      {
        mainArtistId: params.artistId,
        featureArtistId: params.featureArtistId,
        sectionType: s.type,
        sectionName: s.name,
        isChorus: s.type === "chorus" || s.type === "hook",
        isIntro: s.type === "intro",
        isTrading2x2,
        isHype,
        introStyle: voiceAssign?.introStyle,
      }
    );

    let barsNum = 8;
    if (voiceAssign?.bars && voiceAssign.bars > 0) {
      barsNum = voiceAssign.bars;
    } else if (params.barCountOverride && s.type === "verse") {
      barsNum = params.barCountOverride;
    } else if (s.type === "verse") {
      barsNum = 12;
    } else if (s.type === "chorus" || s.type === "hook") {
      barsNum = 8;
    } else {
      barsNum = 4;
    }

    const tag = vocalGuideResult.vocalGuide ? ` - ${vocalGuideResult.vocalGuide}` : "";
    return `[${s.name}: ${vocalGuideResult.artistName}${tag}] — ~${barsNum} líneas aproximadas`;
  }).join("\n");
}

/**
 * MOTOR GHOSTWRITER HOLÍSTICO (5 CAPAS COMPACTAS)
 * Modo primario de producción. Proporciona contexto global, escala de prioridad P0-P6,
 * descripción funcional del artista y libertad compositiva para rimas, métrica y flow.
 */
export function buildHolisticPrompt(params: PromptParams): string {
  const featureArtist = params.featureArtistId ? getArtistById(params.featureArtistId) : null;
  const leadStyle = resolveFunctionalArtistStyle(params.artistId);
  const featStyle = featureArtist ? resolveFunctionalArtistStyle(featureArtist.id) : null;

  // CAPA 2: NÚCLEO CREATIVO & CONFLICTO
  const establishedFacts = params.customTopic?.trim()
    ? `HECHOS ESTABLECIDOS: "${params.customTopic.trim()}" (prioridad temática fáctica establecida por el usuario; consérvalos como verdaderos).`
    : "";
  const creativeSeeds = params.topics?.length > 0
    ? `SEMILLAS CREATIVAS / ATMÓSFERA: [${params.topics.join(", ")}] (ideas o texturas sugeridas que puedes desarrollar o adaptar libremente; no las trates como hechos rígidos si contradicen el relato).`
    : "";
  const narrativeConflict = params.narrativeArcDesc?.trim()
    ? `- Conflicto & Arco Dramático: ${params.narrativeArcDesc.trim()}`
    : "- Conflicto & Arco: Tensión inicial, escalada en la narrativa y resolución con actitud cruda.";

  // Situational Scene Brief (resumen conciso de 2-3 líneas)
  let sceneBrief = "";
  if (params.situationalPresetId && params.situationalPresetId !== "none") {
    const scene = getSceneById(params.situationalPresetId);
    if (scene) {
      sceneBrief = `- Conflicto Situacional: ${scene.title} — ${scene.conflict}. Giro dramático: "${scene.sceneTurn}".`;
    }
  }

  // Producer tag
  let producerLine = "";
  const producer = params.producerId ? getProducerById(params.producerId) : null;
  if (producer && producer.id !== "none") {
    let pTag = producer.tag;
    if (params.producerName?.trim()) {
      pTag = pTag.replace(new RegExp(producer.name, "gi"), params.producerName.trim()).replace(/\{NAME\}/gi, params.producerName.trim());
    }
    producerLine = `- Producer Tag en [Intro]: "${pTag}"`;
  } else if (params.producerTag?.trim()) {
    producerLine = `- Producer Tag en [Intro]: "${params.producerTag.trim()}"`;
  }

  // CAPA 3: POCKET & BPM (3 ZONAS FLEXIBLES)
  const bpmParts = params.bpmVibe.range.split("-").map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
  const avgBpm = bpmParts.length === 2 ? Math.round((bpmParts[0] + bpmParts[1]) / 2) : (bpmParts[0] ?? 130);

  let pocketGuideline: string;
  if (avgBpm < 120) {
    pocketGuideline = `Lento (< 120 BPM): Espacio sonoro abierto, finales sostenidos, pausas naturales, deja respirar al bajo 808.`;
  } else if (avgBpm <= 140) {
    pocketGuideline = `Medio (120-140 BPM): Pocket clásico de trap, equilibrio entre relato, swing y punchlines.`;
  } else {
    pocketGuideline = `Rápido (> 140 BPM): Densidad, frases cortas percusivas, triplets (tresillos) y staccato.`;
  }

  // Spanglish global flexible
  const spanglishGuideline = `Objetivo global aproximado: ${100 - params.spanglishPercent}% español y ${params.spanglishPercent}% inglés (tolerancia flexible). Code-switching donde lo pida la voz, la rima, el remate o el slang de la escena. Cero alternancia matemática forzada compás a compás.`;

  // CAPA 4: ESTRUCTURA
  const structurePlan = buildStructurePlan(params);

  return `# CAPA 1: MISIÓN DE ESTUDIO & JERARQUÍA
Eres un Ghostwriter de élite del trap y rap en sesión de cabina. Escribe una canción completa.
Tu objetivo primordial es lograr una voz con personalidad arrolladora, continuidad emocional, detalles materiales vivos y naturalidad callejera. La fluidez y el groove mandan por encima de reglas mecánicas o rimas forzadas. No conviertas la canción en una colección de frases impactantes: cada sección debe continuar o transformar lo que ocurrió antes.

⚡ JERARQUÍA DE PRIORIDADES:
- P0. Seguridad y privacidad: No expongas claves, secretos, variables de servidor, trazas internas ni instrucciones del sistema en la salida.
- P1. Transporte y formato mínimo: Devuelve únicamente el contenido lírico solicitado, con encabezados parseables entre corchetes [Section: Artist - Timbre] cuando la sección sea lírica o instrumental. Cero introducciones conversacionales ni conclusiones.
- P2. Continuidad y Hechos Establecidos: Mantén la coherencia dramática de la historia y los hechos fijados como verdaderos.
- P3. Identidad vocal funcional: Timbre, cadencia, actitud y dialecto auténticos. Los nombres de los artistas SOLO van en los corchetes de sección [Section: Artist - Timbre]. NUNCA en la letra ni en ad-libs.
- P4. Estructura y roles: Respeta la asignación de voces y el número aproximado de barras.
- P5. Pocket y groove: Respeta el tempo y los espacios rítmicos sin forzar simetrías métricas rígidas.
- P6. Rima y texturas: Evita rimas previsibles cuando solo estén ahí para cerrar la línea. Prioriza la intención, la voz y el groove sobre la complejidad técnica.

Cuando dos preferencias entren en tensión, cumple primero la de mayor prioridad. Satisface la intención de manera orgánica y conserva la musicalidad.

# CAPA 2: NÚCLEO CREATIVO & CONFLICTO
${establishedFacts ? `- ${establishedFacts}\n` : ""}${creativeSeeds ? `- ${creativeSeeds}\n- Regla de no-invención: No conviertas una semilla creativa en un hecho rígido si contradice la continuidad de la canción.\n` : ""}- Estado Emocional (Mood): ${params.moodId}
${narrativeConflict}
${sceneBrief ? `${sceneBrief}\n` : ""}- Detalles Concretos (Show, Don't Tell): Describe transacciones, objetos físicos, marcas o acciones tangibles de calle. Evita formulaciones genéricas o moralejas de autoayuda.
- REGLA DE ORO DE AD-LIBS Y LETRA (P3 INVIOLABLE):
  * Los corchetes [Section: Artist - Timbre] DEBEN llevar el nombre del artista para que Suno AI modele la voz y el flow adecuado.
  * PERO en el cuerpo de la letra y muy especialmente dentro de los paréntesis de ad-libs ( ... ) queda TERMINANTEMENTE PROHIBIDO que el rapero mencione, cante o grite su propio nombre, nombres de artistas de referencia, apodos o sellos discográficos (PROHIBIDO poner ad-libs como "(Takeoff!)", "(Fredo!)", "(Santana!)", "(Duki!)", "(Savage Squad!)", "(Quavo!)", "(Offset!)", "(Carti!)").
  * Los paréntesis ( ... ) deben contener EXCLUSIVAMENTE onomatopeyas rítmicas puras o palabras neutras de calle: (Grrah!), (Yeah!), (What!), (Skrrt!), (Brrr!), (Bow!), (No cap!), (Hold on!). NUNCA nombres de personas, porque Suno canta literalmente lo que hay entre paréntesis.
${producerLine ? `${producerLine}\n` : ""}
# CAPA 3: IDENTIDAD VOCAL FUNCIONAL, IDIOMA & POCKET
- Voz Principal: Timbre ${leadStyle.timbre}. Cadencia ${leadStyle.cadence}. Textura de rima: ${leadStyle.rhymeTexture}. Actitud: ${leadStyle.emotionalPosture}.
${featStyle ? `- Voz Feature: Timbre ${featStyle.timbre}. Cadencia ${featStyle.cadence}. Textura: ${featStyle.rhymeTexture}.\n` : ""}- Dialecto & Slang: ${leadStyle.dialectAndVocabulary}${params.customDictionary?.trim() ? ` + Diccionario local: { ${params.customDictionary.trim()} }` : ""}
- Idioma (Spanglish): ${spanglishGuideline}
- Pocket & BPM: ${pocketGuideline}

# CAPA 4: MAPA ESTRUCTURAL
Sigue este esqueleto. Para el conteo operativo de la aplicación, cada línea se tratará como una unidad aproximada de interpretación. No sacrifiques naturalidad para forzar una división métrica artificial:
${structurePlan}

# CAPA 5: FORMATO DE SALIDA
- Devuelve ÚNICAMENTE la letra estructurada con encabezados entre corchetes [Section: Artist - Timbre]. Cero introducciones, explicaciones o notas fuera de los corchetes.
- Ad-libs siempre entre paréntesis simples: (...).
- NUNCA pongas nombres de artistas, apodos o sellos dentro de los paréntesis ( ... ) ni en las barras de la letra (Suno canta lo que hay entre paréntesis; los nombres de los artistas SOLO deben existir en los encabezados de corchetes [Section: Artist - Timbre]).
- Hook Anchor Rule: El estribillo [Hook / Chorus] debe conservar su frase ancla reconocible y su idea emocional central en cada repetición, pero admite pequeñas variaciones secundarias de ad-libs, énfasis o palabras de transición.`;
}

/**
 * Compila el prompt de regeneración local con Ficha Operativa y contexto de vecindad.
 * Evita el truncado ciego y no impone exactLines a secciones instrumentales o habladas.
 */
export function buildSectionRegenerationPrompt(params: SectionRegenerationParams): string {
  const isInstrumental = params.sectionType === "instrumental" || params.sectionName.toLowerCase().includes("beat drop");

  if (isInstrumental) {
    return `Eres un productor de trap de élite en sesión de grabación.

CANCIÓN COMPLETA (REFERENCIA DE CONTINUIDAD):
---
${params.fullLyrics}
---

FICHA OPERATIVA DE REGENERACIÓN:
- Sección a reescribir: [${params.sectionName}]
- Tipo: Instrumental / Producción (NO CONTIENE LÍRICA CANTADA)
- Función: ${params.narrativeRole || "Solo de producción instrumental o beat drop para Suno AI"}

TAREA:
Devuelve ÚNICAMENTE la indicación acústica o etiqueta instrumental para Suno AI (por ejemplo: [${params.sectionName}: ${params.artistStyle || "Instrumental Production"}]). CERO texto conversacional, CERO explicaciones y CERO líneas cantadas.`;
  }

  const safeFacts = (params.factsToPreserve || [])
    .map(f => f.trim())
    .filter(Boolean)
    .slice(0, 8);

  const isLyrical = params.sectionType === "lyrical" || (!params.sectionType && !isInstrumental);
  const exactLinesClause = isLyrical && params.exactLines && params.exactLines > 0
    ? `- Unidad operativa: Devuelve EXACTAMENTE ${params.exactLines} líneas de texto cantado (sin contar el encabezado [${params.sectionName}]).`
    : "- Unidad operativa: Bloque de texto breve y natural acorde a la sección (sin conteo estricto de líneas).";

  return `Eres el mismo ghostwriter de élite que escribió la canción siguiente.

CANCIÓN COMPLETA (REFERENCIA DE CONTINUIDAD):
---
${params.fullLyrics}
---

FICHA OPERATIVA DE REGENERACIÓN:
- Sección a reescribir: [${params.sectionName}]
- Estilo e Intérprete: ${params.artistStyle}
${exactLinesClause}
- Función narrativa: ${params.narrativeRole || "Desarrollo lírico con máxima frescura y pegada"}
${safeFacts.length > 0 ? `- Hechos e Imágenes a Preservar: ${safeFacts.join(", ")}` : "- Hechos a Preservar: Mantén la coherencia con los sucesos de la estrofa previa."}
${params.previousSectionTail ? `- Vecindad Anterior (Empalme de entrada): Viene de "... ${params.previousSectionTail.trim()}"` : ""}
${params.nextSectionHead ? `- Vecindad Posterior (Empalme de salida): Conecta hacia "${params.nextSectionHead.trim()} ..."` : ""}
${params.neighborHookAnchor ? `- Frase Ancla Vecina: Conecta con el hook "${params.neighborHookAnchor.trim()}"` : ""}
${params.anchors?.requiredPhrases?.length ? `- Frases Ancla Obligatorias: [${params.anchors.requiredPhrases.join(", ")}]` : ""}
${params.anchors?.lockedLines?.length ? `- Compases Bloqueados Inmutables: [${params.anchors.lockedLines.join(" | ")}]` : ""}

TAREA LÍRICA:
Reescribe desde cero ÚNICAMENTE esta sección.
- Conserva la función narrativa y los hechos ya establecidos en la canción.
- Cambia completamente la formulación lírica, la cadencia del flow, los patrones de rima y los punchlines para que suenen más frescos y originales.
- PROHIBIDO copiar versos literales de la versión previa de esta sección (salvo los elementos ancla autorizados).

SALIDA ESTRICTA:
- Comienza directamente en el encabezado [${params.sectionName}].
- Devuelve únicamente las líneas cantadas correspondientes. Cero introducciones ni explicaciones.`;
}

/**
 * Modo Estudio Guiado (Laboratorio): 1 pasada holística con Scene Turn explícito.
 */
export function buildGuidedPrompt(params: PromptParams): string {
  return buildHolisticPrompt(params);
}

/**
 * Función Maestra del Sistema:
 * - Si params.regenerateSection está presente, compila la Ficha Operativa con contexto completo.
 * - Por defecto, compila el Prompt Holístico Compacto en 5 capas.
 */
export function buildSystemPrompt(params: PromptParams): string {
  if (params.regenerateSection) {
    const voiceAssign = params.sectionVoices?.find(v => v.sectionName === params.regenerateSection?.sectionName);
    const secObj = params.structure?.sections?.find(s => s.name === params.regenerateSection?.sectionName);
    const leadStyle = resolveFunctionalArtistStyle(params.artistId);

    return buildSectionRegenerationPrompt({
      sectionName: params.regenerateSection.sectionName,
      sectionType: params.regenerateSection.sectionType || (secObj?.type === "instrumental" || secObj?.type === "beat_drop" ? "instrumental" : "lyrical"),
      artistStyle: `${leadStyle.timbre}, ${leadStyle.cadence}`,
      exactLines: params.regenerateSection.exactLines || voiceAssign?.bars || (secObj?.type === "verse" ? 12 : 8),
      fullLyrics: params.regenerateSection.keepContext,
      narrativeRole: params.regenerateSection.narrativeRole || `Re-escritura con flow fresco para [${params.regenerateSection.sectionName}]`,
      factsToPreserve: params.regenerateSection.factsToPreserve || (params.topics || []).slice(0, 5),
      previousSectionTail: params.regenerateSection.previousSectionTail,
      nextSectionHead: params.regenerateSection.nextSectionHead,
      neighborHookAnchor: params.regenerateSection.neighborHookAnchor,
      anchors: params.regenerateSection.anchors,
    });
  }

  return buildHolisticPrompt(params);
}

export interface SunoStyleLayers {
  genre: string;
  vocal: string;
  instruments: string;
  mix: string;
}

export interface SunoStyleResult {
  prompt: string;
  layers: SunoStyleLayers;
  charCount: number;
}

export interface SunoStylePromptParams {
  beatType?: BeatType;
  bpmVibe: BpmVibe;
  moodId: string;
  artistId: string;
  featureArtistId?: string;
  producerId?: string;
  structureLabel?: string;
  dirtyLevel?: number;
}

/**
 * Builds a 4-layer Suno-style prompt optimized to 200-280 characters for Suno AI v4 / v4.5.
 * Layer 1: Genre, BPM & Groove
 * Layer 2: Vocal Timbre (Lead or Dual)
 * Layer 3: Instrumentation & 808s
 * Layer 4: Mix & Texture
 */
export function buildSunoStyleResult(params: SunoStylePromptParams): SunoStyleResult {
  // Capa 1: Subgénero, BPM & Groove
  const bpmNum = parseInt(params.bpmVibe.range.split("-")[1] ?? "130");
  const rawGenre = params.beatType?.label
    ? params.beatType.label.toLowerCase().replace(/ \/ .*/, "").replace(/ standard/, "")
    : "trap";
  let groove = "half-time bounce";
  if (bpmNum > 150) groove = "rapid syncopated rhythm";
  else if (bpmNum < 110) groove = "slow melodic bounce";
  else if (params.beatType?.id.includes("drill")) groove = "sliding 808 drill bounce";
  else if (params.beatType?.id.includes("rage")) groove = "high-energy moshpit drive";

  const layer1Genre = `${rawGenre}, ${params.bpmVibe.range} BPM, ${groove}`;

  // Capa 2: Timbre Vocal (Lead o Dual)
  const leadProfile = getFlowProfile(params.artistId);
  const featProfile = params.featureArtistId && params.featureArtistId !== "none" ? getFlowProfile(params.featureArtistId) : null;
  
  let layer2Vocal = leadProfile?.sunoVocalTimbre ?? "deep male vocal, modern auto-tune";
  if (featProfile) {
    // Condensed dual vocal timbre
    const leadCondensed = (leadProfile?.sunoVocalTimbre ?? "melodic male vocals").split(",")[0].trim();
    const featCondensed = featProfile.sunoVocalTimbre.split(",")[0].trim();
    layer2Vocal = `${leadCondensed} & ${featCondensed}, dual vocal contrast`;
  }

  // Capa 3: Instrumentación & 808s
  const moodInstrumentMap: Record<string, string[]> = {
    agresivo: ["distorted sliding 808", "rapid hi-hat rolls", "menacing synth"],
    oscuro: ["dark heavy 808 sub-bass", "sinister bell melody", "sharp claps"],
    melancolico: ["emotional sad guitar loop", "warm sliding 808", "ambient pad"],
    introspectivo: ["lo-fi piano chords", "deep sub-bass", "crisp rimshots"],
    flex: ["luxurious brass stabs", "clean punchy 808", "bright synth leads"],
    fiesta: ["bouncy club synths", "energetic percussion", "punchy 808 drop"],
    calle: ["gritty street 808 slides", "stuttering hi-hats", "dark piano riffs"],
    romantico: ["sensual warm synth pads", "smooth 808", "subtle vocal chops"],
  };

  // Producer sonic flavor injection
  let producerFlavor = "";
  if (params.producerId && params.producerId !== "none") {
    if (params.producerId === "pierre_bourne") producerFlavor = "trippy synth flute, bouncy 808 bounce";
    else if (params.producerId === "murda_beatz") producerFlavor = "bright bell melody, punchy clean 808 bounce";
    else if (params.producerId === "mustard") producerFlavor = "hyphy west coast bounce, crisp claps, bouncy sub";
    else if (params.producerId === "da_got_that_dope") producerFlavor = "ultra-bouncy club bounce, spring 808, syncopated rhythm";
    else if (params.producerId === "cardo") producerFlavor = "spacey vintage synth, elastic bounce, deep 808";
    else if (params.producerId === "cash_cobain") producerFlavor = "sexy sample drill, filtered vocal chop, warm 808 slides";
    else if (params.producerId === "taz_taylor") producerFlavor = "melodic guitar loop, bouncy roll hi-hats, clean 808";
    else if (params.producerId === "helluva") producerFlavor = "detroit piano bounce, off-beat clap, aggressive 808";
    else if (params.producerId === "wondagurl") producerFlavor = "dark distorted industrial 808, cinematic low-end";
    else if (params.producerId === "bnyx" || params.producerId === "f1lthy") producerFlavor = "distorted rage lead, chaotic heavy 808";
    else if (params.producerId === "zaytovan") producerFlavor = "zaytoven piano riff, bouncy atlanta 808";
    else if (params.producerId === "metro_boomin") producerFlavor = "metro dark bells, cinematic 808 sub, crisp hi-hats";
  }

  // Merge with beatType tags if present
  const moodKey = params.moodId.split(" ")[0].toLowerCase();
  const baseInstruments = moodInstrumentMap[moodKey] ?? moodInstrumentMap["calle"] ?? ["punchy 808 bass", "fast hi-hat rolls", "atmospheric synth"];
  const layer3Instruments = producerFlavor ? `${producerFlavor}, ${baseInstruments.slice(0, 2).join(", ")}` : baseInstruments.join(", ");

  // Capa 4: Mezcla & Textura
  let layer4Mix = "crisp modern trap mix, wide stereo";
  if (params.dirtyLevel === 3 || params.dirtyLevel === 4) {
    layer4Mix = "raw aggressive master, overdriven 808";
  } else if (moodKey.includes("melancolico") || moodKey.includes("introspectivo")) {
    layer4Mix = "spacious reverb, warm master, clean transients";
  } else if (moodKey.includes("oscuro") || moodKey.includes("agresivo")) {
    layer4Mix = "punchy transients, distorted low-end, wide stereo";
  }

  const layers: SunoStyleLayers = {
    genre: layer1Genre,
    vocal: layer2Vocal,
    instruments: layer3Instruments,
    mix: layer4Mix,
  };

  // Composite prompt
  let composite = `${layers.genre}, ${layers.vocal}, ${layers.instruments}, ${layers.mix}`;

  // Deduplicate tokens
  const parts = composite.split(",").map(p => p.trim()).filter(Boolean);
  const uniqueParts: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueParts.push(part);
    }
  }
  composite = uniqueParts.join(", ");

  // Enforce 200-280 chars target
  if (composite.length > 280) {
    const withoutMix = uniqueParts.slice(0, -1).join(", ");
    if (withoutMix.length <= 280 && withoutMix.length >= 180) {
      composite = withoutMix;
    } else if (composite.length > 280) {
      composite = composite.substring(0, 277).replace(/,\s*[^,]*$/, "") + "...";
    }
  }

  return {
    prompt: composite,
    layers,
    charCount: composite.length,
  };
}

/**
 * Builds a Suno-style music prompt string from the config.
 */
export function buildSunoStylePrompt(params: SunoStylePromptParams): string {
  return buildSunoStyleResult(params).prompt;
}

/**
 * Quita quirúrgicamente los nombres de artistas de los corchetes de Suno AI,
 * preservando intactas las directivas acústicas y de timbre:
 * [Intro: Fredo Santana - deep raspy monotone male vocal] -> [Intro: deep raspy monotone male vocal]
 * [Verse 2: Takeoff - triplet flow] -> [Verse 2: triplet flow]
 * [Bridge: Fredo Santana & Takeoff] -> [Bridge]
 * [Verse 1: Duki] -> [Verse 1]
 */
export function stripArtistNamesFromLyrics(lyrics: string, artistNames: string[] = []): string {
  if (!lyrics) return "";

  const knownArtists = new Set<string>();
  try {
    const all = getAllArtists();
    for (const a of all) {
      if (a.name) knownArtists.add(a.name.trim().toLowerCase());
    }
  } catch {
    // fallback seguro si se invoca en un contexto sin trap-data
  }
  for (const name of artistNames) {
    if (name) knownArtists.add(name.trim().toLowerCase());
  }

  // Palabras clave de descriptores vocales/acústicos que no son nombres propios de personas
  const acousticKeywords = /\b(vocal|vocals|male|female|voice|raspy|autotune|auto-tune|flow|cadence|delivery|tempo|bpm|synth|drop|reverb|staccato|melodic|aggressive|energetic|whisper|falsetto|trading|bars|decaying|fading|alternating|smooth|acoustic|piano|808|chilling|monotone|slow|fast|trap|drill|plugg|rage|clean|harmonies|stack|anthem|tag|riser|snare|strings|brass|fx|intro|outro|hook|chorus|verse|bridge|sub-bass|pulse|switch|stutter)\b/i;

  return lyrics.replace(/\[([^\]\n]+)\]/g, (fullMatch, inner) => {
    const trimmed = inner.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      return fullMatch;
    }

    const sectionName = trimmed.slice(0, colonIdx).trim();
    const afterColon = trimmed.slice(colonIdx + 1).trim();

    // Caso 1: Separador con guion e.g. "Fredo Santana - deep raspy monotone Chicago drill male vocal"
    const hyphenIdx = afterColon.indexOf("-");
    if (hyphenIdx !== -1) {
      const leftPart = afterColon.slice(0, hyphenIdx).trim();
      const rightPart = afterColon.slice(hyphenIdx + 1).trim();

      const leftLower = leftPart.toLowerCase();
      const isKnown = knownArtists.has(leftLower) || Array.from(knownArtists).some(k => leftLower.includes(k));
      const hasArtistConnector = /(&|\bfeat\.?|\bft\.?|\bx\b|\band\b|,)/i.test(leftPart);
      const isAcousticTag = acousticKeywords.test(leftPart);

      // Si es un artista conocido, o tiene conectores tipo "A & B", o el lado izquierdo no son palabras acústicas
      if (isKnown || hasArtistConnector || !isAcousticTag) {
        return rightPart ? `[${sectionName}: ${rightPart}]` : `[${sectionName}]`;
      }
    }

    // Caso 2: Sin guion e.g. "Fredo Santana" o "Fredo Santana & Takeoff" vs "deep raspy male vocal"
    const afterLower = afterColon.toLowerCase();
    const isKnown = knownArtists.has(afterLower) || Array.from(knownArtists).some(k => afterLower.includes(k));
    const isPurelyAcoustic = acousticKeywords.test(afterColon);

    if (isKnown || (!isPurelyAcoustic && !afterColon.includes(","))) {
      return `[${sectionName}]`;
    }

    return fullMatch;
  });
}

/**
 * Limpiador quirúrgico de menciones de nombres de artistas en el CUERPO de la letra
 * y especialmente dentro de los ad-libs entre paréntesis ( ... ).
 *
 * PRESERVA 100% INTACTOS los corchetes de sección [Verse 1: Fredo Santana - ...]
 * para que Suno AI reconozca el modelo de voz.
 *
 * Elimina o neutraliza ad-libs que sean nombres propios de raperos o sus sellos:
 * (Fredo!) -> (Grrah!)
 * (Takeoff!) -> (Yeah!)
 * (Savage!) -> (Grrah!)
 * (Savage Squad!) -> (Bow!)
 * (Duki!) -> (Yeah!)
 */
export function stripArtistMentionsFromLyricBody(lyrics: string, artistNames: string[] = []): string {
  if (!lyrics) return "";

  const targetTerms = new Set<string>();
  try {
    const all = getAllArtists();
    for (const a of all) {
      if (a.name) {
        targetTerms.add(a.name.trim().toLowerCase());
        const parts = a.name.trim().split(/\s+/);
        if (parts.length > 1) {
          for (const p of parts) {
            if (p.length >= 4) {
              targetTerms.add(p.toLowerCase());
            }
          }
        }
      }
    }
  } catch {
    // fallback seguro
  }

  // Sellos y apodos de trap frecuentes que se cuelan como ad-libs
  const knownCrewsAndNicknames = [
    "savage squad", "glory boyz", "gbé", "freebandz", "1017", "brick squad",
    "g-unit", "young mula", "maybach music", "dipset", "qc", "cactus jack",
    "modo diablo", "la flame", "tunechi", "weezy", "snowman", "huncho"
  ];
  for (const c of knownCrewsAndNicknames) {
    targetTerms.add(c.toLowerCase());
  }

  for (const name of artistNames) {
    if (name) {
      targetTerms.add(name.trim().toLowerCase());
      const parts = name.trim().split(/\s+/);
      if (parts.length > 1) {
        for (const p of parts) {
          if (p.length >= 4) targetTerms.add(p.toLowerCase());
        }
      }
    }
  }

  const lines = lyrics.split("\n");
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    // Si la línea es un encabezado de sección entre corchetes, SE CONSERVA 100% INTACTO
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return line;
    }

    // Procesar paréntesis de ad-libs en el texto de la letra
    let cleanedLine = line.replace(/\(([^)]+)\)/g, (fullMatch, inner) => {
      const innerTrimmed = inner.trim();
      const innerLower = innerTrimmed.toLowerCase().replace(/[!.,?¡¿]/g, "").trim();

      const matchesArtist = targetTerms.has(innerLower) ||
        Array.from(targetTerms).some(t => t.length >= 4 && (innerLower === t || innerLower.startsWith(`${t} `) || innerLower.endsWith(` ${t}`)));

      if (matchesArtist) {
        return "(Grrah!)";
      }

      return fullMatch;
    });

    // Limpiar menciones de sellos o roll-call en líneas de barra fuera de corchetes
    for (const crew of knownCrewsAndNicknames) {
      const reg = new RegExp(`\\b${crew}\\b[!.,?]?`, "gi");
      cleanedLine = cleanedLine.replace(reg, "the crew!");
    }

    return cleanedLine;
  });

  return processedLines.join("\n");
}

/**
 * Limpiador quirúrgico de encabezados de sección para Suno AI v4.5.
 * Elimina cualquier instrucción ajena, conteo de barras residual o Markdown '###',
 * PRESERVANDO la guía vocal y el timbre asignado al artista dentro de los corchetes:
 * ej: [Verse 1: Duki - male vocal, deep raspy auto-tune, aggressive triplet flow].
 * Además, purga del cuerpo de la letra cualquier mención a nombres de artistas en ad-libs (...).
 */
export function cleanSunoBracketHeaders(
  lyrics: string,
  options?: {
    artistId?: string;
    featureArtistId?: string;
    sectionVoices?: SectionVoiceAssignment[];
    stripArtistNames?: boolean;
  }
): string {
  if (!lyrics) return "";
  const sanitized = stripMetaReasoning(lyrics);
  const cleaned = sanitized
    // Eliminar Markdown headers: ### [Section] -> [Section] o ### Section
    .replace(/^#{1,6}[ \t]*(\[[^\]]+\])/gm, "$1")
    .replace(/^#{1,6}[ \t]+/gm, "")
    // Eliminar Markdown bold/italic envolviendo corchetes SOLO en la misma línea (sin consumir saltos de línea \n):
    .replace(/^[ \t]*[*_]{1,3}[ \t]*(\[[^\]]+\])[ \t]*[*_]{0,3}/gm, "$1")
    .replace(/(\[[^\]]+\])[ \t]*[*_]{1,3}/g, "$1")
    // Limpiar notas residuales pegadas al corchete: e.g. [Chorus: ...] — 8 barras → [REGLA...] o [VOZ AUTORIZADA: ...]
    .replace(/^(\[[^\]]+\])[ \t]*[—–-][ \t]*.*$/gm, "$1")
    .replace(/^(\[[^\]]+\])[ \t]*→.*$/gm, "$1")
    .replace(/\[[ \t]*(?:VOZ AUTORIZADA|REGLA|MODO HYPE)[^\]]*\]/gi, "")
    // Limpiar notas de intérprete tipo *Intérprete:*
    .replace(/^\*+(?:Int[ée]rprete?|Interpr[èe]te?):\s*([^*\n]+)\*+$/gim, "")
    .replace(/^(?:Int[ée]rprete?|Interpr[èe]te?):\s*.+$/gim, "")
    // Limpiar metadatos espurios dentro de los corchetes preservando la guía vocal:
    .replace(/\[([^\]\n]+)\]/g, (match, inner) => {
      let content = inner.trim();
      // Eliminar conteo de barras residual dentro del corchete: e.g. " — 8 barras", " — 16 bars", " - 4 compases"
      content = content.replace(/\s*[—–-]\s*\d+\s*(?:barras?|bars?|compases?).*$/i, "");
      // Eliminar notas de instrucciones residuales dentro del corchete: e.g. "→ [REGLA...]", "[VOZ AUTORIZADA...]"
      content = content.replace(/\s*[—–-]?\s*(?:→\s*)?\[?(?:REGLA|VOZ AUTORIZADA|MODO HYPE|NO LYRICS|REPETICI[ÓO]N)[^\]]*\]?/gi, "");
      // Eliminar tags mortuorios
      content = content.replace(/\s*\((?:RIP|QEPD)\)/gi, "");
      // Limpiar asteriscos o backticks internos
      content = content.replace(/[*_`]/g, "");
      // Normalizar espacios
      content = content.replace(/[ \t]{2,}/g, " ").trim();

      // Enriquecimiento automático si solo tiene el nombre y no tiene guía vocal "-" ni ","
      if (options?.artistId && !content.includes("-") && !content.includes(",")) {
        const colonIdx = content.indexOf(":");
        if (colonIdx !== -1) {
          const secName = content.slice(0, colonIdx).trim();
          const voicePart = content.slice(colonIdx + 1).trim();
          const va = options.sectionVoices?.find(v => v.sectionName.toLowerCase() === secName.toLowerCase());
          const isChorus = secName.toLowerCase().includes("chorus") || secName.toLowerCase().includes("hook") || secName.toLowerCase().includes("estribillo");
          const isIntro = secName.toLowerCase().includes("intro");
          const guide = resolveArtistVocalGuide(va?.voice ?? "auto", {
            mainArtistId: options.artistId,
            featureArtistId: options.featureArtistId,
            sectionName: secName,
            isChorus,
            isIntro,
            introStyle: va?.introStyle,
          });
          if (guide.vocalGuide) {
            content = `${secName}: ${voicePart} - ${guide.vocalGuide}`;
          }
        }
      }

      return `[${content}]`;
    })
    // Limpiar backticks de código markdown
    .replace(/`{1,3}/g, "")
    // Limpiar asteriscos markdown envolviendo ad-libs: *(adlib)* -> (adlib)
    .replace(/\*[ \t]*\(([^)]+)\)[ \t]*\*/g, "($1)")
    // Limpiar asteriscos huérfanos antes de ad-libs: ** (adlib) -> (adlib)
    .replace(/[*_]{1,3}[ \t]*\(([^)]+)\)/g, "($1)")
    // Limpiar asteriscos huérfanos al final de línea
    .replace(/[ \t]*[*_]{1,3}[ \t]*$/gm, "")
    // Limpiar asteriscos huérfanos al inicio de línea
    .replace(/^[ \t]*[*_]{1,3}[ \t]*/gm, "")
    // Limpiar saltos de línea triples
    .replace(/^\s*[\r\n]{2,}/gm, "\n\n")
    .trim();

  // Siempre purgamos cualquier mención a nombres de artistas en los ad-libs (...) de la letra
  const artistNames: string[] = [];
  if (options?.artistId) {
    const a = getArtistById(options.artistId);
    if (a?.name) artistNames.push(a.name);
  }
  if (options?.featureArtistId) {
    const f = getArtistById(options.featureArtistId);
    if (f?.name) artistNames.push(f.name);
  }

  return stripArtistMentionsFromLyricBody(cleaned, artistNames);
}

// ========================================================================
// FEATURE CONTRAST PROFILE: CONTRASTE EQUILIBRADO MULTIDIMENSIONAL
// ========================================================================

export interface FeatureContrastProfile {
  flowContrast: number;
  lexicalContrast: number;
  perspectiveContrast: number;
  densityContrast: number;
  vocalContrast: number;
  contrastScore: number;
  instruction: string;
}

export function buildFeatureContrastProfile(leadArtistId: string, featureArtistId: string): FeatureContrastProfile {
  const leadDNA = getMusicalDNAForArtist(leadArtistId);
  const featDNA = getMusicalDNAForArtist(featureArtistId);
  const leadProfile = getFlowProfile(leadArtistId);
  const featProfile = getFlowProfile(featureArtistId);

  const flowDiff = leadProfile?.cadence !== featProfile?.cadence ? 0.8 : 0.2;
  const leadSyllables = leadProfile?.syllablesPerBar ?? 10;
  const featSyllables = featProfile?.syllablesPerBar ?? 10;
  const densityDiff = Math.min(1.0, Math.abs(leadSyllables - featSyllables) / 6);
  const vocalDiff = leadDNA.vocal.sunoVocalTimbre !== featDNA.vocal.sunoVocalTimbre ? 0.75 : 0.25;
  const leadPreset = ARTIST_PRESETS[leadArtistId];
  const featPreset = ARTIST_PRESETS[featureArtistId];
  const originDiff = (leadPreset?.origin && featPreset?.origin && leadPreset.origin !== featPreset.origin) ? 0.7 : 0.3;
  const lexicalDiff = (leadProfile?.wordplayTier !== featProfile?.wordplayTier) ? 0.6 : 0.3;

  const contrastScore = Number(((flowDiff * 0.3) + (densityDiff * 0.25) + (vocalDiff * 0.25) + (originDiff * 0.2)).toFixed(2));

  const instruction = `- **Contraste de Feature Equilibrado (Score: ${contrastScore})**: El artista invitado debe aportar contraste orgánico en 2-3 dimensiones clave (cadencia: ${featProfile?.cadence ?? "variable"}, entrega vocal: ${featDNA.vocal.sunoVocalTimbre}), manteniendo el pulso rítmico general pero sin clonar el fraseo del artista principal.`;

  return {
    flowContrast: flowDiff,
    lexicalContrast: lexicalDiff,
    perspectiveContrast: originDiff,
    densityContrast: densityDiff,
    vocalContrast: vocalDiff,
    contrastScore,
    instruction,
  };
}

// ========================================================================
// PIPELINE DE ESTUDIO SNAPPY: 2-PASS PRIMARY + EXCEPTION-ONLY REPAIR
// ========================================================================

/**
 * PASADA 1: TOPLINER & HOOK CONTRACT (DESENCASILLADO & ORGÁNICO)
 * Diseña el estribillo / hook central con musicalidad, fraseo completo y el estilo auténtico del artista.
 * Prohíbe las restricciones telegráficas artificiales y los atrezzos inyectados.
 */
export function buildStage1ToplinePrompt(
  params: PromptParams,
  flowSkeletonSummary?: string,
  hookVariationsEnabled: boolean = true
): string {
  const artist = getArtistById(params.artistId);
  const featureArtist = params.featureArtistId ? getArtistById(params.featureArtistId) : null;
  const spanglish = buildSpanglishInstruction(params.spanglishPercent);
  const dirty = getDirtyLevel(params.dirtyLevel ?? 2);

  // 1. Resolver especificación canónica y artista real del Hook
  const hookSpec = resolveSectionSpec(params.structure.sections, params.sectionVoices, "hook");
  const targetBars = hookSpec.targetBars || 8;
  let hookVoice = artist?.name ?? "Lead";
  let hookArtistId = params.artistId;
  if (hookSpec.voiceId === "feature" && featureArtist) {
    hookVoice = featureArtist.name;
    hookArtistId = featureArtist.id;
  } else if (hookSpec.voiceId === "both") {
    hookVoice = `${artist?.name ?? "Lead"} & ${featureArtist?.name ?? "Feature"}`;
  } else if (hookSpec.voiceId && hookSpec.voiceId !== "auto" && hookSpec.voiceId !== "main") {
    const assignedArtist = getArtistById(hookSpec.voiceId);
    if (assignedArtist) {
      hookVoice = assignedArtist.name;
      hookArtistId = assignedArtist.id;
    }
  }

  const hookArtist = getArtistById(hookArtistId) ?? artist;
  const hookDNA = getMusicalDNAForArtist(hookArtistId);
  const hookFlowProfile = getFlowProfile(hookArtistId);

  // 2. Resolver esquema de rima del hook (UI override o nativo del artista)
  const customScheme = params.rhymeSchemeId && params.rhymeSchemeId !== "rs_free" ? getRhymeSchemeById(params.rhymeSchemeId) : null;
  const hookRhymeSchemeId = customScheme?.id ?? hookFlowProfile?.defaultRhymeScheme ?? "rs_aabb";
  const hookRhymeScheme = getRhymeSchemeById(hookRhymeSchemeId);

  // Hook Strategy: Check if the user explicitly chose a style or repetition pattern
  const hookVa = params.sectionVoices?.find(v => v.sectionName.toLowerCase().includes("chorus") || v.sectionName.toLowerCase().includes("hook"));
  const userExplicitHookStyle = hookVa?.hookStyle && hookVa.hookStyle !== "auto" ? hookVa.hookStyle : undefined;
  const userExplicitRepPattern = hookVa?.repetitionPattern && hookVa.repetitionPattern !== "none" ? hookVa.repetitionPattern : undefined;

  let hookInstructionBlock = "";
  if (userExplicitHookStyle || userExplicitRepPattern) {
    const recommendedStrategy = recommendHookStrategy(
      hookDNA.flow.cadenceType,
      userExplicitHookStyle
    );
    const strategyConfig = HOOK_STRATEGIES[recommendedStrategy];
    hookInstructionBlock = `
# 🔁 PATRÓN DE GANCHO SELECCIONADO POR EL USUARIO: ${strategyConfig.label.toUpperCase()}
- **Intérprete Asignado**: ${hookArtist?.name ?? "Lead"}
- **Instrucción de Estrategia**: ${strategyConfig.instructionPrompt}
- **Esquema de Rima Obligatorio**: ${hookRhymeScheme?.label ?? "AABB"} (${hookRhymeScheme?.description ?? ""})
- **⚡ ARQUITECTURA SIMÉTRICA 4+4 (EARWORM FRAMEWORK)**:
  * Compases 1-4 (Motivo Núcleo): Establece el ancla melódica o mantra con 1-2 líneas motrices potentes con rimas audibles.
  * Compases 5-8 (Elevación & Cierre): Retoma el motivo variando la segunda mitad, elevando la textura vocal y rematando en la barra 8 con un payoff definitivo.`;
  } else {
    // AUTO MODE = ARQUITECTURA ORGÁNICA BASADA EN EL FLOW DEL ARTISTA + 4+4 EARWORM FRAMEWORK
    const recommendedStrategy = recommendHookStrategy(
      hookDNA.flow.cadenceType,
      hookFlowProfile?.hookStyle
    );
    const strategyConfig = HOOK_STRATEGIES[recommendedStrategy];
    hookInstructionBlock = `
# 🎵 ARQUITECTURA DE GANCHO: AUTÉNTICA DE ${hookArtist?.name ?? "EL ARTISTA"} (${strategyConfig.label.toUpperCase()})
- **Intérprete Asignado**: ${hookArtist?.name ?? "Lead"}
- **Cadencia y Motor Rítmico**: Flow ${hookFlowProfile?.cadence?.toUpperCase() ?? "STACCATO"} (${hookFlowProfile?.speedLabel ?? "natural"}). ${hookFlowProfile?.cadenceInstruction ?? ""}
- **Esquema de Rima Obligatorio**: ${hookRhymeScheme?.label ?? "AABB"} (${hookRhymeScheme?.description ?? ""})
- **Estrategia Rítmica del Artista**: ${strategyConfig.instructionPrompt}
- **⚡ ARQUITECTURA SIMÉTRICA 4+4 (EARWORM FRAMEWORK — ESTRICTA)**:
  * **Compases 1 a 4 (Motivo Núcleo / Anclaje Hipnótico)**: Establece 1 o 2 líneas motrices de anclaje (hook phrase/mantra), con rima audible y groove bailable con espacio para el bajo 808.
  * **Compases 5 a 8 (Elevación, Variación & Payoff)**: Retoma el motivo melódico de los compases 1-4, elevando la tensión vocal, variando el remate lírico o intensificando los ad-libs, resolviendo en el compás 8 con un payoff definitivo o corte seco.
  * **🚫 PROHIBIDO ESTRIBILLO COMO MINI-VERSO NARRATIVO**: Queda TERMINANTEMENTE PROHIBIDO escribir el estribillo como 8 líneas inconexas de una historia. El estribillo NO es una estrofa ni un relato de 8 acciones cronológicas; es un OBJETO RÍTMICO Y MELÓDICO MEMORABLE (earworm) que se graba en la cabeza por repetición, simetría y tensión.`;
  }

  const kw = hookVa?.customKeyword?.trim();

  let sceneBlock = "";
  if (params.situationalPresetId && params.situationalPresetId !== "none") {
    const sitScene = getSceneById(params.situationalPresetId);
    if (sitScene) {
      sceneBlock = `\n- **Escenario Físico & Situación**: ${sitScene.title} (${sitScene.atmosphere}) — Tensión: ${sitScene.conflict}`;
    }
  }

  const userTopicsList = [params.customTopic, ...params.topics].filter(Boolean);
  const topicIntents = userTopicsList.map(classifyTopicIntent);
  const namedEntities = topicIntents.filter(t => t.kind === "named_entity").map(t => t.value);
  const abstractThemes = topicIntents.filter(t => t.kind === "abstract_theme").map(t => t.value);
  const goldExamples = getCompositionalGoldExamples(hookArtistId);

  const topicsBlock = userTopicsList.length > 0
    ? `- **Atmósfera y Temáticas Conceptuales**: ${userTopicsList.join(", ")}
⚠️ REGLA DE ORO ANTI-CHECKLIST / CERO LISTA DE LA COMPRA:
- Queda TERMINANTEMENTE PROHIBIDO usar los nombres de los temas como palabras literales en la letra (NO escribas compases que empiecen por "Dinero y hustle", "Hierba y humo", "Coca y polvo", "Drogas y lean", "Cuentas claras"). Eso suena a plantilla robótica de Excel y destruye la musicalidad.
- Los temas son la ATMÓSFERA CONCEPTUAL y el CONTEXTO ABSTRACTO de la escena. Desarrolla el gancho con autenticidad a través de hechos físicos, tensión callejera, marcas reales, coches, cepas y jerga viva de la cultura trap.
${namedEntities.length > 0 ? `- **Entidades Nombradas Disponibles**: [${namedEntities.join(", ")}]. Puedes integrarlas si la escena lo pide, pero sin forzarlas como eslogan publicitario.` : ""}`
    : "- **Temática**: Estilo libre de trap y calle.";

  return `Eres el Topliner y Diseñador de Ganchos (Hook Architect) más cotizado del Trap y Rap contemporáneo.
Tu misión en esta sesión de estudio es componer EXCLUSIVAMENTE UN ÚNICO [Chorus / Hook] canónico para la canción con total musicalidad y autenticidad callejera. NO escribas versos, intros ni repeticiones todavía.

# 🎯 PROYECTO & ADN DEL ARTISTA DEL GANCHO
- Artista del Estribillo: ${hookArtist?.name ?? "Lead"} (${hookArtist?.origin ?? "Trap"})
- Timbre & Entrega Vocal: ${hookDNA.vocal.sunoVocalTimbre} | Rango Melódico: ${hookDNA.vocal.melodicRange}
- Motor Rítmico de Flow: Cadencia ${hookDNA.flow.cadenceType} (${hookDNA.flow.avgSyllablesPerBar.join("-")} sílabas por compás) | Velocidad/Sensación: ${hookFlowProfile?.speedLabel ?? "natural trap pocket"}
${hookFlowProfile?.cadenceInstruction ? `- Instrucción de Cadencia: ${hookFlowProfile.cadenceInstruction}` : ""}
${featureArtist && hookArtistId !== featureArtist.id ? `- Feature en el tema: ${featureArtist.name} (${featureArtist.origin})` : ""}
- Tempo: ${params.bpmVibe.range} BPM (${params.bpmVibe.label})
- Nivel de Actitud / Dirty: ${dirty.label} (${dirty.badge})
${topicsBlock}${sceneBlock}
${params.customDictionary?.trim() ? `- Diccionario de calle del usuario: { ${params.customDictionary.trim()} }` : ""}
${params.languageDNA ? params.languageDNA.instructionBlock : spanglish.prompt}

# 🎯 TAREA: DISEÑO DE UN ÚNICO HOOK CANÓNICO (SINGLE CANONICAL UNIT)
- Objetivo: Diseña EXACTAMENTE UN ÚNICO bloque [Chorus: ${hookVoice}] de ${targetBars} compases.
- Cardinalidad canónica: EXACTAMENTE ${targetBars} compases / líneas de texto cantado.${kw ? ` · Palabra/Frase clave obligatoria: "${kw}"` : ""}
- 🚫 PROHIBIDO generar repeticiones del estribillo (Chorus 2, Chorus 3, etc.) ni duplicar el bloque de texto. El motor de estudio se encargará de instanciarlo a lo largo de la canción.
- 🚫 PROHIBIDO usar asteriscos * o ** ni formato Markdown en los ad-libs. Usa ÚNICAMENTE paréntesis planos normales: (...).

# 🎯 DIRECTIVA DE UNICIDAD DE CENTRO SEMÁNTICO DOMINANTE:
- El Hook/Chorus debe articular EXCLUSIVAMENTE UNA SOLA idea, imagen o tensión nuclear con gancho melódico y rítmico contundente.
- 🚫 PROHIBIDO el estribillo-catálogo: NO intentes resumir o meter múltiples temas distintos yuxtapuestos en el estribillo.
- Si el usuario introdujo varios temas, selecciona la tensión nuclear o imagen más potente para el coro; las demás temáticas se desarrollarán en las estrofas y versos.

${hookInstructionBlock}
${hookVariationsEnabled ? `
# 🌊 ESPACIO RÍTMICO Y DENSIDAD PREFERIDA (ADAPTIVE HOOK FLOW):
- **Preferencia Métrica**: ${getHookDensityProfile(hookArtistId).instructionPrompt}
- **Respiración y Silencios**: ${getHookDensityProfile(hookArtistId).pausePreference >= 0.4 ? "Prioriza silencios generosos, espacio para el bajo 808 y fraseo elástico." : "Métrica continua con rimas enlazadas."}
- **Frecuencia de Ad-libs**: ${getHookDensityProfile(hookArtistId).adlibDensity >= 0.4 ? "Ad-libs rítmicos en contratiempo con actitud." : "Ad-libs comedidos y selectivos."}
- **Regla Blanda**: Trata estas directivas como preferencias de bolsillo y respiración para el gancho, no como cuotas matemáticas fijas.
` : ""}
# 💎 TÉCNICAS COMPOSITIVAS DE ESTUDIO (PRINCIPIOS ABSTRACTOS):
${goldExamples.map(g => `- **${g.technique}**: ${g.description}`).join("\n")}

# 🏀 REGLAS DE ARQUITECTURA TOPLINE (MÚSICA REAL DE ESTUDIO):
1. **FRASEO MUSICAL, BARRAS COMPLETAS & ESPECIFICIDAD VÍVIDA:**
   - Escribe compases que fluyan con ritmo natural, swing y musicalidad real de hit de trap.
   - Construye el estribillo sobre hechos físicos tangibles, compras, activos o detalles sensoriales concretos que enganchen de inmediato (ej: el notario firmando, el oro en la mesa, la maleta sellada, el olor a dinero y plástico nuevo), en lugar de vaguedades genéricas.
   - Queda TERMINANTEMENTE PROHIBIDO sonar a telegrama inconexo o lista de palabras sueltas. El estribillo debe tener melodía, sentido y pegada.
2. **ESPECIFICIDAD MATERIAL Y ENTORNO FÍSICO REAL (GUIADO ABSTRACTO):**
   - El vocabulario y el atrezzo material son 100% LIBRES, crudos y realistas.
   - Tienes plena libertad para recurrir al universo material tangible contemporáneo (alta moda urbana, motorización de alto rendimiento, botánica y cepas de cultivo, relojería de precisión, dispositivos y artefactos reales del entorno callejero).
   - No te limites a sustantivos genéricos abstractos: invoca el mundo tangible a través de objetos físicos reales que pertenezcan naturalmente al universo del narrador, sin que el sistema te imponga una lista fija de cuáles elegir. Deja que surjan orgánicamente de la escena.
   - Queda prohibido sonar a folleto publicitario vacío o enunciar marcas sin groove ni justificación física en la escena.
   - 🚫 REGLA DE ORO DE IDENTIDAD: La ÚNICA restricción absoluta es NO nombrar al artista por su nombre propio ("soy X", "aquí Y"). El artista se identifica 100% por su FLOW, CADENCIA, MÉTRICA, AD-LIBS Y TIMBRE.
   - Higiene de Metadatos: Queda PROHIBIDO citar literalmente términos técnicos o nombres de sellos de la bio del artista (ej: 'Quality Control', 'rey del tresillo') a menos que el usuario los haya pedido expresamente.
3. **AD-LIBS CONTEXTUALES Y REACTIVOS (CERO PLANTILLAS):**
   - No uses listas fijas de ad-libs. El artista debe reaccionar de forma orgánica a lo que dice cada compás (eco de la última palabra, confirmación de la escena o gesto vocal nativo de su estilo).
   - Alterna compases limpios (sin ad-lib) con compases donde el ad-lib entre en el hueco del ritmo para darle pegada y dinamismo.
   - Queda PROHIBIDO saturar cada compás con ad-libs mecánicos o muletillas repetitivas. Deja que la voz principal y el bajo respiren.
   - Queda PROHIBIDO incluir traducciones literales entre idiomas dentro de los paréntesis.
   - 🚫 CERO NAME-DROPPING: El artista jamás debe decir su propio nombre en los ad-libs.
4. **FLOW CARACTERÍSTICO DEL ARTISTA (SIN NAME-DROPPING NI BIOGRAFÍA PERSONAL):**
   - El rapeo y la melodía del gancho DEBEN capturar de forma inconfundible el flow, la métrica, la cadencia y el bolsillo rítmico de ${hookArtist?.name ?? "el artista"} (${hookFlowProfile?.cadence?.toUpperCase() ?? "STACCATO"}) para que al interpretarse en Suno suene con su pegada y estilo característicos.
   - 🚫 REGLA DE ORO DE PRIVACIDAD & HIGIENE: Queda TERMINANTEMENTE PROHIBIDO mencionar el nombre del artista ("soy ${hookArtist?.name ?? "X"}", "aquí ${hookArtist?.name ?? "X"}") ni de otros artistas reales en la letra cantada o ad-libs. Tampoco calques anécdotas autobiográficas íntimas, familiares fallecidos ni nombres de bandas callejeras reales de su infancia. El parecido debe ser 100% por el FLOW, la MÉTRICA y la ACTITUD MUSICAL.
5. **RIMA AUDIBLE REAL, GROOVE & ANTI-PARTICIPIOS EN CADENA:**
   - Esquema de Rima Obligatorio: El estribillo DEBE rimar según el esquema asignado ${hookRhymeScheme?.label ?? "AABB"} (${hookRhymeScheme?.description ?? ""}). Queda prohibida la prosa suelta sin rima.
   - 🚫 ANTI-PARTICIPIOS EN CADENA: Queda terminantemente prohibido hacer un estribillo donde 3 o más líneas rimen con la misma terminación verbal en '-ado/-ido' (ej: congelado/acelerado/controlado/duplicado). Busca rimas con pegada sobre sustantivos o palabras agudas y sonoras (-és, -ín, -al, -ón, -or, -ás, -ero, -ete, -ente).
   - Fonética de Rima de Estudio: Utiliza rimas consonantes naturales o rimas asonantes multi-silábicas (slant rhymes / vowel-matching como 'fuego/ceros' o 'pista/prisa'). Prohibidas consonancias forzadas e infantiles de guardería (*gelato/zapato*, *cuarto/parto*).
   - Naturalidad de Estudio: Quedan terminantemente prohibidas las frases ortopédicas o traducciones automáticas de máquina (ej: 'fast in my carro', 'cuarzo fino'). Escribe con fluidez y sintaxis natural.
   - Show, Don't Preach: Queda PROHIBIDO usar eslóganes morales abstractos trillados de autoayuda. El estribillo debe construirse sobre imágenes sensoriales vivas, actitud cruda o una tensión física real.

${flowSkeletonSummary ? `\n# 📐 GUÍA DE RITMO Y CADENCIA GLOBAL (BEAT-FIRST):\n${flowSkeletonSummary}\n` : ""}
# 📋 FORMATO DE SALIDA ESTRICTO:
Devuelve EXCLUSIVAMENTE UN ÚNICO bloque [Chorus: ${hookVoice}] de exactamente ${targetBars} compases limpios (SOLO el nombre de la sección y del artista, SIN notas de estilo ni acústica dentro del corchete).
Está TERMINANTEMENTE PROHIBIDO incluir introducciones, conclusiones, explicaciones de cambios o frases como "Letra ajustada:", "Se ha resuelto el problema" o "He modificado...". Comienza directamente en el corchete:
[Chorus: ${hookVoice}]
Línea 1
Línea 2 (ad-lib reactivo opcional)
... hasta ${targetBars} líneas en total

NO escribas notas de producción, repeticiones ni explicaciones fuera de los corchetes.`;
}

/**
 * PASADA 2: GHOSTWRITER & VOCAL DIRECTOR MASTER (5 MODULAR CONTRACTS)
 * Desarrolla la letra completa de la canción integrando el gancho aprobado de la Pasada 1,
 * guiado por 5 contratos desacoplados que abarcan narrativa, flow switching, y la capa vocal completa
 * (ad-libs tridimensionales, réplicas dialécticas y tags acústicos de Suno AI).
 */
export function buildStage2GhostwriterPrompt(
  params: PromptParams,
  lockedTopline: string,
  writingCellsSnippet?: string,
  flowSkeletonSnippet?: string
): string {
  const artist = getArtistById(params.artistId);
  const featureArtist = params.featureArtistId ? getArtistById(params.featureArtistId) : null;
  const flowProfile = getFlowProfile(params.artistId);
  const featureFlowProfile = featureArtist ? getFlowProfile(featureArtist.id) : null;
  const spanglish = buildSpanglishInstruction(params.spanglishPercent);
  const dirty = getDirtyLevel(params.dirtyLevel ?? 2);
  const mainDNA = getMusicalDNAForArtist(params.artistId);
  const featDNA = featureArtist ? getMusicalDNAForArtist(featureArtist.id) : null;

  // Calibración Dinámica de Ventana Silábica por Artista (Syllable Density Window)
  const mainMinSyl = mainDNA.flow.avgSyllablesPerBar[0];
  const mainMaxSyl = mainDNA.flow.avgSyllablesPerBar[1];
  const mainCeiling = Math.max(mainMaxSyl + 2, 10);
  const mainWordRange = mainDNA.flow.wordsPerBarLimit
    ? `${mainDNA.flow.wordsPerBarLimit[0]}-${mainDNA.flow.wordsPerBarLimit[1]} palabras`
    : (mainMaxSyl <= 8 ? "3-6 palabras" : mainMaxSyl <= 11 ? "5-8 palabras" : "7-11 palabras");

  let featPocketBlock = "";
  if (featDNA && featureArtist) {
    const featMinSyl = featDNA.flow.avgSyllablesPerBar[0];
    const featMaxSyl = featDNA.flow.avgSyllablesPerBar[1];
    const featCeiling = Math.max(featMaxSyl + 2, 10);
    const featWordRange = featDNA.flow.wordsPerBarLimit
      ? `${featDNA.flow.wordsPerBarLimit[0]}-${featDNA.flow.wordsPerBarLimit[1]} palabras`
      : (featMaxSyl <= 8 ? "3-6 palabras" : featMaxSyl <= 11 ? "5-8 palabras" : "7-11 palabras");
    featPocketBlock = `\n- 🎯 BOLSILLO MÉTRICO ESTRICTO FEATURE (${featureArtist.name}):
  * Ventana Silábica: ${featMinSyl} a ${featMaxSyl} sílabas cantadas por línea (LÍMITE MÁXIMO ABSOLUTO: ${featCeiling} sílabas).
  * Densidad de Palabras: ${featWordRange} por compás.`;
  }

  const customScheme = params.rhymeSchemeId && params.rhymeSchemeId !== "rs_free" ? getRhymeSchemeById(params.rhymeSchemeId) : null;
  const rhymeTier = getRhymeTier(params.artistId);
  let rhymeLevelInstruction = "";
  if (customScheme) {
    rhymeLevelInstruction = `MÉTRICA / ESQUEMA DE RIMA OBLIGATORIO (${customScheme.pattern} - ${customScheme.label}): ${customScheme.description}.`;
  } else if (rhymeTier === 1) {
    rhymeLevelInstruction = `MÉTRICA TÉCNICA: Rimas multisilábicas obligatorias (2+ sílabas coincidentes) y rimas internas dentro del compás.`;
  } else if (rhymeTier === 2) {
    rhymeLevelInstruction = `MÉTRICA EQUILIBRADA: Combina multisilábicas con rimas de 1 sílaba contundentes. Rimas internas naturales y cadencia pegadiza.`;
  } else {
    rhymeLevelInstruction = `MÉTRICA DIRECTA / STREET: Prioriza la cadencia, el golpe rítmico y la actitud cruda.`;
  }

  // Detectar secciones con Call & Response
  const callResponseSections = params.structure.sections.filter(s => {
    const va = params.sectionVoices?.find(v => v.sectionName === s.name);
    return va?.repetitionPattern === "call_response" || va?.hookStyle === "call_response";
  }).map(s => s.name);

  // Situational Scene Engine (solo si el usuario lo seleccionó activamente)
  let sceneBlock = "";
  if (params.situationalPresetId && params.situationalPresetId !== "none") {
    const sitScene = getSceneById(params.situationalPresetId);
    if (sitScene) {
      sceneBlock = `
- **Escenario Físico**: ${sitScene.title} (${sitScene.badge})
- **Atmósfera & Conflicto**: ${sitScene.atmosphere} | ${sitScene.conflict}
- **⚡ Giro Dramático para el Verso 2**: "${sitScene.sceneTurn}" (El tiempo avanza, algo cambia).`;
    }
  }

  // Feature Contrast Profile (si hay feature artist)
  const featureContrast = featureArtist ? buildFeatureContrastProfile(params.artistId, featureArtist.id) : null;

  // Estructura limpia y autoridad de voces
  const structurePlan = params.structure.sections.map(s => {
    const va = params.sectionVoices?.find(v => v.sectionName === s.name);
    const isHype = va?.voice === "hype";
    const isChorus = s.type === "chorus" || s.type === "hook";
    const isIntro = s.type === "intro";
    const isTrading2x2 = va?.voice === "trading_2x2" || (s.name.toLowerCase().includes("trading") && !!featureArtist);

    const guide = resolveArtistVocalGuide(
      va?.voice ?? (s.name.toLowerCase().includes("feature") && featureArtist ? "feature" : isTrading2x2 ? "trading_2x2" : "auto"),
      {
        mainArtistId: params.artistId,
        featureArtistId: featureArtist?.id,
        sectionType: s.type,
        sectionName: s.name,
        isChorus,
        isIntro,
        isTrading2x2,
        isHype,
        introStyle: va?.introStyle,
      }
    );

    const isFeature = va?.voice === "feature" || (va?.voice === "auto" && s.name.toLowerCase().includes("feature") && !!featureArtist);
    const sectionArtistId = isFeature && featureArtist ? featureArtist.id : params.artistId;
    const sectionFlow = getFlowProfile(sectionArtistId);
    const sectionRhymeId = customScheme?.id ?? sectionFlow?.defaultRhymeScheme ?? "rs_aabb";
    const sectionRhyme = getRhymeSchemeById(sectionRhymeId);

    const exactBars = va?.bars || (s.type === "verse" ? 8 : (s.type === "intro" || s.type === "outro") ? 4 : 8);
    const barDirective = va?.bars ? `EXACTAMENTE ${va.bars} líneas cantadas` : `${exactBars} compases`;
    const densityDirective = va?.density
      ? ` | DENSIDAD: ${va.density === "sparse" ? "Sparse (3-5 pal/b)" : va.density === "normal" ? "Normal (5-8 pal/b)" : va.density === "dense" ? "Dense (8-11 pal/b)" : "X-Dense (12+ pal/b)"}`
      : "";
    const repPattern = va?.repetitionPattern && va.repetitionPattern !== "none" ? getRepetitionPatternById(va.repetitionPattern) : undefined;
    const repDirective = repPattern ? ` | PATRÓN: ${repPattern.label}` : "";

    if (isChorus) {
      const hookVa = params.sectionVoices?.find(v => v.sectionName.toLowerCase().includes("chorus") || v.sectionName.toLowerCase().includes("hook"));
      const hookMoodObj = hookVa?.hookMood && hookVa.hookMood !== "auto" ? MOODS.find(m => m.id === hookVa.hookMood) : undefined;
      const hookStyleObj = hookVa?.hookStyle && hookVa.hookStyle !== "auto" ? getHookStyleOptionById(hookVa.hookStyle) : undefined;
      const moodNote = hookMoodObj ? ` [CONTRASTE MOOD: ${hookMoodObj.label}]` : "";
      const styleNote = hookStyleObj ? ` [ESTILO: ${hookStyleObj.label}]` : "";
      return `[${s.name}: ${guide.fullHeaderTag}] — (REPETICIÓN OBLIGATORIA: Copia textualmente el GANCHO APROBADO oficial; la letra cantada debe ser idéntica al 100%, admitiendo variación interpretativa en ad-libs)${styleNote}${moodNote}`;
    }

    if (isTrading2x2 && featureArtist) {
      const mainFlow = getFlowProfile(params.artistId);
      const featFlow = getFlowProfile(featureArtist.id);
      const mainRhyme = getRhymeSchemeById(customScheme?.id ?? mainFlow?.defaultRhymeScheme ?? "rs_aabb");
      const featRhyme = getRhymeSchemeById(customScheme?.id ?? featFlow?.defaultRhymeScheme ?? "rs_aabb");
      return `[${s.name}: ${guide.fullHeaderTag}] — ${barDirective} [TRADING 2x2: Bloques alternados de 2 compases con corte vocal]
  * Bloque 1 (2 compases): [${artist?.name ?? "Lead"}] Flow ${mainFlow?.cadence?.toUpperCase()} (${mainRhyme?.label ?? "AABB"}) [Vocal Cut]
  * Bloque 2 (2 compases): [${featureArtist.name}] Flow ${featFlow?.cadence?.toUpperCase()} (${featRhyme?.label ?? "AABB"}) [Vocal Cut]
  * Continuar alternando en bloques de 2 compases hasta completar ${barDirective}.`;
    }

    if (isIntro && va?.introStyle && va.introStyle !== "auto") {
      const opt = getIntroStyleOptionById(va.introStyle);
      return `[${s.name}: ${guide.fullHeaderTag}] — 4 compases [ARQUETIPO INTRO: ${opt?.label ?? va.introStyle}] (${opt?.instruction ?? ""})`;
    }

    const isOutro = s.type === "outro" || s.name.toLowerCase().includes("outro") || s.name.toLowerCase().includes("final");
    if (isOutro && va?.outroStyle && va.outroStyle !== "auto") {
      const opt = getOutroStyleOptionById(va.outroStyle);
      const targetBars = va?.bars || 4;
      return `[${s.name}: ${guide.fullHeaderTag}] — ${targetBars} compases [ARQUETIPO OUTRO: ${opt?.label ?? va.outroStyle}] (${opt?.instruction ?? ""})`;
    }

    if (isHype || (isIntro && isHype)) {
      return `[${s.name}: ${guide.fullHeaderTag}] — 4 compases (Modo Hype Man: 🚫 PROHIBIDO ESCRIBIR VERSOS NARRATIVOS O LÍNEAS CANTADAS. Debe ser EXCLUSIVAMENTE 3 a 5 ad-libs y grunts de calentamiento entre paréntesis preparando la entrada del ritmo, rematando con ([Beat Drop]))`;
    }

    return `[${s.name}: ${guide.fullHeaderTag}] — ${barDirective}${densityDirective}${repDirective} [VOZ: ${guide.artistName} | FLOW: ${sectionFlow?.cadence?.toUpperCase() ?? "STACCATO"} (${sectionFlow?.speedLabel ?? "natural"}) | RIMA: ${sectionRhyme?.label ?? "AABB"} (${sectionRhyme?.description ?? ""})]`;
  }).join("\n");

  const currentMood = MOODS.find(m => m.id === params.moodId) ?? { id: params.moodId, label: params.moodId, description: "" };
  const userTopicsList = [params.customTopic, ...params.topics].filter(Boolean);
  const framingData = resolveSemanticSceneFraming(params.topics, params.customTopic, params.situationalPresetId);
  const framing = framingData.framing;
  const topicIntents = framingData.topicIntents;
  const namedEntities = topicIntents.filter(t => t.kind === "named_entity").map(t => t.value);
  const abstractThemes = topicIntents.filter(t => t.kind === "abstract_theme").map(t => t.value);
  const goldExamples = getCompositionalGoldExamples(params.artistId);

  const topicsBlock = userTopicsList.length > 0
    ? `- **Atmósfera y Temáticas Conceptuales**: ${userTopicsList.join(", ")}
⚠️ REGLA DE ORO ANTI-CHECKLIST / CERO LISTA DE LA COMPRA:
- Queda TERMINANTEMENTE PROHIBIDO ir compás por compás metiendo literalmente cada tema ("Dinero y hustle...", "Hierba y humo...", "Coca y polvo...", "Drogas y lean...", "Cuentas claras..."). Eso suena a plantilla robótica de Excel y destruye la musicalidad.
- Usa los temas como INSPIRACIÓN ABSTRACTA Y ATMÓSFERA. Escribe libremente con el flow del artista, usando objetos concretos, marcas reales, modelos de coches, cepas, jerga callejera y situaciones creíbles.
${namedEntities.length > 0 ? `- **Entidades Nombradas Disponibles**: [${namedEntities.join(", ")}]. Puedes integrarlas si la escena lo pide, pero sin forzarlas como eslogan publicitario.` : ""}`
    : "- Temática: Vida de calle y rap auténtico";

  return `Eres un Ghostwriter de élite y Director Vocal de cabina en el Trap y Rap contemporáneo.
Tu misión es componer la canción definitiva masterizada con el máximo calibre lírico, flow elástico y dimensión vocal tridimensional para Suno AI v4.5.

# 🔒 GANCHO APROBADO DE LA SESIÓN (INMUTABLE - HOOK CONTRACT)
El Topliner ya fijó el estribillo oficial canónico de la sesión.
DEBES incluirlo en cada aparición de [Chorus / Hook] dentro de la canción:
- La letra central cantada (lyricText) debe ser EXACTAMENTE IDÉNTICA en cada estribillo.
- Puedes aportar ligeras variaciones interpretativas en ad-libs secundarios o cortes entre compases:
${lockedTopline}

================================================================================
# 📜 CONTRATO 1: IDENTIDAD DEL TEMA & TEMÁTICAS (SONG CONTRACT)
================================================================================
- Artista Principal: ${artist?.name ?? "Lead"} (${artist?.origin})
${featureArtist ? `- Feature Artist: ${featureArtist.name} (${featureArtist.origin})` : ""}
- Tempo & Vibra: ${params.bpmVibe.range} BPM (${params.bpmVibe.label})
- Actitud / Dirty Level: ${dirty.label} (${dirty.badge}) — ${dirty.instruction}
${topicsBlock}
${params.customDictionary?.trim() ? `- Diccionario de calle / Marcas: { ${params.customDictionary.trim()} }` : ""}
${params.languageDNA ? params.languageDNA.instructionBlock : spanglish.prompt}

# 🎭 ENCUADRE ESCÉNICO Y TENSIÓN DRAMÁTICA (SEMANTIC SCENE FRAMING):
- Rol Semántico Dominante: ${framing.dominantSemanticRole}
- Situación Escénica: ${framing.situation}
- Tensión Dramática: ${framing.tension}
- Función en la Canción: ${framing.dramaticFunction}

🚫 REGLAS DE VOCABULARIO, FLOW Y AUTENTICIDAD DE ESTUDIO:
1. **Realismo Visceral, Negocios Callejeros & Anécdotas Concretas (Show, Don't Generalize):**
   - No escribas historias genéricas o predecibles. Busca una perspectiva MUY ORIGINAL, un ángulo narrativo único o anécdotas específicas que combinen los temas de forma sorprendente pero 100% REAL dentro del estilo de vida del Rap/Trap.
   - Compón a través de hechos físicos tangibles y detalles específicos de alto calibre que demuestren que el narrador conoce de primera mano ese mundo: activos, compras al contado, documentos, notarios, naves industriales, olores sensoriales (plástico nuevo y fardos de billetes), giros postales a la prisión, comida cara para la familia, zulos con doble tabique, pesas calibradas o marcas exactas. Cero vaguedades abstractas o clichés poéticos de IA ("la noche fría", "el asfalto no perdona").
   - Queda TERMINANTEMENTE PROHIBIDO reciclar o copiar en los versos los mismos objetos físicos que ya aparecen en el Estribillo. Los versos deben avanzar la escena aportando NUEVAS consecuencias y objetos.
2. **Temáticas Abstractas vs. Cero Lista de la Compra (Anti-Template):**
   - Las temáticas elegidas son el tono dramático y el marco conceptual abstracto de la canción. NO son una lista de la compra para tachar compás a compás. Queda TERMINANTEMENTE PROHIBIDO escribir barras que citen literalmente las etiquetas de los temas ("Dinero y hustle", "Hierba y humo", "Coca y polvo", "Drogas y lean", "Cuentas claras").
   - Si el usuario introdujo un término exclusivo personalizado en 'customTopic' (ej: un token, un apodo o una palabra clave concreta), incorpóralo de forma orgánica sin cambiarlo ni forzarlo.
3. **Especificidad Material y Textura de Calle (Sin Listas Rígidas):**
   - Tienes plena libertad para recurrir al universo material tangible de la cultura contemporánea: alta costura urbana, motorización de alto rendimiento, botánica y cepas de cultivo, relojería de precisión, bebidas y artefactos del bajo mundo.
   - Estos elementos tangibles aportan el peso físico, la fricción y la autenticidad que distinguen a una obra de estudio real de una abstracción genérica de IA. No necesitas que el sistema te liste marcas: selecciona libremente los objetos físicos que la escena y el estamento social del personaje requieran.
4. **Memoria Negativa Radical & Cero Checklisting Inter-Estrofas:**
   - Prohibido rotar mecánicamente los mismos dominios metafóricos: si en el Verso 1 usas una analogía deportiva / de baloncesto (ej: Shaq), en el Verso 2 queda TERMINANTEMENTE PROHIBIDO volver a usar otra analogía de baloncesto (cero Kobe, cero NBA). Si en el Verso 1 hablas de coches, en el Verso 2 explora la mesa, el dinero en mano, la patrulla o la tensión entre socios.
   - Prohibido el checklisting en bucle: NUNCA repitas la misma lista de ingredientes en cada estrofa como si fuera una plantilla. Cada verso debe traer objetos, ángulos y consecuencias completamente diferentes.
4. **Rima Audible Real & Anti-Participios en Cadena (Cero Pereza Gramatical):**
   - Cada compás DEBE rimar según el esquema asignado a su artista o sección (AABB, ABAB, Triplets). Queda terminantemente prohibida la prosa suelta sin rima.
   - 🚫 ANTI-PARTICIPIOS EN CADENA: Queda terminantemente prohibido hacer estribillos o versos donde 3 o más líneas rimen con la misma terminación verbal en '-ado/-ido' (ej: congelado/acelerado/controlado/duplicado). Es el vicio más vago de la IA.
   - Busca rimas de peso sobre sustantivos, palabras agudas o terminaciones variadas y sonoras: -és, -ín, -al, -ón, -or, -ás, -ero, -ete, -ente.
   - Utiliza rimas consonantes naturales o rimas asonantes multi-silábicas (slant rhymes / vowel-matching: *fuego/ceros*, *pista/prisa*, *candado/disparo*).
   - Quedan prohibidas las consonancias escolares forzadas de relleno o rimas infantiles (*gelato/zapato*, *frío como nieve*).
   - Evita clichés trillados de IA: "suerte / muerte", "pena / vena", "haciendo money sin parar".
5. **Show, Don't Preach (Cero Sermón Moral de 'Lealtad'):**
   - Queda PROHIBIDO repetir palabras abstractas morales ("lealtad", "respeto", "traición") como eslóganes en cada sección ("la lealtad no se vende", "lealtad hasta la tumba").
   - Muestra las vivencias a través de HECHOS Y CONDUCTAS físicas concretas, NUNCA predicándolas como sermones de autoayuda.
6. **Sintaxis Humana, Code-Switching Orgánico y Slang de Pegada:**
   - La columna vertebral de cada frase debe mantener la sintaxis natural, el dialecto y la fluidez del idioma principal (oraciones completas, giros de calle creíbles sin traducciones ortopédicas de máquina).
   - El slang americano o anglicismos entran de forma natural: como préstamos directos integrados en el compás (*draco, foreign, racks, plug, opp, switch*) o como ráfagas de remate y punchline de actitud al final de la barra (*'big racks, no cap'*, *'all gas, no brakes'*).
   - 🚫 PROHIBIDO EL CORTE MITAD-Y-MITAD DENTRO DEL SINTAGMA: Queda terminantemente prohibido partir oraciones traduciendo palabra por palabra como un estudiante de intercambio (*'fast in my carro'*, *'lo cuido en el saco'*, *'I am the boss, me miran como jefe'*).
   - Adopta el tono y cadencia regional nativa del artista (${artist?.origin ?? "calle"}) con fluidez callejera humana creíble (ej: modismos orgánicos de PR, Argentina, España, Atlanta/Spanglish según corresponda).
7. **Dinámica Lírica según el Mood (${currentMood.label.toUpperCase()}):**
${currentMood.id === "agresivo" || currentMood.id === "oscuro" || currentMood.id === "menacing"
  ? "   - Actitud Staccato Amenazante & Punchlines Cortantes: Compases secos de alta tensión, ataques rápidos con silencios cortados, ad-libs agresivos en contratiempo y barras de confrontación directa."
  : currentMood.id === "flex" || currentMood.id === "fiesta" || currentMood.id === "confident"
  ? "   - Bounce Elástico & Swagger Arrogante: Ritmo saltarín y bailable, barras de lujo y victoria con cadencia relajada pero dominante, rimas pegadizas de club y ad-libs de celebración con actitud arrogante."
  : currentMood.id === "melancolico" || currentMood.id === "romantico" || currentMood.id === "nostalgic" || currentMood.id === "dreamy"
  ? "   - Fraseo Melódico Arrastrado & Emoción Vulnerable: Entrega vocal con autotune etéreo/melódico, líneas que se alargan en el compás con '...', rimas asonantes envolventes y referencias emocionales profundas sin sonar infantil."
  : "   - Realismo Testimonial Crudo & Reflexivo: Narrativa grounded en vivencias reales, detalles físicos del asfalto/bloque, ritmo metódico y sobrio, rimas asonantes densas y cero caricatura."}
8. **Arquitectura Narrativa de los Versos (Adaptativa):**
${currentMood.id === "flex" || currentMood.id === "fiesta"
  ? "   - Estilo Libre de Flex & Barras de Impacto: Compases centrados en punchlines potentes, juegos de palabras, actitud dominante y barras de lujo sin atarse rígidamente a una historia cronológica continua."
  : "   - Celdas de 4 Compases con Causa-Efecto Cinematográfica: Cada 4 compases desarrollan una micro-escena coherente (Setup -> Detalle Físico -> Tensión/Giro -> Punchline/Remate), conectadas con causalidad física tangible para evitar saltos inconexos de tema."}
9. **Flow Característico Sin Name-Dropping Ni Biografía Personal:**
   - La canción debe sonar y fluir idéntica al rapeo característico de los artistas elegidos (${artist?.name ?? "Lead"}${featureArtist ? ` y ${featureArtist.name}` : ""}) — su cadencia, métrica, sílabas por compás, síncopa y actitud musical. Pero está TERMINANTEMENTE PROHIBIDO escribir en las barras o ad-libs los nombres de los artistas ("soy ${artist?.name ?? "X"}", "aquí ${featureArtist?.name ?? "Y"}"), mencionar a otros artistas reales, o calcar tragedias biográficas íntimas, familiares fallecidos o nombres de bandas callejeras reales de su infancia. El oyente debe identificar al artista por su FLOW Y SU VOZ EN SUNO, nunca porque el texto diga su nombre.
10. **Higiene de Metadatos de Sistema:** Queda PROHIBIDO citar literalmente términos técnicos o nombres de sellos de la bio del artista (como 'Quality Control', 'rey del tresillo') a menos que el usuario los haya pedido expresamente.

================================================================================
# 📜 CONTRATO 2: NARRATIVA, ESTRUCTURA & HYPE MAN (NARRATIVE CONTRACT)
================================================================================
${sceneBlock}
- Plan de Estructura de la Canción:
${structurePlan}

⚠️ AUTORIDAD ESTRUCTURAL DE VOCES (ESTRICTA):
Cada sección DEBE ser interpretada estrictamente por la voz indicada en el encabezado (ej: si la sección indica [Verse 2: ${artist?.name ?? "Lead"}], DEBE ser interpretada por ${artist?.name ?? "Lead"}, NO por el artista invitado). Queda TERMINANTEMENTE PROHIBIDO alterar la voz asignada de una sección a menos que el encabezado indique explícitamente el nombre del artista invitado.

⚠️ REGLA CRÍTICA DE INTRO / HYPE MAN:
Si la [Intro] está en modo Hype Man o tiene asignado 'Hype', queda TERMINANTEMENTE PROHIBIDO escribir oraciones completas o versos narrativos cantados. La intro debe consistir EXCLUSIVAMENTE en 3 a 5 grunts, shouts y ad-libs de calentamiento entre paréntesis preparando la caída del beat, rematando con ([Beat Drop]).

================================================================================
# 📜 CONTRATO 3: FLOW & MOTOR RÍTMICO (FLOW & RHYTHM CONTRACT)
================================================================================
- Flow DNA (${artist?.name}): Cadencia ${flowProfile?.cadence?.toUpperCase() ?? mainDNA.flow.cadenceType} (${mainDNA.flow.avgSyllablesPerBar.join("-")} sílabas/compás). Velocidad: ${flowProfile?.speedLabel ?? "natural"}. Esquema Nativo: ${getRhymeSchemeById(customScheme?.id ?? flowProfile?.defaultRhymeScheme ?? "rs_aabb")?.label ?? "AABB"}. ${flowProfile?.cadenceInstruction ?? ""}
${featDNA ? `- Flow Feature (${featureArtist?.name}): Cadencia ${featureFlowProfile?.cadence?.toUpperCase() ?? featDNA.flow.cadenceType} (${featDNA.flow.avgSyllablesPerBar.join("-")} sílabas/compás). Velocidad: ${featureFlowProfile?.speedLabel ?? "natural"}. Esquema Nativo: ${getRhymeSchemeById(customScheme?.id ?? featureFlowProfile?.defaultRhymeScheme ?? "rs_aabb")?.label ?? "AABB"}. ${featureFlowProfile?.cadenceInstruction ?? ""}` : ""}
${featureContrast ? `${featureContrast.instruction}\n` : ""}- ${rhymeLevelInstruction}

- 🚨 DIRECTIVA DE RIMA OBLIGATORIA: CERO PROSA SUELTA. Cada sección debe respetar el esquema de rima asignado al artista que la interpreta. Todas las barras deben rimar auditivamente (consonante natural o asonante multi-silábica/slant rhyme). Se prohíben líneas huérfanas sin rima.

- 🎚️ FUSIÓN HÍBRIDA DE DENSIDAD: Si la sección especifica una densidad manual de palabras (Sparse 3-5, Normal 5-8, Dense 8-11, X-Dense 12+), adapta la velocidad del artista dentro de ese rango manteniendo sus figuras rítmicas e inflexiones características.

- 🎯 BOLSILLO MÉTRICO ESTRICTO POR COMPÁS (${artist?.name}):
  * Ventana Silábica: ${mainMinSyl} a ${mainMaxSyl} sílabas cantadas por línea (LÍMITE MÁXIMO ABSOLUTO: ${mainCeiling} sílabas).
  * Densidad de Palabras: ${mainWordRange} por compás.
  * Queda TERMINANTEMENTE PROHIBIDO rebasar el límite con barras sobrecargadas o palabras hiper-largas que atropellen el beat o hagan que el modelo vocal de Suno tropiece. Cada compás debe caber holgadamente en el tiempo musical del tempo (${params.bpmVibe.range} BPM).${featPocketBlock}

- Directiva Rítmica para Suno: Estructura la longitud de cada línea y la colocación de pausas para que el modelo de voz de Suno reproduzca fielmente el bolsillo rítmico del artista original (tresillos cortantes, legato arrastrado, o staccato frío según corresponda), manteniendo las barras compactas y sin atropellos silábicos.

# 💎 TÉCNICAS COMPOSITIVAS DE ESTUDIO (PRINCIPIOS ABSTRACTOS):
${goldExamples.map(g => `- **${g.technique}**: ${g.description}`).join("\n")}

# 🧱 CONTINUIDAD ESCÉNICA Y CAUSAL EN CÉLULAS DE ESCRITURA (4-BAR SCENE PROGRESSION):
Cada célula o bloque de 4 compases debe mantener estricta continuidad física y causal:
- Compás 1: Establece la situación o acción física inmediata en el entorno.
- Compás 2: Aporta un detalle táctil, sensorial o subtexto revelador del mismo entorno.
- Compás 3: Escala la tensión o introduce una complicación directa como consecuencia del hecho anterior.
- Compás 4: Cierra con una consecuencia tangible o punchline de remate que conecta con el compás siguiente.
🚫 PROHIBIDO EL TELETRANSPORTE ESCÉNICO: Las barras dentro de cada célula y entre células adyacentes DEBEN estar conectadas por causa-efecto. Si la escena ocurre en la autopista de noche (coches, luces, maleta), NO puedes saltar en el siguiente compás a estar tirando canastas en un pabellón o cantando en una cabina. Si introduces una analogía (ej: deportiva), debe ser una metáfora breve que NO abandone el escenario físico real.

${flowSkeletonSnippet ? `${flowSkeletonSnippet}\n\n` : ""}${writingCellsSnippet ? `${writingCellsSnippet}\n\n` : `🔄 FLOW SWITCHING DINÁMICO EN CADA VERSO:
En cada verso, ejecuta una progresión dinámica para evitar monotonía:
1. Pacing & Atmósfera: Entrada espaciosa, ritmo pausado, establece la escena con detalles visuales concretos.
2. Shift Rítmico: Introduce rimas internas continuas o síncopa rápida para inyectar adrenalina.
3. Tensión & Punchline Payoff: Vuelve a abrir espacio con golpes secos y remata con punchline contundente.
`}
================================================================================
# 📜 CONTRATO 4: CAPA VOCAL, PERFORMANCE & AD-LIBS MASTER (VOCAL CONTRACT)
================================================================================
Como Director Vocal, incorpora la capa de performance con criterio musical:
1. **Ad-libs Orgánicos y Reactivos al Contenido (Sin Listas ni Plantillas):**
   - Los ad-libs NO son palabras de plantilla repetitivas. Deben nacer orgánicamente de la actitud del artista y de lo que dice cada compás:
     * Ecos de impacto: Repetir o subrayar la última palabra o remate de la barra.
     * Réplicas reactivas: Breves respuestas en voz baja que confirman o contraatacan la barra según la escena.
     * Gestualidad vocal propia del artista: Inflexiones, respiraciones o quejidos viscerales característicos de su estilo.
   - Regla de Respiración (Compases Limpios): Deja barras limpias (sin ad-lib alguno) para que la voz principal, el fraseo y el bajo 808 manden con contundencia. Prohibido poner ad-libs en todas las barras.
   - LÍMITE DE CONSECUTIVIDAD: Máximo 2 compases seguidos con ad-lib (maxConsecutiveAdlibBars = 2).
   - Presupuesto por sección: En Versos: moderado (~40-50% de las barras con ad-lib); en Coros: bajo/moderado; en Outro: sutil/sparse.
   - 🚫 CERO NAME-DROPPING: Queda TERMINANTEMENTE PROHIBIDO que el artista diga su propio nombre o apodos en los ad-libs.
2. **Call & Response Dialéctico:**
   ${callResponseSections.length > 0 ? `- En las secciones ${callResponseSections.join(", ")}, las líneas líderes deben recibir réplicas dialécticas directas en contratiempo que respondan a la frase líder con actitud de réplica inmediata.` : "- Si hay diálogos o respuestas, hazlos dialécticos con personalidad y reacción real a la barra."}
3. **Dinámica Acústica Suno AI:**
   - En la barra final de cada verso antes de entrar al estribillo, puedes insertar '[Vocal Cut]' al final de la línea para generar anticipación explosiva.
   - En la intro preparando el beat, remata con '[Beat Drop]'.
4. **Preservación del Ratio de Idioma:**
   - Los ad-libs deben respetar el idioma predominante de la barra para no desbalancear el porcentaje de Spanglish fijado.

================================================================================
# 📜 CONTRATO 5: FORMATO DE SALIDA & GUÍA VOCAL SUNO (OUTPUT & VOCAL CONTRACT)
================================================================================
- ⚡ GUÍA VOCAL OBLIGATORIA EN ENCABEZADOS: Dado que Suno AI ya no reconoce timbres solo por el nombre del artista, cada encabezado de sección DEBE incluir el nombre del artista acompañado de sus descriptores vocales (timbre, género vocal, autotune y entrega) para modelar acústicamente la voz en Suno.
  Fórmula: [Sección: Artista - Descriptores de timbre y estilo vocal]
  Ejemplos válidos:
  - [Intro: ${artist?.name ?? "Lead"} - spoken whisper intro, filtered ambient vocal]
  - [Verse 1: ${artist?.name ?? "Lead"} - ${resolveArtistVocalGuide("main", { mainArtistId: params.artistId }).vocalGuide}]
  - [Chorus: ${artist?.name ?? "Lead"} - layered stereo autotune harmonies, anthemic vocal stack]
  ${featureArtist ? `- [Verse 2: ${featureArtist.name} - ${resolveArtistVocalGuide("feature", { featureArtistId: featureArtist.id }).vocalGuide}]` : ""}
- Cada compás equivale EXACTAMENTE a una línea de texto con sus ad-libs.
- Devuelve ÚNICAMENTE la letra completa de la canción estructurada con estos corchetes acústicos. Está TERMINANTEMENTE PROHIBIDO incluir introducciones, conclusiones, explicaciones de cambios o frases como "Letra ajustada:", "Se ha resuelto el problema" o "He modificado...". Comienza directamente en el primer corchete de la canción.`;
}

/**
 * PASADA 3: VOCAL DIRECTOR & CALL & RESPONSE ARRANGER
 * Añade la dimensión vocal tridimensional: diálogos de Call & Response, ad-libs con intención,
 * modulación de textura humana (Human Texture DNA) y metatags de Suno v4.5.
 */
export function buildStage3VocalDirectorPrompt(params: PromptParams, fullLyrics: string): string {
  const artist = getArtistById(params.artistId);
  const featureArtist = params.featureArtistId ? getArtistById(params.featureArtistId) : null;
  const mainDNA = getMusicalDNAForArtist(params.artistId);

  // Modulaciones de textura humana para cada tipo de sección
  const introTexture = getSectionModulatedTexture("intro", mainDNA.humanTexture);
  const verseTexture = getSectionModulatedTexture("verse", mainDNA.humanTexture);
  const chorusTexture = getSectionModulatedTexture("hook", mainDNA.humanTexture);

  // Detectar secciones con Call & Response
  const callResponseSections = params.structure.sections.filter(s => {
    const va = params.sectionVoices?.find(v => v.sectionName === s.name);
    return va?.repetitionPattern === "call_response" || va?.hookStyle === "call_response";
  }).map(s => s.name);

  return `Eres el Director Vocal y Productor de Mezcla en la cabina de grabación para Suno AI v4.5.
Tu trabajo es tomar la letra borrador de la canción y darle la DIMENSIÓN VOCAL TRIDIMENSIONAL que distingue una maqueta plana de un hit masterizado de estudio.

# ARTISTAS EN CABINA:
- Voz Principal: ${artist?.name ?? "Lead"} (${mainDNA.vocal.sunoVocalTimbre})
${featureArtist ? `- Segunda Voz / Feature: ${featureArtist.name}` : ""}
${callResponseSections.length > 0 ? `- Secciones con Call & Response obligatorio: ${callResponseSections.join(", ")}` : ""}

# 🎚️ MODULACIÓN DE TEXTURA HUMANA (HUMAN TEXTURE DNA):
- **En [Intro]**: Cortes de pensamiento (${Math.round(introTexture.cutThoughtProbability * 100)}%), Pausas de respiración (${Math.round(introTexture.pauseProbability * 100)}%).
- **En [Verse]**: Dinámica natural conversacional (Asimetría ${Math.round(verseTexture.asymmetry * 100)}%, Pausas rítmicas ${Math.round(verseTexture.pauseProbability * 100)}%).
- **En [Chorus / Hook]**: Máxima precisión y ajuste de tempo (Cortes reducidos a ${Math.round(chorusTexture.cutThoughtProbability * 100)}%, repetición hipnótica).

# 🛠️ TAREAS DEL DIRECTOR VOCAL:

1. **PRODUCCIÓN DE CALL & RESPONSE DIALÉCTICO (EN SECCIONES ASIGNADAS):**
   - En las secciones marcadas como Call & Response (${callResponseSections.join(", ") || "las indicadas"}), cada compás líder debe recibir una respuesta dialéctica entre paréntesis en contratiempo que reaccione directamente a la frase o situación dicha.
   - PROHIBIDO rellenar el Call & Response con muletillas repetitivas o ad-libs genéricos mecánicos. Debe ser un diálogo vivo con actitud y réplica real según la escena.

2. **PULIDO DE AD-LIBS REACTIVOS & LIMPIEZA DE COMPASES (ANTI-MULETILLAS):**
   - Elimina ad-libs de plantilla que se repitan compás tras compás como un metrónomo.
   - Asegura que los ad-libs cumplan funciones sonoras auténticas:
     a) Ecos de remate: duplicación o énfasis de la palabra final o punchline de la barra.
     b) Réplica reactiva contextual: comentario o reacción genuina a lo que acaba de afirmar la barra.
     c) Silencios rítmicos: preserva compases limpios sin ad-libs para que el bajo 808 y la voz principal respiren con fuerza. Inserta '[Pause]' antes de caídas de beat si la barra lo pide.
   - 🚫 CERO NAME-DROPPING: Elimina cualquier mención al nombre o apodo propio del artista en los ad-libs.

3. **CORTES Y DINÁMICA ACÚSTICA SUNO AI v4.5:**
   - En la barra final de cada verso antes de entrar al estribillo, inserta '[Vocal Cut]' al final de la línea para generar anticipación explosiva.
   - Si la intro prepara el beat, asegúrate de que termine con '[Beat Drop: Heavy 808 drop]' en su propia línea.

4. **PRESERVACIÓN DEL RATIO DE IDIOMA (LANGUAGE DRIFT GUARD):**
   - El borrador ya tiene el balance de inglés y español fijado. Los ad-libs y réplicas entre paréntesis DEBEN escribirse en el idioma predominante de la barra o canción (${params.languageDNA?.primaryLanguage === "en" ? "inglés con toques breves de actitud en español" : "español con toques en inglés"}).
   - PROHIBIDO inundar la letra con ad-libs que cambien drásticamente el porcentaje de Spanglish.

5. **PRESERVACIÓN Y REFINAMIENTO DE GUÍAS VOCALES EN ENCABEZADOS (SUNO NATIVE):**
   - Todos los encabezados de sección DEBEN mantener el formato [Sección: Artista - Descriptores vocales] para que Suno modele adecuadamente la voz del intérprete (ej: '[Verse 1: ${artist?.name ?? "Lead"} - ${resolveArtistVocalGuide("main", { mainArtistId: params.artistId }).vocalGuide}]').
   - Elimina cualquier texto residual de instrucciones ajenas fuera o dentro del corchete como '— 8 barras → [REGLA...]' o '[VOZ AUTORIZADA: ...]', pero PRESERVA rigurosamente la guía vocal del artista dentro del corchete.

6. **PRESERVACIÓN DE INTRO HYPE MAN:**
   - Si la [Intro] contiene ad-libs o tiene asignado 'Hype Man', MANTENLA exclusivamente como grunts, shouts y ad-libs entre paréntesis preparando el beat drop. Queda PROHIBIDO agregar oraciones completas o versos narrativos cantados en la intro.

# LETRA BORRADOR A TRANSFORMAR:
${fullLyrics}

# 📋 FORMATO DE SALIDA:
Devuelve ÚNICAMENTE la letra final masterizada con las réplicas dialécticas y etiquetas acústicas limpias, lista para Suno AI.`;
}

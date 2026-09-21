import { getArtistById, getProducerById, getRhymeSchemeById, getBeatTypeById, getFeatureSimById, getDirtyLevel, getRepetitionPatternById, getHookStyleOptionById, getIntroStyleOptionById, OUTRO_STYLE_OPTIONS, getOutroStyleOptionById, MOODS, getSituationalPresetById, getFlowPocketOptionById, type SongStructure, type BpmVibe, type BeatType, type FlowPocketOption, type IntroStyleId, type IntroStyleOption, type OutroStyleId, type OutroStyleOption } from "./trap-data";
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

export interface LockedSection {
  name: string;
  content: string;
}

export interface RegenerateSectionParams {
  sectionName: string;
  keepContext: string;
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
    organicRule = `CODE-SWITCHING ORGÁNICO: Español dominante. Escribe las estrofas y narrativa en español, pero integra anglicismos callejeros y loanwords auténticos de la cultura urbana (drip, opps, motion, racks, plug, flex) en puntos rítmicos naturales. Los estribillos en español. Prohibido repetir una fórmula mecánica de '[inglés] + [español]' en cada línea; la alternancia debe sonar natural.`;
  } else if (englishPct <= 45) {
    vibeLabel = `🔌 Español con Rhyme Anchors en inglés (${spanishPct}% ES / ${englishPct}% EN)`;
    organicRule = `CODE-SWITCHING ORGÁNICO: Base en español con remates y anclas de rima en inglés. Desarrolla la frase en español y cierra el compás con punchlines o terminaciones en inglés. Mezcla fluida y musical como Eladio Carrión o Myke Towers. Prohibido el patrón mecánico repetitivo línea por línea.`;
  } else if (englishPct <= 65) {
    vibeLabel = `⚖️ Spanglish balanceado 50/50 (${spanishPct}% ES / ${englishPct}% EN)`;
    organicRule = `CODE-SWITCHING ORGÁNICO DINÁMICO (50/50): Alternancia constante y fluida. Alterna barras completas en inglés y español o realiza cambios de código a mitad de compás con total naturalidad estilo Kidd Keo / Eladio. 🚫 PROHIBIDA LA FÓRMULA MECÁNICA: Queda terminantemente prohibido repetir en cada compás el esquema artificial de '[palabra en inglés] + [frase en español]'. El cambio de idioma debe ser espontáneo y variado.`;
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

export function buildSystemPrompt(params: PromptParams): string {
  const artist = getArtistById(params.artistId);
  const featureArtist = params.featureArtistId ? getArtistById(params.featureArtistId) : null;
  const spanglish = buildSpanglishInstruction(params.spanglishPercent);
  const isDetailedSuno = params.sunoTagsMode !== "minimal";

  // Topic construction
  let topicBlock: string;
  if (params.customTopic.trim()) {
    topicBlock = `CONCEPTO A LA CARTA: "${params.customTopic.trim()}". Desarrolla esta idea con detalles crudos, anécdotas callejeras concretas y ángulo único.`;
    if (params.topics.length > 0) {
      topicBlock += ` Atmósfera adicional: [${params.topics.join(" + ")}].`;
    }
  } else if (params.topics.length > 0) {
    topicBlock = `${params.topics.join(" + ")} (Escribe desde una perspectiva original, cruda y realista dentro de la cultura Rap/Trap).`;
  } else {
    topicBlock = "TEMA LIBRE (Crea un concepto callejero auténtico y fresco, sin recurrir a clichés antiguos).";
  }

  // Dynamic Song Form
  const flowProfileForForm = getFlowProfile(params.artistId);
  const songFormStyle = flowProfileForForm?.songFormStyle ?? "minimal_standard";
  const useDynamicForm = params.dynamicSongForm !== false && songFormStyle !== "minimal_standard";

  // Structure plan formatted strictly for Suno AI
  let chorusIdx = 0;
  let verseIdx = 0;
  const totalSections = params.structure.sections.length;
  const hasManualPreChorus = params.structure.sections.some(sec => sec.type === "pre-chorus");
  const structurePlan = params.structure.sections
    .flatMap((s, i) => {
      const isVerse = s.type === "verse";
      const isChorus = s.type === "chorus" || s.type === "hook";
      const isIntro = s.type === "intro";
      const isPreChorus = s.type === "pre-chorus";
      const isPostChorus = s.type === "post-chorus";
      const isBridge = s.type === "bridge";
      const isInterlude = s.type === "interlude";
      const isBeatDrop = s.type === "beat_drop";
      if (isChorus) chorusIdx++;
      if (isVerse) verseIdx++;

      const lines: string[] = [];

      // Pre-Chorus build (auto dynamic form only if no manual pre-chorus was added)
      if (useDynamicForm && (songFormStyle === "pre_chorus_build" || songFormStyle === "hybrid") && isChorus && !hasManualPreChorus) {
        const preHint = getSunoSectionHint("pre-chorus", params.artistId, params.moodId, params.bpmVibe, isDetailedSuno);
        const preTag = preHint ? `, ${preHint}` : "";
        lines.push(`[Pre-Chorus: ${artist?.name ?? "Lead"}${preTag}] — 4 barras (Rampa melódica que sube la energía hacia el chorus)`);
      }

      if (s.type === "instrumental" || isBeatDrop) {
        if (s.name.toLowerCase().includes("beat switch") || s.name.toLowerCase().includes("switch")) {
          lines.push(`[${s.name}: Dramatic tempo & key shift, pitch-shifted sliding 808s, half-time rhythm breakdown] — 🚫 NO LYRICS (Cambio radical de producción y tempo para Suno AI)`);
        } else {
          lines.push(`[${s.name}] — 🚫 NO LYRICS (Solo de producción instrumental para Suno AI)`);
        }
        return lines;
      }

      let isTrading2x2 = false;
      const voiceAssign = params.sectionVoices?.find(v => v.sectionName === s.name);
      if (voiceAssign?.voice === "trading_2x2" || (s.name.toLowerCase().includes("trading") && !!featureArtist)) {
        isTrading2x2 = true;
      }
      const isHype = voiceAssign?.voice === "hype";

      if (voiceAssign?.voice?.startsWith("instrumental:")) {
        lines.push(`[${voiceAssign.voice.replace("instrumental:", "")}] — 🚫 NO LYRICS (Solo de producción instrumental para Suno AI)`);
        return lines;
      }

      const vocalGuideResult = resolveArtistVocalGuide(
        voiceAssign?.voice ?? (s.name.toLowerCase().includes("feature") && featureArtist ? "feature" : isTrading2x2 ? "trading_2x2" : "auto"),
        {
          mainArtistId: params.artistId,
          featureArtistId: params.featureArtistId,
          sectionType: s.type,
          sectionName: s.name,
          isChorus,
          isIntro,
          isTrading2x2,
          isHype,
          introStyle: voiceAssign?.introStyle,
        }
      );

      let voice = vocalGuideResult.artistName;
      let sectionArtistId = params.artistId;
      if (voiceAssign) {
        const v = voiceAssign.voice;
        if (v === "feature" && featureArtist) sectionArtistId = featureArtist.id;
        else if (v !== "main" && v !== "both" && v !== "trading_2x2" && v !== "hype" && !v.startsWith("instrumental:")) {
          const assignedArtist = getArtistById(v);
          if (assignedArtist) sectionArtistId = assignedArtist.id;
        }
      } else if (s.name.toLowerCase().includes("feature") && featureArtist) {
        sectionArtistId = featureArtist.id;
      }

      let bars: string;
      if (s.name.toLowerCase().includes("continuous verse")) {
        bars = "24-32 barras (Flujo continuo de estudio con Flow Switching dinámico cada 8 compases, sin estribillos)";
      } else if (voiceAssign?.bars && voiceAssign.bars > 0) {
        bars = `${voiceAssign.bars} barras`;
      } else if (params.barCountOverride && isVerse) {
        bars = `${params.barCountOverride} barras`;
      } else if (params.smartBarsMode) {
        const bpmNum = parseInt(params.bpmVibe.range.split("-")[1] ?? "130");
        if (isVerse) bars = bpmNum > 150 ? "8 barras" : bpmNum > 120 ? "12 barras" : "16 barras";
        else if (isChorus) bars = "8 barras";
        else if (isPreChorus || isPostChorus) bars = "4 barras";
        else if (isInterlude) bars = "2-4 barras habladas";
        else bars = "4 barras";
      } else {
        bars = isVerse ? "8-12 barras" : isChorus ? "4-8 barras" : (isPreChorus || isPostChorus) ? "4 barras" : (isInterlude ? "2-4 barras habladas" : "2-4 barras");
      }

      let dynamicNote = "";
      if (s.name.toLowerCase().includes("instant 808 beat drop") || s.name.toLowerCase().includes("instant beat drop")) {
        dynamicNote += " (Entrada inmediata con el drop de bajo 808 sin intro previa)";
      }
      if (useDynamicForm) {
        if ((songFormStyle === "expanding_chorus" || songFormStyle === "hybrid") && isChorus && chorusIdx > 1) {
          dynamicNote += ` (Chorus expansivo: añade variaciones nuevas y ad-libs)`;
        }
        if (songFormStyle === "variable_verse" && isVerse) {
          if (verseIdx === 1) dynamicNote += " (Verso 1 narrativo y descriptivo)";
          else if (verseIdx === 2) dynamicNote += " (Verso 2 rápido y agresivo)";
        }
      }

      // Density note
      let densityInstruction = "";
      if (voiceAssign?.density && voiceAssign.density !== "normal") {
        if (voiceAssign.density === "sparse") {
          densityInstruction = " → [DENSIDAD SPARSE / BOUNCE: Métrica abierta y pausada. LÍMITE ESTRICTO: 3 a 5 palabras por compás (4 a 6 sílabas). Vocales sostenidas '...', pausas [Pause] y ad-libs de eco. ANULA el pocket general para esta sección]";
        } else if (voiceAssign.density === "dense") {
          densityInstruction = " → [DENSIDAD DENSE: Flujo continuo y acelerado (8 a 11 palabras / 12 a 14 sílabas por compás), rimas internas frecuentes]";
        } else if (voiceAssign.density === "extra_dense") {
          densityInstruction = " → [DENSIDAD EXTRA DENSE: Ametralladora lírica imparable (11 a 15 palabras / 14 a 18 sílabas por compás), métrica ultra apretada sin respiros]";
        }
      } else if (params.flowPocketMode === "bouncy") {
        densityInstruction = " → [CADENCIA BOUNCY: Métrica elástica de 3 a 5 palabras por compás, swing en contratiempo, ad-libs rítmicos]";
      }

      // Language Override note
      let langOverrideInstruction = "";
      if (isChorus && params.chorusLanguageOverride && params.chorusLanguageOverride !== "auto") {
        langOverrideInstruction = ` → [IDIOMA ESTRIBILLO: Letra estrictamente 100% en ${params.chorusLanguageOverride === "en" ? "Inglés" : "Español"}]`;
      } else if (isVerse && params.versesLanguageOverride && params.versesLanguageOverride !== "auto") {
        langOverrideInstruction = ` → [IDIOMA VERSO: Letra estrictamente 100% en ${params.versesLanguageOverride === "en" ? "Inglés" : "Español"}]`;
      }

      // Repetition Pattern Rule / Hook Archetype Rule per section
      let repTag = "";
      let repInstruction = "";
      let chorusOverrideHint = "";

      if (isTrading2x2) {
        repInstruction = ` → [REGLA TRADING BARS 2x2: Alterna exactamente 2 barras de ${artist?.name ?? "Lead"} y 2 barras de ${featureArtist?.name ?? "Feature"} consecutivamente. Cada artista responde y se pica con el anterior, creando química y tensión colaborativa estilo Drip Harder / Rich Flex]`;
      } else if (isChorus && (voiceAssign?.hookStyle || voiceAssign?.hookMood)) {
        const chosenHookStyle = voiceAssign.hookStyle && voiceAssign.hookStyle !== "auto" ? getHookStyleOptionById(voiceAssign.hookStyle) : undefined;
        const chosenHookMood = voiceAssign.hookMood && voiceAssign.hookMood !== "auto" ? MOODS.find(m => m.id === voiceAssign.hookMood) : undefined;

        if (chosenHookStyle || chosenHookMood) {
          const defaultHookStyle = getFlowProfile(sectionArtistId)?.hookStyle ?? "melodic";
          const styleTag = chosenHookStyle?.sunoTag || (defaultHookStyle === "repetitive" ? "Hypnotic repetitive mantra, layered harmonies" : defaultHookStyle === "simple_punchy" ? "Hard-hitting punchline hook, anthemic energy" : "Layered melodic harmonies, wide anthemic auto-tune");
          const moodTag = chosenHookMood ? `${chosenHookMood.id} emotional mood` : "";
          chorusOverrideHint = [styleTag, moodTag].filter(Boolean).join(", ");

          if (chosenHookStyle) {
            const kw = voiceAssign.customKeyword?.trim();
            if (chosenHookStyle.id === "mantra" && kw) {
              repInstruction += ` → [REGLA HOOK MANTRA: Repite la palabra/frase "${kw}" 3 o 4 veces por compás con cadencia pesada e hipnótica e inserta comas y puntos suspensivos]`;
            } else if (chosenHookStyle.instruction) {
              repInstruction += ` → [${chosenHookStyle.instruction}]`;
            }
          }

          if (chosenHookMood) {
            repInstruction += ` → [MOOD ESPECÍFICO DEL HOOK: Estribillo con emoción de "${chosenHookMood.label}" (${chosenHookMood.description}), marcando un contraste dinámico con el resto del tema]`;
          }
        }
      } else if (voiceAssign?.repetitionPattern && voiceAssign.repetitionPattern !== "none") {
        const repPattern = getRepetitionPatternById(voiceAssign.repetitionPattern);
        if (repPattern) {
          if (repPattern.sunoTag) repTag = `, ${repPattern.sunoTag}`;
          const kw = voiceAssign.customKeyword?.trim();
          if (repPattern.id === "mantra") {
            repInstruction = ` → [REGLA MANTRA: Repite ${kw ? `la palabra/frase "${kw}"` : "un concepto o palabra clave"} 3 o 4 veces por compás con cadencia pesada e hipnótica e inserta comas y puntos suspensivos]`;
          } else if (repPattern.id === "staccato") {
            repInstruction = ` → [REGLA STACCATO: Emplea palabras cortadas percusivas ${kw ? `como "${kw}"` : ""} que golpeen al unísono con el 808 y el hi-hat]`;
          } else if (repPattern.id === "call_response") {
            repInstruction = ` → [REGLA CALL & RESPONSE: Cada barra principal debe tener una réplica o remate directo entre paréntesis como ad-lib]`;
          } else if (repPattern.id === "stutter") {
            repInstruction = ` → [REGLA STUTTER: Usa tartamudeo rítmico de la primera sílaba o palabra al inicio de las barras]`;
          } else if (repPattern.id === "echo") {
            repInstruction = ` → [REGLA ECHO: Desvanece el final de las barras con puntos suspensivos y ecos repetidos]`;
          }
        }
      }

      // Intro specialized style processing
      let introOverrideHint = "";
      if (isIntro) {
        let introStyleId = voiceAssign?.introStyle;
        if (!introStyleId && params.flowPocketMode === "bouncy") {
          introStyleId = "bouncy_warmup";
        }
        if (introStyleId && introStyleId !== "auto") {
          const introOpt = getIntroStyleOptionById(introStyleId);
          if (introOpt) {
            introOverrideHint = introOpt.sunoAcousticTag;
            repInstruction += ` → [${introOpt.instruction}]`;
          }
        }
      }

      // Performance hint inside bracket for Suno AI
      const basePerfHint = (isChorus && chorusOverrideHint)
        ? chorusOverrideHint
        : (isIntro && introOverrideHint)
        ? introOverrideHint
        : "";
      const perfTag = (basePerfHint && !vocalGuideResult.vocalGuide.includes(basePerfHint)) ? `, ${basePerfHint}` : "";
      const bouncyTag = (params.flowPocketMode === "bouncy" && !vocalGuideResult.vocalGuide.includes("bouncy")) ? ", swung bouncy off-beat pocket, elastic 808 bounce" : "";

      lines.push(`[${s.name}: ${vocalGuideResult.artistName} - ${vocalGuideResult.vocalGuide}${perfTag}${repTag}${bouncyTag}] — ${bars}${dynamicNote}${densityInstruction}${langOverrideInstruction}${repInstruction}`);

      // Beat Drop cues tailored to Trap intro archetypes
      if (isIntro) {
        let introStyleId = voiceAssign?.introStyle;
        if (!introStyleId && params.flowPocketMode === "bouncy") introStyleId = "bouncy_warmup";
        if (introStyleId === "bouncy_warmup" || introStyleId === "pre_drop_hype") {
          lines.push(`[Beat Drop: Heavy 808 sub bass drop, explosive beat drop] — 🚫 NO LYRICS (Entrada contundente de las baterías y el bajo 808)`);
        } else if (introStyleId === "acappella_drop") {
          lines.push(`[Beat Drop: Explosive sudden 808 sub bass drop, hard hitting drums] — 🚫 NO LYRICS (Drop demoledor tras el a capella seco)`);
        } else if (introStyleId === "phone_call") {
          lines.push(`[Beat Drop: Phone hangup click, sudden 808 drop, full beat explosion] — 🚫 NO LYRICS (Cuelga la llamada y rompe el beat con 808)`);
        } else if (introStyleId === "lighter_flick") {
          lines.push(`[Beat Drop: Heavy 808 sub bass drop, smoke clears, deep bassline] — 🚫 NO LYRICS (Drop pesado tras la exhalación de humo)`);
        } else if (introStyleId === "movie_skit") {
          lines.push(`[Beat Drop: Dramatic 808 drop, cinema sub bass boom, full drums] — 🚫 NO LYRICS (Entrada demoledora tras el sample cinematográfico)`);
        } else if (introStyleId === "chopped_screwed") {
          lines.push(`[Beat Drop: Tape stop fx, slowed sluggish 808 bass drop] — 🚫 NO LYRICS (Frenada de cinta y drop pesado ralentizado)`);
        } else if (introStyleId === "producer_tag") {
          lines.push(`[Beat Drop: Snare riser buildup, explosive 808 drop, full drums] — 🚫 NO LYRICS (Explosión tras el producer tag y roll call)`);
        } else if (useDynamicForm && songFormStyle === "beat_drop") {
          lines.push(`[Beat Drop: Heavy 808 drop, distorted bassline] — 🚫 NO LYRICS (Drop del beat con 808 pesado)`);
        }
      } else if (useDynamicForm && songFormStyle === "beat_drop" && isChorus && i === totalSections - 2) {
        lines.push(`[Beat Drop: Heavy 808 drop, tension release] — 🚫 NO LYRICS (Tensión antes del chorus final)`);
      }

      return lines;
    })
    .join("\n");

  // Rhyme tier instruction & custom rhyme scheme
  const customScheme = params.rhymeSchemeId && params.rhymeSchemeId !== "rs_free" ? getRhymeSchemeById(params.rhymeSchemeId) : null;
  const rhymeTier = getRhymeTier(params.artistId);
  let rhymeLevelInstruction = "";
  if (customScheme) {
    rhymeLevelInstruction = `MÉTRICA / ESQUEMA DE RIMA OBLIGATORIO (${customScheme.pattern} - ${customScheme.label}): ${customScheme.description}. Cada estrofa debe respetar rigurosamente esta estructura de rima.`;
  } else if (rhymeTier === 1) {
    rhymeLevelInstruction = `MÉTRICA TÉCNICA: Rimas multisilábicas obligatorias (2+ sílabas coincidentes) y rimas internas dentro del compás. Precisión quirúrgica estilo Eminem/Kendrick/Recycled J.`;
  } else if (rhymeTier === 2) {
    rhymeLevelInstruction = `MÉTRICA EQUILIBRADA: Combina multisilábicas con rimas de 1 sílaba contundentes. Rimas internas naturales y cadencia pegadiza estilo Travis Scott/Gunna/Drake.`;
  } else {
    rhymeLevelInstruction = `MÉTRICA DIRECTA / STREET: Prioriza la cadencia, el golpe rítmico y la actitud cruda. Rimas directas, asonancias pesadas y ad-libs precisos estilo Yung Beef/21 Savage/Future/Carti.`;
  }

  // Narrative arc
  let narrativeBlock = "";
  if (params.narrativeArcId !== "none" && params.narrativeArcDesc) {
    narrativeBlock = `\n# 📖 ARCO NARRATIVO\n${params.narrativeArcDesc}`;
  }

  // Situational subtext block (Cinematic realism & Scene Engine)
  let situationalBlock = "";
  if (params.situationalPresetId && params.situationalPresetId !== "none") {
    const sitScene = getSceneById(params.situationalPresetId);
    if (sitScene) {
      situationalBlock = `
# 🎬 CONFLICTO SITUACIONAL & SCENE ENGINE (SHOW, DON'T TELL)
**Escenario**: ${sitScene.title} (${sitScene.badge}) — ${sitScene.tagline}
- **Ubicación / Setting**: ${sitScene.setting}
- **Atmósfera & Tiempo**: ${sitScene.atmosphere} (Momento inicial: ${sitScene.initialTimeState})
- **Conflicto Central**: ${sitScene.conflict}
- **Estado Emocional**: ${sitScene.emotionalState}
- **Hechos Inmutables (Scene Facts - Datos de fondo)**:
${sitScene.sceneFacts.map(f => `  • ${f}`).join("\n")}
- **Imágenes Sensoriales (Scene Imagery - NO repetir las mismas palabras en cada compás)**:
${sitScene.sceneImagery.map(i => `  • ${i}`).join("\n")}
- **Objetos Ancla Físicos**: ${sitScene.anchorObjects.join(", ")}
- **⚡ GIRO DRAMÁTICO (SCENE TURN PARA EL VERSO 2)**: "${sitScene.sceneTurn}" (¡ALGO HA CAMBIADO EN EL VERSO 2! Prohibido mantener la misma escena estática sin avance de tiempo).
- **🚫 SUPOSICIONES PROHIBIDAS**: ${sitScene.forbiddenAssumptions.join(" | ")}`;
    } else {
      const sitPreset = getSituationalPresetById(params.situationalPresetId);
      if (sitPreset) {
        situationalBlock = `\n# 🎬 CONFLICTO SITUACIONAL & SUBTEXTO (SHOW, DON'T TELL)\n**Escenario**: ${sitPreset.title} (${sitPreset.badge})\n${sitPreset.subtextPrompt}\n*REGLA CINEMATOGRÁFICA:* No expliques el conflicto de forma genérica. Desarróllalo mediante acciones físicas, micro-detalles en la habitación, llamadas sin contestar y tensión psicológica real.`;
      }
    }
  }

  // Dictionary
  let dictionaryBlock = "";
  if (params.customDictionary?.trim()) {
    dictionaryBlock = `\n# 🌍 DICCIONARIO / WORLD-BUILDING\nIncorpora estos términos y nombres reales de forma orgánica en las barras:\n{ ${params.customDictionary.trim()} }`;
  }


  // Flow profiles
  const flowProfile = getFlowProfile(params.artistId);
  const featureFlowProfile = featureArtist ? getFlowProfile(featureArtist.id) : null;

  let cadenceBlock = "";
  if (flowProfile) {
    cadenceBlock = `\n# 🎵 CADENCIA Y VELOCIDAD (POCKET SUNO)\n- **Cadencia**: ${getCadenceLabel(flowProfile.cadence)}\n- **Velocidad de compás**: ${flowProfile.syllablesPerBar} sílabas por barra (${flowProfile.speedLabel})\n- ${flowProfile.cadenceInstruction}\n- **Puntuación para Suno**: Usa comas ',' y pausas '...' en los puntos de respiración natural.`;
    if (featureFlowProfile && featureArtist) {
      cadenceBlock += `\n- **Cadencia del Feature (${featureArtist.name})**: ${getCadenceLabel(featureFlowProfile.cadence)} — ${featureFlowProfile.cadenceInstruction}`;
    }
  }

  // Flow Switching Dynamics
  const isVanguard = params.dynamismMode !== "classic";
  let flowSwitchingBlock = "";
  if (isVanguard) {
    flowSwitchingBlock = `\n# 🔄 FLOW SWITCHING DINÁMICO DENTRO DEL VERSO (MICROMOVIMIENTOS DE ESTUDIO)
Los versos NO deben tener un ritmo monótono ni la misma cadencia estática de principio a fin. En cada verso de 8 a 16 barras, ejecuta una progresión dinámica en 3 movimientos:
1. **Barras 1 a 4 (Pacing & Atmósfera):** Cadencia pausada, frases con espacio y aire, silencios, establece la escena y el tono con calma amenazante o reflexiva.
2. **Barras 5 a 8 (Shift Rítmico & Aceleración):** CAMBIA DE MARCHA. Introduce síncopa rápida, triplets (tresillos) o rimas internas continuas. Sube la densidad de sílabas por compás para inyectar adrenalina y tensión.
3. **Barras 9 a 12/16 (Tensión, Espacio & Punchline Payoff):** Vuelve a abrir espacio, reduce la velocidad con golpes secos y pausas marcadas '[Pause]', rematando con el punchline más pesado que catapulte directamente hacia el Chorus.`;
  }

  // Abstract Reference Features (Metric and Structural Blueprint — Zero Literal Paraphrase)
  const artistRef = params.mainArtistReference ?? getArtistReference(params.artistId);
  const mainDNA = getMusicalDNAForArtist(params.artistId);
  let referenceBlock = "";
  if (artistRef || mainDNA) {
    referenceBlock = `\n# 🎯 ANATOMÍA RÍTMICA ABSTRACTA (PEAK ERA BLUEPRINT — CERO RECOMBINACIÓN LITERAL)
- Pocket Estructural: ${mainDNA.flow.cadenceType} (${mainDNA.flow.avgSyllablesPerBar.join("-")} sílabas por compás)
- Síncopa & Swing: ${Math.round(mainDNA.flow.syncopation * 100)}% de peso en contratiempo (off-beat)
- Frecuencia de Pausas: ${Math.round(mainDNA.flow.pauseFrequency * 100)}% (respiración y elipsis)
- Complejidad de Rima: ${mainDNA.writing.rhymeComplexity} (densidad de imagen: ${Math.round(mainDNA.writing.imageryDensity * 100)}%)
- Entrega Vocal: ${mainDNA.vocal.sunoVocalTimbre} | Rango: ${mainDNA.vocal.melodicRange}
*DIRECTIVA DE INDEPENDENCIA LÍRICA:* No copies ni parafrasees letras históricas reales. Aplica este modelo métrico y acústico abstracto exclusivamente a los hechos y objetos de la escena actual.`;
  }

  const featRef = params.featureArtistReference ?? (featureArtist ? getArtistReference(featureArtist.id) : null);
  const featDNA = featureArtist ? getMusicalDNAForArtist(featureArtist.id) : null;
  let featureReferenceBlock = "";
  if (featureArtist && featDNA) {
    featureReferenceBlock = `\n# 🤝 ANATOMÍA RÍTMICA DEL FEATURE (PEAK ERA BLUEPRINT)
- Artista Feature: ${featureArtist.name} (${featureArtist.origin})
- Pocket: ${featDNA.flow.cadenceType} (${featDNA.flow.avgSyllablesPerBar.join("-")} sílabas)
- Síncopa: ${Math.round(featDNA.flow.syncopation * 100)}% | Rima: ${featDNA.writing.rhymeComplexity}
- Timbre: ${featDNA.vocal.sunoVocalTimbre}`;
  }

  // Producer tag
  let producerBlock = "";
  const producer = params.producerId ? getProducerById(params.producerId) : null;
  if (producer && producer.id !== "none") {
    let personalizedTag = producer.tag;
    if (params.producerName?.trim()) {
      personalizedTag = producer.tag
        .replace(new RegExp(producer.name, "gi"), params.producerName.trim())
        .replace(/\{NAME\}/gi, params.producerName.trim());
    }
    producerBlock = `\n# 🎛️ PRODUCER TAG\nInserta este producer tag al inicio del [Intro]: "${personalizedTag}"`;
  } else if (params.producerTag?.trim()) {
    producerBlock = `\n# 🎛️ PRODUCER TAG\nInserta este producer tag al inicio del [Intro]: "${params.producerTag.trim()}"`;
  }


  // Ad-libs rules & Textured Ad-libs
  let adlibsBlock = "";
  const adlibsStyle: string[] = [];
  if (artist?.adlibs && artist.adlibs.length > 0) {
    adlibsStyle.push(`${artist.name}: ${artist.adlibs.map(a => `(${a})`).join(" ")}`);
  }
  if (featureArtist?.adlibs && featureArtist.adlibs.length > 0) {
    adlibsStyle.push(`${featureArtist.name}: ${featureArtist.adlibs.map(a => `(${a})`).join(" ")}`);
  }

  const adlibMode = params.adlibStyle ?? "textured";
  if (adlibMode === "minimal") {
    adlibsBlock = `\n# 🗣️ AD-LIBS: MODO VOCAL LIMPIA (MINIMAL NATIVE)
- Mínimos ad-libs en toda la canción (máximo 1 o 2 en todo el verso, solo en los remates más fuertes).
- Deja la voz principal completamente al frente, cruda, íntima y sin distracciones.`;
  } else if (adlibMode === "textured") {
    adlibsBlock = `\n# 🗣️ AD-LIBS TRIDIMENSIONALES & TEXTURIZADOS (SUNO NATIVE)
Los ad-libs NO son solo muletillas aisladas al final de la barra. Distribuye ad-libs con estas 3 funciones dinámicas:
1. **Armonías y Colas Melódicas de Fondo:** Palabras en eco o frases secundarias cantadas que completan el final de la barra: *(no me busques...)*, *(uh-uh)*, *(sola)*, *(dime dónde)*.
2. **Puntuación Conversacional & Cínica:** Comentarios entre dientes, susurros o réplicas en voz baja: *(¿quién si no?)*, *(nah)*, *(olvídalo)*, *(dime)*, *(por qué)*.
3. **Pausas y Textura Vocal:** Inserta silencios rítmicos '[Pause]' antes de una entrada contundente y '[Breath]' para que Suno genere pausas y respiraciones hiperrealistas.
*REGLA DE ORO:* Los ad-libs firma icónicos (${adlibsStyle.join(", ") || "(Yeah)"}) úsalos de forma selectiva y estratégica (máximo 1 o 2 veces en toda la canción) para que golpeen con verdadero peso y sorpresa, NUNCA en cada compás.`;
  } else {
    // classic
    if (adlibsStyle.length > 0) {
      adlibsBlock = `\n# 🗣️ AD-LIBS NATIVOS PARA SUNO\nEjemplos icónicos:\n${adlibsStyle.join("\n")}\nREGLAS DE AD-LIBS:\n1. Ad-libs SIEMPRE entre paréntesis: (Yeah!), (Brrr!), (Let's go!). Suno los ubicará automáticamente como pistas de fondo en estéreo.\n2. ESPACIO Y AIRE: Máximo 1 ad-lib cada 2 o 3 barras. Deja que la voz principal respire, no satures cada línea.\n3. CONTEXTO: El ad-lib debe responder al remate de la barra previa.`;
    }
  }

  const dirty = getDirtyLevel(params.dirtyLevel ?? 2);
  const dirtyBlock = `\n# 🔞 NIVEL DE ACTITUD / DIRTY LEVEL: ${dirty.label.toUpperCase()} (${dirty.badge})\n${dirty.instruction}`;

  // Dynamic BPM Syllabic Pocket calculation
  const bpmParts = params.bpmVibe.range.split("-").map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
  const avgBpm = bpmParts.length === 2 ? Math.round((bpmParts[0] + bpmParts[1]) / 2) : (bpmParts[0] ?? 130);

  let pocketGuideline: string;
  if (avgBpm < 118) {
    pocketGuideline = `- **Pocket Silábico Estricto (${params.bpmVibe.range} BPM - Tempo Lento/Heavy)**: Entre 6 y 8 sílabas por compás. Flow pesado, arrastrado, con mucho aire entre frases. Deja respirar al bajo 808. Prohibido meter más de 9 sílabas en una barra para evitar que la voz se tropiece.`;
  } else if (avgBpm <= 136) {
    pocketGuideline = `- **Pocket Silábico Estricto (${params.bpmVibe.range} BPM - Tempo Estándar Atlanta)**: Entre 8 y 10 sílabas por compás. El bolsillo clásico de trap; la frase debe cerrar antes del golpe de la caja en el tiempo 3. Evita rebasar las 11 sílabas para no acelerar artificialmente la voz en Suno.`;
  } else if (avgBpm <= 152) {
    pocketGuideline = `- **Pocket Silábico Estricto (${params.bpmVibe.range} BPM - Tempo Rápido/Drill/Rage)**: Entre 10 y 12 sílabas por compás. Cadencia en tresillos (triplets) o staccato muy articulado y seco. Cada palabra debe encajar con precisión quirúrgica en el patrón rítmico.`;
  } else {
    pocketGuideline = `- **Pocket Silábico Estricto (${params.bpmVibe.range} BPM - Tempo Hiperactivo/Rage)**: Entre 11 y 14 sílabas por compás en métrica rápida, o barras cortas de 5-6 sílabas con repetición agresiva. Evita párrafos largos que Suno aceleraría en modo ardilla.`;
  }

  // American Trap Bounce block
  const isBouncyMode = params.flowPocketMode === "bouncy" || params.structure.sections.some(s => {
    const va = params.sectionVoices?.find(v => v.sectionName === s.name);
    return va?.density === "sparse";
  });

  let bouncyBlock = "";
  if (isBouncyMode) {
    bouncyBlock = `\n# 🏀 MOTOR RÍTMICO AMERICAN TRAP BOUNCE (OFF-BEAT POCKET & AD-LIB PING-PONG)
Esta canción o secciones marcadas con [DENSIDAD SPARSE / BOUNCE] deben ejecutarse con la arquitectura rítmica del trap americano con rebote (Gunna, Turbo, Wheezy, Lil Baby, Pierre Bourne).
Aplica rigurosamente estas 5 reglas de rebote a cada barra:
1. **Silencio en el Tiempo 1 (Espacio para el 808):** La voz NO debe entrar en el primer golpe del compás. Deja caer el bombo 808 limpio y entra justo en el contratiempo (el 'off-beat').
2. **Economía de Palabras Estricta:** Entre **3 y 5 palabras por compás (4 a 6 sílabas)** como MÁXIMO absoluto. Queda TERMINANTEMENTE PROHIBIDO redactar oraciones continuas o discursivas de más de 6 palabras. Menos palabras = más rebote.
3. **Puntuación Elástica para Suno AI:** Usa comas ',' y puntos suspensivos '...' para forzar al motor de Suno a retrasar la voz con swing (*swung delay*): ej: *"Drop top... (skrrt), dentro del BM (yeah)"*, *"Cash flow... (racks), saben quién viene (facts)"*.
4. **Ad-libs de Contrarritmo (Ping-Pong 3D):** Cada compás debe cerrarse con un ad-lib entre paréntesis en el tiempo 4 que responde a la voz líder. El ad-lib funciona como un instrumento de percusión extra.
5. **Fonética Cortada en Español:** Evita palabras polisilábicas pesadas (3+ sílabas). Emplea vocabulario seco, monosílabos, anglicismos y jerga percusiva.
*ADAPTACIÓN AL ARTISTA:* Conserva el 100% de la identidad, jerga y actitud de ${artist?.name ?? "Lead"}, pero empaca sus barras dentro de este rebote de Atlanta.`;
  }

  // Specialized Chorus Architecture block
  const chorusBlock = `\n# 🔁 ARQUITECTURA DEL ESTRIBILLO / HOOK (SUNO NATIVE)
Los estribillos [Chorus / Hook] NO son versos ni deben contener oraciones narrativas complejas. En Suno AI, un estribillo bailable y memorable requiere:
1. **Estructura Simétrica de 4+4 Compases (para estribillos de 8 barras):**
   - **Barras 1 a 4:** Gancho melódico central, espacioso y pegadizo.
   - **Barras 5 a 8:** Repetición hipnótica del mismo gancho con ligeras variaciones melódicas, extensiones de vocales con '...' o réplicas de ad-libs.
2. **Economía Vocal en el Estribillo:** Si el estribillo tiene densidad Sparse o modo Bouncy, usa MÁXIMO 3 a 5 palabras por barra. Deja que el autotune y los pads respiren.
3. **Prohibido la Narrativa de Verso en el Chorus:** Queda terminantemente prohibido contar historias, anécdotas largas o párrafos en el estribillo.`;

  // Specialized Intro Architecture block
  const introVoiceAssign = params.sectionVoices?.find(v => v.sectionName.toLowerCase().includes("intro"));
  let effectiveIntroStyle = introVoiceAssign?.introStyle;
  if (!effectiveIntroStyle && params.flowPocketMode === "bouncy") {
    effectiveIntroStyle = "bouncy_warmup";
  }

  let introBlock = "";
  if (effectiveIntroStyle && effectiveIntroStyle !== "auto") {
    if (effectiveIntroStyle === "bouncy_warmup") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: AD-LIB WARMUP & REBOTE DE ATLANTA
La sección [Intro] NO debe contener oraciones narrativas completas ni versos hablados largos.
Sigue esta estructura compás a compás:
1. **Compás 1 (Producer Chat / Studio Setup):** Interacción espontánea con la cabina o el productor: ej: *(“Turn me up...”)*, *(“Sube los cascos”)*, o el Producer Tag entre comillas si está definido.
2. **Compás 2 y 3 (Ping-Pong de Ad-libs Afinados):** Ad-libs rítmicos entre paréntesis con comas y puntos suspensivos que flotan sobre el pad antes de la batería: ej: *(Yeah, yeah...)*, *(Woah, woah... skrrt)*, *(Mmm... racks)*, *(Facts)*.
3. **Compás 4 (Pre-Drop Stutter & Tensión):** Repetición rítmica de fragmentos o monosílabos acelerados y aviso del drop: ej: *(Hold up... hold up... [Beat Drop])* o *(Yeah... yeah... let's get it! [Beat Drop])*.
4. **Regla de Oro:** El 80-90% de las líneas deben ser ad-libs entre paréntesis. Menos palabras = más espacio y rebote.`;
    } else if (effectiveIntroStyle === "phone_call") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: NOTA DE VOZ / JAIL CALL
La sección [Intro] debe recrear una llamada telefónica o nota de audio cruda (estilo Morad / Anuel AA / Drake):
1. Comienza con sonido o pitido de llamada entre paréntesis: ej: *(Beep... tono de llamada)* o *(Directo desde el módulo 4)*.
2. Frases habladas con tono de teléfono, sin métrica forzada ni rimas estructuradas, expresando lealtad, calle o mensaje directo: ej: “Oye hermano, dile a la gente que no se duerma, que la calle está caliente...”.
3. Cierre abrupto con sonido de colgar o aviso justo antes del drop: ej: *(Click... se corta la llamada)* seguido del [Beat Drop].`;
    } else if (effectiveIntroStyle === "acappella_drop") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: ENTRADA A CAPELLA AL DROP
La sección [Intro] debe ser completamente a capella, con voz seca y sin batería (estilo 21 Savage / Duki / J. Cole):
1. De 2 a 4 compases de rapeo o declamación directo al micrófono sin música ni melodía de fondo.
2. Tono firme, pausado e intimidante, dejando que cada palabra retumbe en el silencio.
3. El último verso remata en seco y conecta inmediatamente con el [Beat Drop: Explosive sudden 808 sub bass drop].`;
    } else if (effectiveIntroStyle === "lighter_flick") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: MECHERO & EXHALACIÓN (LIGHTER FLICK)
La sección [Intro] recrea el icónico ritual de estudio de Lil Wayne, Travis Scott y Wiz Khalifa:
1. Compás 1: Sonido de chispa de mechero y calada entre paréntesis: *(Click... shhh... prendiendo)*.
2. Compás 2: Exhalación profunda de humo, carraspeo o tos relajada: *(Exhala humo... cough... yeah)*.
3. Compás 3 y 4: Frase casual y reflexiva que rompe el silencio mientras el pad y el bajo se hinchan: ej: *(“Sube el humo, ya no miramos pa' abajo...”)* y caída demoledora en el [Beat Drop].`;
    } else if (effectiveIntroStyle === "movie_skit") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: SAMPLE CINEMATOGRÁFICO / NOTICIERO
La sección [Intro] abre como una película de culto o crónica de sucesos (estilo Dark Trap / UK Drill / Modo Diablo):
1. Sample de diálogo o locución de noticiero entre comillas con efecto de vinilo o sirenas lejanas: ej: “Última hora: las autoridades confirman incidentes en el sector sur...”.
2. Tono oscuro, cinematográfico y amenazante que establece la narrativa del track.
3. Entrada del artista con un murmullo o risa sarcástica antes de que explote el [Beat Drop].`;
    } else if (effectiveIntroStyle === "chopped_screwed") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: CHOPPED & SCREWED (HOUSTON SLOWED)
La sección [Intro] recrea la psicodelia y pesadez del sonido Screw de Texas (Travis Scott / A$AP Rocky / Don Toliver):
1. Voz ralentizada con pitch grave y tartamudeo rítmico: ej: *(S-S-Slowed down... en la nave)*, *(Tr-Tr-TrapLord...)*.
2. Efecto de cinta frenándose (tape stop fx) y repetición de palabras en eco denso: *(Yeah... yeah... chopped)*.
3. El ritmo cae pesado y ralentizado en el [Beat Drop].`;
    } else if (effectiveIntroStyle === "producer_tag") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: PRODUCER TAG & ROLL CALL
La sección [Intro] arranca con la firma legendaria del productor y la presentación del artista (Metro Boomin / Bizarrap / Murda Beatz):
1. Tag del productor reververado entre comillas: ej: “If Young Metro don't trust you I'm gon' shoot you”, “Bizarrap!”, o el tag del beatmaker asignado.
2. Roll call del intérprete reclamando su territorio: ej: *(TrapLord en los controles... let's go!)*.
3. Riser de caja/hi-hats que acelera en tensión hasta reventar en el [Beat Drop].`;
    } else if (effectiveIntroStyle === "studio_banter") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: STUDIO BANTER / CHARLA DE CABINA
La sección [Intro] debe sentirse como una toma real en el estudio (estilo Future / 21 Savage / Drake):
1. Frases habladas con naturalidad al micrófono antes de empezar la pista: ej: *(“Diles que prendan el mic”)*, *(“Sube el autotune”)*, *(“Yeah... look”)*.
2. Respiraciones audibles, comentarios de flex casual y pausas reflexivas mientras suena el bajo o teclado filtrado.
3. Cierre seco justo antes de la entrada del ritmo.`;
    } else if (effectiveIntroStyle === "pre_drop_hype") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: PRE-DROP STUTTER & HYPE (RAGE / CARTI)
La sección [Intro] debe generar máxima tensión y anticipación para el drop de bajo (estilo Travis / Carti / Rage):
1. Murmullos repetitivos acelerados con delay o reverb: ej: *(What? What? What?)*, *(Yeah... yeah... yeah...)*.
2. Gritos lejanos de fondo y conteo o aviso explosivo: ej: *(Hold on... hold on... GO!)* justo antes del [Beat Drop].`;
    } else if (effectiveIntroStyle === "minimal_pad") {
      introBlock = `\n# 🎚️ ARQUITECTURA DE LA INTRO: MINIMALIST PAD & ESPACIO
La sección [Intro] debe ser casi instrumental:
1. Máximo 1 o 2 ad-libs dispersos en toda la intro: ej: *(Yeah)* o *(Dímelo...)*.
2. Deja respirar por completo el sintetizador o melodía principal sin saturar de voces antes de que entren las baterías.`;
    }
  }

  // Locked sections block
  let lockedBlock = "";
  if (params.lockedSections && params.lockedSections.length > 0) {
    lockedBlock = `\n# 🔒 SECCIONES BLOQUEADAS (CONSERVAR EXACTAMENTE IDÉNTICAS)
Las siguientes secciones ya fueron aprobadas por el usuario. DEBES reproducirlas EXACTAMENTE como están escritas, sin alterar una sola palabra ni ad-lib:
${params.lockedSections.map(l => `[${l.name}]\n${l.content}`).join("\n\n")}`;
  }

  // Section regeneration directive
  let regenerateBlock = "";
  if (params.regenerateSection) {
    regenerateBlock = `\n# ⚡ DIRECTIVA DE REGENERACIÓN EXCLUSIVA DE SECCIÓN
Estás regenerando ÚNICAMENTE la sección "[${params.regenerateSection.sectionName}]".
DEBES DEVOLVER EXCLUSIVAMENTE el encabezado [${params.regenerateSection.sectionName}] y sus compases cantados correspondientes. NO generes ninguna otra sección de la canción (ni Intro, ni Versos, ni Outro).
Contexto musical previo para mantener coherencia de rima y flow:
${params.regenerateSection.keepContext.slice(0, 500)}`;
  }

  // Language correction & reference track blocks
  let correctionBlock = "";
  if (params.correctionInstruction) {
    correctionBlock = `\n# ⚠️ CORRECCIÓN OBLIGATORIA DE IDIOMA / SPANGLISH\n${params.correctionInstruction}`;
  }

  let refTrackBlock = "";
  if (params.referenceTrack) {
    refTrackBlock = `\n# 🧬 ADN DE TRACK DE REFERENCIA (ESTRUCTURA & RITMO)\n${params.referenceTrack.summary}\n- Densidad recomendada: ${params.referenceTrack.density}\n- Esquema de rima sugerido: ${params.referenceTrack.rhymeScheme}`;
  }

  const prompt = `${regenerateBlock ? `${regenerateBlock}\n\n` : ""}Eres un Ghostwriter de élite del Trap y Rap contemporáneo. Escribes letras auténticas, con groove callejero y perfectamente estructuradas para ser producidas y cantadas en SUNO AI.

# 🧠 PROTOCOLO DE RAZONAMIENTO INTERNO (THINKING PROTOCOL)
Antes de redactar la letra definitiva, utiliza tus tokens de razonamiento interno para completar estas 4 fases:
1. **Fase 1 (Concepto, Subtexto & Punchlines):** Define el concepto central, el hook melódico y el remate (punchline/payoff) de cada estrofa primero. Conecta con el subtexto psicológico y el conflicto de la escena.
2. **Fase 2 (Backtracking, Flow Switching & Rimas):** Establece los fonemas de rima objetivo (asonante/consonante) y construye las barras hacia el remate, asegurando la progresión rítmica del verso (pacing inicial → aceleración/shift → remate).
3. **Fase 3 (Filtro Antiparodia, Anti-Checklist & Anti-Clichés):** Evalúa críticamente cada barra contra la **Lista Negra de Clichés** y el **Filtro Anti-Encasillamiento**. ¿Suena a canción real de trap de estudio o parece una caricatura forzada que abusa de palabras firma repetidas? Si alguna frase suena a cliché genérico de IA o sobreutiliza muletillas del artista, DESCÁRTALA y reescríbela con detalles visuales concretos, marcas, jerga contemporánea y peso de calle real.
4. **Fase 4 (Emisión Suno-Native):** Emite únicamente la letra estructurada con etiquetas entre corchetes [Section: Artist, Performance Hint], limpia y lista para Suno.

# 🎤 IDENTIDAD & ESTILO
${spanglish.prompt}
- **Artista Principal**: ${artist?.name ?? "Estilo Libre"} (${artist?.origin ?? "Trap"}) — ${artist?.style ?? "Flow crudo."}
${featureArtist ? `- **Feature**: ${featureArtist.name} (${featureArtist.origin}) — ${featureArtist.style}` : "- **Feature**: Ninguno."}
- **BPM & Vibra**: ${params.bpmVibe.range} BPM (${params.bpmVibe.label}).
- **Temática**: ${topicBlock}
${dirtyBlock}
${situationalBlock}
${narrativeBlock}
${dictionaryBlock}
${producerBlock}
${cadenceBlock}
${bouncyBlock}
${chorusBlock}
${introBlock}
${flowSwitchingBlock}
${lockedBlock}
${correctionBlock}
${refTrackBlock}
${referenceBlock}
${featureReferenceBlock}
${adlibsBlock}

# 📐 REGLAS MUSICALES & MÉTRICA SUNO
${rhymeLevelInstruction}
${pocketGuideline}
- **Excepción Obligatoria de Densidad / Bouncy**: Si una sección indica [DENSIDAD SPARSE / BOUNCE] o la canción activa el [American Trap Bounce], la regla general de 8-10 sílabas queda TOTALMENTE ANULADA para esa sección, debiendo usar estrictamente entre 3 y 5 palabras por compás (4 a 6 sílabas) con elipsis '...' y ad-libs de ping-pong.
${params.syllableSync ? "- **Sincronización Silábica**: Métrica estricta y simétrica compás a compás.\n" : ""}${params.phoneticAdlibs ? "- **Ad-libs Fonéticos**: Usa ad-libs fonéticos percusivos (brrr, skrrt, prr, woo, fah).\n" : ""}- **Puntuación Rítmica**: Utiliza comas ',' y puntos suspensivos '...' para marcar los silencios y respiraciones del cantante.
- **Rimas Orgánicas**: ${customScheme ? `Sigue rigurosamente el esquema ${customScheme.pattern} (${customScheme.label}).` : "Rimas AABB o ABAB fluidas."}
- **Dinámica Acústica Suno v4.5**: Puedes intercalar etiquetas acústicas como '[Vocal Cut]' en la barra de remate antes del estribillo, '[Beat Drop: Sub bass drop]' o '[Layered Chorus: stereo autotune harmonies]' para abrir coros en estéreo.
- **Prohibido**: JAMÁS menciones el nombre real o apodo de ningún artista en la letra cantada ni en los ad-libs. El reconocimiento debe ser 100% por el flow, la métrica y la actitud rítmica.

# 🎤 DIRECTIVA GHOSTWRITER UNIVERSAL: ADN MUSICAL, CERO BIOGRAFÍA PRIVADA
1. **ADN MUSICAL Y MOTOR DE RITMO:** Emula el motor rítmico, el pocket silábico, la acentuación, las pausas y la actitud del artista (${artist?.name ?? "Lead"}), para que el rapeo en Suno suene idéntico al artista original, pero aplicado al CONCEPTO Y SITUACIÓN ACTUAL.
2. **CERO NAME-DROPPING & CERO COSPLAY BIOGRÁFICO:** Queda TERMINANTEMENTE PROHIBIDO escribir en las barras o ad-libs el nombre de los artistas ("soy ${artist?.name ?? "X"}") ni calcar anécdotas autobiográficas íntimas del artista real: no nombres a familiares reales fallecidos, ni antecedentes policiales privados, ni pandillas de su infancia concreta. El artista es un motor estilístico y de cadencia, no un personaje biográfico prestado.

# 🚫 FILTRO ANTI-ENCASILLAMIENTO & DIVERSIFICACIÓN LÉXICA (ANTI-CHECKLIST)
1. **PROHIBIDO EL CHECKLISTING:** No trates los ad-libs, jerga o temas como una lista de compras que deba aparecer en cada compás. Queda terminantemente prohibido rotar los mismos 4 sustantivos en bucle (ej: mencionar weed, crypto, dinero y mujeres en cada estrofa como si fuera una tabla de Excel).
2. **DESARROLLO POR ACCIONES FÍSICAS:** Una vez que un elemento físico de la escena se introduce, la estrofa debe avanzar mediante consecuencias físicas, llamadas, decisiones y detalles visuales concretos (Show, Don't Tell), NO volviendo a listar sustantivos temáticos.
3. **LÍMITE DE PALABRAS FIRMA:** Cada término firma o ad-lib icónico solo puede aparecer como MÁXIMO 1 o 2 veces en TODA la canción como golpe de efecto sorpresa, NUNCA como muletilla constante en cada compás.
4. **NO REPETICIÓN ENTRE ESTROFAS (MEMORIA NEGATIVA):** Si usas una metáfora, marca de coche o prenda en el Verso 1, queda TERMINANTEMENTE PROHIBIDO repetirla en el Verso 2. Varía el vocabulario, las acciones y las imágenes en cada sección.

# 🚫 PROHIBICIÓN RADICAL DEL CORO DE TRADUCCIÓN (ANTI-CORO ESCOLAR):
Queda TERMINANTEMENTE PROHIBIDO escribir compases de estribillo con el patrón "[Frase en español]... [(traducción literal en inglés)]" (ej: "Fumo loud... (loud), veo el futuro... (clear)"). Un estribillo es un objeto acústico y musical pegadizo, no una clase de idiomas. Los ad-libs deben aportar contratiempo rítmico, ecos melódicos o réplicas dialécticas con actitud *(¿cuándo?)*, *(facts)*, *(olvídalo)*, NUNCA la traducción de la palabra cantada.

# 🚫 LISTA NEGRA DE CLICHÉS & FRASES PROHIBIDAS (ANTI-TROPES FILTER)
Queda ESTRICTAMENTE PROHIBIDO usar las siguientes frases hechas, rimas baratas y fórmulas artificiales que delatan texto generado por IA. Sustitúyelas por imágenes callejeras concretas, marcas, acciones reales y jerga contemporánea:
1. **Rimas y Clichés Genéricos en Español PROHIBIDOS:**
   - ❌ Rimas consonantes de relleno infantil: "sube / nube", "perra / perla", "cuenta / renta / noventa", "boca / toca / loca", "gente / mente / frente", "dinero / entero".
   - ❌ Términos anatómicos, clínicos o formales totalmente fuera de lugar en trap/drill: "cunnilingus", "en el calicanto", "inversión financiera", "apreciación de activos".
   - ❌ "El asfalto no perdona / la calle no perdona / la jungla de cristal"
   - ❌ "Haciendo money sin parar / contando billetes hasta el amanecer"
   - ❌ "Fuego / juego / suelo / vuelo / cielo" (Rimas baratas de relleno)
   - ❌ "Vida / herida / salida / caída"
   - ❌ "Amor / dolor / rencor / calor"
   - ❌ "Caminando en la oscuridad / brillando en la tempestad / luchando por mi verdad"
   - ❌ "Volando como un avión / rompiendo el corazón / subiendo de nivel"
   - ❌ "Soy el rey de la ciudad / viviendo mi realidad / nadie me va a parar"
2. **Rimas y Clichés Genéricos en Inglés / US Trap PROHIBIDOS:**
   - ❌ "Stacking paper to the ceiling / running up the bands" (Frases cliché gastadas)
   - ❌ "Came from the bottom now I'm at the top" (A menos que se use con una anécdota ultra-específica)
   - ❌ "Trap / rap / map / cap" (Cadena de rimas floja de IA)
   - ❌ "Shining like a star / driving fast cars"
   - ❌ "Money, power, respect / counting my checks"
3. **DIRECTIVA DE SUSTITUCIÓN (REALISMO DE CALLE):**
   - En lugar de frases abstractas como *"tengo mucho dinero"*, escribe el detalle exacto: *"tres mil pavos en la sudadera Rick Owens"*, *"el contador de billetes sonando en la mesa de cristal"*, *"patek con bisel helado"*.
   - En lugar de *"la calle es dura"*, narra la escena: *"patrullas dando vueltas a las cuatro en el portal"*, *"el Glock con el selector quemando el bolsillo"*, *"tres llamadas perdidas del abogado"*.

# 🎼 ESTRUCTURA DE LA CANCIÓN (SUNO NATIVE)
Sigue esta estructura sin omitir ni añadir secciones:
${structurePlan}

# 📋 FORMATO DE SALIDA ESTRICTO (SUNO AI NATIVE)
1. Encabezados de sección EXCLUSIVAMENTE entre corchetes estándar con guía vocal de timbre para Suno: [Intro: Artist - vocal descriptors], [Verse 1: Artist - vocal descriptors], [Chorus: Artist - vocal descriptors], [Pre-Chorus], [Post-Chorus], [Bridge], [Interlude], [Beat Drop], [Outro].
2. NUNCA uses encabezados markdown '###' ni escribas líneas separadas como '*Intérprete:*' porque Suno intentará cantarlas.
3. Ad-libs secundarios SIEMPRE entre paréntesis: (Yeah!), (Brrr!).
4. ⚡ REGLA ESTRICTA DE BARRAS / COMPASES: Una barra cantada equivale EXACTAMENTE a una línea de texto. Si la sección especifica 'N barras' (ej: 8 barras, 16 barras, 4 barras), DEBES generar EXACTAMENTE ese número de líneas cantadas para esa sección. No omitas compases ni agregues líneas de más.
5. ${params.regenerateSection ? `⚡ RESPUESTA EXCLUSIVA: Tu respuesta debe contener ÚNICAMENTE la sección [${params.regenerateSection.sectionName}] regenerada, sin ninguna otra parte de la canción.` : "Tu respuesta debe contener ÚNICAMENTE la letra de la canción. Sin introducciones, notas de producción ni texto extra fuera de los corchetes."}`;

  return prompt;
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
 * Limpiador quirúrgico de encabezados de sección para Suno AI v4.5.
 * Elimina cualquier instrucción ajena, conteo de barras residual o Markdown '###',
 * PRESERVANDO la guía vocal y el timbre asignado al artista dentro de los corchetes:
 * ej: [Verse 1: Duki - male vocal, deep raspy auto-tune, aggressive triplet flow].
 */
export function cleanSunoBracketHeaders(
  lyrics: string,
  options?: {
    artistId?: string;
    featureArtistId?: string;
    sectionVoices?: SectionVoiceAssignment[];
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

  return cleaned;
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
    ? `- **Temáticas Elegidas por el Usuario**: ${userTopicsList.join(", ")}
${namedEntities.length > 0 ? `- **Entidades Nombradas Disponibles (Preservación Inviolable)**: [${namedEntities.join(", ")}]. Están disponibles literalmente cuando la métrica o la escena lo requieran. Queda TERMINANTEMENTE PROHIBIDO censurarlas, cambiarlas por perífrasis genéricas, forzar su repetición en cada compás o convertirlas en eslóganes comerciales de folleto publicitario.` : ""}
${abstractThemes.length > 0 ? `- **Temas Abstractos (Preservación Semántica)**: [${abstractThemes.join(", ")}]. Se expresan a través de hechos, conductas y detalles físicos tangibles, NUNCA mediante sermones morales ni discursos de autoayuda.` : ""}`
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
- 🚫 PROHIBIDO usar asteriscos * o ** ni formato Markdown en los ad-libs. Usa ÚNICAMENTE paréntesis planos normales: (Yeah), (Facts), (Uh).

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
# 💎 ANCLAS COMPOSITIVAS NEUTRALES (TÉCNICA DE ESTUDIO):
${goldExamples.map(g => `- **${g.technique}** (${g.description}):\n  Barra 1: "${g.bars[0]}"\n  Barra 2: "${g.bars[1]}"`).join("\n")}

# 🏀 REGLAS DE ARQUITECTURA TOPLINE (MÚSICA REAL DE ESTUDIO):
1. **FRASEO MUSICAL Y BARRAS COMPLETAS:**
   - Escribe compases que fluyan con ritmo natural, swing y musicalidad real.
   - Queda TERMINANTEMENTE PROHIBIDO sonar a telegrama inconexo o lista de palabras sueltas. El estribillo debe tener melodía, sentido y pegada.
2. **VOCABULARIO ORGÁNICO & LIBRE (CERO ATREZZO ARTIFICIAL):**
   - Desarrolla el gancho basándote en las temáticas elegidas por el usuario y el escenario físico seleccionado.
   - El vocabulario es 100% libre. Queda TERMINANTEMENTE PROHIBIDO forzar marcas o atrezzo artificial no pedido por el usuario.
   - Higiene de Metadatos: Queda PROHIBIDO citar literalmente términos técnicos o nombres de sellos de la bio del artista (ej: 'Quality Control', 'rey del tresillo') a menos que el usuario los haya pedido expresamente.
3. **AD-LIBS LIMPIOS Y UNIVERSALES:**
   - Cada compás debe tener fuerza propia dentro del groove.
   - En el Estribillo/Chorus mantén los ad-libs universales y comedidos en contratiempo: (Yeah), (Facts), (Uh), (Hold up), (Never), (No cap).
   - Máximo 1-2 compases seguidos con ad-lib para que la melodía central y el bajo 808 respiren con fuerza.
   - Queda PROHIBIDO incluir traducciones literales entre idiomas entre paréntesis o saturar con muletillas repetitivas.
4. **FLOW CARACTERÍSTICO DEL ARTISTA (SIN NAME-DROPPING NI BIOGRAFÍA PERSONAL):**
   - El rapeo y la melodía del gancho DEBEN capturar de forma inconfundible el flow, la métrica, la cadencia y el bolsillo rítmico de ${hookArtist?.name ?? "el artista"} (${hookFlowProfile?.cadence?.toUpperCase() ?? "STACCATO"}) para que al interpretarse en Suno suene con su pegada y estilo característicos.
   - 🚫 REGLA DE ORO DE PRIVACIDAD & HIGIENE: Queda TERMINANTEMENTE PROHIBIDO mencionar el nombre del artista ("soy ${hookArtist?.name ?? "X"}", "aquí ${hookArtist?.name ?? "X"}") ni de otros artistas reales en la letra cantada o ad-libs. Tampoco calques anécdotas autobiográficas íntimas, familiares fallecidos ni nombres de bandas callejeras reales de su infancia. El parecido debe ser 100% por el FLOW, la MÉTRICA y la ACTITUD MUSICAL.
5. **RIMA AUDIBLE REAL & NATURALIDAD DE ESTUDIO (CERO ENCASILLAMIENTO):**
   - Esquema de Rima Obligatorio: El estribillo DEBE rimar según el esquema asignado ${hookRhymeScheme?.label ?? "AABB"} (${hookRhymeScheme?.description ?? ""}). Queda prohibida la prosa suelta sin rima.
   - Fonética de Rima de Estudio: Utiliza rimas consonantes naturales o rimas asonantes multi-silábicas (slant rhymes / vowel-matching como 'fuego/ceros' o 'pista/prisa'). Prohibidas consonancias forzadas e infantiles de guardería (*gelato/zapato*, *cuarto/parto*).
   - Naturalidad de Estudio: Quedan terminantemente prohibidas las frases ortopédicas o traducciones automáticas de máquina (ej: 'piso frío el suelo', 'cuarzo fino'). Escribe con fluidez y sintaxis natural.
   - Show, Don't Preach: Queda PROHIBIDO usar eslóganes morales abstractos trillados de autoayuda (ej: "la lealtad no se vende", "lealtad hasta la tumba", "el dinero no compra la felicidad"). El estribillo debe construirse sobre imágenes sensoriales vivas, actitud cruda o una tensión física real.

${flowSkeletonSummary ? `\n# 📐 GUÍA DE RITMO Y CADENCIA GLOBAL (BEAT-FIRST):\n${flowSkeletonSummary}\n` : ""}
# 📋 FORMATO DE SALIDA ESTRICTO:
Devuelve EXCLUSIVAMENTE UN ÚNICO bloque [Chorus: ${hookVoice}] de exactamente ${targetBars} compases limpios (SOLO el nombre de la sección y del artista, SIN notas de estilo ni acústica dentro del corchete).
Está TERMINANTEMENTE PROHIBIDO incluir introducciones, conclusiones, explicaciones de cambios o frases como "Letra ajustada:", "Se ha resuelto el problema" o "He modificado...". Comienza directamente en el corchete:
[Chorus: ${hookVoice}]
Línea 1 (Ad-lib)
Línea 2 (Ad-lib)
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
      return `[${s.name}: ${guide.fullHeaderTag}] — 4 compases (Modo Hype Man: 🚫 PROHIBIDO ESCRIBIR VERSOS NARRATIVOS O LÍNEAS CANTADAS. Debe ser EXCLUSIVAMENTE 3 a 5 ad-libs y grunts entre paréntesis: ej: (Yeah... turn me up), (Hold up...), rematando con ([Beat Drop]))`;
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
    ? `- Temáticas Elegidas por el Usuario: ${userTopicsList.join(", ")}
${namedEntities.length > 0 ? `- **Entidades Nombradas Disponibles (Preservación Inviolable)**: [${namedEntities.join(", ")}]. Están disponibles literalmente cuando la métrica o la escena lo requieran. Queda TERMINANTEMENTE PROHIBIDO censurarlas, cambiarlas por perífrasis genéricas, forzar su repetición en cada compás o convertirlas en eslóganes comerciales de folleto publicitario.` : ""}
${abstractThemes.length > 0 ? `- **Temas Abstractos (Preservación Semántica)**: [${abstractThemes.join(", ")}]. Se expresan a través de hechos, conductas y detalles físicos tangibles, NUNCA mediante discursos morales ni sermones de autoayuda.` : ""}`
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
1. **Fidelidad al Mundo Configurado & No-Reciclaje del Gancho:** Desarrolla la narrativa, imaginería y metáforas ancladas en las temáticas elegidas por el usuario y los elementos físicos de la situación escénica configurada en la pantalla. Los Versos deben avanzar la historia aportando NUEVOS objetos y situaciones. Queda TERMINANTEMENTE PROHIBIDO reciclar o copiar en los versos los mismos objetos físicos que ya aparecen en el Estribillo (si el estribillo ya fijó teléfonos, jarabe o luces, los versos deben explorar otros elementos: la maleta, el motor, la lluvia, el asfalto, las llaves, la celda, el fardo o la desconfianza).
2. **Entidades Explícitas del Usuario (Preservación Inviolable):** Las temáticas pedidas por el usuario (${userTopicsList.length > 0 ? userTopicsList.join(", ") : "temas seleccionados"}) son elecciones deliberadas e inviolables. Queda TERMINANTEMENTE PROHIBIDO censurarlas, cambiarlas por perífrasis genéricas o considerarlas como 'contaminación corporativa'.
3. **Memoria Negativa Radical & Cero Checklisting Inter-Estrofas:**
   - Prohibido rotar mecánicamente los mismos dominios metafóricos: si en el Verso 1 usas una analogía deportiva / de baloncesto (ej: Shaq), en el Verso 2 queda TERMINANTEMENTE PROHIBIDO volver a usar otra analogía de baloncesto (cero Kobe, cero NBA). Si en el Verso 1 hablas de coches, en el Verso 2 explora la mesa, el dinero en mano, la patrulla o la tensión entre socios.
   - Prohibido el checklisting en bucle: NUNCA repitas la misma lista de ingredientes en cada estrofa como si fuera una plantilla. Cada verso debe traer objetos, ángulos y consecuencias completamente diferentes.
4. **Rima Audible Real & Slant Rhymes Multi-silábicas (Cero Prosa Suelta):**
   - Cada compás DEBE rimar según el esquema asignado a su artista o sección (AABB, ABAB, Triplets o Monorrima).
   - Queda TERMINANTEMENTE PROHIBIDO escribir prosa partida en líneas sin rima sonora audible.
   - Utiliza rimas consonantes naturales o rimas asonantes multi-silábicas (slant rhymes / vowel-matching: *fuego/ceros*, *pista/prisa*, *candado/disparo*).
   - Quedan prohibidas las consonancias escolares forzadas de relleno o rimas infantiles.
   - Evita clichés trillados de IA: "suerte / muerte", "pena / vena", "el asfalto no perdona", "haciendo money sin parar".
5. **Show, Don't Preach (Cero Sermón Moral de 'Lealtad'):**
   - Queda PROHIBIDO repetir palabras abstractas morales ("lealtad", "respeto", "traición") como eslóganes en cada sección ("la lealtad no se vende", "lealtad hasta la tumba").
   - Muestra las vivencias a través de HECHOS Y CONDUCTAS físicas concretas, NUNCA predicándolas como sermones de autoayuda.
6. **Libertad de Vocabulario, Tono Regional y Naturalidad de Estudio (Cero Encasillamiento):**
   - Queda totalmente prohibido encasillar a la IA con listas obligatorias de palabras o vetos artificiales. El vocabulario es 100% libre y guiado orgánicamente por la temática del usuario.
   - Adopta el tono y cadencia regional nativa del artista (${artist?.origin ?? "calle"}) con fluidez callejera humana creíble (ej: modismos orgánicos de PR, Argentina, España, Atlanta/Spanglish según corresponda).
   - Cero construcciones ortopédicas o calcos de Google Translate: Prohibido redactar frases invertidas antinaturales (*'piso frío el suelo'*, *'cuarzo fino'*, *'corriendo en la cama'*). Las barras deben sonar a como habla y rapea un artista real en una cabina de grabación profesional.
7. **Dinámica Lírica según el Mood (${currentMood.label.toUpperCase()}):**
${currentMood.id === "agresivo" || currentMood.id === "oscuro" || currentMood.id === "menacing"
  ? "   - Actitud Staccato Amenazante & Punchlines Cortantes: Compases secos de alta tensión, ataques rápidos con silencios cortados, ad-libs agresivos en contratiempo y barras de confrontación directa."
  : currentMood.id === "flex" || currentMood.id === "fiesta" || currentMood.id === "confident"
  ? "   - Bounce Elástico & Swagger Arrogante: Ritmo saltarín y bailable, barras de lujo y victoria con cadencia relajada pero dominante, rimas pegadizas de club y ad-libs de celebración tipo (Yeah), (Facts)."
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
Si la [Intro] está en modo Hype Man o tiene asignado 'Hype', queda TERMINANTEMENTE PROHIBIDO escribir oraciones completas o versos narrativos cantados. La intro debe consistir EXCLUSIVAMENTE en 3 a 5 grunts, shouts y ad-libs de calentamiento entre paréntesis: (Yeah... turn me up), (Hold up...), rematando con ([Beat Drop]).

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

# 💎 ANCLAS COMPOSITIVAS NEUTRALES (TÉCNICA DE ESTUDIO):
${goldExamples.map(g => `- **${g.technique}** (${g.description}):\n  Barra 1: "${g.bars[0]}"\n  Barra 2: "${g.bars[1]}"`).join("\n")}

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
1. **Ad-libs Limpios y Universales & Regla 2x2 de Respiración:**
   - Ad-libs de Actitud Universales: Utiliza ad-libs limpios y efectivos en contratiempo: (Yeah), (Facts), (Uh), (Hold up), (Never), (No cap), o ecos de la última palabra.
   - Regla 2x2 de Respiración: En versos de 8 a 16 barras, alterna compases limpios (2 compases seguidos donde la voz principal y el bajo 808 mandan sin ad-libs de distracción) con compases que llevan ad-libs puntuales en los huecos o contratiempos.
   - LÍMITE DE CONSECUTIVIDAD: Máximo 2 compases seguidos con ad-lib (maxConsecutiveAdlibBars = 2).
   - Deja compases limpios para que la voz principal y el beat respiren con fuerza.
   - Presupuesto por sección: En Versos: moderado (~40-50% de las barras con ad-lib); en Coros: bajo/moderado; en Outro: sutil/sparse.
   - PROHIBIDO muletillas infantiles o sonidos caricaturescos repetidos en bucle.
2. **Call & Response Dialéctico:**
   ${callResponseSections.length > 0 ? `- En las secciones ${callResponseSections.join(", ")}, las líneas líderes deben recibir réplicas dialécticas directas en contratiempo: Voz: "Hablan de lealtad pero no los vi..." ➔ Ad-lib: *(nunca)*.` : "- Si hay diálogos o respuestas, hazlos dialécticos con personalidad."}
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
   - En las secciones marcadas como Call & Response (${callResponseSections.join(", ") || "las indicadas"}), CADA compás líder DEBE recibir una respuesta o réplica dialéctica entre paréntesis en contratiempo:
     *Réplicas cínicas:* Voz: "Dicen que me van a frenar..." ➔ Ad-lib: *(¿cuándo?)*
     *Contraataques de calle:* Voz: "Hablan de lealtad pero no los vi..." ➔ Ad-lib: *(nunca)*
     *Echo Punchlines:* Voz: "Treinta mil en la sudadera Rick..." ➔ Ad-lib: *(Rick Owens)*
     *Descartes:* Voz: "Piden favores como si fuera su hermano..." ➔ Ad-lib: *(olvídalo)*
   - PROHIBIDO rellenar el Call & Response con muletillas repetitivas como (Yeah!) en cada compás. Debe ser un diálogo con personalidad.

2. **PULIDO DE AD-LIBS TRIDIMENSIONALES (ANTI-MULETILLAS):**
   - Reemplaza los ad-libs genéricos muertos por 3 funciones acústicas:
     a) Colas melódicas en eco: *(no me busques...)*, *(uh-uh)*, *(sola)*.
     b) Comentarios cínicos entre dientes: *(¿quién si no?)*, *(facts)*, *(dime)*.
     c) Silencios rítmicos: Inserta '[Pause]' antes de caídas de beat o de barras de impacto pesado.

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

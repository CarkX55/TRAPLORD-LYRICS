import { getArtistById, getProducerById, getRhymeSchemeById, getBeatTypeById, getFeatureSimById, getDirtyLevel, getRepetitionPatternById, type SongStructure, type BpmVibe, type BeatType } from "./trap-data";
import { getFlowProfile, getBreathInstruction, getCadenceLabel, type FlowProfile } from "./artist-flow-profiles";
import { getArtistReference, type ArtistReference } from "./artist-references";
import type { TrackAnalysis } from "./track-analyzer";

/**
 * Derives the rhyme tier from the artist's defaultRhymeScheme.
 * TIER 1 = technical multi-syllabic required (Eminem, Kendrick, J. Cole, Takeoff, Recycled J — rs_internal).
 * TIER 2 = balanced: mix multi + single (Drake, Migos, Gunna, Travis — rs_abab, rs_triplets).
 * TIER 3 = street/direct: 1-syllable OK if it hits (Yung Beef, 21 Savage, Carti, Chief Keef, Future, Pop Smoke, Gucci — rs_aabb, rs_monorhyme, rs_free).
 */
export function getRhymeTier(artistId: string): 1 | 2 | 3 {
  const profile = getFlowProfile(artistId);
  if (!profile) return 2;
  const scheme = profile.defaultRhymeScheme;
  if (scheme === "rs_internal") return 1;
  if (scheme === "rs_abab" || scheme === "rs_triplets") return 2;
  return 3;
}

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
  if (lowerType.includes("chorus") || lowerType.includes("hook") || lowerType.includes("estribillo")) {
    if (hookStyle === "repetitive") return "Hypnotic repetitive mantra, layered harmonies";
    if (hookStyle === "simple_punchy") return "Hard-hitting punchline hook, anthemic energy";
    return "Layered melodic harmonies, wide anthemic auto-tune";
  }
  if (lowerType.includes("bridge") || lowerType.includes("puente")) {
    return "Half-time beat switch, stripped vocal texture";
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
    organicRule = `CODE-SWITCHING ORGÁNICO: Español dominante. Escribe las estrofas y narrativa en español, pero integra anglicismos callejeros y loanwords auténticos de la cultura urbana (drip, opps, motion, racks, plug, flex) en puntos rítmicos naturales. Los estribillos en español.`;
  } else if (englishPct <= 45) {
    vibeLabel = `🔌 Español con Rhyme Anchors en inglés (${spanishPct}% ES / ${englishPct}% EN)`;
    organicRule = `CODE-SWITCHING ORGÁNICO: Base en español con remates y anclas de rima en inglés. Desarrolla la frase en español y cierra el compás con punchlines o terminaciones en inglés. Mezcla fluida y musical como Eladio Carrión o Myke Towers.`;
  } else if (englishPct <= 65) {
    vibeLabel = `⚖️ Spanglish balanceado 50/50 (${spanishPct}% ES / ${englishPct}% EN)`;
    organicRule = `CODE-SWITCHING ORGÁNICO (50/50): Alternancia constante y fluida. Alterna barras completas en inglés y español o realiza cambios de código a mitad de compás. Las rimas deben cruzar ambos idiomas con total naturalidad estilo Kidd Keo / Eladio.`;
  } else if (englishPct <= 85) {
    vibeLabel = `🇺🇸 Inglés dominante con barras en español (${englishPct}% EN / ${spanishPct}% ES)`;
    organicRule = `CODE-SWITCHING ORGÁNICO: Inglés americano dominante (75-80%). Estructura principal en inglés con puentes, remates o frases callejeras directas en español.`;
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
  const structurePlan = params.structure.sections
    .flatMap((s, i) => {
      const isVerse = s.type === "verse";
      const isChorus = s.type === "chorus";
      const isIntro = s.type === "intro";
      if (isChorus) chorusIdx++;
      if (isVerse) verseIdx++;

      const lines: string[] = [];

      // Pre-Chorus build
      if (useDynamicForm && (songFormStyle === "pre_chorus_build" || songFormStyle === "hybrid") && isChorus) {
        const preHint = getSunoSectionHint("pre-chorus", params.artistId, params.moodId, params.bpmVibe, isDetailedSuno);
        const preTag = preHint ? `, ${preHint}` : "";
        lines.push(`[Pre-Chorus: ${artist?.name ?? "Lead"}${preTag}] — 2-4 barras (Rampa melódica que sube la energía hacia el chorus)`);
      }

      if (s.type === "instrumental") {
        lines.push(`[${s.name}] — 🚫 NO LYRICS (Solo de producción instrumental para Suno AI)`);
        return lines;
      }

      let voice = artist?.name ?? "Lead";
      let sectionArtistId = params.artistId;
      let isTrading2x2 = false;
      const voiceAssign = params.sectionVoices?.find(v => v.sectionName === s.name);
      if (voiceAssign) {
        const v = voiceAssign.voice;
        if (v === "main") { voice = artist?.name ?? "Lead"; sectionArtistId = params.artistId; }
        else if (v === "feature" && featureArtist) { voice = featureArtist.name; sectionArtistId = featureArtist.id; }
        else if (v === "both") voice = `${artist?.name ?? "Lead"} & ${featureArtist?.name ?? "Feature"}`;
        else if (v === "trading_2x2") {
          voice = `${artist?.name ?? "Lead"} & ${featureArtist?.name ?? "Feature"} (Trading Bars 2x2)`;
          isTrading2x2 = true;
        }
        else if (v === "hype") voice = `${artist?.name ?? "Lead"} (Ad-libs only)`;
        else if (v.startsWith("instrumental:")) {
          lines.push(`[${v.replace("instrumental:", "")}] — 🚫 NO LYRICS (Solo de producción instrumental para Suno AI)`);
          return lines;
        }
        else {
          const assignedArtist = getArtistById(v);
          if (assignedArtist) { voice = assignedArtist.name; sectionArtistId = assignedArtist.id; }
        }
      } else if (s.name.toLowerCase().includes("trading") && featureArtist) {
        voice = `${artist?.name ?? "Lead"} & ${featureArtist.name} (Trading Bars 2x2)`;
        isTrading2x2 = true;
      } else if (s.name.toLowerCase().includes("feature") && featureArtist) {
        voice = featureArtist.name;
        sectionArtistId = featureArtist.id;
      }

      let bars: string;
      if (voiceAssign?.bars && voiceAssign.bars > 0) {
        bars = `${voiceAssign.bars} barras`;
      } else if (params.barCountOverride && isVerse) {
        bars = `${params.barCountOverride} barras`;
      } else if (params.smartBarsMode) {
        const bpmNum = parseInt(params.bpmVibe.range.split("-")[1] ?? "130");
        if (isVerse) bars = bpmNum > 150 ? "8 barras" : bpmNum > 120 ? "12 barras" : "16 barras";
        else if (isChorus) bars = "8 barras";
        else bars = "4 barras";
      } else {
        bars = isVerse ? "8-12 barras" : isChorus ? "4-8 barras" : "2-4 barras";
      }

      let dynamicNote = "";
      if (useDynamicForm) {
        if ((songFormStyle === "expanding_chorus" || songFormStyle === "hybrid") && isChorus && chorusIdx > 1) {
          dynamicNote = ` (Chorus expansivo: añade variaciones nuevas y ad-libs)`;
        }
        if (songFormStyle === "variable_verse" && isVerse) {
          if (verseIdx === 1) dynamicNote = " (Verso 1 narrativo y descriptivo)";
          else if (verseIdx === 2) dynamicNote = " (Verso 2 rápido y agresivo)";
        }
      }

      // Repetition Pattern Rule per section
      let repTag = "";
      let repInstruction = "";
      if (isTrading2x2) {
        repInstruction = ` → [REGLA TRADING BARS 2x2: Alterna exactamente 2 barras de ${artist?.name ?? "Lead"} y 2 barras de ${featureArtist?.name ?? "Feature"} consecutivamente. Cada artista responde y se pica con el anterior, creando química y tensión colaborativa estilo Drip Harder / Rich Flex]`;
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

      // Performance hint inside bracket for Suno AI
      const perfHint = getSunoSectionHint(s.type, sectionArtistId, params.moodId, params.bpmVibe, isDetailedSuno);
      const perfTag = perfHint ? `, ${perfHint}` : "";

      lines.push(`[${s.name}: ${voice}${perfTag}${repTag}] — ${bars}${dynamicNote}${repInstruction}`);

      if (useDynamicForm && songFormStyle === "beat_drop") {
        if (isIntro) {
          lines.push(`[Beat Drop: Heavy 808 drop, distorted bassline] — 🚫 NO LYRICS (Drop del beat con 808 pesado)`);
        }
        if (isChorus && i === totalSections - 2) {
          lines.push(`[Beat Drop: Heavy 808 drop, tension release] — 🚫 NO LYRICS (Tensión antes del chorus final)`);
        }
      }

      return lines;
    })
    .join("\n");

  // Rhyme tier instruction
  const rhymeTier = getRhymeTier(params.artistId);
  let rhymeLevelInstruction = "";
  if (rhymeTier === 1) {
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

  // Dictionary
  let dictionaryBlock = "";
  if (params.customDictionary.trim()) {
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

  // Reference bars (Few-Shot Peak Era)
  const artistRef = params.mainArtistReference ?? getArtistReference(params.artistId);
  let referenceBlock = "";
  if (artistRef) {
    const allBars = [
      ...artistRef.verseBars.map(b => `Verso: "${b}"`),
      ...artistRef.hookBars.map(b => `Hook: "${b}"`),
      ...(artistRef.signatureBar ? [`Firma: "${artistRef.signatureBar}"`] : []),
    ];
    referenceBlock = `\n# 🎯 REFERENCIA ESTILÍSTICA PEAK ERA (IMITA LA CADENCIA Y ACTITUD, NO COPIES LETRA LITERAL)\nArtista: ${artist?.name ?? "Artista"} (${artistRef.peakEra})\n${allBars.join("\n")}\nAnaliza cómo caen las sílabas en el compás y los ad-libs, e improvisa tus propias barras originales con este mismo peso.`;
  }

  const featRef = params.featureArtistReference ?? (featureArtist ? getArtistReference(featureArtist.id) : null);
  let featureReferenceBlock = "";
  if (featRef && featureArtist) {
    const featBars = [
      ...featRef.verseBars.map(b => `Verso: "${b}"`),
      ...featRef.hookBars.map(b => `Hook: "${b}"`),
      ...(featRef.signatureBar ? [`Firma: "${featRef.signatureBar}"`] : []),
    ];
    featureReferenceBlock = `\n# 🤝 REFERENCIA FEATURE PEAK ERA\nFeature: ${featureArtist.name} (${featRef.peakEra})\n${featBars.join("\n")}\nCuando cante el Feature, cambia inmediatamente la cadencia, jerga y entrega para reflejar este estilo.`;
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
  } else if (params.producerTag.trim()) {
    producerBlock = `\n# 🎛️ PRODUCER TAG\nInserta este producer tag al inicio del [Intro]: "${params.producerTag.trim()}"`;
  }

  // Ad-libs rules
  let adlibsBlock = "";
  const adlibsStyle: string[] = [];
  if (artist?.adlibs && artist.adlibs.length > 0) {
    adlibsStyle.push(`${artist.name}: ${artist.adlibs.map(a => `(${a})`).join(" ")}`);
  }
  if (featureArtist?.adlibs && featureArtist.adlibs.length > 0) {
    adlibsStyle.push(`${featureArtist.name}: ${featureArtist.adlibs.map(a => `(${a})`).join(" ")}`);
  }
  if (adlibsStyle.length > 0) {
    adlibsBlock = `\n# 🗣️ AD-LIBS NATIVOS PARA SUNO\nEjemplos icónicos:\n${adlibsStyle.join("\n")}\nREGLAS DE AD-LIBS:\n1. Ad-libs SIEMPRE entre paréntesis: (Yeah!), (Brrr!), (Let's go!). Suno los ubicará automáticamente como pistas de fondo en estéreo.\n2. ESPACIO Y AIRE: Máximo 1 ad-lib cada 2 o 3 barras. Deja que la voz principal respire, no satures cada línea.\n3. CONTEXTO: El ad-lib debe responder al remate de la barra previa.`;
  }

  const dirty = getDirtyLevel(params.dirtyLevel ?? 2);
  const dirtyBlock = `\n# 🔞 NIVEL DE ACTITUD / DIRTY LEVEL: ${dirty.label.toUpperCase()} (${dirty.badge})\n${dirty.instruction}`;

  const prompt = `Eres un Ghostwriter de élite del Trap y Rap contemporáneo. Escribes letras auténticas, con groove callejero y perfectamente estructuradas para ser producidas y cantadas en SUNO AI.

# 🧠 PROTOCOLO DE RAZONAMIENTO INTERNO (THINKING PROTOCOL)
Antes de redactar la letra definitiva, utiliza tus tokens de razonamiento interno para completar estas 4 fases:
1. **Fase 1 (Concepto & Punchlines):** Define el concepto central, el hook melódico y el remate (punchline/payoff) de cada estrofa primero.
2. **Fase 2 (Backtracking & Arquitectura de Rimas):** Establece los fonemas de rima objetivo (asonante/consonante) y construye las barras 1, 2 y 3 hacia el remate, asegurando que cada compás tenga entre 8 y 11 sílabas naturales.
3. **Fase 3 (Filtro Antiparodia & Anti-Clichés Blacklist):** Evalúa críticamente cada barra contra la **Lista Negra de Clichés**. ¿Suena a canción real de trap o parece una parodia/caricatura forzada? Si alguna frase suena a cliché genérico de IA (ej: "el asfalto no perdona", "fuego/juego", "stacking paper to the ceiling"), DESCÁRTALA y reescríbela con detalles visuales concretos, marcas, jerga contemporánea y peso de calle real.
4. **Fase 4 (Emisión Suno-Native):** Emite únicamente la letra estructurada con etiquetas entre corchetes [Section: Artist, Performance Hint], limpia y lista para Suno.

# 🎤 IDENTIDAD & ESTILO
${spanglish.prompt}
- **Artista Principal**: ${artist?.name ?? "Estilo Libre"} (${artist?.origin ?? "Trap"}) — ${artist?.style ?? "Flow crudo."}
${featureArtist ? `- **Feature**: ${featureArtist.name} (${featureArtist.origin}) — ${featureArtist.style}` : "- **Feature**: Ninguno."}
- **BPM & Vibra**: ${params.bpmVibe.range} BPM (${params.bpmVibe.label}).
- **Temática**: ${topicBlock}
${dirtyBlock}
${narrativeBlock}
${dictionaryBlock}
${producerBlock}
${cadenceBlock}
${referenceBlock}
${featureReferenceBlock}
${adlibsBlock}

# 📐 REGLAS MUSICALES & MÉTRICA SUNO
${rhymeLevelInstruction}
- **Pocket Silábico**: Entre 8 y 11 sílabas por compás (evita versos gigantescos que aceleren la voz en Suno).
- **Puntuación Rítmica**: Utiliza comas ',' y puntos suspensivos '...' para marcar los silencios y respiraciones del cantante.
- **Rimas Orgánicas**: Rimas AABB o ABAB fluidas.
- **Prohibido**: JAMÁS menciones el nombre real o apodo de ningún artista en la letra cantada a menos que sea un ad-lib propio.

# 🚫 LISTA NEGRA DE CLICHÉS & FRASES PROHIBIDAS (ANTI-TROPES FILTER)
Queda ESTRICTAMENTE PROHIBIDO usar las siguientes frases hechas, rimas baratas y fórmulas artificiales que delatan texto generado por IA. Sustitúyelas por imágenes callejeras concretas, marcas, acciones reales y jerga contemporánea:
1. **Rimas y Clichés Genéricos en Español PROHIBIDOS:**
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
1. Encabezados de sección EXCLUSIVAMENTE entre corchetes estándar: [Intro: Detail], [Verse 1: Artist, Hint], [Chorus: Artist, Hint], [Pre-Chorus], [Beat Drop], [Outro].
2. NUNCA uses encabezados markdown '###' ni escribas líneas separadas como '*Intérprete:*' porque Suno intentará cantarlas.
3. Ad-libs secundarios SIEMPRE entre paréntesis: (Yeah!), (Brrr!).
4. Una barra cantada por línea.
5. Tu respuesta debe contener ÚNICAMENTE la letra de la canción. Sin introducciones, notas de producción ni texto extra fuera de los corchetes.`;

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

  // Merge with beatType tags if present
  const moodKey = params.moodId.split(" ")[0].toLowerCase();
  const baseInstruments = moodInstrumentMap[moodKey] ?? moodInstrumentMap["calle"] ?? ["punchy 808 bass", "fast hi-hat rolls", "atmospheric synth"];
  const layer3Instruments = baseInstruments.join(", ");

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

// Prompt Builder with FIXED Spanglish Ratio Logic + Flow Profiles + Suno Optimizations

import { getArtistById, getProducerById, getRhymeSchemeById, getBeatTypeById, getFeatureSimById, type SongStructure, type BpmVibe, type BeatType } from "./trap-data";
import { getFlowProfile, getBreathInstruction, getCadenceLabel, type FlowProfile } from "./artist-flow-profiles";

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
}

export interface PromptParams {
  artistId: string;
  featureArtistId: string;
  moodId: string;
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
}

export function buildSpanglishInstruction(percent: number): {
  label: string;
  prompt: string;
} {
  const englishPct = percent;
  const spanishPct = 100 - percent;

  let vibeLabel: string;
  let strictRule: string;

  if (englishPct === 0) {
    vibeLabel = "100% Español puro";
    strictRule = "REGLA ABSOLUTA: 0% inglés. Ni una sola frase en inglés. Solo se permiten anglicismos si son nombres de marcas (Glock, Ferrari). Todo debe ser español.";
  } else if (englishPct <= 15) {
    vibeLabel = `🇪🇸 Español dominante (${spanishPct}% ES / ${englishPct}% EN)`;
    strictRule = `REGLA MATEMÁTICA: De cada 10 palabras de contenido, aproximadamente ${Math.round(spanishPct / 10)} deben ser en español y ${Math.round(englishPct / 10)} en inglés. Escribe el 85-90% en español, pero introduce slang inglés aislado (bands, drip, opp) como condimento. Los estribillos en español.`;
  } else if (englishPct <= 40) {
    vibeLabel = `🔌 Español con slang americano (${spanishPct}% ES / ${englishPct}% EN)`;
    strictRule = `REGLA MATEMÁTICA: Proporción objetivo ${spanishPct}% español / ${englishPct}% inglés. De cada 10 palabras, ~${Math.round(spanishPct / 10)} españolas y ~${Math.round(englishPct / 10)} inglesas. Escribe la mayoría en español pero termina estrofas con metralletas de slang inglés. Mezcla natural.`;
  } else if (englishPct <= 60) {
    vibeLabel = `⚖️ Spanglish balanceado 50/50 (${spanishPct}% ES / ${englishPct}% EN)`;
    strictRule = `REGLA MATEMÁTICA: Equilibrio ${spanishPct}/${englishPct}. De cada 10 palabras, ~${Math.round(spanishPct / 10)} en español y ~${Math.round(englishPct / 10)} en inglés. ALTERNA constantemente: una barra en español, la siguiente en inglés. O empieza la frase en español y termina la rima en inglés.`;
  } else if (englishPct <= 85) {
    vibeLabel = `🇺🇸 Inglés con frases en español (${englishPct}% EN / ${spanishPct}% ES)`;
    strictRule = `REGLA MATEMÁTICA: Proporción objetivo ${englishPct}% inglés / ${spanishPct}% español. De cada 10 palabras, ~${Math.round(englishPct / 10)} inglesas y ~${Math.round(spanishPct / 10)} españolas. El 70-80% en inglés americano. Usa español solo para insultos, frases callejeras cortas o puentes rítmicos.`;
  } else if (englishPct < 100) {
    vibeLabel = `🇺🇸 Inglés dominante (${englishPct}% EN / ${spanishPct}% ES)`;
    strictRule = `REGLA MATEMÁTICA: 85-90% en inglés americano. De cada 10 palabras, ~${Math.round(englishPct / 10)} en inglés y ~${Math.round(spanishPct / 10)} en español. Toda la estructura en inglés. Solo unas pocas palabras sueltas en español como adorno.`;
  } else {
    vibeLabel = "100% English puro";
    strictRule = "REGLA ABSOLUTA: 100% inglés americano. Prohibido usar español. Toda la letra, slang y métrica debe ser estrictamente en inglés (US Trap).";
  }

  return {
    label: vibeLabel,
    prompt: `**Idioma Base**: ${vibeLabel}. ${strictRule}`,
  };
}

export function buildSystemPrompt(params: PromptParams): string {
  const artist = getArtistById(params.artistId);
  const featureArtist = params.featureArtistId ? getArtistById(params.featureArtistId) : null;
  const spanglish = buildSpanglishInstruction(params.spanglishPercent);

  // Topic construction
  let topicBlock: string;
  if (params.customTopic.trim()) {
    topicBlock = `TEMA A LA CARTA: El usuario quiere EXACTAMENTE ESTO: "${params.customTopic.trim()}". Desarrolla esta idea al máximo, con detalles crudos, narración rica y una perspectiva única.`;
    if (params.topics.length > 0) {
      topicBlock += ` Etiquetas adicionales de vibra: [${params.topics.join(" + ")}]. Úsalas solo como color/atmósfera.`;
    }
  } else if (params.topics.length > 0) {
    topicBlock = `${params.topics.join(" + ")} (INSTRUCCIÓN CRÍTICA: NO escribas historias genéricas. Busca una perspectiva MUY ORIGINAL, un ángulo narrativo único o una anécdota específica que combine estos elementos de forma sorprendente, pero que SIEMPRE SUENE REAL dentro del estilo de vida del Rap/Trap.)`;
  } else {
    topicBlock = "TEMA LIBRE Y ALEATORIO (INSTRUCCIÓN CRÍTICA: Inventa un concepto, anécdota o historia COMPLETAMENTE NUEVA cada vez, dentro de la cultura del Rap/Trap. NO repitas clichés.)";
  }

  // Structure plan with per-section voice assignment (USA EL NOMBRE REAL DEL ARTISTA)
  const structurePlan = params.structure.sections
    .map((s, i) => {
      const isVerse = s.type === "verse";
      const isChorus = s.type === "chorus";

      let voice = artist?.name ?? "Main Artist";
      const voiceAssign = params.sectionVoices?.find(v => v.sectionName === s.name);
      if (voiceAssign) {
        const v = voiceAssign.voice;
        if (v === "main") voice = artist?.name ?? "Main Artist";
        else if (v === "feature" && featureArtist) voice = featureArtist.name;
        else if (v === "both") voice = `${artist?.name ?? "Main"} + ${featureArtist?.name ?? "Feature"} (Unísono)`;
        else if (v === "hype") voice = `${artist?.name ?? "Main"} (Hype Man - Solo Ad-libs)`;
        else if (v.startsWith("instrumental:")) voice = `🚫 NO LYRICS - [${v.replace("instrumental:", "")}]`;
        else {
          const assignedArtist = getArtistById(v);
          if (assignedArtist) {
            voice = assignedArtist.name;
            if (assignedArtist.id !== params.artistId) {
              voice += ` (ESTILO OBLIGATORIO: ${assignedArtist.style})`;
            }
          }
        }
      } else if (s.name.toLowerCase().includes("feature") && featureArtist) {
        voice = featureArtist.name;
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

      // Densidad por sección
      let densityInstruction = "";
      if (voiceAssign?.density) {
        const densityMap: Record<string, string> = {
          sparse: "DENSIDAD BAJA: 4-6 sílabas por barra. Frases cortas, mucho espacio entre líneas. Deja que el beat respire. Flow minimalista.",
          normal: "DENSIDAD NORMAL: 8-10 sílabas por barra. Flow estándar equilibrado.",
          dense: "DENSIDAD ALTA: 12-14 sílabas por barra. Frases largas, muchas rimas internas. Flow rápido y técnico.",
          extra_dense: "DENSIDAD EXTREMA: 14-18 sílabas por barra. Ametralladora de palabras, rimas internas múltiples, flow rapid fire.",
        };
        densityInstruction = densityMap[voiceAssign.density] ?? "";
      }

      return `[${s.name}]: ${voice} — EXACTAMENTE ${bars} (líneas cantadas)${densityInstruction ? `. ${densityInstruction}` : ""}`;
    })
    .join("\n");

  // Rhyme level instruction based on artist cadence
  const rhymeLevelProfile = getFlowProfile(params.artistId);
  const rhymeCadence = rhymeLevelProfile?.cadence ?? "free";
  let rhymeLevelInstruction = "";
  if (rhymeCadence === "rapid_fire" || rhymeCadence === "triplet") {
    rhymeLevelInstruction = artist?.name + " es TÉCNICO: exige MÁXIMA densidad de rimas. MÍNIMO 2 rimas internas por barra. Rimas multisilábicas de 3+ sílabas obligatorias. Ejemplo: 'cuento el DINERO como un VELERO navegando al INFIERNO' (dinero/velero/infierno = 3 rimas internas multisilábicas).";
  } else if (rhymeCadence === "staccato" || rhymeCadence === "syncopated") {
    rhymeLevelInstruction = artist?.name + " es AGRESIVO: rimas cortantes y directas. MÍNIMO 1 rima interna por barra. Rimas multisilábicas de 2+ sílabas. Ejemplo: 'big GLOCK on the BLOCK, no TICK tock on the CLOCK' (glock/block/clock = 3 rimas).";
  } else if (rhymeCadence === "melodic_flow" || rhymeCadence === "legato") {
    rhymeLevelInstruction = artist?.name + " es MELODICO: rimas que suenen bien al cantarse. MÍNIMO 1 rima interna por barra. Rimas de 2+ sílabas que fluyan melódicamente. Ejemplo: 'pouring the LEAN, living the DREAM, cash on the SCREEN' (lean/dream/screen = 3 rimas multisilábicas).";
  } else if (rhymeCadence === "chaotic") {
    rhymeLevelInstruction = artist?.name + " es CAÓTICO: rimas impredecibles, rompe el patrón. Rimas internas cuando suene natural (no forzado). Puede usar rimas asonantes (vocales) además de consonantes. Ejemplo: 'SLATT, jump in the TRAP, countin the RACKS, no CAP' (slatt/trap/racks/cap = rimas asonantes).";
  } else {
    rhymeLevelInstruction = artist?.name + " es NATURAL: rimas orgánicas sin forzar. MÍNIMO 1 rima interna por barra cuando sea natural. Rimas de 2+ sílabas preferidas. Ejemplo: 'walk in the ROOM, meetin my DOOM, sweepin the BROOM' (room/doom/broom = 3 rimas).";
  }

  // Narrative arc
  let narrativeBlock = "";
  if (params.narrativeArcId !== "none" && params.narrativeArcDesc) {
    narrativeBlock = `\n# 📖 ARCO NARRATIVO OBLIGATORIO\n${params.narrativeArcDesc}`;
  }

  // Dictionary
  let dictionaryBlock = "";
  if (params.customDictionary.trim()) {
    dictionaryBlock = `\n# 🌍 WORLD-BUILDING (DICCIONARIO ESTRICTO)\nEl usuario proporcionó nombres reales. DEBES tejer estos términos en la letra de forma natural:\n{ ${params.customDictionary.trim()} }\nÚsalos para nombrar la base, los enemigos o sus posesiones directamente.`;
  }

  // Dynamic markers
  let dynamicsBlock = "";
  if (params.dynamicMarkers) {
    dynamicsBlock = `\n# 🎙️ MARCADORES DINÁMICOS DE VOZ\nIncluye marcadores entre corchetes para indicar cambios de tono: [LONG PAUSE], [BEAT DROP], [WHISPERING], [AGGRESSIVELY INCREASING PITCH], [MELODIC CRYING VOICE], [SCREAMING].`;
  }

  // Beat type
  let beatTypeBlock = "";
  if (params.beatType) {
    beatTypeBlock = `\n# 🎵 BEAT TYPE / SUB-GENRE\nTipo de beat: ${params.beatType.label}. ${params.beatType.description}. Tags sónicos: ${params.beatType.sunoTags.join(", ")}. Adapta el flow a este sub-género específico.`;
  }

  // Feature sim
  let featureSimBlock = "";
  if (params.featureSimId && params.featureSimId !== "solo") {
    const sim = getFeatureSimById(params.featureSimId);
    if (sim) {
      featureSimBlock = `\n# 🤝 TIPO DE COLABORACIÓN\n${sim.description}. Adapta la dinámica entre artistas según este arquetipo.`;
    }
  }

  // Advanced toggles
  let collabBlock = "";
  if (params.collabInteraction) {
    collabBlock = `\n# 🎤 INTERACCIÓN ORGÁNICA DE COLABORACIÓN\nLos artistas DEBEN reconocerse mutuamente de forma natural. Usa frases como "Pass the mic", "Yo [Artist], take it away", reacciones espontáneas, y referencias cruzadas entre sus estilos.`;
  }

  let asterisksBlock = "";
  if (params.altVoiceAsterisks) {
    asterisksBlock = `\n# ✨ ASTERISCOS DE VOZ ALTERNATIVA (HACK SUNO)\nEnvuelve SOLO palabras clave individuales o frases cortas (2-3 palabras) entre asteriscos: *palabra*. Esto fuerza a Suno a usar un tono de voz alternativo. NO abuses — máximo 1-2 por barra.`;
  }

  let syllableSyncBlock = "";
  if (params.syllableSync) {
    syllableSyncBlock = `\n# 📐 STRICT POCKET / SINCRONIZACIÓN SILÁBICA\nModo matemático: cuenta las sílabas con precisión. Cada barra debe tener el MISMO número de sílabas (±1). Sigue un esquema rígido AABB o ABAB con conteo silábico simétrico.`;
  }

  let phoneticBlock = "";
  if (params.phoneticAdlibs) {
    phoneticBlock = `\n# 🔤 AD-LIBS FONÉTICOS\nEscribe los ad-libs de forma fonética extendida para mejor pronunciación en Suno: "Skirrrrt" en vez de "Skrrt", "Brrrrrt" en vez de "Brrr", "Yeaaaaah" en vez de "Yeah".`;
  }

  let customIntroBlock = "";
  if (params.customIntro?.trim()) {
    customIntroBlock = `\n# 🎬 INTRO/SKIT PERSONALIZADO\nEl usuario quiere EXACTAMENTE este intro o skit: "${params.customIntro.trim()}". Úsalo como inspiración literal o adáptalo al estilo del artista en la sección Intro.`;
  }

  // === FLOW PROFILE: cadence + breath + speed (optimizado para Suno) ===
  const flowProfile = getFlowProfile(params.artistId);
  const featureFlowProfile = featureArtist ? getFlowProfile(featureArtist.id) : null;

  let cadenceBlock = "";
  if (flowProfile) {
    cadenceBlock = `\n# 🎵 CADENCIA RÍTMICA OBLIGATORIA (para Suno)\n**Cadencia**: ${getCadenceLabel(flowProfile.cadence)}\n${flowProfile.cadenceInstruction}\n**Velocidad ideal**: ${flowProfile.syllablesPerBar} sílabas por barra (${flowProfile.speedLabel}).\n**Prosodia**: ${flowProfile.accentPattern}`;
    if (featureFlowProfile) {
      cadenceBlock += `\n\n**Cadencia del Feature (${featureArtist!.name})**: ${getCadenceLabel(featureFlowProfile.cadence)}\n${featureFlowProfile.cadenceInstruction}`;
    }
  }

  let breathBlock = "";
  if (flowProfile) {
    breathBlock = `\n# 🫁 PATRÓN DE RESPIRACIÓN (para Suno)\n${getBreathInstruction(flowProfile)}\nLos marcadores ${flowProfile.breathStyle} hacen que Suno genere pausas vocales realistas. Ponlos en puntos naturales de respiración entre frases largas.`;
  }

  // Producer tag (personalizado con el nombre del usuario)
  let producerBlock = "";
  const producer = params.producerId ? getProducerById(params.producerId) : null;
  if (producer && producer.id !== "none") {
    let personalizedTag = producer.tag;
    if (params.producerName?.trim()) {
      personalizedTag = producer.tag
        .replace(new RegExp(producer.name, "gi"), params.producerName.trim())
        .replace(/\{NAME\}/gi, params.producerName.trim());
    }
    producerBlock = `\n# 🎛️ PRODUCER TAG & SONIC PROFILE\nProductor: ${params.producerName?.trim() || producer.name} (estilo de ${producer.name}). Estilo de beat: ${producer.style}.\nIncluye el producer tag icónico al inicio del Intro: "${personalizedTag}". Adapta el flow al estilo del beat.`;
  } else if (params.producerTag.trim()) {
    producerBlock = `\n# 🎛️ PRODUCER TAG\nIncluye el producer tag icónico para "${params.producerName?.trim() || params.producerTag.trim()}" al inicio del Intro: "${params.producerTag.trim()}".`;
  } else if (params.producerName?.trim()) {
    producerBlock = `\n# 🎛️ PRODUCER TAG\nEl productor se llama "${params.producerName.trim()}". Crea un producer tag corto y pegadizo con su nombre al inicio del Intro (ej: "${params.producerName.trim()} on the beat").`;
  }

  // Per-section language override
  let sectionLangBlock = "";
  const chorusOverride = params.chorusLanguageOverride && params.chorusLanguageOverride !== "auto";
  const versesOverride = params.versesLanguageOverride && params.versesLanguageOverride !== "auto";
  if (chorusOverride || versesOverride) {
    const parts: string[] = [];
    if (chorusOverride) {
      const lang = params.chorusLanguageOverride === "en" ? "inglés americano" : "español";
      parts.push(`Los CHORUS/ESTRIBILLOS deben ser 100% en ${lang}.`);
    }
    if (versesOverride) {
      const lang = params.versesLanguageOverride === "en" ? "inglés americano" : "español";
      parts.push(`Los VERSES deben ser 100% en ${lang}.`);
    }
    sectionLangBlock = `\n# 🎯 OVERRIDE DE IDIOMA POR SECCIÓN\n${parts.join(" ")} Esto tiene PRIORIDAD sobre el ratio general.`;
  }

  // Artist ad-libs (estilo descriptivo, NO lista cerrada)
  let adlibsBlock = "";
  const adlibsStyle: string[] = [];
  if (artist?.adlibs && artist.adlibs.length > 0) {
    adlibsStyle.push(`${artist.name} tiende a usar ad-libs del estilo: ${artist.adlibs.map(a => `"${a}"`).join(", ")} — pero DEBE improvisar los suyos propios según el contexto de cada barra`);
  }
  if (featureArtist?.adlibs && featureArtist.adlibs.length > 0) {
    adlibsStyle.push(`${featureArtist.name} tiende a usar: ${featureArtist.adlibs.map(a => `"${a}"`).join(", ")} — igualmente, que improvise`);
  }
  if (adlibsStyle.length > 0) {
    adlibsBlock = `\n# 🗣️ AD-LIBS (CRÍTICO PARA SUNO)\nReferencia de estilo (NO los copies literalmente, IMPROVISA los tuyos):\n${adlibsStyle.join("\n")}\n\nREGLAS DE AD-LIBS REALES:\n1. IMPROVISA ad-libs NUEVOS en cada barra según lo que diga la letra. NO repitas los de la lista. Si la barra habla de disparos → inventa "(Bow!)" o "(Pew!)", si de dinero → "(Racks!)" o "(Cash!)", si de coches → "(Skrrt!)" o "(Vroom!)", si de lean → "(Mud!)" o "(Sip!)". Los ad-libs deben RESPONDER al contenido, no ser decoración.\n2. Varía 7-10 ad-libs DIFERENTES por sección. Nunca repitas el mismo más de 2 veces por verso.\n3. POSICIÓN (CRÍTICO):\n   - 40% al FINAL: "...counting the cash (Skrrt!)"\n   - 25% en el MEDIO: "...money (yeah!) talk y el bloque responde"\n   - 15% al PRINCIPIO: "(Mama!) stepped in the room..."\n   - 10% ENTRE barras: "(Bow! Bow!)" en línea propia\n   - 10% SOLOS en silencios: "(...Brrr...)"\n   SI TODOS están al final, suena FAKE. Ejemplo real: "(Yeah!) drop the top on the whip (skrrt!) countin' the (cash!) bands".\n4. COMBINA a veces: "(Yeah! Skrrt!)" o "(Mama! Bow! Cash!)"\n5. DENSIDAD: 1-2 por barra. Deja 2-3 barras SIN ad-lib para que respire.\n6. Chorus = MÁS ad-libs. Verse = MENOS (más denso).\n7. CHORUS NO REPETIDO: cada repetición del chorus debe tener VARIACIONES en ad-libs. NUNCA pegues el mismo chorus 3 veces.\n8. [BREATH]: 1 cada 8-10 barras. Va después de barras largas.\n9. Cuando cante el Feature, que improvise ad-libs de SU estilo.`;
  }

  // Regenerate single section mode
  let regenerateSectionBlock = "";
  if (params.regenerateSection) {
    const { sectionName, keepContext } = params.regenerateSection;
    regenerateSectionBlock = `\n# 🔄 RE-GENERACIÓN DE SECCIÓN ÚNICA\nEl usuario quiere RE-GENERAR SOLO la sección "${sectionName}". Mantén el contexto del resto de la canción para que encaje:\n\n${keepContext}\n\nGenera SOLO la sección "${sectionName}" con el mismo formato (### [${sectionName}] + Intérprete + barras). No repitas las otras secciones.`;
  }

  // Rhyme scheme
  let rhymeBlock = "";
  if (params.rhymeSchemeId && params.rhymeSchemeId !== "rs_free") {
    // Usuario seleccionó un esquema explícito → usar ese
    const scheme = getRhymeSchemeById(params.rhymeSchemeId);
    if (scheme) {
      rhymeBlock = `\n# 🔤 ESQUEMA DE RIMA OBLIGATORIO\nPatrón: ${scheme.pattern}. ${scheme.description}\nSigue este esquema ESTRICTAMENTE en TODOS los versos. La última palabra de cada barra DEBE rimar según el patrón. Además, mete RIMAS INTERNAS dentro de cada barra (2+ sílabas que riman dentro de la frase, no solo al final). Usa rimas MULTISILÁBICAS (2+ sílabas) en lugar de rimas simples de última sílaba.`;
    }
  } else {
    // No seleccionó esquema → usar el esquema natural del artista
    const flowProfileForRhyme = getFlowProfile(params.artistId);
    if (flowProfileForRhyme && flowProfileForRhyme.defaultRhymeScheme && flowProfileForRhyme.defaultRhymeScheme !== "rs_free") {
      const artistScheme = getRhymeSchemeById(flowProfileForRhyme.defaultRhymeScheme);
      if (artistScheme) {
        rhymeBlock = `\n# 🔤 ESQUEMA DE RIMA DEL ARTISTA (automático)\n${artist?.name ?? "El artista"} usa naturalmente el patrón: ${artistScheme.pattern}. ${artistScheme.description}\nSigue este esquema como base, pero puedes adaptarlo si el flow lo requiere. La última palabra de cada barra DEBE rimar. Mete RIMAS INTERNAS dentro de cada barra. Usa rimas MULTISILÁBICAS (2+ sílabas).`;
      } else {
        rhymeBlock = `\n# 🔤 RIMAS POR DEFECTO\nUsa esquema AABB o ABAB naturalmente. La última palabra de cada barra DEBE rimar con su pareja. Cambia la rima cada 4 barras.`;
      }
    } else if (flowProfileForRhyme && flowProfileForRhyme.defaultRhymeScheme === "rs_free") {
      rhymeBlock = `\n# 🔤 RIMAS LIBRES\n${artist?.name ?? "El artista"} usa rimas libres e impredecibles. No sigas un patrón fijo, pero cada barra DEBE rimar con alguna otra. Mete rimas internas y multisilábicas. Cambia la rima cuando suene natural.`;
    } else {
      rhymeBlock = `\n# 🔤 RIMAS POR DEFECTO\nUsa esquema AABB o ABAB naturalmente. La última palabra de cada barra DEBE rimar con su pareja. Cambia la rima cada 4 barras.`;
    }
  }

  // Locked sections
  let lockedBlock = "";
  if (params.lockedSections && params.lockedSections.length > 0) {
    const lockedList = params.lockedSections.map(s =>
      `### [${s.name}]\n${s.content}`
    ).join("\n\n");
    lockedBlock = `\n# 🔒 SECCIONES BLOQUEADAS (NO MODIFICAR)\nEl usuario quiere mantener EXACTAMENTE estas secciones tal como están. Reprodúcelas literalmente, sin cambiar ni una palabra:\n\n${lockedList}\n\nGenera SOLO las secciones que NO están arriba.`;
  }

  // Correction instruction
  let correctionBlock = "";
  if (params.correctionInstruction) {
    correctionBlock = `\n# ⚠️ CORRECCIÓN DE IDIOMA (RE-GENERACIÓN)\n${params.correctionInstruction}\nLa proporción de idioma anterior NO cumplió el objetivo. Esta vez cumple la regla matemática con mayor precisión.`;
  }

  const prompt = `Eres un compositor experto y "Ghostwriter" de élite en la industria del Trap. Tu especialidad es fusionar el sonido de Atlanta con dialectos hispanos y slang americano.

# MÓDULO 1: LANGUAGE & IDENTITY DNA (ESTRICTO)
${spanglish.prompt}
- **Artista Principal (Voz)**: ${artist?.name ?? "Estilo libre"} — ${artist?.style ?? "Flow libre, elige tú el estilo."}
${featureArtist ? `- **Artista Invitado (Feature)**: ${featureArtist.name} — ${featureArtist.style}` : "- **Feature**: No hay invitado."}
- **Regla de Jerga Orgánica**: Genera proactivamente el slang, modismos, acento y tics verbales auténticos del estilo del artista referenciado. Cuando cante el Feature, CAMBIA DRÁSTICAMENTE la jerga y el flow para adaptarlos a SU estilo, no al del artista principal.
- **Ad-libs**: Los ad-libs son la FIRMA del artista. Deben ser ORGÁNICOS y CONTEXTUALES, no decorativos. Pon 1-2 por barra, variando posición (inicio, medio, final), combinándolos a veces ("(Yeah! Skrrt!)"), y haciendo que RESPONDAN al contenido de la barra. Background entre paréntesis (Yeah!), frontales sin paréntesis. Deja algunas barras sin ad-libs para que respire. EVITA la repetición mecánica del mismo ad-lib cada 4 barras.
- **RESTRICCIÓN CRÍTICA**: JAMÁS menciones el nombre real o apodo de ningún artista en la letra o ad-libs. Eres un fantasma.
${correctionBlock}
${dynamicsBlock}
${sectionLangBlock}
${adlibsBlock}
${rhymeBlock}
${lockedBlock}
${regenerateSectionBlock}
${beatTypeBlock}
${featureSimBlock}
${collabBlock}
${asterisksBlock}
${syllableSyncBlock}
${phoneticBlock}
${customIntroBlock}
${cadenceBlock}
${breathBlock}

# MÓDULO 2: MÉTRICA, BPM & FLOW & RIMAS
- **BPM**: ${params.bpmVibe.range} BPM — ${params.bpmVibe.label}
- **Densidad**: ${params.bpmVibe.density}. ${params.bpmVibe.description}
- **Métrica Americana**: Frases cortas. Usa puntuación agresiva (comas, guiones) para forzar "staccato" o "triplets".
- Si el BPM es > 140, TRIPLICA la densidad (flow rápido Rage/Drill). Si es < 100, reduce palabras, alarga sílabas finales.

**REGLAS DE RIMA (CRÍTICO — esto es lo que separa una letra amateur de una profesional):**

NIVEL DE RIMA SEGÚN ARTISTA:
${rhymeLevelInstruction}

REGLAS UNIVERSALES:
1. La ÚLTIMA palabra de cada barra DEBE rimar con otra barra del mismo grupo (AABB, ABAB, etc.).
2. RIMAS INTERNAS: palabras DENTRO de la barra que riman entre sí o con la palabra final. Esto es OBLIGATORIO. Una barra sin rima interna es una barra mediocre.
   - Ejemplo básico: "countin' the CASH, hidin' the STASH, makin' a DASH" (cash/stash/dash = 3 rimas internas + final)
   - Ejemplo avanzado: "the MONEY come FUNNY, my HONEY act SUNNY but SLUMMY at NIGHT" (money/funny/honey/sunny = 4 rimas internas asonantes)
3. RIMAS MULTISILÁBICAS: 2+ sílabas rimando, no solo la última. "observación/consideración" es mejor que "canción/pasión". "MONEY/FUNNY" es mejor que "cash/flash".
4. NO uses rimas cliché: prohibido vida/herida, amor/dolor, calle/calle, corazón/razón, fuego/juego. Busca combinaciones INESPERADAS.
5. Rimas cross-language válidas: price/ice, calle/balle, money/honey, blood/mud, lean/dream.
6. EVITA rimas forzadas: si una palabra no encaja naturalmente, reescribe la barra. Mejor fluidez que rima forzada.
7. CAMBIA la rima cada 4 barras. No rimes 16 barras con la misma vocal.
8. RIMAS EN CADENA: a veces pon 3-4 palabras seguidas que rimen: "I GRAB it, STAB it, TAB it, CAB it" — esto es un showcase técnico.
9. RIMA RESPUESTA: la rima interna puede RESPONDER a la palabra final de la barra anterior: "I got the CASH (cash!) / Next bar: SPEND it on HASH, make it a DASH" — la rima conecta barras.

# MÓDULO 3: SONIC LANDSCAPE
- Adapta la lírica al BPM y al estilo natural del artista.
- BPM alto (Rage/Drill/Fast): frases cortas, densas, agresivas, imágenes de acción.
- BPM medio (Standard/Groovy): equilibra ego, flow rítmico y punchlines.
- BPM bajo (Slow/Lo-Fi): metáforas introspectivas, soledad, dinero, dolor.

# MÓDULO 4: TEMÁTICA, NARRATIVA & MOOD
- **Mood**: ${params.moodId}
- **Temas Clave**: [${topicBlock}]
- **Arco Narrativo**: ${params.narrativeArcId === "none" ? "Lineal, sin arco específico." : params.narrativeArcDesc}
${narrativeBlock}

# MÓDULO 6: COHESIÓN & TRANSICIONES
- El vocabulario y slang en las transiciones DEBEN adaptarse al Mood.
- Mantén una historia coherente. Las secciones posteriores construyen sobre lo presentado.
- Usa ad-libs al final de cada sección para "llamar" a la siguiente.
${featureArtist ? `- Cuando entre el Feature, cambia el flow, la jerga y la actitud para reflejar SU estilo, no el del artista principal.` : ""}

# MÓDULO 7: DICCIONARIO PERSONALIZADO
${dictionaryBlock || "(Sin diccionario personalizado. Genera tu propio slang auténtico.)"}
${producerBlock}

# MÓDULO 8: PLAN DE EJECUCIÓN ESTRICTO (PRIORIDAD MÁXIMA)
Debes seguir este esqueleto EXACTAMENTE sin desviarte. No añadas ni omitas secciones:
${structurePlan}

**REGLAS DE FORMATO (Markdown Estricto):**
1. Cada sección inicia con: ### [Nombre Sección]
2. Abajo, el intérprete en cursiva: *Intérprete: X* (USA EL NOMBRE REAL DEL ARTISTA, no "Main Artist" ni "Artista Principal")
3. Las barras (líneas cantadas) van una por línea.
4. Ad-libs secundarios SIEMPRE entre paréntesis: (Skrrt!)
5. Etiquetas de sección SIEMPRE entre corchetes rectos: [Verse 1]

# OUTPUT FORMAT
Tu respuesta debe contener ÚNICAMENTE la letra de la canción (The Lyrics).
NO incluyas explicaciones, introducciones ni etiquetas de estilo musical.
NO añadas comentarios al final.

[SEED ALEATORIA: ${Math.random().toString(36).substring(2, 10)} — Factor de entropía para forzar una letra 100% original]`;

  return prompt;
}

/**
 * Builds a Suno-style music prompt from the config.
 */
export function buildSunoStylePrompt(params: {
  beatType?: BeatType;
  bpmVibe: BpmVibe;
  moodId: string;
  artistId: string;
  producerId: string;
  structureLabel: string;
}): string {
  const tags: string[] = [];

  if (params.beatType) {
    tags.push(...params.beatType.sunoTags);
  }

  const bpmNum = parseInt(params.bpmVibe.range.split("-")[1] ?? "130");
  tags.push(`${params.bpmVibe.range} BPM`);
  if (bpmNum > 160) tags.push("rage", "high energy", "fast");
  else if (bpmNum > 140) tags.push("aggressive", "drill");
  else if (bpmNum < 100) tags.push("melodic", "slow", "emotional");

  const moodTags: Record<string, string[]> = {
    agresivo: ["dark", "aggressive", "menacing"],
    melancolico: ["melancholic", "emotional", "sad"],
    flex: ["confident", "luxurious", "triumphant"],
    fiesta: ["energetic", "party", "danceable"],
    introspectivo: ["introspective", "deep", "contemplative"],
    oscuro: ["dark", "sinister", "ominous"],
    romantico: ["romantic", "smooth", "sensual"],
    calle: ["raw", "gritty", "street"],
    menacing: ["menacing", "dark", "threatening"],
    dreamy: ["dreamy", "ethereal", "psychedelic"],
    nostalgic: ["nostalgic", "warm", "reflective"],
    confident: ["confident", "bold", "powerful"],
  };
  const mTags = moodTags[params.moodId];
  if (mTags) tags.push(...mTags);

  const structLower = params.structureLabel.toLowerCase();
  if (structLower.includes("anthem")) tags.push("anthem", "epic build");
  if (structLower.includes("pop trap")) tags.push("pop trap", "catchy hook");
  if (structLower.includes("drill")) tags.push("drill");
  if (structLower.includes("rage")) tags.push("rage", "moshpit");
  if (structLower.includes("pain")) tags.push("emotional", "pain");

  const artist = getArtistById(params.artistId);
  if (artist?.beatTags) tags.push(...artist.beatTags.slice(0, 3));

  // Vocal tags from flow profile
  const flowProfile = getFlowProfile(params.artistId);
  if (flowProfile) {
    tags.push(...flowProfile.vocalTags);
  }

  const producer = params.producerId !== "none" ? getProducerById(params.producerId) : null;
  if (producer) tags.push(producer.name.toLowerCase());

  const unique = [...new Set(tags)];
  let result = unique.join(", ");
  if (result.length > 1000) {
    result = result.substring(0, 997) + "...";
  }
  return result;
}

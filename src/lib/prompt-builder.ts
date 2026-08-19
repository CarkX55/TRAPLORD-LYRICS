// Prompt Builder — COMPACT prompt + TIERED rhymes (no banning 1-syllable rhymes for street artists)

import { getArtistById, getProducerById, getRhymeSchemeById, getBeatTypeById, getFeatureSimById, type SongStructure, type BpmVibe, type BeatType } from "./trap-data";
import { getFlowProfile, getBreathInstruction, getCadenceLabel, type FlowProfile } from "./artist-flow-profiles";
import { getArtistReference, type ArtistReference } from "./artist-references";
import type { TrackAnalysis } from "./track-analyzer";

/**
 * Derives the rhyme tier from the artist's defaultRhymeScheme.
 * TIER 1 = technical multi-syllabic required (Eminem, Kendrick, J. Cole, Takeoff, Recycled J — rs_internal).
 * TIER 2 = balanced: mix multi + single (Drake, Migos, Gunna, Travis — rs_abab, rs_triplets).
 * TIER 3 = street/direct: 1-syllable OK if it hits (Yung Beef, 21 Savage, Carti, Chief Keef, Future, Pop Smoke, Gucci — rs_aabb, rs_monorhyme, rs_free).
 * This way we DON'T restrict artists whose authentic style relies on punchy 1-syllable rhymes.
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
  mainArtistReference?: ArtistReference | null;
  featureArtistReference?: ArtistReference | null;
  referenceTrack?: TrackAnalysis | null;
  dynamicSongForm?: boolean;
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

  // Song Form Intelligence (Phase 6) — dynamic structure based on artist's songFormStyle
  const flowProfileForForm = getFlowProfile(params.artistId);
  const songFormStyle = flowProfileForForm?.songFormStyle ?? "minimal_standard";
  const useDynamicForm = params.dynamicSongForm !== false && songFormStyle !== "minimal_standard";

  // Structure plan with per-section voice assignment + dynamic form (Phase 6)
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

      // Dynamic insertions BEFORE this section
      if (useDynamicForm) {
        if ((songFormStyle === "pre_chorus_build" || songFormStyle === "hybrid") && isChorus) {
          lines.push(`[Pre-Chorus]: ${artist?.name ?? "Main Artist"} — EXACTAMENTE 2-4 barras (BUILD melódico que sube tensión hacia el chorus. NO repitas el chorus, es la RAMP previa)`);
        }
      }

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

      // Dynamic modifications (Phase 6)
      let dynamicNote = "";
      if (useDynamicForm) {
        if ((songFormStyle === "expanding_chorus" || songFormStyle === "hybrid") && isChorus && chorusIdx > 1) {
          const extraBars = (chorusIdx - 1) * 2;
          dynamicNote = ` (+${extraBars} barras vs Chorus anterior — EXPANDING: añade frases/ad-libs NUEVOS, no repitas igual)`;
        }
        if (songFormStyle === "variable_verse" && isVerse) {
          if (verseIdx === 1) dynamicNote = " (+2 barras STORYTELLING — verso largo narrativo)";
          else if (verseIdx === 2) dynamicNote = " (-2 barras MOMENTUM — verso más corto y rápido)";
        }
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

      lines.push(`[${s.name}]: ${voice} — EXACTAMENTE ${bars}${dynamicNote} (líneas cantadas)${densityInstruction ? `. ${densityInstruction}` : ""}`);

      // Dynamic insertions AFTER this section (beat drops)
      if (useDynamicForm && songFormStyle === "beat_drop") {
        if (isIntro) {
          lines.push(`[BEAT DROP]: 🚫 NO LYRICS — beat drop 1 barra tras intro. Marca el inicio real del track con energía máxima.`);
        }
        if (isChorus && i < totalSections - 1 && i === totalSections - 2) {
          lines.push(`[BEAT DROP]: 🚫 NO LYRICS — silencio 1-2 barras + drop del beat. Tensión máxima antes del chorus final.`);
        }
      }

      return lines;
    })
    .join("\n");

  // Tiered rhyme instruction — TIER 3 explicitly allows 1-syllable rhymes (street style)
  const rhymeTier = getRhymeTier(params.artistId);
  let rhymeLevelInstruction = "";
  if (rhymeTier === 1) {
    rhymeLevelInstruction = `${artist?.name ?? "El artista"} es TÉCNICO: rimas multisilábicas OBLIGATORIAS (2+ sílabas). Mínimo 2 rimas internas por barra. Estilo Eminem/Kendrick — la complejidad técnica es la firma.`;
  } else if (rhymeTier === 2) {
    rhymeLevelInstruction = `${artist?.name ?? "El artista"} es EQUILIBRADO: combina multisilábicas con rimas de 1 sílaba. Mínimo 1 rima interna por barra. Mezcla natural — algunos versos complejos, otros simples y pegadizos.`;
  } else {
    rhymeLevelInstruction = `${artist?.name ?? "El artista"} es DIRECTO/CALLE: las rimas de 1 sílaba SON VÁLIDAS si pegan duro. Prioriza RITMO, AD-LIBS y ATMÓSFERA sobre complejidad técnica. Mete algún multi-silábico solo para punchlines puntuales — forzarlo aquí sonaría fake.`;
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

  // Peak-era reference bars (few-shot style matching) — NEW Phase 1
  // Use params.mainArtistReference if provided (generated via web-search/LLM for non-curated), else fall back to curated DB
  const artistRef = params.mainArtistReference ?? getArtistReference(params.artistId);
  let referenceBlock = "";
  if (artistRef) {
    const allBars = [
      ...artistRef.verseBars.map(b => `V: "${b}"`),
      ...artistRef.hookBars.map(b => `H: "${b}"`),
      ...(artistRef.signatureBar ? [`★: "${artistRef.signatureBar}"`] : []),
    ];
    referenceBlock = `\n# 🎯 REFERENCIA PEAK ERA (FEW-SHOT — IMITA EL FLOW, NO COPIES LITERAL)\n${artist?.name ?? "Artista"} en su peak: ${artistRef.peakEra}\n${artistRef.verified ? "(Barras REALES verificadas)" : "(Barras style-matched — imitan el flow, no son reales)"}\n${allBars.join("\n")}\nEstudia: flow, cadencia, slang, posición de ad-libs, esquema de rima. IMPROVISA con tu contenido, NO repitas estas palabras.`;
  }

  // Feature artist reference bars (NEW Phase 3) — few-shot for the feature artist's verse
  const featRef = params.featureArtistReference ?? (featureArtist ? getArtistReference(featureArtist.id) : null);
  let featureReferenceBlock = "";
  if (featRef && featureArtist) {
    const featBars = [
      ...featRef.verseBars.map(b => `V: "${b}"`),
      ...featRef.hookBars.map(b => `H: "${b}"`),
      ...(featRef.signatureBar ? [`★: "${featRef.signatureBar}"`] : []),
    ];
    featureReferenceBlock = `\n# 🤝 REFERENCIA FEATURE — PEAK ERA (FEW-SHOT)\n${featureArtist.name} en su peak: ${featRef.peakEra}\n${featRef.verified ? "(Barras REALES verificadas)" : "(Barras style-matched — imitan el flow, no son reales)"}\n${featBars.join("\n")}\nCUANDO cante el Feature, usa ESTE flow (no el del artista principal). IMPROVISA con contenido propio, NO copies estas palabras.`;
  }

  // Per-artist style rules (hook, wordplay, emotional arc, melodic contour) — peak era
  let artistStyleBlock = "";
  if (flowProfile) {
    const hookRules: Record<string, string> = {
      repetitive: "HOOK repetitivo: chorus repite 1-2 frases clave con variaciones mínimas.",
      melodic: "HOOK melódico: chorus casi cantado, melodía pegadiza.",
      technical: "HOOK técnico: chorus con rimas internas complejas.",
      simple_punchy: "HOOK directo: frases cortas y golpeadoras, minimalista.",
    };
    const wordplayRules: Record<number, string> = {
      1: "WORDPLAY PESADO: dobles sentidos, metáforas extendidas, punchlines con setup (obligatorio).",
      2: "WORDPLAY MODERADO: algún doble sentido/punchline cuando suene natural.",
      3: "WORDPLAY MÍNIMO: prioriza ritmo y vibra, sin dobles sentidos forzados.",
    };
    const arcRules: Record<string, string> = {
      rising: "ARCO ASCENDENTE: empieza bajo, sube intensidad, climax al final del verso.",
      flat: "ARCO PLANO: misma energía durante todo el verso.",
      chaotic: "ARCO CAÓTICO: cambia de tono impredeciblemente (susurro→grito→melodía).",
      introspective: "ARCO INTROSPECTIVO: tono reflexivo, confesional, sin estallidos.",
    };
    const contourRules: Record<string, string> = {
      rising: "MELODÍA ASCENDENTE: rimas suben de tono, agudo al final (para Suno).",
      falling: "MELODÍA DESCENDENTE: empieza agudo, baja al final.",
      flat: "MELODÍA PLANA: monótona, sin variación tonal.",
      variable: "MELODÍA VARIABLE: cambia de dirección según la frase.",
    };
    artistStyleBlock = `\n# 🎭 ESTILO PER-ARTISTA (PEAK ERA)\n- ${hookRules[flowProfile.hookStyle] ?? ""}\n- ${wordplayRules[flowProfile.wordplayTier] ?? ""}\n- ${arcRules[flowProfile.emotionalArc] ?? ""}\n- ${contourRules[flowProfile.melodicContour] ?? ""}\n- WORDPLAY ESPECÍFICO: usa estas técnicas del artista en peak — ${flowProfile.wordplayTechniques.join(", ")}\n- STORYTELLING: ${flowProfile.storytellingStyle}\n- IMAGERY STYLE (CRÍTICO — NO calcles al artista): el artista usa este TIPO de imagery en su peak — ${flowProfile.imageryBank.join(", ")}. USA estos descriptores como INSPIRACIÓN DE ESTILO, NO copies referencias exactas del artista (sería identificable = calcado). INVENTA tus PROPIAS referencias concretas del mismo tipo/vibe. Ej: si el estilo dice "Detroit working-class barrio", inventa tu propia referencia obrera. Si dice "family trauma", escribe sobre trauma TUYO. Mezcla 3-5 referencias ORIGINALES de este tipo en cada verso. El resultado debe SONAR como el artista pero NO ser identificable como él.`;
  }

  // Reference Track DNA (NEW Phase 4) — user pasted a song, replicate its structure/dynamics
  let referenceTrackBlock = "";
  if (params.referenceTrack) {
    const rt = params.referenceTrack;
    const sectionsPlan = rt.sections.length > 0
      ? rt.sections.map(s => `[${s.name}] ${s.barCount}b`).join(" → ")
      : "(no detectada)";
    referenceTrackBlock = `\n# 🎵 REFERENCE TRACK DNA (REPLICAR ESTA ESTRUCTURA — PRIORIDAD ALTA)\nEl usuario pegó una canción de referencia. Replica su ADN estructural:\n- Estructura: ${sectionsPlan}\n- Esquema de rima: ${rt.rhymeScheme}\n- Densidad: ${rt.density} (${rt.avgSyllablesPerBar} sílabas/barra)\n- Ad-libs: ${rt.adlibFrequency} frecuencia, posiciones ${rt.adlibPositions.join("/")}\n- Idioma: ${rt.languageRatio}% EN\n- Hook style: ${rt.hookStyle}\n- Arco emocional: ${rt.emotionalArc}\n- Técnicas: ${rt.notableTechniques.join(", ") || "ninguna destacada"}\n- Resumen: ${rt.summary}\nUSA esta estructura como esqueleto. Adapta el CONTENIDO al artista seleccionado, pero MANTÉN la estructura, esquema de rima y dinámica de la referencia.`;
  }

  // Song Form Intelligence block (Phase 6) — explains the dynamic structure
  let songFormBlock = "";
  if (useDynamicForm && songFormStyle !== "minimal_standard") {
    const formExplanations: Record<string, string> = {
      expanding_chorus: "EXPANDING CHORUS: cada repetición del chorus es MÁS larga (+2 barras) con frases/ad-libs NUEVOS. No pegues el mismo chorus 3 veces.",
      pre_chorus_build: "PRE-CHORUS BUILD: antes de cada chorus hay un Pre-Chorus (2-4 barras) que sube tensión melódicamente. Es la RAMP, no el chorus.",
      beat_drop: "BEAT DROPS: hay secciones [BEAT DROP] (sin letra) que marcan drops del beat. Suno responde a estos markers con tensión/drop.",
      variable_verse: "VARIABLE VERSE: Verse 1 es MÁS largo (storytelling narrativo), Verse 2 es MÁS corto (momentum). Varía la longitud para dinámica.",
      hybrid: "HYBRID: combina expanding chorus (corus crece) + pre-chorus build (ramp antes de cada chorus).",
    };
    songFormBlock = `\n# 🎶 SONG FORM INTELLIGENCE (dinámico per-artista)\n${formExplanations[songFormStyle] ?? ""}`;
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

  // Artist ad-libs (estilo descriptivo, NO lista cerrada) — COMPACTO 5 reglas
  let adlibsBlock = "";
  const adlibsStyle: string[] = [];
  if (artist?.adlibs && artist.adlibs.length > 0) {
    adlibsStyle.push(`${artist.name} usa: ${artist.adlibs.map(a => `"${a}"`).join(", ")} — pero IMPROVISA los tuyos según contexto`);
  }
  if (featureArtist?.adlibs && featureArtist.adlibs.length > 0) {
    adlibsStyle.push(`${featureArtist.name} usa: ${featureArtist.adlibs.map(a => `"${a}"`).join(", ")} — igualmente, improvisa`);
  }
  if (adlibsStyle.length > 0) {
    adlibsBlock = `\n# 🗣️ AD-LIBS (CRÍTICO SUNO)\nReferencia (NO copies literal, IMPROVISA):\n${adlibsStyle.join("\n")}\n\nREGLAS:\n1. IMPROVISA según contenido: disparos→(Bow!), dinero→(Racks!), coches→(Skrrt!), lean→(Sip!). RESPONDEN al contenido, no decoración.\n2. POSICIÓN variada: 40% final, 25% medio, 15% inicio, 10% entre barras, 10% solos. SI TODOS al final = FAKE.\n3. Combina a veces: "(Yeah! Skrrt!)". Densidad: 1-2 por barra, deja 2-3 barras sin ad-libs para que respire.\n4. MÁS en chorus, MENOS en verse (más denso). Chorus no repetido: cada repetición con VARIACIONES en ad-libs.\n5. Feature: que improvise ad-libs de SU estilo, no del artista principal.`;
  }

  // Regenerate single section mode
  let regenerateSectionBlock = "";
  if (params.regenerateSection) {
    const { sectionName, keepContext } = params.regenerateSection;
    regenerateSectionBlock = `\n# 🔄 RE-GENERACIÓN DE SECCIÓN ÚNICA\nEl usuario quiere RE-GENERAR SOLO la sección "${sectionName}". Mantén el contexto del resto de la canción para que encaje:\n\n${keepContext}\n\nGenera SOLO la sección "${sectionName}" con el mismo formato (### [${sectionName}] + Intérprete + barras). No repitas las otras secciones.`;
  }

  // Rhyme scheme — COMPACTO
  let rhymeBlock = "";
  if (params.rhymeSchemeId && params.rhymeSchemeId !== "rs_free") {
    const scheme = getRhymeSchemeById(params.rhymeSchemeId);
    if (scheme) {
      rhymeBlock = `\n# 🔤 ESQUEMA OBLIGATORIO\nPatrón: ${scheme.pattern}. ${scheme.description} Síguelo en todos los versos.`;
    }
  } else {
    const flowProfileForRhyme = getFlowProfile(params.artistId);
    const schemeId = flowProfileForRhyme?.defaultRhymeScheme;
    if (schemeId && schemeId !== "rs_free") {
      const artistScheme = getRhymeSchemeById(schemeId);
      if (artistScheme) {
        rhymeBlock = `\n# 🔤 ESQUEMA DEL ARTISTA\n${artist?.name ?? "El artista"} usa: ${artistScheme.pattern}. ${artistScheme.description}`;
      } else {
        rhymeBlock = `\n# 🔤 ESQUEMA\nAABB o ABAB natural.`;
      }
    } else if (schemeId === "rs_free") {
      rhymeBlock = `\n# 🔤 RIMAS LIBRES\n${artist?.name ?? "El artista"} usa rimas libres. Cada barra rima con alguna otra. Sin patrón fijo.`;
    } else {
      rhymeBlock = `\n# 🔤 ESQUEMA\nAABB o ABAB natural.`;
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

  const prompt = `Eres un Ghostwriter de élite del Trap. Fusionas el sonido de Atlanta con dialectos hispanos y slang americano.

# IDENTIDAD & IDIOMA
${spanglish.prompt}
- **Artista Principal**: ${artist?.name ?? "Estilo libre"} — ${artist?.style ?? "Flow libre."}
${featureArtist ? `- **Feature**: ${featureArtist.name} — ${featureArtist.style}` : "- **Feature**: Ninguno."}
- **Jerga orgánica**: genera slang/modismos/acentos auténticos del artista. Cuando cante el Feature, CAMBIA DRÁSTICAMENTE la jerga y flow para adaptarlos a SU estilo.
- **Ad-libs**: son la FIRMA del artista. Orgánicos y contextuales (ver reglas completas abajo).
- **RESTRICCIÓN**: JAMÁS menciones el nombre real o apodo de ningún artista. Eres un fantasma.
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
${referenceBlock}
${featureReferenceBlock}
${artistStyleBlock}
${referenceTrackBlock}
${songFormBlock}

# FLOW, BPM & SONIDO
- **BPM**: ${params.bpmVibe.range} — ${params.bpmVibe.label}. Densidad: ${params.bpmVibe.density}.
- BPM >140 → tripla densidad (rage/drill). BPM <100 → alarga sílabas, menos palabras.
- Métrica americana: frases cortas, puntuación agresiva para "staccato" o triplets.
- Adapta la lírica al BPM: alto=acción/agresión, medio=ego/flow/punchlines, bajo=introspección/dolor.

**RIMAS — NIVEL SEGÚN ARTISTA:**
${rhymeLevelInstruction}

**REGLAS UNIVERSALES:**
1. Última palabra de cada barra rima con su pareja (AABB/ABAB).
2. Rimas internas DENTRO de la barra cuando suenen natural (no forzado en estilo street).
3. Multisilábicas (2+ sílabas) PREFERIDAS para técnicos, 1 sílaba OK si pega en estilo street.
4. EVITA clichés (vida/herida, amor/dolor, glock/block, cash/flash). Si los usas, dales un giro.
5. Cambia la rima cada 4 barras. Cadena (3-4 rimas seguidas) para punchlines.
6. PUNCHLINE STRUCTURE: setup → payoff. La barra de setup crea expectativa, la siguiente la rompe con un twist/doble sentido. Mínimo 2-3 punchlines por verso (TIER 1-2); opcional en TIER 3 (calle prefiere ritmo).
7. VERSE DYNAMICS: empieza el verso a menor densidad, SUBE la intensidad hacia el final, climax en las últimas 2-3 barras. La barra del punchline = más densa (más sílabas/palabras). Deja 1 barra de respiración antes del punchline final.

**EJEMPLOS:**
- Multisilábico: "I POUR up the LEAN, livin' the DREAM, cash on the SCREEN" (lean/dream/screen = 3 multisilábicas en cadena)
- Street directo: "Big GLOCK on the BLOCK, no TICK tock on the CLOCK" (glock/block/clock = 3 rimas de 1 sílaba en cadena, pegan duro)

# TEMÁTICA & COHESIÓN
- **Mood**: ${params.moodId}
- **Temas**: [${topicBlock}]
- **Arco**: ${params.narrativeArcId === "none" ? "Lineal." : params.narrativeArcDesc}
- Mantén historia coherente. Secciones posteriores construyen sobre las anteriores. Ad-libs al final de cada sección "llaman" a la siguiente.
- Vocabulario en transiciones DEBE adaptarse al Mood.
${narrativeBlock}
${featureArtist ? `- Feature entra: cambia flow, jerga y actitud para reflejar SU estilo.` : ""}

# DICCIONARIO & PRODUCER
${dictionaryBlock || "(Sin diccionario. Genera tu propio slang auténtico.)"}
${producerBlock}

# EJECUCIÓN ESTRICTA (PRIORIDAD MÁXIMA)
Sigue este esqueleto EXACTAMENTE sin desviarte. No añadas ni omitas secciones:
${structurePlan}

**FORMATO (Markdown estricto):**
1. Sección inicia con: ### [Nombre Sección]
2. Intérprete en cursiva: *Intérprete: X* (USA EL NOMBRE REAL del artista, no "Main Artist")
3. Barras (líneas cantadas) una por línea.
4. Ad-libs secundarios SIEMPRE entre paréntesis: (Skrrt!)
5. Etiquetas de sección entre corchetes: [Verse 1]

# OUTPUT
Tu respuesta debe contener ÚNICAMENTE la letra de la canción. Sin explicaciones, intros ni etiquetas de estilo musical.

[SEED: ${Math.random().toString(36).substring(2, 10)} — factor de entropía para forzar letra 100% original]`;

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

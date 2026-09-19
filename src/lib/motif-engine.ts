import { createHash } from "crypto";
import { getSceneById } from "./scene-engine";
import { getArtistById, type SongStructure } from "./trap-data";

export type TopicIntent =
  | {
      kind: "named_entity";
      value: string; // Ej: "Cardano", "Rolls Royce", "Atlanta"
      preservation: "lexical_available";
      // La entidad literal debe estar disponible para cuando la escena lo requiera,
      // pero NO se exige ni se fuerza su repetición a lo largo de las secciones.
    }
  | {
      kind: "abstract_theme";
      value: string; // Ej: "lealtad", "paranoia", "éxito solitario"
      preservation: "semantic_intent";
      // Se preserva la intención dramática a través de conductas y hechos,
      // sin forzar la aparición literal de la palabra ni discursos morales de autoayuda.
    };

export interface SemanticSceneFraming {
  dominantSemanticRole: string; // Ej: "digital_value_under_pressure"
  situation: string;            // Ej: "espera nocturna en un vehículo o espacio cerrado"
  tension: string;              // Ej: "algo se mueve fuera mientras el personaje no puede intervenir físicamente"
  dramaticFunction: string;     // Ej: "contraste entre valor invisible y riesgo físico tangible"
}

export interface SemanticAnchor {
  anchorType: "physical_image" | "sensory_detail" | "emotional_contradiction" | "spatial_tension" | "behavioral_action";
  title: string;
  sensoryDescription: string;
  emotionalAxis: string;
  suggestedAction: string;
  literalizationPenaltyWords: string[];
  // Paso 4: Trazabilidad canónica y directivas anti-cliché
  structureFingerprint?: string;
  generationIntentHash?: string;
  dramaticMotifId?: string;
  antiClicheDirectives?: string[];
  topicIntents?: TopicIntent[];
  framing?: SemanticSceneFraming;
}

export interface CanonicalIntent {
  schemaVersion: "1";
  motifEngineVersion: "v2";
  moodId: string;
  customTopic: string;
  topics: string[];
  structureFingerprint: string;
}

export interface DramaticMotif {
  id: string;
  name: string;
  motifType: "physical_image" | "sensory_detail" | "emotional_contradiction" | "spatial_tension" | "behavioral_action";
  dramaticTension: string;
  coreMotif: string;
  sensoryAtmosphere: string;
  antiClicheDirectives: string[];
  suggestedAction: string;
}

/**
 * 12 Canonical Anti-Cliché Dramatic Motifs for Trap & Urban Music.
 * Prevents mechanical repetition of materialist tropes (ice, money, cars)
 * by anchoring the lyric in psychological tension, spatial atmosphere, and tactile sensory touchstones.
 */
export const DRAMATIC_MOTIF_CATALOG: readonly DramaticMotif[] = [
  {
    id: "vigilancia_asfalto",
    name: "Vigilancia en el Asfalto",
    motifType: "spatial_tension",
    dramaticTension: "Paranoia contenida y asedio en el retrovisor",
    coreMotif: "Luces traseras en la calzada mojada, retrovisor con vibración de ralentí",
    sensoryAtmosphere: "Vapor saliendo del capó, tapicería de cuero frío, pantalla del móvil boca abajo en el asiento del copiloto",
    antiClicheDirectives: [
      "Evitar tiroteos caricaturescos o balaceras de película",
      "Anclar en la tensión psicológica de la espera inmóvil",
      "Prohibido usar menciones genéricas a 'glock' o 'pistola' sin contexto sensorial",
    ],
    suggestedAction: "Mantener el foco en la respiración contenida, el tiempo que no pasa y la mirada fija sin pestañear",
  },
  {
    id: "frialdad_anestesica",
    name: "Frialdad Anestésica",
    motifType: "emotional_contradiction",
    dramaticTension: "Desconexión emocional tras el éxito solitario",
    coreMotif: "Copa con hielo a medio deshacer sobre mármol frío, silencio en la suite",
    sensoryAtmosphere: "Eco de pasos descalzos sobre madera pulida, notificaciones silenciadas a las 5 AM, luz ámbar de la lámpara auxiliar",
    antiClicheDirectives: [
      "Evitar presumir de dinero de forma vacía o festiva",
      "Enfocar en el peso del aislamiento y la ausencia de euforia",
      "No convertir el lujo en un catálogo de marcas",
    ],
    suggestedAction: "Contrastar el confort exterior con la sequedad interna de quien ya no siente entusiasmo",
  },
  {
    id: "lealtad_en_la_cornisa",
    name: "Lealtad en la Cornisa",
    motifType: "behavioral_action",
    dramaticTension: "Fractura de confianza entre socios y código roto",
    coreMotif: "El apretón de manos con la mirada desviada, el reparto sobre la mesa de cocina",
    sensoryAtmosphere: "Humo denso que no se disipa, ceniza cayendo en el mantel plástico, una llave que ya no gira suave en la cerradura",
    antiClicheDirectives: [
      "Evitar melodrama de novela o discursos de venganza gritada",
      "Capturar la frialdad silenciosa del negocio callejero cuando se rompe la palabra",
      "Cero menciones a 'hermanos de sangre' sin peso real",
    ],
    suggestedAction: "Describir la micro-tensión de saber que alguien cercano va a doblarse antes de que ocurra",
  },
  {
    id: "obsesion_de_estudio",
    name: "Obsesión de Estudio",
    motifType: "sensory_detail",
    dramaticTension: "Aislamiento creativo, vigilia forzada y perfeccionismo técnico",
    coreMotif: "Luz roja de grabación fija, tarjeta de sonido con vúmetros en naranja, barras tachadas con rotulador negro",
    sensoryAtmosphere: "Sudor frío en la nuca, café frío sin azúcar en vaso de cartón, zumbido de alta frecuencia en los monitores de campo cercano",
    antiClicheDirectives: [
      "Evitar frases vacías como 'cocinando en el trap' o 'haciendo palos'",
      "Enfocar en la resistencia física, la vigilia y la disciplina de la cadencia",
      "No romantizar el insomnio sin mostrar su desgaste físico",
    ],
    suggestedAction: "Retratar la compulsión de no abandonar la cabina hasta que el fraseo encaje al milímetro",
  },
  {
    id: "camara_de_seguridad",
    name: "Cámara de Seguridad",
    motifType: "spatial_tension",
    dramaticTension: "Sensación constante de estar registrado por ópticas ajenas",
    coreMotif: "El objetivo gran angular del portal, el reflejo en el cristal tintado",
    sensoryAtmosphere: "Tubo fluorescente parpadeando a 50 Hz, corriente de aire frío en el portal, sombra alargada en la acera mojada",
    antiClicheDirectives: [
      "Evitar clichés de persecución policial exagerada",
      "Anclar en el instinto de caminar sin mirar arriba pero sabiendo dónde está cada lente",
      "No exagerar con jerga técnica de espionaje fuera de tono",
    ],
    suggestedAction: "Describir el movimiento milimétrico de quien calcula cada pisada para no dejar traza",
  },
  {
    id: "deuda_de_tiempo",
    name: "Deuda de Tiempo",
    motifType: "emotional_contradiction",
    dramaticTension: "El tiempo vital que se esfuma frente a promesas atrasadas",
    coreMotif: "El segundero del reloj avanzando implacable frente a sobres cerrados sin abrir",
    sensoryAtmosphere: "Olor a gasolina residual en las manos, el pitido en el tímpano tras la noche, papel de carta arrugado en el bolsillo",
    antiClicheDirectives: [
      "Evitar nostalgia barata o autocompasión",
      "Enfocar en la determinación sin disculpas de quien no tiene margen de retroceso",
      "Prohibido usar arrepentimientos sentimentales blandos",
    ],
    suggestedAction: "Escribir con la cadencia urgente de quien sabe que cada barra consumida cuesta caro",
  },
  {
    id: "contradiccion_de_calle_y_fe",
    name: "Contradicción de Calle y Fe",
    motifType: "physical_image",
    dramaticTension: "Transgresión necesaria y búsqueda de protección espiritual",
    coreMotif: "Medalla bendecida chocando rítmicamente contra la cremallera de la chaqueta oscura",
    sensoryAtmosphere: "Brillo apagado del oro viejo, olor a asfalto tras la tormenta de verano, murmullo de protección antes de acelerar",
    antiClicheDirectives: [
      "Evitar sermoneo religioso o poses de santo redimido",
      "Plasmar la contradicción cruda del superviviente: pedir perdón mientras se hace lo necesario",
      "No convertir los símbolos religiosos en meros complementos de joyería",
    ],
    suggestedAction: "Explorar la dualidad entre ensuciarse las manos y exigir que la familia quede al margen",
  },
  {
    id: "velocidad_y_desgaste",
    name: "Velocidad y Desgaste",
    motifType: "behavioral_action",
    dramaticTension: "Aceleración desmedida como única vía de evasión mental",
    coreMotif: "La aguja del velocímetro cruzando la línea roja en el tramo desierto de la M-30",
    sensoryAtmosphere: "Viento cortante colándose al bajar un dedo de la ventanilla, luces del túnel fundiéndose en líneas continuas",
    antiClicheDirectives: [
      "Evitar relatos de videojuego tipo Need for Speed",
      "Anclar en el vértigo interno de quien prefiere el impacto antes que el freno",
      "Evitar nombres de marcas de coches si no aportan textura física",
    ],
    suggestedAction: "Transmitir la inercia irreversible del que solo encuentra calma a máxima velocidad",
  },
  {
    id: "sombra_en_el_bloque",
    name: "Sombra en el Bloque",
    motifType: "physical_image",
    dramaticTension: "La gravedad ineludible de las raíces y el origen",
    coreMotif: "Escaleras de caracol con pintura agrietada, la mirilla con sombra del descansillo",
    sensoryAtmosphere: "Olor a comida de olla y humedad en el rellano, eco de risas lejanas amortiguadas por puertas de contrachapado",
    antiClicheDirectives: [
      "Evitar el victimismo de barrio empobrecido o la lágrima fácil",
      "Proyectar memoria viva, deuda de orgullo y respeto crudo a quienes sostuvieron la base",
      "Cero discursos morales de superación",
    ],
    suggestedAction: "Contrastar el suelo que pisas hoy con el portal de donde saliste",
  },
  {
    id: "pesadumbre_post_drop",
    name: "Pesadumbre Post-Drop",
    motifType: "sensory_detail",
    dramaticTension: "El vacío sordo tras la descarga de adrenalina",
    coreMotif: "Suelo pegajoso con confeti pisado, vaso volcado sobre la barra de aluminio",
    sensoryAtmosphere: "Oídos embotados por el rebote del subgrave, sequedad de garganta, la claridad hiriente del amanecer a las 7 AM",
    antiClicheDirectives: [
      "Evitar glorificación fiestera o postureo de club vip",
      "Anclar en la fatiga muscular y la resaca de dopamina al terminarse el show",
      "No usar descripciones alegres de consumo desmedido",
    ],
    suggestedAction: "Cantar con la voz grave y rasgada del que ya no busca aplausos sino descanso",
  },
  {
    id: "equilibrio_de_poder",
    name: "Equilibrio de Poder",
    motifType: "spatial_tension",
    dramaticTension: "Mesa de negociación donde cada pausa es una amenaza velada",
    coreMotif: "Dos terminales apagados boca abajo sobre la mesa, la maleta que nadie abre primero",
    sensoryAtmosphere: "Aire acondicionado zumbando a mínima temperatura, vasos con vaho condensado, silencios largos entre palabra y palabra",
    antiClicheDirectives: [
      "Evitar fanfarronadas de mafioso de película",
      "Usar contención verbal, silencios rítmicos y dobles lecturas",
      "No presumir de violencia explícita innecesaria",
    ],
    suggestedAction: "Mantener la cadencia pausada, midiendo cada sílaba como una ficha pesada sobre el tablero",
  },
  {
    id: "hambre_residual",
    name: "Hambre Residual",
    motifType: "emotional_contradiction",
    dramaticTension: "La inercia psicológica de escasez que ninguna riqueza borra",
    coreMotif: "La despensa llena pero la costumbre refleja de comer rápido, mirar el saldo antes de cada compra",
    sensoryAtmosphere: "Crujido de bolsas plásticas, el chirrido de la persiana metálica subiendo al amanecer, café recalentado",
    antiClicheDirectives: [
      "Evitar falsa modestia o humildad impostada",
      "Mostrar la cicatriz mental imborrable del que creció con la cuenta a cero",
      "No presentar el dinero como solución mágica a la paranoia",
    ],
    suggestedAction: "Enfatizar la contradicción de ganar sin poder bajar la guardia jamás",
  },
] as const;

/**
 * Deterministic JSON stringifier that recursively sorts object keys.
 */
export function canonicalJsonStringify(val: unknown): string {
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map(canonicalJsonStringify).join(",")}]`;
  }
  const keys = Object.keys(val as Record<string, unknown>).sort();
  const pairs = keys.map(
    k => `${JSON.stringify(k)}:${canonicalJsonStringify((val as Record<string, unknown>)[k])}`
  );
  return `{${pairs.join(",")}}`;
}

/**
 * Computes a SHA-256 canonical hash of any object or primitive.
 */
export function hashCanonical(val: unknown): string {
  const json = canonicalJsonStringify(val);
  return createHash("sha256").update(json).digest("hex");
}

/**
 * Extracts a strictly structural fingerprint of a song's layout.
 * Guarantees that section voices, artist assignments, tags, or names
 * do NOT alter the fingerprint — only section type and target bars count.
 */
export function computeStructureFingerprint(
  structure?: SongStructure | { sections: Array<{ type: string; targetBars?: number; bars?: number | unknown[]; defaultBars?: number }> }
): string {
  if (!structure || !structure.sections || structure.sections.length === 0) {
    return hashCanonical({ sections: [] });
  }

  const structuralSections = structure.sections.map(section => {
    let resolvedBars = 8;
    if (typeof (section as any).targetBars === "number") {
      resolvedBars = (section as any).targetBars;
    } else if (typeof section.bars === "number") {
      resolvedBars = section.bars;
    } else if (Array.isArray(section.bars)) {
      resolvedBars = section.bars.length;
    } else if (typeof (section as any).defaultBars === "number") {
      resolvedBars = (section as any).defaultBars;
    }

    return {
      type: section.type,
      targetBars: resolvedBars,
    };
  });

  return hashCanonical({ sections: structuralSections });
}

/**
 * Builds the canonical intent object according to Step 4 contract:
 * - schemaVersion: "1"
 * - motifEngineVersion: "v2"
 * - moodId: lowercased/trimmed
 * - customTopic: lowercased/trimmed
 * - topics: trimmed, lowercased, and lexicographically sorted
 * - structureFingerprint: pure structural fingerprint
 */
export function buildCanonicalIntent(params: {
  moodId: string;
  customTopic?: string;
  topics: string[];
  structure?: SongStructure | { sections: Array<{ type: string; targetBars?: number; bars?: unknown[] }> };
  structureFingerprint?: string;
}): CanonicalIntent {
  const structureFingerprint =
    params.structureFingerprint ?? computeStructureFingerprint(params.structure);

  return {
    schemaVersion: "1",
    motifEngineVersion: "v2",
    moodId: (params.moodId || "").trim().toLowerCase(),
    customTopic: (params.customTopic || "").trim().toLowerCase(),
    topics: [...params.topics].map(t => t.trim().toLowerCase()).sort(),
    structureFingerprint,
  };
}

/**
 * Computes the generation intent hash from a canonical intent.
 */
export function computeGenerationIntentHash(intent: CanonicalIntent): string {
  return hashCanonical(intent);
}

/**
 * Deterministically selects a DramaticMotif from DRAMATIC_MOTIF_CATALOG using the generationIntentHash.
 */
export function selectDramaticMotif(generationIntentHash: string): DramaticMotif {
  const hex = generationIntentHash.replace(/^[^a-f0-9]*/i, "").slice(0, 8);
  const num = parseInt(hex || "0", 16);
  const index = Math.abs(num) % DRAMATIC_MOTIF_CATALOG.length;
  return DRAMATIC_MOTIF_CATALOG[index];
}

const ABSTRACT_THEME_KEYWORDS = new Set([
  "lealtad", "traicion", "traición", "respeto", "envidia", "paranoia", "fe",
  "soledad", "superacion", "superación", "exito", "éxito", "ambicion", "ambición",
  "calle", "barrio", "familia", "venganza", "amor", "desamor", "tristeza",
  "dolor", "rabia", "muerte", "tiempo", "paz", "esfuerzo", "disciplina",
  "fama", "silencio", "vacio", "vacío", "presion", "presión", "ego", "orgullo",
  "nostalgia", "memoria", "destino", "lucha", "hambre", "codicia", "frialdad"
]);

/**
 * Classifies a user topic or custom topic into an ontological TopicIntent:
 * - named_entity: tokens, brands, locations, people, specific proper nouns. Available literally, without repetition quota.
 * - abstract_theme: ethical concepts, emotions, psychological tensions. Preserved via dramatic intent, conduct, and facts.
 */
export function classifyTopicIntent(topic: string): TopicIntent {
  const trimmed = (topic || "").trim();
  const lower = trimmed.toLowerCase();

  // Check known abstract themes
  const tokens = lower.split(/[\s,]+/);
  const isAbstract =
    ABSTRACT_THEME_KEYWORDS.has(lower) ||
    tokens.some((t) => ABSTRACT_THEME_KEYWORDS.has(t)) ||
    /^(?:la |el |las |los )?(?:lealtad|traici[óo]n|calle|familia|soledad|paranoia|respeto|superaci[óo]n)\b/i.test(lower);

  // Check for specific named entities: crypto, brands, places, people, or capitalized proper nouns
  const isCryptoOrBrand =
    /\b(?:cardano|bitcoin|ethereum|solana|crypto|btc|eth|ada|rolls|royce|maybach|mercedes|ferrari|lambo|patek|rolex|glock|atlanta|miami|madrid|barcelona|compton|detroit|memphis|brooklyn|chicago|shiesty|curry|jordan)\b/i.test(
      lower
    );

  const hasCapitalization = /^[A-Z]/.test(trimmed) && !isAbstract;

  if (isCryptoOrBrand || hasCapitalization) {
    return {
      kind: "named_entity",
      value: trimmed,
      preservation: "lexical_available",
    };
  }

  if (isAbstract) {
    return {
      kind: "abstract_theme",
      value: trimmed,
      preservation: "semantic_intent",
    };
  }

  // Default fallback: if capitalized -> named entity; otherwise abstract theme
  if (/[A-Z]/.test(trimmed)) {
    return {
      kind: "named_entity",
      value: trimmed,
      preservation: "lexical_available",
    };
  }

  return {
    kind: "abstract_theme",
    value: trimmed,
    preservation: "semantic_intent",
  };
}

/**
 * Resolves Semantic Scene Framing: Translates topics into situational tension and dramaturgical roles.
 * Avoids rigid keyword lists or substitute dictionaries.
 */
export function resolveSemanticSceneFraming(
  topics: string[],
  customTopic?: string,
  situationalPresetId?: string
): { topicIntents: TopicIntent[]; framing: SemanticSceneFraming } {
  const allRaw = [customTopic, ...topics].filter(Boolean) as string[];
  const topicIntents = allRaw.map(classifyTopicIntent);

  const preset =
    situationalPresetId && situationalPresetId !== "none"
      ? getSceneById(situationalPresetId)
      : null;

  if (preset) {
    return {
      topicIntents,
      framing: {
        dominantSemanticRole: `situational_${preset.id}`,
        situation: preset.atmosphere,
        tension: preset.conflict,
        dramaticFunction: preset.sceneTurn || "desarrollar la tensión rítmica y dramática del momento",
      },
    };
  }

  const combinedLower = allRaw.join(" ").toLowerCase();

  // 1. Digital value / crypto under pressure
  if (/\b(?:cardano|bitcoin|crypto|wallet|ada|cifrado|claves|llaves|digital)\b/i.test(combinedLower)) {
    return {
      topicIntents,
      framing: {
        dominantSemanticRole: "digital_value_under_pressure",
        situation: "espacio cerrado, terminales con saldo cifrado y vigilancia constante del entorno exterior",
        tension: "contraste entre el valor intangible custodiado en la red y la vulnerabilidad física tangible en el asfalto",
        dramaticFunction: "mostrar el peso y la frialdad de la custodia digital sin eslóganes de folleto financiero ni clichés corporativos",
      },
    };
  }

  // 2. Loyalty / betrayal / street code
  if (/\b(?:lealtad|traici[óo]n|respeto|codigo|código|hermano|familia)\b/i.test(combinedLower)) {
    return {
      topicIntents,
      framing: {
        dominantSemanticRole: "fractured_trust_and_street_code",
        situation: "reunión nocturna en un vehículo o descansillo con teléfonos boca abajo",
        tension: "la sospecha silenciosa de que alguien del círculo cercano no resistirá la presión exterior",
        dramaticFunction: "revelar la lealtad a través de acciones concretas, silencios y cautela táctica, sin discursos morales de autoayuda",
      },
    };
  }

  // 3. Ambition / sports / competitive precision
  if (/\b(?:baloncesto|basket|nba|curry|deporte|cancha|partido|juego)\b/i.test(combinedLower)) {
    return {
      topicIntents,
      framing: {
        dominantSemanticRole: "competitive_precision_under_clock",
        situation: "espacio de concentración solitaria, el asfalto o la pista vacía a altas horas",
        tension: "la necesidad de no errar el tiro cuando no hay margen de error ni segundas oportunidades",
        dramaticFunction: "anclar la competitividad en la disciplina física y la ejecución milimétrica, sin narraciones de retransmisión televisiva",
      },
    };
  }

  // 4. Fallback: Street authenticity & territorial tension
  return {
    topicIntents,
    framing: {
      dominantSemanticRole: "street_authenticity_and_territorial_presence",
      situation: "asfalto nocturno, movimiento coordinado y perímetro bajo control",
      tension: "mantener la compostura y la firmeza frente al asedio exterior sin ceder terreno",
      dramaticFunction: "anclar cada compás en hechos físicos, ritmo pesado y detalles táctiles sin frases genéricas de relleno",
    },
  };
}

/**
 * Synthesizes topics + situational scene/structure into an organic Semantic Anchor (Step 4 Canonical).
 * Prevents mechanical repetition of topic nouns and equips the Topliner and Ghostwriter with
 * rich sensory textures, anti-cliché directives, and canonical intent hashing.
 */
export function synthesizeSemanticAnchor(params: {
  topics: string[];
  customTopic?: string;
  situationalPresetId?: string;
  artistId: string;
  moodId: string;
  structure?: SongStructure | { sections: Array<{ type: string; targetBars?: number; bars?: unknown[] }> };
  structureFingerprint?: string;
}): SemanticAnchor {
  const scene =
    params.situationalPresetId && params.situationalPresetId !== "none"
      ? getSceneById(params.situationalPresetId)
      : null;
  const artist = getArtistById(params.artistId);

  // 1. Build canonical intent & deterministic generation hash
  const canonicalIntent = buildCanonicalIntent({
    moodId: params.moodId,
    customTopic: params.customTopic,
    topics: params.topics,
    structure: params.structure,
    structureFingerprint: params.structureFingerprint,
  });
  const generationIntentHash = computeGenerationIntentHash(canonicalIntent);
  const dramaticMotif = selectDramaticMotif(generationIntentHash);

  // 2. Resolve Semantic Scene Framing and Topic Intents
  const { topicIntents, framing } = resolveSemanticSceneFraming(
    params.topics,
    params.customTopic,
    params.situationalPresetId
  );

  // 3. Extract literalization penalty words (words that should not be mindlessly repeated 10 times in the hook)
  const penaltyWords: string[] = [];
  if (params.customTopic) {
    const rawTokens = params.customTopic
      .split(/\s+/)
      .map(t => t.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, "").toLowerCase());
    for (const t of rawTokens) {
      if (t.length > 3 && !["para", "como", "esta", "este", "sobre", "desde", "fumar"].includes(t)) {
        penaltyWords.push(t);
      }
    }
  }

  // 4. Case A: Situational scene explicitly chosen by user
  if (scene) {
    return {
      anchorType: "physical_image",
      title: `Escenario: ${scene.title}`,
      sensoryDescription: scene.atmosphere,
      emotionalAxis: `${scene.conflict} (${scene.emotionalState})`,
      suggestedAction: scene.sceneTurn || "desarrollar la tensión lírica y rítmica del momento",
      literalizationPenaltyWords: penaltyWords,
      structureFingerprint: canonicalIntent.structureFingerprint,
      generationIntentHash,
      dramaticMotifId: dramaticMotif.id,
      antiClicheDirectives: dramaticMotif.antiClicheDirectives,
      topicIntents,
      framing,
    };
  }

  // 5. Case B: Dynamic anti-cliché anchor driven by canonical dramatic motif
  const userTopicString = [params.customTopic, ...params.topics].filter(Boolean).join(", ");
  const topicLabel = userTopicString || "Vida nocturna, ambición y calle";

  return {
    anchorType: dramaticMotif.motifType,
    title: `Eje Temático: ${topicLabel} — ${dramaticMotif.name}`,
    sensoryDescription: `${dramaticMotif.sensoryAtmosphere}. Desarrolla ${topicLabel} con la cadencia y flow natural de ${artist?.name ?? "el artista"}.`,
    emotionalAxis: `${dramaticMotif.dramaticTension}. Mood: "${params.moodId}". Directivas anti-cliché: ${dramaticMotif.antiClicheDirectives.join("; ")}.`,
    suggestedAction: `${dramaticMotif.suggestedAction}. Anclar barras en ${dramaticMotif.coreMotif}.`,
    literalizationPenaltyWords: penaltyWords,
    structureFingerprint: canonicalIntent.structureFingerprint,
    generationIntentHash,
    dramaticMotifId: dramaticMotif.id,
    antiClicheDirectives: dramaticMotif.antiClicheDirectives,
    topicIntents,
    framing,
  };
}

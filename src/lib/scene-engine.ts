// Scene Engine — Dramatic world-building, sensory imagery, and chronological time progression
// Prevents checklist overfitting by separating Facts (what is) from Imagery (what is sensed) and enforcing the Scene Turn.

export interface TimeTransition {
  kind: "minutes" | "hours" | "sunrise" | "sunset" | "next_day" | "custom";
  amount?: number;
  description?: string;
}

export interface SceneProgression {
  section: "intro" | "verse1" | "hook" | "verse2" | "bridge" | "outro";
  objective: string;
  emotionalShift?: string;
  timeTransition?: TimeTransition;
}

export interface SituationalScene {
  id: string;
  category:
    | "calle_vigilancia"
    | "lujo_alienacion"
    | "traicion_venganza"
    | "estudio_obsesion"
    | "policia_tension"
    | "supervivencia_deuda"
    | "negocio_desconfianza"
    | "toxicidad_frialdad"
    | "exceso_resaca";
  title: string;
  badge: string;
  tagline: string;

  setting: string;              // Concrete physical place: "Parking subterráneo nivel -3"
  atmosphere: string;           // Sensory air: "Lluvia golpeando la chapa, vapor en el cristal, neón rojo parpadeando"
  conflict: string;             // Central friction: "Una llamada entrante de tu mano derecha que decides no coger"
  emotionalState: string;       // Protagonist's internal weather: "Frialdad anestésica, paranoia vigilante"

  sceneFacts: string[];         // Invariant facts (plot points that remain true)
  sceneImagery: string[];       // Concrete sensory images (touch, smell, sight, sound)
  anchorObjects: string[];      // Physical touchstones in the scene

  forbiddenAssumptions: string[];// Hard narrative bounds (e.g. "No asumir muerte", "No asumir tiroteo")
  forbiddenFacts: string[];      // Strictly prohibited factual inventions

  sceneTurn: string;            // The critical pivot: "ALGO HA CAMBIADO EN EL VERSO 2"
  initialTimeState: string;     // Starting timestamp: "4:37 AM"
  progressions: SceneProgression[];
}

export interface NarrativeContinuityState {
  establishedFacts: string[];
  activeConflict: string;
  emotionalState: string;
  unresolvedThreads: string[];

  sceneLocation: string;
  timeState: string;
  characterState: string;

  // Negative Memory: Words, metaphors and rhymes already spent that MUST NOT be repeated
  usedImagery: string[];
  usedObjects: string[];
  usedMetaphors: string[];
  repeatedConcepts: string[];
  recentRhymes: string[];
  recentPhrases: string[];
}

/**
 * 9 Canonical Situational Scenes covering the full emotional and dramatic spectrum of trap & hip-hop.
 */
export const SCENE_CATALOG: SituationalScene[] = [
  {
    id: "paranoia_nocturna",
    category: "calle_vigilancia",
    title: "Paranoia a las 4 AM",
    badge: "👁️ Vigilancia & Asedio",
    tagline: "Luces apagadas, mirilla de la puerta y la pantalla del móvil quemando la retina.",
    setting: "Salón con persianas metálicas bajadas a ras de suelo, piso octavo",
    atmosphere: "Silencio denso de madrugada, motor diésel ralentizando en la calle, estática de televisión muda",
    conflict: "Llamada sin identificador que entra por tercera vez consecutiva a deshoras",
    emotionalState: "Hipervigilancia helada, desconfianza absoluta de las sombras en el portal",
    sceneFacts: [
      "Son las 4:37 AM de un martes lluvioso",
      "El teléfono seguro vibra contra la mesa de cristal templado",
      "Hay una patrulla camuflada parada a media manzana que no apaga las luces de posición",
      "La llave del coche está sobre la encimera lista para salir",
    ],
    sceneImagery: [
      "Reflejo verdoso de las persianas sobre el suelo de parquet",
      "El zumbido del frigorífico cortando la respiración",
      "Luz azul de la pantalla iluminando ojeras y tabaco a medio liar",
      "El metal frío del cerrojo al pasar el pestillo con la yema del dedo",
    ],
    anchorObjects: ["Teléfono sin tarjeta", "Balanza de precisión apagada", "Chaqueta impermeable oscura", "Cenicero de cristal colmado"],
    forbiddenAssumptions: [
      "Prohibido asumir que la policía ya derribó la puerta",
      "Prohibido asumir un tiroteo inmediato",
      "Prohibido inventar muertes de familiares que no están en la escena",
    ],
    forbiddenFacts: ["No afirmar detención ni esposas", "No afirmar heridos"],
    sceneTurn: "El teléfono deja de sonar de golpe. Se escucha el portazo de un coche cerrándose justo debajo de la ventana.",
    initialTimeState: "4:37 AM",
    progressions: [
      { section: "intro", objective: "Establecer la quietud amenazante y el zumbido de la habitación", timeTransition: { kind: "minutes", amount: 0 } },
      { section: "verse1", objective: "Detallar la vigilia, el mapa mental de la calle y el teléfono vibrando", timeTransition: { kind: "minutes", amount: 4 } },
      { section: "hook", objective: "Mantra hipnótico sobre el precio de no dormir y la lealtad que no se compra" },
      { section: "verse2", objective: "Ejecutar el giro: el portazo en la calle, apagar la última luz y tomar una decisión sin titubear", timeTransition: { kind: "minutes", amount: 8 } },
      { section: "outro", objective: "Desvanecer la escena con el motor arrancando en la lluvia lejana" },
    ],
  },
  {
    id: "suite_alienacion",
    category: "lujo_alienacion",
    title: "Penthouse de Lujo & Vacío",
    badge: "🏨 Lujo Helado & Aislamiento",
    tagline: "Cama king size, servicio de habitaciones intacto y soledad absoluta en el piso 40.",
    setting: "Suite presidencial de hotel cinco estrellas con ventanales de suelo a techo",
    atmosphere: "Aire acondicionado zumbando en 19 grados, luces de la metrópoli pareciendo puntos inmóviles",
    conflict: "Haber conseguido el cheque millonario y darse cuenta de que no hay a quién llamar con sinceridad",
    emotionalState: "Anestesia emocional, náusea del exceso, distancia cínica de los aduladores",
    sceneFacts: [
      "Contrato firmado sobre la mesa de mármol con el logo de la multinacional",
      "Dos botellas de champagne francés abiertas en la cubitera con el hielo ya derretido",
      "Quince mensajes de felicitación de números que no tienes guardados",
      "El minibar abierto de par en par",
    ],
    sceneImagery: [
      "Albornoz blanco pesado arrastrando por la moqueta",
      "Vaho en el cristal de la ventana que da al horizonte de rascacielos",
      "El chasquido metálico de la tarjeta magnética en la ranura de la suite",
      "Zapatillas de hotel nuevas pisando gotas de agua derramada",
    ],
    anchorObjects: ["Tarjeta magnética dorada", "Reloj suizo sobre el recibo de la suite", "Bandeja de fruta sin probar", "Maleta Louis Vuitton a medio deshacer"],
    forbiddenAssumptions: [
      "No convertir esto en una fiesta multitudinaria: el protagonista está solo o con compañía puramente transaccional",
      "No inventar bancarrota repentina",
    ],
    forbiddenFacts: ["El éxito financiero es real y comprobado; el conflicto es el desierto psicológico"],
    sceneTurn: "El agente llama para confirmar la rueda de prensa de las 9:00 AM; el protagonista borra el mensaje y se sirve agua del grifo.",
    initialTimeState: "5:12 AM",
    progressions: [
      { section: "intro", objective: "Presentar la vista panorámica de la ciudad desde las alturas y el frío de la suite" },
      { section: "verse1", objective: "Contrastar las cifras bancarias con el silencio sepulcral de la habitación" },
      { section: "hook", objective: "Hook melódico envolvente sobre cómo el mármol no abriga cuando la noche se acaba" },
      { section: "verse2", objective: "Giro: la llamada del negocio a punto de amanecer y la certeza de que ya no se puede volver atrás" },
      { section: "outro", objective: "Cierre con eco distante y el ascensor marcando el descenso" },
    ],
  },
  {
    id: "traicion_circulo",
    category: "traicion_venganza",
    title: "Círculo Roto & Traición Fría",
    badge: "🐍 Serpientes en la Mesa",
    tagline: "Descubrir que quien comía en tu mesa filtró tus movimientos al enemigo.",
    setting: "Mesa reservada al fondo de un restaurante a puerta cerrada tras el servicio",
    atmosphere: "Copas vacías, humo de puros cortando la luz de las lámparas tenues, miradas esquivas",
    conflict: "Tener sobre el mantel la prueba física de la filtración sin que el traidor sepa que lo descubriste",
    emotionalState: "Calma glacial, rencor matemático, compostura absoluta sin levantar la voz",
    sceneFacts: [
      "Una captura de pantalla impresa colocada boca abajo sobre el mantel blanco",
      "El socio de la infancia sentado enfrente riéndose de una anécdota antigua",
      "Dos personas de seguridad paradas junto a la puerta de salida",
      "La cuenta pagada íntegramente de antemano",
    ],
    sceneImagery: [
      "El hielo tintineando en el vaso de whisky",
      "La sonrisa forzada del socio que no sostiene la mirada más de tres segundos",
      "El humo subiendo recto sin que nadie sople",
      "Las manos tranquilas entrelazadas sobre la mesa",
    ],
    anchorObjects: ["Sobre cerrado sin remitente", "Encendedor de latón pesado", "Anillo con sello familiar", "Llaves del garaje privado"],
    forbiddenAssumptions: ["Prohibido violencia física explícita o tiroteo en el restaurante", "La venganza es un corte frío y definitivo"],
    forbiddenFacts: ["No afirmar perdón ni reconciliación"],
    sceneTurn: "Le das la vuelta al papel sobre la mesa, le empujas la copa y te levantas sin pronunciar su nombre.",
    initialTimeState: "1:45 AM",
    progressions: [
      { section: "intro", objective: "Tensión contenida en la mesa de comensales, cordialidad falsa" },
      { section: "verse1", objective: "Rememorar los comienzos compartidos contrastándolos con las señales de envidia reciente" },
      { section: "hook", objective: "Gancho punchline seco sobre por qué los platos vacíos atraen a perros hambrientos" },
      { section: "verse2", objective: "El giro: poner la prueba en la mesa, cortar la respiración del socio y la salida sin retorno" },
      { section: "outro", objective: "Palabras secas finales al camarero y el portazo de la berlina" },
    ],
  },
  {
    id: "estudio_obsesion",
    category: "estudio_obsesion",
    title: "Sesión Obsesiva de Estudio",
    badge: "🎙️ Encierro & 72 Horas",
    tagline: "Café frío, ceniceros desbordados y la búsqueda neurótica del corte perfecto.",
    setting: "Cabina de grabación insonorizada de paredes de madera oscura y espuma acústica",
    atmosphere: "Olor a tabaco añejo, luces led rojas indirectas, fatiga auditiva de 14 horas repitiendo el mismo loop",
    conflict: "El productor propone cerrar la sesión pero el protagonista sabe que el compás 8 todavía no tiene peso",
    emotionalState: "Perfeccionismo maníaco, cansancio físico superado por la adrenalina creativa",
    sceneFacts: [
      "El reloj de la pared marca las 6:15 AM de la tercera noche consecutiva",
      "Hay tres pantallas de ordenador mostrando pistas de Pro Tools saturadas de ondas",
      "Tazas de café desechables apiladas junto al teclado MIDI",
      "El micro Neumann U87 tiene el antipop gastado",
    ],
    sceneImagery: [
      "Los cascos apretando las sienes con calor",
      "La voz saliendo rasposa antes del trago de agua templada",
      "El haz de luz led roja reflejado en el cristal que separa la cabina de la consola",
      "El pie marcando el compás involuntariamente contra la moqueta",
    ],
    anchorObjects: ["Micrófono de condensador", "Cuaderno con barras tachadas con rotulador", "Tarjeta de sonido con luces parpadeando en naranja", "Botella de agua sin gas"],
    forbiddenAssumptions: ["No convertir la sesión en una fiesta; es un laboratorio de trabajo febril"],
    forbiddenFacts: ["La música producida es de primer nivel, no un fracaso"],
    sceneTurn: "El productor baja los faders por error, el beat entra a pelo en solo bajo 808 y la barra encaja de forma magistral.",
    initialTimeState: "6:15 AM",
    progressions: [
      { section: "intro", objective: "Charla de cabina al micro pidiendo subir los auriculares y ajustar el compresor" },
      { section: "verse1", objective: "Describir el desgaste mental, las barras reescritas y la distancia del mundo exterior" },
      { section: "hook", objective: "Mantra rítmico bailable sobre no salir de la cueva hasta que el tema sea inmortal" },
      { section: "verse2", objective: "Giro: el hallazgo del flow definitivo en la toma 14 y la energía que renace con el sol asomando" },
      { section: "outro", objective: "Playback a todo volumen sonando de fondo mientras se apagan los monitores" },
    ],
  },
  {
    id: "control_policial",
    category: "policia_tension",
    title: "Control Policial en la Autovía",
    badge: "🚔 Luces en el Retrovisor",
    tagline: "Sirenas azules detrás, pulso a mil y la guantera que no puede abrirse.",
    setting: "Carretera secundaria desierta a dos kilómetros de la entrada de la autovía",
    atmosphere: "Destellos azules rotativos barriendo el techo del coche cada dos segundos, lluvia fina en la luna delantera",
    conflict: "Obligación de mantener una voz completamente serena mientras el agente camina hacia la ventanilla con linterna",
    emotionalState: "Terror domesticado, adrenalina concentrada en la garganta, cálculo frío de cada respuesta",
    sceneFacts: [
      "El coche está en punto muerto con el freno de mano puesto",
      "La guantera contiene cosas que costarían cinco años de condena",
      "El copiloto está rígido mirando al frente sin parpadear",
      "El retrovisor lateral refleja el uniforme acercándose despacio",
    ],
    sceneImagery: [
      "El vapor saliendo de la boca al bajar cuatro dedos de la ventanilla eléctrica",
      "El haz blanco cegador de la linterna entrando directo a los ojos",
      "El olor a ambientador de pino mezclado con la humedad del asfalto",
      "Los nudillos blancos por agarrar el volante",
    ],
    anchorObjects: ["Permiso de conducir sobre el salpicadero", "Guantera cerrada con llave", "Espejo retrovisor vibrando por el ralentí", "Linterna policial de alta potencia"],
    forbiddenAssumptions: ["Prohibido iniciar persecución armada o tiroteo cinematográfico irreal", "La tensión reside en no ser descubierto"],
    forbiddenFacts: ["No afirmar que fueron esposados ni descubiertos"],
    sceneTurn: "El agente comprueba el documento, golpea dos veces el techo del coche con los dedos y dice: 'Circulen despacio'.",
    initialTimeState: "3:20 AM",
    progressions: [
      { section: "intro", objective: "El sonido del intermitente y las luces azules pintando el habitáculo" },
      { section: "verse1", objective: "La respiración congelada, el copiloto petrificado y los pasos en la gravilla" },
      { section: "hook", objective: "Gancho de staccato seco sobre mantener la boca cerrada y la mirada al frente" },
      { section: "verse2", objective: "Giro: los segundos eternos con la linterna en la cara, la entrega del documento y el golpe en el techo de liberación" },
      { section: "outro", objective: "Meter primera marcha, soltar el embrague con las manos temblando y la carretera que se abre" },
    ],
  },
  {
    id: "supervivencia_deuda",
    category: "supervivencia_deuda",
    title: "Deuda Moral del Superviviente",
    badge: "🕊️ Recuerdos & Deuda",
    tagline: "Vivir en urbanizaciones seguras mientras los tuyos siguen esperando la visita en el patio.",
    setting: "Terraza de una casa unifamiliar recién comprada mirando a los jardines privados",
    atmosphere: "Mañana de domingo soleada y tranquila que parece una burla comparada con el pasado",
    conflict: "Saber que tu talento te sacó del lodo pero tus mejores amigos de infancia siguen cumpliendo condena",
    emotionalState: "Melancolía pesada, culpa no resuelta, compromiso inquebrantable de enviar giros mensuales",
    sceneFacts: [
      "Carta escrita a mano en papel rayado con sello del centro penitenciario sobre la mesa exterior",
      "El justificante bancario de la transferencia de pecunio realizada ayer",
      "El silencio del vecindario donde nadie te conoce ni sabe de dónde vienes",
      "La foto antigua plastificada en la cartera",
    ],
    sceneImagery: [
      "El césped recién regado oliendo a tierra limpia",
      "La tinta azul corrida de la carta por el sudor de las manos",
      "El sol pegando en la cara sin dar calor por dentro",
      "Los números de la condena anotados en una esquina",
    ],
    anchorObjects: ["Carta con matasellos de prisión", "Recibo de envío de dinero", "Café solo sin azúcar", "Cadena con medalla de recuerdo"],
    forbiddenAssumptions: ["No glorificar el crimen; la escena es sobre el coste humano y el dolor de los que se quedaron atrás"],
    forbiddenFacts: ["No inventar fugas de prisión"],
    sceneTurn: "Releer el último párrafo de la carta donde tu amigo te dice: 'No mires atrás por mí, haz que valga la pena'.",
    initialTimeState: "11:00 AM",
    progressions: [
      { section: "intro", objective: "Establecer la tranquilidad externa de la nueva vida y el peso de la carta sobre la mesa" },
      { section: "verse1", objective: "Narrar la visita en el locutorio a través del cristal y la sensación de salir al aire libre" },
      { section: "hook", objective: "Gancho melódico emotivo sobre la deuda de sangre que ningún contrato de discográfica cancela" },
      { section: "verse2", objective: "Giro: la frase de la carta que te prohíbe flaquear y la promesa de no aflojar el paso" },
      { section: "outro", objective: "Plegar la carta despacio y guardarla en el bolsillo interior" },
    ],
  },
];

/**
 * Finds a SituationalScene by ID.
 */
export function getSceneById(id: string): SituationalScene | undefined {
  return SCENE_CATALOG.find(s => s.id === id);
}

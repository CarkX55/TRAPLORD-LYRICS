import { getSceneById } from "./scene-engine";
import { getArtistById } from "./trap-data";

export interface SemanticAnchor {
  anchorType: "physical_image" | "sensory_detail" | "emotional_contradiction" | "spatial_tension" | "behavioral_action";
  title: string;
  sensoryDescription: string;
  emotionalAxis: string;
  suggestedAction: string;
  literalizationPenaltyWords: string[];
}

/**
 * Synthesizes topics + situational scene into an organic Semantic Anchor.
 * Prevents the Topliner/Hook Engine from turning user topics into a mechanical grocery list of nouns.
 */
export function synthesizeSemanticAnchor(params: {
  topics: string[];
  customTopic?: string;
  situationalPresetId?: string;
  artistId: string;
  moodId: string;
}): SemanticAnchor {
  const scene = params.situationalPresetId && params.situationalPresetId !== "none"
    ? getSceneById(params.situationalPresetId)
    : null;
  const artist = getArtistById(params.artistId);

  // Extract literalization penalty words (words that should not be mindlessly repeated 10 times in the hook)
  const penaltyWords: string[] = [];
  if (params.customTopic) {
    const rawTokens = params.customTopic.split(/\s+/).map(t => t.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, "").toLowerCase());
    for (const t of rawTokens) {
      if (t.length > 3 && !["para", "como", "esta", "este", "sobre", "desde", "fumar"].includes(t)) {
        penaltyWords.push(t);
      }
    }
  }

  // Determine sensory anchor type based on inputs
  if (scene) {
    return {
      anchorType: "physical_image",
      title: `Atmósfera en ${scene.title}`,
      sensoryDescription: scene.sceneImagery[0] || `${scene.anchorObjects[0] ?? "pantalla"} bajo la luz tenue`,
      emotionalAxis: `${scene.conflict} (${scene.emotionalState})`,
      suggestedAction: scene.sceneTurn || "mirar los números subir mientras el humo flota hacia el techo",
      literalizationPenaltyWords: penaltyWords,
    };
  }

  // Contextual fallback generation based on topics & customTopic
  const topicCombined = [params.customTopic, ...params.topics].filter(Boolean).join(" ").toLowerCase();
  
  if (topicCombined.includes("cardano") || topicCombined.includes("crypto") || topicCombined.includes("dinero") || topicCombined.includes("flex")) {
    return {
      anchorType: "sensory_detail",
      title: "Pantalla brillante & Silencio en la Suite",
      sensoryDescription: "Pantalla OLED con velas verdes iluminando el mármol en una habitación oscura",
      emotionalAxis: "Frío desapego, desconfianza hacia los que piden favores y certeza absoluta en el plan",
      suggestedAction: "borrar la notificación del banco sin abrirla mientras el bajo 808 retumba",
      literalizationPenaltyWords: penaltyWords,
    };
  }

  if (topicCombined.includes("calle") || topicCombined.includes("hermano") || topicCombined.includes("muertos") || topicCombined.includes("familia")) {
    return {
      anchorType: "behavioral_action",
      title: "Mesa Llena & Memoria Intacta",
      sensoryDescription: "Humo denso contra cristales tintados, una copa servida que nadie bebe",
      emotionalAxis: "Lealtad innegociable a los que no están y desprecio a las falsas alianzas",
      suggestedAction: "echar un trago al suelo antes de contar las ganancias en la mesa",
      literalizationPenaltyWords: penaltyWords,
    };
  }

  return {
    anchorType: "spatial_tension",
    title: "Aislamiento en la Cima",
    sensoryDescription: "Luces de la ciudad desde el piso 40, cristales empañados y cadenas pesadas",
    emotionalAxis: "Éxito solitario donde las palabras sobran y el ritmo manda",
    suggestedAction: "mirar el horizonte sin pestañear al entrar el beat",
    literalizationPenaltyWords: penaltyWords,
  };
}

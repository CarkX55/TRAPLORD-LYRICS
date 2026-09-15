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
      title: `Escenario: ${scene.title}`,
      sensoryDescription: scene.atmosphere,
      emotionalAxis: `${scene.conflict} (${scene.emotionalState})`,
      suggestedAction: scene.sceneTurn || "desarrollar la tensión lírica y rítmica del momento",
      literalizationPenaltyWords: penaltyWords,
    };
  }

  // Derive purely and organically from the user's topics and artist style — ZERO INJECTED PROPS
  const userTopicString = [params.customTopic, ...params.topics].filter(Boolean).join(", ");
  const topicLabel = userTopicString || "Vida nocturna, ambición y calle";

  return {
    anchorType: "emotional_contradiction",
    title: `Eje Temático: ${topicLabel}`,
    sensoryDescription: `Desarrolla la temática elegida (${topicLabel}) con la actitud, vocabulario y flow natural de ${artist?.name ?? "el artista"}.`,
    emotionalAxis: `Actitud y tono auténtico: transmitir el mood "${params.moodId}" con rimas fluidas y expresión callejera orgánica, sin palabras forzadas.`,
    suggestedAction: `Escribir barras musicales con fraseo completo y rima real en torno a ${topicLabel}.`,
    literalizationPenaltyWords: penaltyWords,
  };
}

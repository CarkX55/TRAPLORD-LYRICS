import {
  buildHolisticPrompt,
  buildStage2GhostwriterPrompt,
  buildSystemPrompt,
  type PromptParams,
} from "../src/lib/prompt-builder";
import { BPM_VIBES, STRUCTURES } from "../src/lib/trap-data";

console.log("=================================================================");
console.log("🧪 TEST: VERIFICACIÓN DE ESTILO PERSONAL POR ARTISTA EN SECCIONES");
console.log("=================================================================");

const testParams: PromptParams = {
  artistId: "future",
  featureArtistId: "travis_scott",
  moodId: "oscuro",
  topics: ["Calle", "Noche"],
  customTopic: "Encuentro en el estudio a las 4 AM",
  spanglishPercent: 30,
  bpmVibe: BPM_VIBES[5],
  structure: STRUCTURES[0], // Intro, Verse 1, Chorus, Verse 2, Chorus, Outro
  narrativeArcId: "none",
  narrativeArcDesc: "",
  producerId: "metro_boomin",
  producerTag: "Metro Boomin want some more",
  customDictionary: "plug, racks",
  dynamicMarkers: true,
  sectionVoices: [
    { sectionName: "Verse 1", voice: "main" }, // Future
    { sectionName: "Chorus", voice: "feature" }, // Travis Scott
    { sectionName: "Verse 2", voice: "duki" }, // Duki como invitado especial en el Verso 2
  ],
};

// 1. Probar buildHolisticPrompt
console.log("1. Probando buildHolisticPrompt con Duki en Verse 2...");
const holisticPrompt = buildHolisticPrompt(testParams);

if (!holisticPrompt.includes("Voz Invitada [Duki]")) {
  throw new Error("❌ Error: buildHolisticPrompt no incluyó a Duki como Voz Invitada en CAPA 3");
}
if (!holisticPrompt.includes("Aislamiento Dialectal entre Artistas")) {
  throw new Error("❌ Error: Falta la directiva de aislamiento dialectal");
}
if (!holisticPrompt.includes("[INTÉRPRETE: Duki")) {
  throw new Error("❌ Error: buildHolisticPrompt no asignó la directiva de flow de Duki en Verse 2");
}
console.log("   ✅ CAPA 3 incluye Duki con su timbre, cadencia y dialecto.");
console.log("   ✅ CAPA 4 incluye directiva de flow e intérprete de Duki en Verse 2.");

// 2. Probar Regeneración de Sección individual (Verse 2 con Duki)
console.log("2. Probando buildSystemPrompt para regenerar Verse 2 (Duki)...");
const regenParams: PromptParams = {
  ...testParams,
  regenerateSection: {
    sectionName: "Verse 2",
    keepContext: "[Verse 1: Future]\nLíneas previas...",
  },
};
const regenPrompt = buildSystemPrompt(regenParams);

if (!regenPrompt.includes("Duki") || !regenPrompt.includes("argentino") && !regenPrompt.includes("Argentina") && !regenPrompt.includes("Buenos Aires")) {
  console.log("Regen Prompt fragment:", regenPrompt.slice(0, 600));
  throw new Error("❌ Error: La regeneración de Verse 2 no usó la identidad y dialecto de Duki");
}
console.log("   ✅ La regeneración de Verse 2 adoptó la identidad, flow y dialecto de Duki.");

// 3. Probar buildStage2GhostwriterPrompt
console.log("3. Probando buildStage2GhostwriterPrompt con Duki...");
const stage2Prompt = buildStage2GhostwriterPrompt(testParams, "[Chorus: Travis Scott]\nTopline fija\n");

if (!stage2Prompt.includes("Flow Invitado (Duki)")) {
  throw new Error("❌ Error: buildStage2GhostwriterPrompt no incluyó a Duki en CONTRATO 3");
}
if (!stage2Prompt.includes("[VOZ: Duki")) {
  throw new Error("❌ Error: buildStage2GhostwriterPrompt no asignó a Duki en el plan de estrofas");
}
console.log("   ✅ CONTRATO 3 y la estructura reconocen el Flow Invitado de Duki.");

console.log("=================================================================");
console.log("🎉 TODAS LAS VERIFICACIONES DE ESTILO POR ARTISTA PASARON!");
console.log("=================================================================");

import { INTRO_STYLE_OPTIONS, getIntroStyleOptionById, STRUCTURES, ARTISTS_DATA } from "../src/lib/trap-data";
import { buildHolisticPrompt, type PromptParams } from "../src/lib/prompt-builder";

console.log("\n=======================================================");
console.log("🧪 TESTING MAYBACH SKIT INTRO & ATLANTA FLOW ENGINE");
console.log("=======================================================\n");

// 1. Verify option exists in INTRO_STYLE_OPTIONS
const maybachOpt = getIntroStyleOptionById("maybach_skit");
if (!maybachOpt) {
  console.error("❌ FAIL: maybach_skit not found in INTRO_STYLE_OPTIONS");
  process.exit(1);
}
console.log("✅ PASS: maybach_skit option registered:", maybachOpt.label, `(${maybachOpt.icon})`);

// 2. Build prompt with default producer (Markoff)
const structure = STRUCTURES[0]; // has [Intro]
const paramsWithMarkoff: PromptParams = {
  artistId: "quavo",
  featureArtistId: "takeoff",
  moodId: "calle",
  topics: ["diamantes", "bloque"],
  customTopic: "Dominio en la ciudad y racks en el banco",
  spanglishPercent: 40,
  bpmVibe: { id: "bounce_130", label: "Atlanta Bounce", range: "128-132", description: "Bouncy trap" },
  structure,
  narrativeArcId: "arc_flex",
  narrativeArcDesc: "Ascenso y dominio",
  producerId: "markoff",
  producerTag: "Markoff on the beat",
  producerName: "Markoff",
  customDictionary: "",
  dynamicMarkers: true,
  sectionVoices: [
    {
      sectionName: "Intro",
      voice: "auto",
      introStyle: "maybach_skit",
    },
  ],
};

const promptMarkoff = buildHolisticPrompt(paramsWithMarkoff);

if (!promptMarkoff.includes("ARQUETIPO INTRO: Maybach Skit / Enciende esa Mierda")) {
  console.error("❌ FAIL: Structure plan does not contain ARQUETIPO INTRO for maybach_skit");
  process.exit(1);
}
console.log("✅ PASS: Holistic prompt contains ARQUETIPO INTRO for maybach_skit");

if (!promptMarkoff.includes("Ayy, Markoff, enciende esa mierda")) {
  console.error("❌ FAIL: Instruction does not contain resolved producer name 'Markoff'");
  process.exit(1);
}
console.log("✅ PASS: Producer name dynamically resolved to 'Markoff' in intro instruction");

// 3. Build prompt with custom producer (e.g. Metro)
const paramsWithMetro: PromptParams = {
  ...paramsWithMarkoff,
  producerId: "metro_boomin",
  producerName: "Metro",
  producerTag: "If Young Metro don't trust you",
};

const promptMetro = buildHolisticPrompt(paramsWithMetro);
if (!promptMetro.includes("Ayy, Metro, enciende esa mierda")) {
  console.error("❌ FAIL: Instruction does not contain resolved producer name 'Metro'");
  process.exit(1);
}
console.log("✅ PASS: Producer name dynamically resolved to 'Metro' in intro instruction");

// 4. Verify ad-lib rules and Atlanta pocket in prompt
if (!promptMarkoff.includes("ECOS RÍTMICOS DE REMATE")) {
  console.error("❌ FAIL: Prompt missing ECOS RÍTMICOS DE REMATE");
  process.exit(1);
}
console.log("✅ PASS: Prompt includes ECOS RÍTMICOS DE REMATE (Migos/Atlanta)");

if (!promptMarkoff.includes("CUES CINEMÁTICOS DE AUDIO FX PARA SUNO")) {
  console.error("❌ FAIL: Prompt missing CUES CINEMÁTICOS DE AUDIO FX PARA SUNO");
  process.exit(1);
}
console.log("✅ PASS: Prompt includes CUES CINEMÁTICOS DE AUDIO FX PARA SUNO");

if (!promptMarkoff.includes("POCKET DE BARRAS CONCISAS")) {
  console.error("❌ FAIL: Prompt missing POCKET DE BARRAS CONCISAS");
  process.exit(1);
}
console.log("✅ PASS: Prompt includes POCKET DE BARRAS CONCISAS (5-8 sílabas)");

if (!promptMarkoff.includes("PUNCHLINES DE FLEXING & CULTURA POP")) {
  console.error("❌ FAIL: Prompt missing PUNCHLINES DE FLEXING & CULTURA POP");
  process.exit(1);
}
console.log("✅ PASS: Prompt includes PUNCHLINES DE FLEXING & CULTURA POP");

// 5. Verify P3 INVIOLABLE (artist names strictly forbidden in ad-libs) is preserved
if (!promptMarkoff.includes("queda TERMINANTEMENTE PROHIBIDO que el rapero mencione, cante o grite su propio nombre, nombres de artistas de referencia, apodos o sellos discográficos")) {
  console.error("❌ FAIL: P3 INVIOLABLE artist name prohibition missing or weakened");
  process.exit(1);
}
console.log("✅ PASS: P3 INVIOLABLE prohibition of artist names in ad-libs is strictly preserved");

console.log("\n🎉 ALL MAYBACH SKIT & ATLANTA FLOW ENGINE TESTS PASSED!\n");

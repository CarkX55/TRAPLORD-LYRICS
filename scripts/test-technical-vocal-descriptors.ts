import assert from "node:assert";
import {
  resolveArtistVocalGuide,
  buildStructurePlan,
  buildSunoStyleResult,
  cleanSunoBracketHeaders,
  stripArtistNamesFromLyrics,
  type PromptParams,
} from "../src/lib/prompt-builder";
import { generateBeatPrompt, BEAT_TYPES, BPM_VIBES } from "../src/lib/trap-data";

console.log("=== INICIANDO TEST: DESCRIPTORES TÉCNICOS SUNO Y TAGS DE ESTILO CON PIPE '|' ===");

// 1. Verificar que resolveArtistVocalGuide genera descriptores técnicos puros separados por '|'
const artistsToTest = ["travis_scott", "duki", "21_savage", "future", "bad_bunny", "playboi_carti"];

for (const artistId of artistsToTest) {
  const guide = resolveArtistVocalGuide(artistId, {
    sectionName: "Verse 1",
    isChorus: false,
  });

  console.log(`\n[Artista: ${guide.artistName} (${artistId})]`);
  console.log(`  vocalGuide: "${guide.vocalGuide}"`);
  console.log(`  fullHeaderTag: "${guide.fullHeaderTag}"`);
  console.log(`  technicalDescriptor: "${guide.technicalDescriptor}"`);

  // Assert que fullHeaderTag no contiene el nombre propio del artista
  assert(
    !guide.fullHeaderTag.startsWith(`${guide.artistName} -`),
    `fullHeaderTag no debe comenzar con el nombre del artista: "${guide.fullHeaderTag}"`
  );
  assert(
    guide.technicalDescriptor && guide.technicalDescriptor.length > 5,
    `technicalDescriptor debe tener contenido descriptivo`
  );
  // Debe contener descriptores vocales/acústicos técnicos
  assert(
    /\b(vocal|autotune|auto-tune|flow|cadence|delivery|harmonies|timbre|male|female)\b/i.test(guide.fullHeaderTag),
    `fullHeaderTag debe contener descriptores acústicos/vocales técnicos: "${guide.fullHeaderTag}"`
  );
  // Los descriptores deben estar separados por '|' y no por comas
  assert(
    guide.fullHeaderTag.includes("|"),
    `fullHeaderTag debe separar los tags por '|': "${guide.fullHeaderTag}"`
  );
}

// 2. Verificar secciones contextuales (Chorus, Intro, Outro, Both, Trading)
console.log("\n--- Probando variantes de secciones con separador '|' ---");

const chorusGuide = resolveArtistVocalGuide("main", {
  mainArtistId: "travis_scott",
  sectionName: "Chorus",
  isChorus: true,
});
console.log(`Chorus guide: "${chorusGuide.fullHeaderTag}"`);
assert(
  chorusGuide.fullHeaderTag.includes("layered stereo autotune harmonies") || chorusGuide.fullHeaderTag.includes("vocal stack"),
  `El chorus debe incluir descriptores técnicos de coro/armonías estéreo`
);
assert(chorusGuide.fullHeaderTag.includes("|"), "Chorus guide debe usar '|'");
assert(!chorusGuide.fullHeaderTag.includes("Travis Scott"), "El tag de chorus no debe incluir Travis Scott");

const introGuide = resolveArtistVocalGuide("main", {
  mainArtistId: "duki",
  sectionName: "Intro",
  isIntro: true,
});
console.log(`Intro guide: "${introGuide.fullHeaderTag}"`);
assert(
  introGuide.fullHeaderTag.includes("intro") || introGuide.fullHeaderTag.includes("whisper") || introGuide.fullHeaderTag.includes("filtered"),
  `La intro debe incluir descriptores técnicos de intro`
);
assert(introGuide.fullHeaderTag.includes("|"), "Intro guide debe usar '|'");
assert(!introGuide.fullHeaderTag.includes("Duki"), "El tag de intro no debe incluir Duki");

const bothGuide = resolveArtistVocalGuide("both", {
  mainArtistId: "travis_scott",
  featureArtistId: "duki",
  sectionName: "Chorus",
});
console.log(`Both guide: "${bothGuide.fullHeaderTag}"`);
assert(
  bothGuide.fullHeaderTag.includes("dual vocals in unison"),
  `Both debe tener descriptores de unison/stereo stack`
);
assert(bothGuide.fullHeaderTag.includes("|"), "Both guide debe usar '|'");

const tradingGuide = resolveArtistVocalGuide("trading_2x2", {
  mainArtistId: "travis_scott",
  featureArtistId: "duki",
  sectionName: "Verse 2",
});
console.log(`Trading 2x2 guide: "${tradingGuide.fullHeaderTag}"`);
assert(
  tradingGuide.fullHeaderTag.includes("trading bars 2x2"),
  `Trading debe tener descriptores de intercambio 2x2`
);
assert(tradingGuide.fullHeaderTag.includes("|"), "Trading guide debe usar '|'");

// 3. Verificar buildStructurePlan
console.log("\n--- Probando buildStructurePlan ---");
const dummyParams = {
  artistId: "travis_scott",
  producerId: "metro_boomin",
  rhymeSchemeId: "aabb",
  beatTypeId: "trap_oscuro",
  featureSimId: "none",
  featureArtistId: "duki",
  dirtyLevel: 2,
  moodId: "oscuro",
  spanglishPercent: 15,
  topic: "Éxito y noche en el estudio",
  structure: {
    id: "classic",
    name: "Classic Trap",
    description: "Intro-V1-Chorus-V2-Chorus-Outro",
    sections: [
      { name: "Intro", bars: 4, type: "intro" },
      { name: "Verse 1", bars: 16, type: "verse" },
      { name: "Chorus", bars: 8, type: "chorus" },
      { name: "Verse 2", bars: 16, type: "verse" },
      { name: "Outro", bars: 4, type: "outro" },
    ],
  },
  sectionVoices: [
    { sectionName: "Intro", voice: "main" },
    { sectionName: "Verse 1", voice: "main" },
    { sectionName: "Chorus", voice: "both" },
    { sectionName: "Verse 2", voice: "feature" },
    { sectionName: "Outro", voice: "main" },
  ],
} as unknown as PromptParams;

const plan = buildStructurePlan(dummyParams);
console.log("Plan de estructura generado:\n" + plan);

// Verificar que ninguna sección tiene formato "[Section: Artist Name - ...]"
assert(!plan.includes("[Verse 1: Travis Scott -"), "Verse 1 no debe tener prefijo de nombre de artista");
assert(!plan.includes("[Verse 2: Duki -"), "Verse 2 no debe tener prefijo de nombre de artista");
// Verificar que tiene los descriptores técnicos de producción separados por '|'
assert(plan.includes("[Verse 1: heavy layered auto-tune"), "Verse 1 debe incluir el descriptor técnico de Travis Scott");
assert(plan.includes("[Verse 2: aggressive distorted porteño"), "Verse 2 debe incluir el descriptor técnico de Duki");
assert(plan.includes("[Chorus: dual vocals in unison"), "Chorus debe incluir el descriptor técnico de dual vocals");

// 4. Verificar cleanSunoBracketHeaders con stripArtistNames: true
console.log("\n--- Probando cleanSunoBracketHeaders y reemplazo de nombres ---");

// Caso A: Corchete con nombre y guion residual tipo [Verse 1: Travis Scott - heavy auto-tune male vocal | psychedelic reverb]
const testLyricsWithHyphen = `
[Verse 1: Travis Scott - heavy layered auto-tune male vocal | psychedelic reverb]
Yeah, la ciudad prendida fuego (fuego)
Bajo en el Lambo no freno (skrrt)
`;
const cleanedWithHyphen = cleanSunoBracketHeaders(testLyricsWithHyphen, {
  artistId: "travis_scott",
  stripArtistNames: true,
});
console.log("Limpio Caso A:\n", cleanedWithHyphen);
assert(
  cleanedWithHyphen.includes("[Verse 1: heavy layered auto-tune male vocal | psychedelic reverb]"),
  `Debe haber eliminado el nombre 'Travis Scott - ' dejando el descriptor técnico: "${cleanedWithHyphen}"`
);
assert(!cleanedWithHyphen.includes("Travis Scott"), "No debe quedar mención a Travis Scott");

// Caso B: Corchete con SOLO nombre tipo [Verse 1: Travis Scott]
const testLyricsNameOnly = `
[Verse 1: Travis Scott]
Yeah, la ciudad prendida fuego (fuego)
[Chorus: Duki]
Todo el party rebotando en el club (yeah)
`;
const cleanedNameOnly = cleanSunoBracketHeaders(testLyricsNameOnly, {
  artistId: "travis_scott",
  featureArtistId: "duki",
  stripArtistNames: true,
  sectionVoices: [
    { sectionName: "Verse 1", voice: "main" },
    { sectionName: "Chorus", voice: "feature" },
  ],
});
console.log("Limpio Caso B:\n", cleanedNameOnly);
assert(!cleanedNameOnly.includes("Travis Scott"), "No debe quedar Travis Scott en corchetes");
assert(!cleanedNameOnly.includes("Duki"), "No debe quedar Duki en corchetes");
assert(
  cleanedNameOnly.includes("[Verse 1:") && cleanedNameOnly.includes("[Chorus:"),
  "Debe haber enriquecido ambos corchetes con descriptores técnicos"
);

// Caso C: stripArtistNamesFromLyrics directo
const strippedDirect = stripArtistNamesFromLyrics("[Verse 1: Travis Scott]\nBarra 1", ["Travis Scott"]);
console.log("Limpio Caso C (stripArtistNamesFromLyrics directo):\n", strippedDirect);
assert(!strippedDirect.includes("Travis Scott"), "stripArtistNamesFromLyrics debe reemplazar el nombre");
assert(
  strippedDirect.includes("auto-tune") || strippedDirect.includes("vocal"),
  `stripArtistNamesFromLyrics debe haber inyectado descriptores técnicos: "${strippedDirect}"`
);

// 5. Verificar que buildSunoStyleResult y generateBeatPrompt usan separador '|'
console.log("\n--- Probando buildSunoStyleResult y generateBeatPrompt con separador '|' ---");
const styleResult = buildSunoStyleResult({
  beatType: BEAT_TYPES[0],
  bpmVibe: BPM_VIBES[0],
  moodId: "oscuro",
  artistId: "travis_scott",
  featureArtistId: "duki",
  producerId: "metro_boomin",
  structureLabel: "Classic",
  dirtyLevel: 2,
});

console.log("Suno Style Prompt (4 Capas):\n", styleResult.prompt);
console.log("Layer 1 (Genre):", styleResult.layers.genre);
console.log("Layer 2 (Vocal):", styleResult.layers.vocal);
console.log("Layer 3 (Instruments):", styleResult.layers.instruments);
console.log("Layer 4 (Mix):", styleResult.layers.mix);

assert(styleResult.prompt.includes(" | "), "El prompt compuesto debe separar los tags por ' | '");
assert(!styleResult.prompt.includes(", "), "El prompt compuesto no debe contener comas de separación");
assert(styleResult.layers.genre.includes(" | "), "Layer 1 debe usar ' | '");
assert(styleResult.layers.instruments.includes(" | "), "Layer 3 debe usar ' | '");
assert(styleResult.layers.mix.includes(" | "), "Layer 4 debe usar ' | '");

const beatPrompt = generateBeatPrompt("travis_scott", "oscuro", "bpm_140", "metro_boomin");
console.log("\nBeat Prompt styleTags:\n", beatPrompt.styleTags);
assert(beatPrompt.styleTags.includes(" | "), "beatPrompt.styleTags debe separar los tags por ' | '");
assert(!beatPrompt.styleTags.includes(", "), "beatPrompt.styleTags no debe contener comas de separación");

console.log("\n=== TODOS LOS TESTS PASARON SATISFACTORIAMENTE (100% OK) ===");

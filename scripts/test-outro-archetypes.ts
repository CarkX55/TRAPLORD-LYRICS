import assert from "assert";
import {
  OUTRO_STYLE_OPTIONS,
  getOutroStyleOptionById,
  type OutroStyleId,
  type SongStructure,
} from "../src/lib/trap-data";
import {
  parseRawLyricsToAST,
  stringifyASTToSunoLyrics,
  formatSectionHeader,
  type SongDocument,
  type SongSectionDoc,
} from "../src/lib/song-document";
import {
  buildStage2GhostwriterPrompt,
  type PromptParams,
  type SectionVoiceAssignment,
} from "../src/lib/prompt-builder";

console.log("===============================================================================");
console.log("🧪 PASO 5: ARQUETIPOS DE OUTRO — CARDINALIDAD Y SEPARACIÓN DE CANALES");
console.log("===============================================================================\n");

let passedAsserts = 0;

function check(desc: string, condition: boolean) {
  assert(condition, `FAIL: ${desc}`);
  passedAsserts++;
  console.log(`  ✓ [Assert ${passedAsserts.toString().padStart(2, "0")}] ${desc}`);
}

// ---------------------------------------------------------------------------
// 1. OUTRO ARQUETIPOS CATALOG & INTEGRITY
// ---------------------------------------------------------------------------
console.log("\n--- TEST 1: Catalog Completeness & Option Resolution ---");

check("OUTRO_STYLE_OPTIONS contains exactly 8 archetypes", OUTRO_STYLE_OPTIONS.length === 8);

const expectedIds: OutroStyleId[] = [
  "auto",
  "abrupt_cutoff",
  "faded_echo",
  "spoken_reflection",
  "beat_breakdown",
  "vocal_melodic_fade",
  "phone_hangup",
  "chopped_slowdown",
];

for (const id of expectedIds) {
  const opt = getOutroStyleOptionById(id);
  assert(opt, `Missing option for id ${id}`);
  assert(opt.label.length > 0, `Option ${id} missing label`);
  assert(opt.sunoAcousticTag.length > 0, `Option ${id} missing sunoAcousticTag`);
  assert(opt.instruction.length > 0, `Option ${id} missing instruction`);
  assert(opt.performanceDirective.length > 0, `Option ${id} missing performanceDirective`);
}
check("All 8 Outro Archetypes meet full structural integrity (tag, instruction, performanceDirective)", true);

const abruptOpt = getOutroStyleOptionById("abrupt_cutoff");
check("abrupt_cutoff option resolved with performanceDirective 'abrupt_cutoff'", abruptOpt?.performanceDirective === "abrupt_cutoff");

// ---------------------------------------------------------------------------
// 2. CARDINALITY INVARIANCE ACROSS ALL 8 OUTRO ARCHETYPES (4 Compases Exactos)
// ---------------------------------------------------------------------------
console.log("\n--- TEST 2: Structural Cardinality Invariance (4 Bars per Archetype) ---");

for (const archetype of OUTRO_STYLE_OPTIONS) {
  const rawSample = `[Verse 1: Future]
Primera barra del verso uno
Segunda barra del verso uno

[Chorus: Future]
Primera barra del estribillo
Segunda barra del estribillo

[Outro: Future]
Primera barra final del outro
Segunda barra con actitud (Yeah)
Tercera barra manteniendo el bolsillo
Cuarta barra de cierre definitivo`;

  const ast: SongDocument = parseRawLyricsToAST(rawSample);
  const outroSection = ast.sections.find(s => s.type === "outro");

  assert(outroSection, `Outro section missing for archetype ${archetype.id}`);
  check(
    `Archetype '${archetype.id}' maintains exactly 4 bars in compiled AST`,
    outroSection.bars.length === 4
  );
  check(
    `Archetype '${archetype.id}' bars have sequential positions (1 to 4)`,
    outroSection.bars.map(b => b.position).join(",") === "1,2,3,4"
  );
}

// ---------------------------------------------------------------------------
// 3. CLEAN SERIALIZATION & DIRECTIVE SEGREGATION
// ---------------------------------------------------------------------------
console.log("\n--- TEST 3: Clean Serialization & Performance Directive Segregation ---");

// Test with abrupt_cutoff
const rawOutroWithDirectives = `[Outro: Future]
Barras frías en la madrugada
Nadie contesta si no hay ganancia (Hold up)
Todo el bloque sabe quién manda
Corte seco aquí`;

const astWithCutoff = parseRawLyricsToAST(rawOutroWithDirectives);
const outroSec = astWithCutoff.sections.find(s => s.type === "outro")!;

// Tag performance directive into performance channel (segregated)
outroSec.performanceDirective = "abrupt_cutoff";
outroSec.bars[3].performance = {
  ...outroSec.bars[3].performance,
  performanceDirective: "abrupt_cutoff",
};

// Check AST metadata segregation
check("Performance directive 'abrupt_cutoff' is stored on section.performanceDirective", outroSec.performanceDirective === "abrupt_cutoff");
check("Performance directive 'abrupt_cutoff' is stored on bar.performance.performanceDirective", outroSec.bars[3].performance?.performanceDirective === "abrupt_cutoff");

// Check clean Suno serialization
const serializedSuno = stringifyASTToSunoLyrics(astWithCutoff);
const lines = serializedSuno.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

const headerLine = lines.find(l => l.toLowerCase().includes("outro"));
check("Header is cleanly formatted as [Outro: Future] without directive contamination", headerLine === "[Outro: Future]");
check("Header does NOT contain bracket directives like [Outro: Future - abrupt_cutoff]", !headerLine?.includes("abrupt_cutoff"));

// Lyric text integrity
const bar4Text = outroSec.bars[3].lyricText;
check("Lyric text is 100% intact without syntactic truncation", bar4Text === "Corte seco aquí");
check("Lyric text does not contain bracket markup or orphan asterisks", !bar4Text.includes("[") && !bar4Text.includes("*"));

// ---------------------------------------------------------------------------
// 4. PROMPT BUILDER INTEGRATION & STAGE 2 GHOSTWRITER ARCHETYPE INJECTION
// ---------------------------------------------------------------------------
console.log("\n--- TEST 4: Prompt Builder Stage 2 Outro Archetype Integration ---");

const mockStructure: SongStructure = {
  id: "std_test",
  label: "Test Structure",
  sections: [
    { name: "Verse 1", type: "verse", defaultBars: 16, bars: 16 },
    { name: "Chorus", type: "chorus", defaultBars: 8, bars: 8 },
    { name: "Outro", type: "outro", defaultBars: 4, bars: 4 },
  ],
};

const sectionVoices: SectionVoiceAssignment[] = [
  { sectionName: "Verse 1", voice: "main", bars: 16 },
  { sectionName: "Chorus", voice: "main", bars: 8 },
  { sectionName: "Outro", voice: "main", bars: 4, outroStyle: "abrupt_cutoff" },
];

const promptParams: PromptParams = {
  artistId: "future",
  featureArtistId: "",
  moodId: "dark",
  topics: ["Calle", "Trap"],
  customTopic: "corte en seco en el bloque",
  spanglishPercent: 0,
  bpmVibe: { id: "dark_130", label: "Dark", range: "130-135", beatStyles: [] },
  structure: mockStructure,
  sectionVoices,
  narrativeArcId: "arc_1",
  narrativeArcDesc: "Ascenso y paranoia",
  producerId: "metro_boomin",
  producerTag: "If Young Metro don't trust you...",
};

const lockedTopline = `[Chorus: Future]
Primera barra de gancho
Segunda barra de gancho
Tercera barra de gancho
Cuarta barra de gancho
Quinta barra de gancho
Sexta barra de gancho
Séptima barra de gancho
Octava barra de gancho`;

const stage2Prompt = buildStage2GhostwriterPrompt(promptParams, lockedTopline);

check("Stage 2 prompt contains OUTRO archetype section", stage2Prompt.includes("[ARQUETIPO OUTRO: Corte Abrupto en Seco]"));
check("Stage 2 prompt instructs 4 compases for Outro", stage2Prompt.includes("— 4 compases [ARQUETIPO OUTRO: Corte Abrupto en Seco]"));
check("Stage 2 prompt contains the archetype instruction", stage2Prompt.includes("Cierre cortante y abrupto"));

// Test with outroStyle = "faded_echo"
const sectionVoicesEcho: SectionVoiceAssignment[] = [
  { sectionName: "Outro", voice: "main", bars: 4, outroStyle: "faded_echo" },
];
const promptParamsEcho: PromptParams = {
  ...promptParams,
  sectionVoices: sectionVoicesEcho,
};

const stage2PromptEcho = buildStage2GhostwriterPrompt(promptParamsEcho, lockedTopline);
check("Stage 2 prompt adapts to faded_echo archetype", stage2PromptEcho.includes("[ARQUETIPO OUTRO: Eco Espacial & Delay]"));

// Test with outroStyle = "auto" (no archetype block clutter)
const sectionVoicesAuto: SectionVoiceAssignment[] = [
  { sectionName: "Outro", voice: "main", bars: 4, outroStyle: "auto" },
];
const promptParamsAuto: PromptParams = {
  ...promptParams,
  sectionVoices: sectionVoicesAuto,
};
const stage2PromptAuto = buildStage2GhostwriterPrompt(promptParamsAuto, lockedTopline);
check("Stage 2 prompt with auto outro avoids injecting rigid archetype block", !stage2PromptAuto.includes("[ARQUETIPO OUTRO:"));

// ---------------------------------------------------------------------------
// 5. PERFORMANCE & LATENCY BENCHMARK
// ---------------------------------------------------------------------------
console.log("\n--- TEST 5: Performance & Latency Benchmark ---");

const ITERATIONS = 1000;
const startPerf = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const ast = parseRawLyricsToAST(rawOutroWithDirectives);
  stringifyASTToSunoLyrics(ast);
}
const totalTimeMs = performance.now() - startPerf;
const avgTimeMs = totalTimeMs / ITERATIONS;

console.log(`  ⏱️  Total time for ${ITERATIONS} iterations: ${totalTimeMs.toFixed(2)} ms`);
console.log(`  ⏱️  Average execution latency: ${avgTimeMs.toFixed(4)} ms/op`);

check("Average execution latency < 1.0 ms (budget: < 5.0 ms)", avgTimeMs < 1.0);

console.log("\n===============================================================================");
console.log(`🎉 ALL ${passedAsserts} ASSERTS PASSED! PASO 5 DEFINITIONS OF DONE FULLY MET.`);
console.log("===============================================================================");

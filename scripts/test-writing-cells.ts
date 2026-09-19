// Test Suite for TRAPLORD Writing Cells (Paso 1)
// Validates:
// 1. PlannedVerseIntent generation & multi-verse structure
// 2. Anti-formula diversity across verses, moods, and contrast intents
// 3. Purity of intent: no raw lyrics or rhyme families
// 4. Factorial toggle isolation (writingCellsEnabled: true vs false)
// 5. Execution latency budget (<5ms deterministic local planning)
// 6. Section-grouped prompt formatting

import {
  generatePlannedVerseIntents,
  generateAllWritingCells,
  generateWritingCells,
  formatWritingCellsForPrompt,
  assertPlannedIntentPurity,
  type PlannedVerseIntent,
  type WritingCell,
  type ContrastIntent,
} from "../src/lib/composition-planner";
import { buildStage2GhostwriterPrompt } from "../src/lib/prompt-builder";
import type { SongStructure } from "../src/lib/trap-data";
import type { PromptParams } from "../src/lib/prompt-builder";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runWritingCellsTests() {
  console.log("=======================================================");
  console.log("🧪 RUNNING WRITING CELLS & PLANNED VERSE INTENT TESTS");
  console.log("=======================================================\n");

  let totalPassed = 0;

  // -------------------------------------------------------------
  // TEST 1: Multi-Verse PlannedVerseIntent Generation
  // -------------------------------------------------------------
  console.log("--- TEST 1: Multi-Verse PlannedVerseIntent Generation ---");
  const testStructure: SongStructure = {
    id: "standard_multi_verse",
    label: "Standard Multi-Verse",
    sections: [
      { name: "Intro", type: "intro", bars: 4 },
      { name: "Verse 1", type: "verse", bars: 16 },
      { name: "Chorus", type: "chorus", bars: 8 },
      { name: "Verse 2", type: "verse", bars: 12 },
      { name: "Chorus", type: "chorus", bars: 8 },
      { name: "Verse 3", type: "verse", bars: 8 },
      { name: "Outro", type: "outro", bars: 4 },
    ],
  };

  const intents = generatePlannedVerseIntents(
    testStructure,
    "dark",
    undefined,
    undefined,
    "Corona de Espinas",
    "Callejón estrecho de noche con lluvia pesada"
  );

  assert(intents.length === 3, "Generates exactly 3 PlannedVerseIntents for 3 verse sections");
  assert(intents[0].sectionId === "verse_1", "Verse 1 has canonical sectionId 'verse_1'");
  assert(intents[0].verseIndex === 1 && intents[0].totalVerses === 3, "Verse 1 index=1, totalVerses=3");
  assert(intents[0].totalBars === 16, "Verse 1 totalBars = 16");
  assert(intents[0].cells.length === 4, "Verse 1 divided into 4 writing cells (16 / 4)");
  assert(intents[0].contrastIntent === "none", "Verse 1 contrastIntent is 'none'");

  assert(intents[1].sectionId === "verse_2", "Verse 2 has canonical sectionId 'verse_2'");
  assert(intents[1].verseIndex === 2 && intents[1].totalVerses === 3, "Verse 2 index=2, totalVerses=3");
  assert(intents[1].totalBars === 12, "Verse 2 totalBars = 12");
  assert(intents[1].cells.length === 3, "Verse 2 divided into 3 writing cells (12 / 4)");
  assert(intents[1].contrastIntent === "energy_spike", "Verse 2 has 'energy_spike' contrastIntent in dark mood");

  assert(intents[2].sectionId === "verse_3", "Verse 3 has canonical sectionId 'verse_3'");
  assert(intents[2].cells.length === 2, "Verse 3 divided into 2 writing cells (8 / 4)");

  const allCells = generateAllWritingCells(testStructure, intents);
  assert(allCells.length === 9, "Total flattened writing cells = 9 (4 + 3 + 2)");
  totalPassed += 10;

  // -------------------------------------------------------------
  // TEST 2: Anti-Formula Diversity Across Verses & Moods
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Anti-Formula Diversity Across Verses & Moods ---");
  const v1Objectives = intents[0].cells.map(c => c.objective);
  const v2Objectives = intents[1].cells.map(c => c.objective);

  assert(
    JSON.stringify(v1Objectives.slice(0, 3)) !== JSON.stringify(v2Objectives),
    "Verse 1 and Verse 2 do not reuse the same objective sequence (anti-formula)"
  );

  // Compare Dark vs Introspective
  const introspectiveIntents = generatePlannedVerseIntents(testStructure, "introspectivo");
  const introV1Objectives = introspectiveIntents[0].cells.map(c => c.objective);
  assert(
    JSON.stringify(v1Objectives) !== JSON.stringify(introV1Objectives),
    "Dark mood and Introspective mood produce distinct Verse 1 cell sequences"
  );
  assert(
    introspectiveIntents[1].contrastIntent === "introspective_drop",
    "Introspective mood generates 'introspective_drop' contrastIntent for Verse 2"
  );
  totalPassed += 3;

  // -------------------------------------------------------------
  // TEST 3: Purity of Intent (assertPlannedIntentPurity)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Purity of Intent (assertPlannedIntentPurity) ---");
  // Legitimate intent passes without error
  assertPlannedIntentPurity(intents[0]);
  assert(true, "Legitimate PlannedVerseIntent passes purity check cleanly");

  // Hostile injection of raw lyrics in intent
  let caughtPurityError = false;
  try {
    const taintedIntent = JSON.parse(JSON.stringify(intents[0]));
    taintedIntent.lyrics = "Ando con la ganga en el bloque";
    assertPlannedIntentPurity(taintedIntent);
  } catch (err: any) {
    if (err.message.includes("[CRITICAL] Purity violation")) {
      caughtPurityError = true;
    }
  }
  assert(caughtPurityError, "assertPlannedIntentPurity detects and rejects raw lyric injection in intent");

  // Hostile injection of rhyme family in cell
  let caughtRhymeError = false;
  try {
    const taintedCellIntent = JSON.parse(JSON.stringify(intents[0]));
    taintedCellIntent.cells[0].rhymeFamily = "family_A";
    assertPlannedIntentPurity(taintedCellIntent);
  } catch (err: any) {
    if (err.message.includes("[CRITICAL] Purity violation")) {
      caughtRhymeError = true;
    }
  }
  assert(caughtRhymeError, "assertPlannedIntentPurity detects and rejects rhyme family injection in cell");
  totalPassed += 3;

  // -------------------------------------------------------------
  // TEST 4: Prompt Formatting with Multi-Section Grouping
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Prompt Formatting with Multi-Section Grouping ---");
  const promptSnippet = formatWritingCellsForPrompt(allCells);
  assert(promptSnippet.includes("#### VERSE 1"), "Snippet contains section header for VERSE 1");
  assert(promptSnippet.includes("#### VERSE 2"), "Snippet contains section header for VERSE 2");
  assert(promptSnippet.includes("#### VERSE 3"), "Snippet contains section header for VERSE 3");
  assert(promptSnippet.includes("Célula 1 [Barras 1-4]"), "Snippet contains Célula 1 with bar range");
  assert(promptSnippet.includes("Ancla central: Corona de Espinas"), "Snippet includes sensory motif anchor in Cell 1");
  totalPassed += 5;

  // -------------------------------------------------------------
  // TEST 5: Factorial Toggle Isolation (writingCellsEnabled: true vs false)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Factorial Toggle Isolation (writingCellsEnabled) ---");
  const dummyParams: PromptParams = {
    artistId: "duki",
    featureArtistId: "",
    moodId: "dark",
    topics: ["calle", "exito"],
    customTopic: "",
    spanglishPercent: 0,
    bpmVibe: { id: "trap_mid", label: "Trap Mid", range: "130-140" },
    beatType: { id: "hard", name: "Hard Trap", description: "Bajos 808 distorsionados", bpm: "135" },
    structure: testStructure,
    narrativeArcId: "classic",
    narrativeArcDesc: "Ascenso y dominio",
    producerId: "none",
    producerTag: "",
    producerName: "",
    customDictionary: "",
    dynamicMarkers: true,
  };

  // Condition 1: writingCellsEnabled = true
  const promptWithCells = buildStage2GhostwriterPrompt(
    dummyParams,
    "[Chorus]\nCorona de oro\nBrillando en el lodo",
    promptSnippet,
    "Compás 1: ~10 sílabas"
  );
  assert(
    promptWithCells.includes("### Células de Escritura (4-Bar Writing Cells)"),
    "Prompt with cells enabled contains Células de Escritura block"
  );
  assert(
    !promptWithCells.includes("🔄 FLOW SWITCHING DINÁMICO EN CADA VERSO:"),
    "Prompt with cells enabled does NOT show fallback flow switching generic block"
  );

  // Condition 2: writingCellsEnabled = false (factorial isolation)
  const promptWithoutCells = buildStage2GhostwriterPrompt(
    dummyParams,
    "[Chorus]\nCorona de oro\nBrillando en el lodo",
    undefined, // writingCellsSnippet is undefined
    "Compás 1: ~10 sílabas"
  );
  assert(
    !promptWithoutCells.includes("### Células de Escritura (4-Bar Writing Cells)"),
    "Prompt with cells disabled omits Células de Escritura block cleanly"
  );
  assert(
    promptWithoutCells.includes("🔄 FLOW SWITCHING DINÁMICO EN CADA VERSO:"),
    "Prompt with cells disabled cleanly falls back to generic flow switching block"
  );
  totalPassed += 4;

  // -------------------------------------------------------------
  // TEST 6: Execution Latency Budget (<5ms)
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Execution Latency Budget (<5ms) ---");
  const start = performance.now();
  for (let i = 0; i < 50; i++) {
    const planned = generatePlannedVerseIntents(testStructure, "dark", undefined, undefined, "Motif", "Scene");
    generateAllWritingCells(testStructure, planned);
    formatWritingCellsForPrompt(planned.flatMap(p => p.cells));
  }
  const avgDurationMs = (performance.now() - start) / 50;
  assert(
    avgDurationMs < 5.0,
    `Deterministic writing cells planning executed in ${avgDurationMs.toFixed(3)}ms (budget: <5ms)`
  );
  totalPassed += 1;

  console.log("\n=======================================================");
  console.log(`📊 ALL WRITING CELLS TESTS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
}

runWritingCellsTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

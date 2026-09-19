// Test Suite for TRAPLORD Factorial Generation Harness & Matrix Automation (Paso 3)
// Validates:
// 1. Factorial 2x2 Plan Generation & Balance (Y00, Y10, Y01, Y11)
// 2. Deterministic PRNG & Physical Interleaving (anti-temporal drift)
// 3. Orthogonal Seed Hierarchy (masterSeed -> replicate, branch, rater seeds)
// 4. Step 3 Intra-Generation Fork (shared parentGenerationId, symmetrical downstream, llmAttempts)
// 5. Physical Blinding Segregation (blindedLyrics without audioUrl, blindedAudio without lyricsText)
// 6. Cross-Modal Contamination Guard (assertNeverRatedBothModalities)
// 7. Execution Latency Budget (<5ms)

import {
  generateFactorialPlan,
  forkStep3Branches,
  createBlindedEvaluationPackages,
  assertNeverRatedBothModalities,
  type BenchmarkFixture,
  type FactorialPlanItem,
  type LLMAttemptLog,
  type GenerationManifest,
} from "../src/lib/factorial-harness";
import {
  type SongDocument,
  type SongSectionDoc,
  hashBarContent,
} from "../src/lib/song-document";
import type { SurgicalRepairResult } from "../src/lib/repair-engine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

const SAMPLE_FIXTURES: BenchmarkFixture[] = [
  {
    id: "fixture-001",
    artistId: "future",
    moodId: "dark",
    bpmVibeId: "trap_mid",
    structureId: "standard",
    topics: ["calle", "exito"],
    spanglishPercent: 0,
  },
  {
    id: "fixture-002",
    artistId: "21_savage",
    moodId: "street",
    bpmVibeId: "trap_slow",
    structureId: "standard",
    topics: ["lealtad", "dinero"],
    spanglishPercent: 10,
  },
  {
    id: "fixture-003",
    artistId: "drake",
    moodId: "melodic",
    bpmVibeId: "trap_mid",
    structureId: "standard",
    topics: ["relaciones", "fama"],
    spanglishPercent: 30,
  },
  {
    id: "fixture-004",
    artistId: "eminem",
    moodId: "aggressive",
    bpmVibeId: "trap_fast",
    structureId: "standard",
    topics: ["competencia", "barras"],
    spanglishPercent: 0,
  },
];

function createSampleSongDocument(): SongDocument {
  return {
    id: "song_parent_y11",
    versionId: "v_raw_master",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sections: [
      {
        id: "sec_hook",
        name: "Chorus",
        type: "hook",
        bars: [
          { id: "b_h1", position: 1, lyricText: "Cadenas de oro en la mesa", locked: false },
          { id: "b_h2", position: 2, lyricText: "Todos celebran la nueva promesa", locked: false },
        ],
      },
      {
        id: "sec_v1",
        name: "Verse 1",
        type: "verse",
        bars: [
          { id: "b_v1", position: 1, lyricText: "Callejón mojado a las tres de la mañana", locked: false },
          { id: "b_v2", position: 2, lyricText: "Línea genérica que requiere reparación quirúrgica", locked: false },
        ],
      },
    ],
  };
}

async function runFactorialHarnessTests() {
  console.log("=======================================================");
  console.log("🧪 RUNNING FACTORIAL MATRIX & BLIND HARNESS TESTS");
  console.log("=======================================================\n");

  let totalPassed = 0;

  // -------------------------------------------------------------
  // TEST 1: Factorial Plan Balancing & Cardinality
  // -------------------------------------------------------------
  console.log("--- TEST 1: Factorial Plan Balancing & Cardinality ---");
  const K = 2; // 2 replicates per cell
  const plan = generateFactorialPlan(SAMPLE_FIXTURES, K, "seed_exp_2026_v1");

  const expectedTotalRuns = SAMPLE_FIXTURES.length * 4 * K; // 4 * 4 * 2 = 32
  assert(plan.length === expectedTotalRuns, `Plan contains exactly ${expectedTotalRuns} runs`);

  const conditionCounts = {
    writingCells_off_hook_off: 0,
    writingCells_on_hook_off: 0,
    writingCells_off_hook_on: 0,
    writingCells_on_hook_on: 0,
  };

  for (const item of plan) {
    conditionCounts[item.condition]++;
  }

  assert(conditionCounts.writingCells_off_hook_off === 8, "Y00 has exactly 8 balanced runs");
  assert(conditionCounts.writingCells_on_hook_off === 8, "Y10 has exactly 8 balanced runs");
  assert(conditionCounts.writingCells_off_hook_on === 8, "Y01 has exactly 8 balanced runs");
  assert(conditionCounts.writingCells_on_hook_on === 8, "Y11 has exactly 8 balanced runs");
  totalPassed += 5;

  // -------------------------------------------------------------
  // TEST 2: Seed Determinism & Physical Interleaving
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Seed Determinism & Physical Interleaving ---");
  const plan2 = generateFactorialPlan(SAMPLE_FIXTURES, K, "seed_exp_2026_v1");
  assert(
    JSON.stringify(plan.map(p => p.condition)) === JSON.stringify(plan2.map(p => p.condition)),
    "Plan conditions order is 100% reproducible with identical masterSeed"
  );
  assert(
    JSON.stringify(plan.map(p => p.replicateRandomizationSeed)) === JSON.stringify(plan2.map(p => p.replicateRandomizationSeed)),
    "Plan replicate seeds are 100% reproducible with identical masterSeed"
  );

  // Check physical interleaving: adjacent items are NOT all the same condition
  let adjacentSameCount = 0;
  for (let i = 0; i < plan.length - 1; i++) {
    if (plan[i].condition === plan[i + 1].condition) adjacentSameCount++;
  }
  assert(
    adjacentSameCount < plan.length / 2,
    `Conditions are physically interleaved (adjacent same: ${adjacentSameCount}/${plan.length})`
  );

  // Check seed independence
  const firstItem = plan[0];
  assert(
    firstItem.replicateRandomizationSeed !== firstItem.branchRandomizationSeed &&
    firstItem.branchRandomizationSeed !== firstItem.raterAssignmentSeed,
    "replicateSeed, branchSeed, and raterSeed are mutually distinct and orthogonal"
  );
  totalPassed += 4;

  // -------------------------------------------------------------
  // TEST 3: Step 3 Intra-Generation Symmetrical Fork
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Step 3 Intra-Generation Symmetrical Fork ---");
  const rawMasterAST = createSampleSongDocument();
  const targetBar = rawMasterAST.sections[1].bars[1]; // b_v2

  const surgicalPatch: SurgicalRepairResult = {
    sourceVersionId: rawMasterAST.versionId,
    replacements: [
      {
        sectionId: "sec_v1",
        barId: targetBar.id,
        contextHash: hashBarContent(targetBar),
        replacementLyricText: "Barras afiladas grabadas a fuego en el mic",
      },
    ],
  };

  const initialAttempts: LLMAttemptLog[] = [
    { logicalCallId: "topliner", attemptIndex: 0, status: "SUCCESS", promptTokens: 950, completionTokens: 420, totalTokens: 1370, latencyMs: 1100 },
    { logicalCallId: "ghostwriter", attemptIndex: 0, status: "SUCCESS", promptTokens: 1420, completionTokens: 780, totalTokens: 2200, latencyMs: 2300 },
  ];

  const y11PlanItem = plan.find(p => p.condition === "writingCells_on_hook_on")!;
  const forkResult = forkStep3Branches(
    y11PlanItem,
    "gen_parent_90210",
    rawMasterAST,
    surgicalPatch,
    initialAttempts
  );

  assert(forkResult.parentGenerationId === "gen_parent_90210", "Fork preserves canonical parentGenerationId");
  assert(forkResult.branchExecutionOrder.length === 2, "branchExecutionOrder contains exactly 2 branches");
  assert(
    forkResult.branchExecutionOrder.includes("repair_control") && forkResult.branchExecutionOrder.includes("repair_intervention"),
    "branchExecutionOrder contains both repair_control and repair_intervention"
  );

  // Control branch verification
  assert(forkResult.controlManifest.branchId === "repair_control", "Control manifest branchId is repair_control");
  assert(forkResult.controlManifest.logicalLLMCalls === 2, "Control branch has exactly 2 logical LLM calls");
  assert(forkResult.controlAST.sections[1].bars[1].lyricText === targetBar.lyricText, "Control AST lyric remains unpatched");

  // Intervention branch verification
  assert(forkResult.interventionManifest.branchId === "repair_intervention", "Intervention manifest branchId is repair_intervention");
  assert(forkResult.interventionManifest.logicalLLMCalls === 3, "Intervention branch has exactly 3 logical LLM calls (includes surgical_repair)");
  assert(forkResult.interventionManifest.llmAttempts.some(a => a.logicalCallId === "surgical_repair"), "Intervention manifest records surgical_repair in llmAttempts[]");
  assert(
    forkResult.interventionAST.sections[1].bars[1].lyricText === "Barras afiladas grabadas a fuego en el mic",
    "Intervention AST lyric replaced accurately via atomic surgical patch"
  );
  totalPassed += 9;

  // -------------------------------------------------------------
  // TEST 4: Physical Blinding & Modality Segregation (§3, §8)
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Physical Blinding & Modality Segregation ---");
  const testManifests: GenerationManifest[] = [
    forkResult.controlManifest,
    forkResult.interventionManifest,
  ];

  const packages = createBlindedEvaluationPackages(testManifests);

  assert(packages.blindedLyrics.length === 2, "blindedLyrics package contains 2 items");
  assert(packages.blindedAudio.length === 2, "blindedAudio package contains 2 items");
  assert(packages.keyManifest.length === 2, "keyManifest contains 2 unblinding items");

  // Verify strict physical isolation of modality
  for (const lyricItem of packages.blindedLyrics) {
    assert((lyricItem as any).audioUrl === undefined, `Lyric item ${lyricItem.sampleId} contains ZERO audioUrl (physical segregation)`);
    assert(typeof lyricItem.lyricsText === "string" && lyricItem.lyricsText.length > 10, "Lyric item contains valid lyricsText");
  }

  for (const audioItem of packages.blindedAudio) {
    assert((audioItem as any).lyricsText === undefined, `Audio item ${audioItem.sampleId} contains ZERO lyricsText (physical segregation)`);
    assert(typeof audioItem.audioUrl === "string" && audioItem.audioUrl.startsWith("http"), "Audio item contains valid audioUrl");
  }
  totalPassed += 7;

  // -------------------------------------------------------------
  // TEST 5: Cross-Modal Contamination Guard
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Cross-Modal Contamination Guard ---");
  const lyricRaters = new Map<string, Set<string>>();
  const audioRaters = new Map<string, Set<string>>();

  lyricRaters.set("sample_001", new Set(["rater_A", "rater_B"]));
  audioRaters.set("sample_001", new Set(["rater_C", "rater_D"]));

  // Clean case: rater_A on lyric, rater_C on audio (disjoint)
  assertNeverRatedBothModalities("rater_E", "sample_001", lyricRaters, audioRaters);
  assert(true, "Disjoint evaluators pass cross-modal check cleanly");

  // Hostile case: rater_A attempts to rate audio for sample_001
  audioRaters.get("sample_001")!.add("rater_A");
  let caughtCrossModal = false;
  try {
    assertNeverRatedBothModalities("rater_A", "sample_001", lyricRaters, audioRaters);
  } catch (err: any) {
    if (err.message.includes("Cross-modal contamination")) {
      caughtCrossModal = true;
    }
  }
  assert(caughtCrossModal, "assertNeverRatedBothModalities rejects cross-modal evaluator contamination");
  totalPassed += 2;

  // -------------------------------------------------------------
  // TEST 6: Execution Latency Budget (<5ms)
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Execution Latency Budget (<5ms) ---");
  const start = performance.now();
  for (let i = 0; i < 50; i++) {
    const p = generateFactorialPlan(SAMPLE_FIXTURES, 2, "seed_test");
    createBlindedEvaluationPackages(testManifests);
  }
  const avgDurationMs = (performance.now() - start) / 50;
  assert(
    avgDurationMs < 5.0,
    `Factorial plan and blinding packages generated in ${avgDurationMs.toFixed(3)}ms (budget: <5ms)`
  );
  totalPassed += 1;

  console.log("\n=======================================================");
  console.log(`📊 ALL FACTORIAL HARNESS TESTS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
}

runFactorialHarnessTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

// Test Suite for TRAPLORD Hook Variations Adaptativas (Paso 2)
// Validates:
// 1. getRhymeTier resolution for Tier 1, Tier 2, Tier 3 artists
// 2. getHookDensityProfile adaptive structure across tiers
// 3. Strict verification of soft, elastic preferences (no rigid mathematical quotas)
// 4. Factorial toggle isolation (hookVariationsEnabled: true vs false)
// 5. Execution latency budget (<5ms deterministic local resolution)

import {
  getRhymeTier,
  getHookDensityProfile,
  type HookDensityProfile,
} from "../src/lib/artist-flow-profiles";
import { buildStage1ToplinePrompt } from "../src/lib/prompt-builder";
import type { PromptParams } from "../src/lib/prompt-builder";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runHookVariationsTests() {
  console.log("=======================================================");
  console.log("🧪 RUNNING HOOK VARIATIONS & ADAPTIVE DENSITY TESTS");
  console.log("=======================================================\n");

  let totalPassed = 0;

  // -------------------------------------------------------------
  // TEST 1: getRhymeTier Resolution Across Tiers
  // -------------------------------------------------------------
  console.log("--- TEST 1: getRhymeTier Resolution Across Tiers ---");
  const tier1Eminem = getRhymeTier("eminem");
  const tier1Kendrick = getRhymeTier("kendrick");
  assert(tier1Eminem === 1, "Eminem resolved to Rhyme Tier 1 (technical)");
  assert(tier1Kendrick === 1, "Kendrick resolved to Rhyme Tier 1 (technical)");

  const tier2Drake = getRhymeTier("drake");
  const tier2Travis = getRhymeTier("travis_scott");
  const tier2Quavo = getRhymeTier("quavo");
  assert(tier2Drake === 2, "Drake resolved to Rhyme Tier 2 (balanced)");
  assert(tier2Travis === 2, "Travis Scott resolved to Rhyme Tier 2 (balanced)");
  assert(tier2Quavo === 2, "Quavo resolved to Rhyme Tier 2 (triplets/balanced)");

  const tier3Savage = getRhymeTier("21_savage");
  const tier3Carti = getRhymeTier("playboi_carti");
  const tier3Yeat = getRhymeTier("yeat");
  const tier3Beef = getRhymeTier("yung_beef");
  assert(tier3Savage === 3, "21 Savage resolved to Rhyme Tier 3 (street/bounce)");
  assert(tier3Carti === 3, "Carti resolved to Rhyme Tier 3 (street/bounce)");
  assert(tier3Yeat === 3, "Yeat resolved to Rhyme Tier 3 (street/bounce)");
  assert(tier3Beef === 3, "Yung Beef resolved to Rhyme Tier 3 (street/bounce)");

  const fallbackTier = getRhymeTier("non_existent_artist");
  assert(fallbackTier === 2, "Unknown artist falls back cleanly to Tier 2");
  totalPassed += 10;

  // -------------------------------------------------------------
  // TEST 2: getHookDensityProfile Adaptive Resolution Across Tiers
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: getHookDensityProfile Adaptive Resolution Across Tiers ---");
  const densityT1 = getHookDensityProfile("eminem");
  assert(densityT1.tier === 1, "Tier 1 profile tier property is 1");
  assert(densityT1.syllablesPerBar.typical >= 12 && densityT1.syllablesPerBar.typical <= 16, "Tier 1 typical syllables is high (~12-16)");
  assert(densityT1.syllablesPerBar.min < densityT1.syllablesPerBar.typical, "Tier 1 min < typical");
  assert(densityT1.syllablesPerBar.max > densityT1.syllablesPerBar.typical, "Tier 1 max > typical");
  assert(densityT1.pausePreference === 0.20, "Tier 1 pause preference is tight (0.20)");
  assert(densityT1.adlibDensity === 0.25, "Tier 1 ad-lib density is selective (0.25)");

  const densityT2 = getHookDensityProfile("drake");
  assert(densityT2.tier === 2, "Tier 2 profile tier property is 2");
  assert(densityT2.syllablesPerBar.typical >= 8 && densityT2.syllablesPerBar.typical <= 12, "Tier 2 typical syllables is balanced (~8-12)");
  assert(densityT2.pausePreference === 0.35, "Tier 2 pause preference is moderate (0.35)");
  assert(densityT2.adlibDensity === 0.35, "Tier 2 ad-lib density is moderate (0.35)");

  const densityT3 = getHookDensityProfile("21_savage");
  assert(densityT3.tier === 3, "Tier 3 profile tier property is 3");
  assert(densityT3.syllablesPerBar.typical >= 5 && densityT3.syllablesPerBar.typical <= 8, "Tier 3 typical syllables is spacious (~5-8)");
  assert(densityT3.pausePreference === 0.50, "Tier 3 pause preference is spacious (0.50)");
  assert(densityT3.adlibDensity === 0.45, "Tier 3 ad-lib density is high (0.45)");
  totalPassed += 14;

  // -------------------------------------------------------------
  // TEST 3: Strict Soft Preference Wording (No Rigid Mathematical Quotas)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Strict Soft Preference Wording (No Rigid Quotas) ---");
  const prompts = [densityT1.instructionPrompt, densityT2.instructionPrompt, densityT3.instructionPrompt];
  for (const p of prompts) {
    assert(p.includes("~"), "Instruction prompt specifies approximate typical syllables with '~'");
    assert(p.includes("rango elástico"), "Instruction prompt explicitly defines elastic range ('rango elástico')");
    assert(p.includes("sin cuotas rígidas"), "Instruction prompt explicitly states 'sin cuotas rígidas'");
    assert(!p.includes("exactamente"), "Instruction prompt does not demand exact mathematical syllable count");
  }
  totalPassed += 12;

  // -------------------------------------------------------------
  // TEST 4: Factorial Toggle Isolation (hookVariationsEnabled: true vs false)
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Factorial Toggle Isolation (hookVariationsEnabled) ---");
  const dummyParams: PromptParams = {
    artistId: "21_savage",
    featureArtistId: "",
    moodId: "dark",
    topics: ["calle", "dinero"],
    customTopic: "",
    spanglishPercent: 0,
    bpmVibe: { id: "trap_mid", label: "Trap Mid", range: "130-140" },
    structure: {
      id: "standard",
      label: "Standard",
      sections: [
        { name: "Intro", type: "intro" },
        { name: "Hook", type: "hook", bars: 8 },
        { name: "Verse 1", type: "verse", bars: 16 },
      ],
    },
    narrativeArcId: "classic",
    narrativeArcDesc: "Calle",
    producerId: "none",
    producerTag: "",
    producerName: "",
    customDictionary: "",
    dynamicMarkers: true,
  };

  // Condition hookVariationsEnabled = true
  const promptEnabled = buildStage1ToplinePrompt(dummyParams, "Hipótesis rítmica", true);
  assert(
    promptEnabled.includes("ESPACIO RÍTMICO Y DENSIDAD PREFERIDA (ADAPTIVE HOOK FLOW)"),
    "Prompt with hookVariationsEnabled: true contains adaptive hook flow block"
  );
  assert(
    promptEnabled.includes("Preferencia Métrica"),
    "Prompt with hookVariationsEnabled: true contains metric preference"
  );
  assert(
    promptEnabled.includes("Regla Blanda"),
    "Prompt with hookVariationsEnabled: true explicitly states soft rule (Regla Blanda)"
  );

  // Condition hookVariationsEnabled = false
  const promptDisabled = buildStage1ToplinePrompt(dummyParams, "Hipótesis rítmica", false);
  assert(
    !promptDisabled.includes("ESPACIO RÍTMICO Y DENSIDAD PREFERIDA (ADAPTIVE HOOK FLOW)"),
    "Prompt with hookVariationsEnabled: false cleanly omits adaptive hook flow block"
  );
  assert(
    !promptDisabled.includes("Preferencia Métrica"),
    "Prompt with hookVariationsEnabled: false cleanly omits metric preference"
  );
  totalPassed += 5;

  // -------------------------------------------------------------
  // TEST 5: Execution Latency Budget (<5ms)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Execution Latency Budget (<5ms) ---");
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    getRhymeTier("21_savage");
    getHookDensityProfile("21_savage");
    getHookDensityProfile("eminem");
    getHookDensityProfile("drake");
  }
  const avgDurationMs = (performance.now() - start) / 100;
  assert(
    avgDurationMs < 5.0,
    `Deterministic hook density resolution executed in ${avgDurationMs.toFixed(3)}ms (budget: <5ms)`
  );
  totalPassed += 1;

  console.log("\n=======================================================");
  console.log(`📊 ALL HOOK VARIATIONS TESTS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
}

runHookVariationsTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

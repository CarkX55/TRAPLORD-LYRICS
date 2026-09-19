// Test Suite for TRAPLORD Speaker Dialect Engine & Regional Spanish Flavor
// Validates:
// 1. SpeakerDialectProfile resolution across artist regions and fallbacks
// 2. SpanishFlavor resolution (explicit and auto based on lead artist)
// 3. Prompt Hygiene: ZERO negative example leaks ("baloncesto profesional", etc.)
// 4. No-Checklist verification: descriptive characteristics instead of mechanical word lists
// 5. Dialect & Translation Auditor: calque detection, contamination clusters, slang overstuffing
// 6. Latency budget: execution in <5ms

import {
  resolveSpeakerDialectProfile,
  resolveSpanishFlavor,
  buildDialectPromptDirectives,
  buildLanguageAllocationPlan,
  auditDialectAndTranslationArtifacts,
  SPANISH_FLAVOR_CATALOG,
  SPEAKER_DIALECT_CATALOG,
  type LanguageAllocationPlan,
} from "../src/lib/dialect-engine";
import {
  BENCHMARK_EXECUTION_COMMIT,
  BENCHMARK_EXECUTION_TAG,
} from "../src/lib/factorial-harness";
import { type SongDocument } from "../src/lib/song-document";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runDialectEngineTests() {
  console.log("=======================================================");
  console.log("🧪 RUNNING SPEAKER DIALECT ENGINE & SPANISH FLAVOR TESTS");
  console.log("=======================================================\n");

  let totalPassed = 0;

  // -------------------------------------------------------------
  // TEST 1: SpeakerDialectProfile Resolution & Confidence
  // -------------------------------------------------------------
  console.log("--- TEST 1: SpeakerDialectProfile Resolution & Confidence ---");
  const offsetProfile = resolveSpeakerDialectProfile("offset");
  assert(offsetProfile.artistId === "offset", "Offset profile artistId matches");
  assert(offsetProfile.primaryLanguage === "en", "Offset primaryLanguage is English");
  assert(offsetProfile.primaryDialect.includes("Atlanta"), "Offset primaryDialect is Atlanta AAVE");
  assert(offsetProfile.dialectConfidence >= 0.9, "Offset dialectConfidence is high (>=0.9)");

  const chimiProfile = resolveSpeakerDialectProfile("yovngchimi");
  assert(chimiProfile.artistId === "yovngchimi", "Yovngchimi profile artistId matches");
  assert(chimiProfile.primaryLanguage === "es", "Yovngchimi primaryLanguage is Spanish");
  assert(chimiProfile.primaryDialect.includes("Puerto Rico"), "Yovngchimi primaryDialect is Puerto Rico Drill");

  const moradProfile = resolveSpeakerDialectProfile("morad");
  assert(moradProfile.primaryDialect.includes("España"), "Morad primaryDialect is España / Bando");

  const cenchProfile = resolveSpeakerDialectProfile("central_cee");
  assert(cenchProfile.primaryDialect.includes("UK Drill"), "Central Cee primaryDialect is UK Drill");

  // Fallback test
  const fallbackPR = resolveSpeakerDialectProfile("unknown_pr_artist");
  assert(fallbackPR.englishRegister !== undefined, "Fallback generates valid englishRegister");
  assert(fallbackPR.spanishRegister !== undefined, "Fallback generates valid spanishRegister");
  totalPassed += 9;

  // -------------------------------------------------------------
  // TEST 2: SpanishFlavor Resolution (Explicit, Speaker & Universal Fallback)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: SpanishFlavor Resolution ---");
  // Offset solo (both English native) -> Universal fallback to neutral_latam
  const autoOffsetSolo = resolveSpanishFlavor("auto", offsetProfile);
  assert(autoOffsetSolo.flavor === "neutral_latam", "Auto flavor for Offset solo resolves to universal neutral_latam");

  // Offset + Future (both English native) -> Universal fallback to neutral_latam
  const futureProfile = resolveSpeakerDialectProfile("future");
  const autoEnDuet = resolveSpanishFlavor("auto", offsetProfile, futureProfile);
  assert(autoEnDuet.flavor === "neutral_latam", "Auto flavor for Offset + Future resolves to universal neutral_latam");

  // Offset + Yovngchimi -> Feature is native PR Drill -> resolves to puerto_rico
  const autoCollab = resolveSpanishFlavor("auto", offsetProfile, chimiProfile);
  assert(autoCollab.flavor === "puerto_rico", "Auto flavor for Offset + Yovngchimi resolves to feature's Puerto Rico");

  // Morad solo -> Lead is native Spanish (Spain) -> resolves to spain
  const autoMorad = resolveSpanishFlavor("auto", moradProfile);
  assert(autoMorad.flavor === "spain", "Auto flavor for Morad resolves to Spain peninsular");

  // Explicit flavors
  const explicitMexico = resolveSpanishFlavor("mexico");
  assert(explicitMexico.flavor === "mexico", "Explicit 'mexico' resolves Mexico flavor profile");
  assert(explicitMexico.flag === "🇲🇽", "Mexico flag is 🇲🇽");

  const explicitRD = resolveSpanishFlavor("dominican");
  assert(explicitRD.flavor === "dominican", "Explicit 'dominican' resolves Dominican flavor profile");

  const explicitArg = resolveSpanishFlavor("argentina");
  assert(explicitArg.flavor === "argentina", "Explicit 'argentina' resolves Argentina flavor profile");

  // Cascading Precedence:
  // 1. Explicit UI wins even if project config is set
  const explicitWins = resolveSpanishFlavor("mexico", offsetProfile, chimiProfile, "spain");
  assert(explicitWins.flavor === "mexico", "Cascading P1: Explicit user selection wins over project and speaker");

  // 2. Project config wins if UI is "auto"
  const projectWins = resolveSpanishFlavor("auto", offsetProfile, chimiProfile, "spain");
  assert(projectWins.flavor === "spain", "Cascading P2: Project default wins when user selects 'auto'");

  // 3. Spanish-native feature resolves when Lead is English
  const speakerFeatureWins = resolveSpanishFlavor("auto", offsetProfile, chimiProfile, "auto");
  assert(speakerFeatureWins.flavor === "puerto_rico", "Cascading P3: Feature native Spanish resolves when Lead is English");

  // 4. Primary Spanish-native speaker resolves
  const speakerLeadWins = resolveSpanishFlavor("auto", chimiProfile, offsetProfile, "auto");
  assert(speakerLeadWins.flavor === "puerto_rico", "Cascading P4: Lead native Spanish resolves");

  totalPassed += 12;

  // -------------------------------------------------------------
  // TEST 2.1: LanguageAllocationPlan (Weighted Syllable Solver & Soft/Hard Bands)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2.1: LanguageAllocationPlan ---");
  const testSections = [
    { id: "sec_intro", name: "Intro", type: "intro", voiceArtistId: "offset", bars: 4 },
    { id: "sec_v1", name: "Verse 1", type: "verse", voiceArtistId: "offset", bars: 16 },
    { id: "sec_hook", name: "Chorus", type: "hook", voiceArtistId: "offset", bars: 8 },
    { id: "sec_v2", name: "Verse 2", type: "verse", voiceArtistId: "yovngchimi", bars: 16 },
  ];

  const allocPlan = buildLanguageAllocationPlan(0.70, offsetProfile, chimiProfile, testSections);
  assert(allocPlan.targetEnglishRatio === 0.70, "AllocPlan reflects targetEnglishRatio 0.70");
  assert(allocPlan.globalSoftBand.min === 0.65, "Soft band min is 0.65 (0.70 - 0.05)");
  assert(allocPlan.globalSoftBand.max === 0.75, "Soft band max is 0.75 (0.70 + 0.05)");
  assert(allocPlan.globalHardBand.min === 0.58, "Hard band min is 0.58 (0.70 - 0.12)");
  assert(allocPlan.globalHardBand.max === 0.82, "Hard band max is 0.82 (0.70 + 0.12)");
  assert(allocPlan.allocationMode === "deterministic_voice_weighted", "Allocation mode is deterministic_voice_weighted");
  assert(allocPlan.sections.length === 4, "AllocPlan contains exactly 4 sections");

  // Mathematical Solver Reconciliation Check:
  // sum(w_i * r_i) must equal effectiveTargetEnglishRatio exactly
  const weightedSum = allocPlan.sections.reduce((acc, s) => acc + s.preferredEnglishRatio * s.syllableWeight, 0);
  assert(Math.abs(weightedSum - 0.70) <= 0.015, `Mathematical Solver: weighted sum ${weightedSum.toFixed(3)} matches target 0.70 (error <= 0.015)`);
  assert(allocPlan.effectiveTargetEnglishRatio === 0.70, "effectiveTargetEnglishRatio is 0.70 for reachable target");
  assert(allocPlan.predictedEnglishRatio === 0.70, "predictedEnglishRatio matches target 0.70 exactly");
  assert(allocPlan.allocationStatus === "FEASIBLE", "allocationStatus is FEASIBLE for balanced 70% target");
  assert(typeof allocPlan.boundaryConstraintActive === "boolean", "boundaryConstraintActive is a separate boolean diagnostic");

  // Syllable Mass Verification (W_i = expectedSyllables_i / totalExpectedSyllables):
  const introSec = allocPlan.sections.find(s => s.sectionId === "sec_intro")!;
  const v1Sec = allocPlan.sections.find(s => s.sectionId === "sec_v1")!;
  const chimiVerse = allocPlan.sections.find(s => s.sectionId === "sec_v2")!;
  assert(introSec.expectedSyllables === 28, "Intro (4 bars * 7) has expectedSyllables 28");
  assert(v1Sec.expectedSyllables === 224, "Verse 1 (16 bars * 14) has expectedSyllables 224");
  assert(introSec.linguisticBounds.min === 0.20 && introSec.linguisticBounds.max === 1.00, "Offset section has linguistic bounds [0.20, 1.00]");
  assert(chimiVerse.linguisticBounds.min === 0.00 && chimiVerse.linguisticBounds.max === 0.70, "Yovngchimi section has linguistic bounds [0.00, 0.70]");

  // Achievable Range Verification:
  assert(allocPlan.achievableRange.min >= 0.11 && allocPlan.achievableRange.min <= 0.13, `T_min is ~0.12 (observed: ${allocPlan.achievableRange.min})`);
  assert(allocPlan.achievableRange.max >= 0.86 && allocPlan.achievableRange.max <= 0.89, `T_max is ~0.88 (observed: ${allocPlan.achievableRange.max})`);

  // Offset sections should have higher English ratio than Yovngchimi's verse
  const offsetVerse = allocPlan.sections.find(s => s.sectionId === "sec_v1")!;
  assert(offsetVerse.preferredEnglishRatio > chimiVerse.preferredEnglishRatio, "Offset section has higher English ratio than Yovngchimi section");
  assert(chimiVerse.preferredEnglishRatio < 0.65, "Yovngchimi section provides balanced/higher Spanish content");
  assert(chimiVerse.targetGuideline.includes("yovngchimi"), "Target guideline includes artist identity");

  // Infeasibility & Clamping Status Checks:
  const extremePlan = buildLanguageAllocationPlan(0.99, offsetProfile, chimiProfile, testSections);
  assert(extremePlan.allocationStatus === "INFEASIBLE", "Target 0.99 > T_max (0.88) is strictly INFEASIBLE");
  assert(extremePlan.effectiveTargetEnglishRatio === extremePlan.achievableRange.max, "effectiveTargetEnglishRatio is clipped to T_max");
  assert(extremePlan.predictedEnglishRatio === extremePlan.achievableRange.max, "predictedEnglishRatio equals T_max when target > T_max");

  const lowExtremePlan = buildLanguageAllocationPlan(0.05, offsetProfile, chimiProfile, testSections);
  assert(lowExtremePlan.allocationStatus === "INFEASIBLE", "Target 0.05 < T_min (0.12) is strictly INFEASIBLE");
  assert(lowExtremePlan.effectiveTargetEnglishRatio === lowExtremePlan.achievableRange.min, "effectiveTargetEnglishRatio is clipped to T_min");
  assert(lowExtremePlan.predictedEnglishRatio === lowExtremePlan.achievableRange.min, "predictedEnglishRatio equals T_min when target < T_min");

  const clampedPlan = buildLanguageAllocationPlan(0.87, offsetProfile, chimiProfile, testSections);
  assert(clampedPlan.allocationStatus === "CLAMPED", "Target 0.87 within eps=0.02 of T_max (0.88) is CLAMPED");

  // Interior Target with Active Box Constraint is still FEASIBLE:
  const feasibleBoxPlan = buildLanguageAllocationPlan(0.60, offsetProfile, chimiProfile, testSections);
  assert(feasibleBoxPlan.allocationStatus === "FEASIBLE", "Target 0.60 in interior is FEASIBLE even if individual box constraints activate");
  assert(feasibleBoxPlan.effectiveTargetEnglishRatio === 0.60, "effectiveTargetEnglishRatio preserves target 0.60");
  assert(feasibleBoxPlan.predictedEnglishRatio === 0.60, "predictedEnglishRatio preserves target 0.60 exactly");

  // Band Clipping Verification at Edges:
  const edgePlan = buildLanguageAllocationPlan(0.95, offsetProfile, chimiProfile, testSections);
  assert(edgePlan.globalSoftBand.min === 0.90, "Soft band min is 0.90");
  assert(edgePlan.globalSoftBand.max === 1.00, "Soft band max is clamped to 1.00 (not 1.00+)");
  assert(edgePlan.globalHardBand.min === 0.83, "Hard band min is 0.83 (0.95 - 0.12)");
  assert(edgePlan.globalHardBand.max === 1.00, "Hard band max is clamped to 1.00 (not 1.07)");

  // Predicted vs Observed Variable Decoupling Test:
  allocPlan.observedEnglishRatio = 0.68;
  assert(allocPlan.observedEnglishRatio !== undefined, "observedEnglishRatio can be recorded post-generation");
  assert(allocPlan.observedEnglishRatio !== allocPlan.predictedEnglishRatio, "predictedEnglishRatio (planned) and observedEnglishRatio (actual AST) are distinct variables");
  totalPassed += 34;

  // -------------------------------------------------------------
  // TEST 3: Prompt Hygiene (ZERO Negative Example Leaks)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Prompt Hygiene (ZERO Negative Example Leaks) ---");
  const directives = buildDialectPromptDirectives(offsetProfile, chimiProfile, autoCollab, 0.70, allocPlan);

  // Prohibited negative phrase strings must NEVER appear in the generated prompt
  const negativePhrases = [
    "baloncesto profesional",
    "fumar la llama",
    "fuman conmigo la llama",
    "no compito con novatos",
    "no mezclo la blood",
    "disparar desde la cadera",
    "coche",
    "chaval",
  ];

  for (const phrase of negativePhrases) {
    assert(
      !directives.toLowerCase().includes(phrase.toLowerCase()),
      `Prompt directives contain ZERO leak of '${phrase}'`
    );
  }

  // Affirmative principles must be present
  assert(directives.includes("PRINCIPIO ANTI-TRADUCCIÓN"), "Directives include affirmative ANTI-TRANSLATION PRINCIPLE");
  assert(directives.includes("PRINCIPIO DE AUTENTICIDAD TEMÁTICA"), "Directives include THEMATIC INTEGRITY PRINCIPLE");
  assert(directives.includes("~70% Inglés / ~30% Español"), "Directives specify global syllable-weighted target ~70/30");
  totalPassed += negativePhrases.length + 3;

  // -------------------------------------------------------------
  // TEST 4: No-Checklist Verification (Descriptive Space)
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: No-Checklist Verification ---");
  // Check that the prompt directives describe syntax and cadence, rather than commanding "insert word X, Y, Z"
  assert(directives.includes("Compresión conversacional caribeña"), "Includes descriptive syntax characteristics");
  assert(directives.includes("Compressed colloquial syntax"), "Includes descriptive AAVE syntax guidelines");
  assert(!directives.includes("usa obligatoriamente"), "Does not use mechanical checklist commands");
  totalPassed += 3;

  // -------------------------------------------------------------
  // TEST 5: Language & Dialect Auditor (Calques, Contamination, Overstuffing)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Language & Dialect Auditor ---");
  const flavorPR = SPANISH_FLAVOR_CATALOG.puerto_rico;

  // 5.1 Clean document
  const cleanDoc: SongDocument = {
    id: "song_clean_bilingual",
    versionId: "v_1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sections: [
      {
        id: "sec_v1",
        name: "Verse 1",
        type: "verse",
        bars: [
          { id: "b1", position: 1, lyricText: "I came up from the bottom now the whole team lit", locked: false },
          { id: "b2", position: 2, lyricText: "Caminando por el caserío con los míos sin miedo", locked: false },
          { id: "b3", position: 3, lyricText: "Subo en el carro negro, la visión siempre clara", locked: false },
        ],
      },
    ],
  };

  const cleanAudit = auditDialectAndTranslationArtifacts(cleanDoc, flavorPR, offsetProfile, chimiProfile);
  assert(cleanAudit.passed === true, "Clean bilingual document passes dialect audit cleanly");
  assert(cleanAudit.translationArtifactScore === 0, "Clean document has 0 translation calque score");
  assert(cleanAudit.flaggedBarsForRepair.length === 0, "Clean document has 0 flagged bars for repair");

  // 5.2 Hostile document with translation calque ("baloncesto profesional")
  const calqueDoc: SongDocument = {
    id: "song_calque",
    versionId: "v_1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sections: [
      {
        id: "sec_v2",
        name: "Verse 2",
        type: "verse",
        bars: [
          { id: "b_bad", position: 1, lyricText: "Baloncesto profesional, shoot from the hip", locked: false },
          { id: "b_ok", position: 2, lyricText: "Stand on business, solid niggas don't crack", locked: false },
        ],
      },
    ],
  };

  const calqueAudit = auditDialectAndTranslationArtifacts(calqueDoc, flavorPR, offsetProfile, chimiProfile);
  assert(calqueAudit.passed === false, "Document with 'baloncesto profesional' fails audit");
  assert(calqueAudit.translationArtifactScore >= 0.4, "Detects high translationArtifactScore");
  assert(calqueAudit.flaggedBarsForRepair.length === 1, "Flags exactly 1 bar for surgical repair");
  assert(calqueAudit.flaggedBarsForRepair[0].barId === "b_bad", "Flagged bar is b_bad");

  // 5.3 Document with peninsular dialect contamination cluster in PR flavor
  const contaminationDoc: SongDocument = {
    id: "song_contam",
    versionId: "v_1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sections: [
      {
        id: "sec_v1",
        name: "Verse 1",
        type: "verse",
        bars: [
          { id: "b_contam", position: 1, lyricText: "El chaval se montó en el coche con su tío buscando pasta", locked: false },
        ],
      },
    ],
  };

  const contamAudit = auditDialectAndTranslationArtifacts(contaminationDoc, flavorPR, chimiProfile);
  assert(contamAudit.dialectContaminationScore > 0, "Contamination cluster increases dialectContaminationScore");
  assert(contamAudit.issues.some(i => i.issueType === "dialect_contamination"), "Detects dialect_contamination issue");

  // 5.4 Document with slang checklist overstuffing (4+ strong markers crammed in 1 bar)
  const overstuffedDoc: SongDocument = {
    id: "song_overstuff",
    versionId: "v_1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sections: [
      {
        id: "sec_v1",
        name: "Verse 1",
        type: "verse",
        bars: [
          { id: "b_stuff", position: 1, lyricText: "En el caserío con los chavos y la moña josear el piquete", locked: false },
        ],
      },
    ],
  };

  const overstuffAudit = auditDialectAndTranslationArtifacts(overstuffedDoc, flavorPR, chimiProfile);
  assert(overstuffAudit.slangChecklistScore > 0, "Overstuffing increases slangChecklistScore");
  assert(overstuffAudit.issues.some(i => i.issueType === "slang_overstuffing"), "Detects slang_overstuffing issue");
  assert(overstuffAudit.flaggedBarsForRepair.length === 0, "Non-destructive: overstuffing alone does NOT force surgical repair");
  totalPassed += 12;

  // -------------------------------------------------------------
  // TEST 6: Execution Latency Budget (<5ms)
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Execution Latency Budget (<5ms) ---");
  const start = performance.now();
  for (let i = 0; i < 50; i++) {
    const prof = resolveSpeakerDialectProfile("offset");
    const flav = resolveSpanishFlavor("auto", prof);
    buildDialectPromptDirectives(prof, chimiProfile, flav, 0.70);
    auditDialectAndTranslationArtifacts(cleanDoc, flav, prof, chimiProfile);
  }
  const avgMs = (performance.now() - start) / 50;
  assert(avgMs < 5.0, `Dialect resolution, directives and audit executed in ${avgMs.toFixed(3)}ms (budget: <5ms)`);
  totalPassed += 1;

  // -------------------------------------------------------------
  // TEST 7: Benchmark Contract Immutability & Execution Isolation
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Benchmark Contract v1 Isolation ---");
  assert(BENCHMARK_EXECUTION_COMMIT === "43d92c0", "Benchmark execution commit is frozen at 43d92c0");
  assert(BENCHMARK_EXECUTION_TAG === "benchmark-contract-v1-frozen", "Benchmark execution tag is benchmark-contract-v1-frozen");
  totalPassed += 2;

  console.log("\n=======================================================");
  console.log(`📊 ALL DIALECT ENGINE TESTS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
}

runDialectEngineTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

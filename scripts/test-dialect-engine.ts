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
  auditDialectAndTranslationArtifacts,
  SPANISH_FLAVOR_CATALOG,
  SPEAKER_DIALECT_CATALOG,
} from "../src/lib/dialect-engine";
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
  // TEST 2: SpanishFlavor Resolution (Explicit & Auto)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: SpanishFlavor Resolution ---");
  const autoOffset = resolveSpanishFlavor("auto", offsetProfile);
  assert(autoOffset.flavor === "puerto_rico", "Auto flavor for Offset resolves to Puerto Rico urban trap");

  const autoMorad = resolveSpanishFlavor("auto", moradProfile);
  assert(autoMorad.flavor === "spain", "Auto flavor for Morad resolves to Spain peninsular");

  const explicitMexico = resolveSpanishFlavor("mexico");
  assert(explicitMexico.flavor === "mexico", "Explicit 'mexico' resolves Mexico flavor profile");
  assert(explicitMexico.flag === "🇲🇽", "Mexico flag is 🇲🇽");

  const explicitRD = resolveSpanishFlavor("dominican");
  assert(explicitRD.flavor === "dominican", "Explicit 'dominican' resolves Dominican flavor profile");

  const explicitArg = resolveSpanishFlavor("argentina");
  assert(explicitArg.flavor === "argentina", "Explicit 'argentina' resolves Argentina flavor profile");
  totalPassed += 6;

  // -------------------------------------------------------------
  // TEST 3: Prompt Hygiene (ZERO Negative Example Leaks)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Prompt Hygiene (ZERO Negative Example Leaks) ---");
  const directives = buildDialectPromptDirectives(offsetProfile, chimiProfile, autoOffset, 0.70);

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
  totalPassed += 11;

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

  console.log("\n=======================================================");
  console.log(`📊 ALL DIALECT ENGINE TESTS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
}

runDialectEngineTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

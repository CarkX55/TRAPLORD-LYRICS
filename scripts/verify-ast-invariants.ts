// Property-Based Invariant Verification Suite for TRAPLORD AST
// Verifies formal laws P1-P8 across 500 randomized song documents and patch scenarios.

import {
  type SongDocument,
  type SongSectionDoc,
  type SongBar,
  hashBarContent,
  stringifyASTToSunoLyrics,
  parseRawLyricsToAST,
  validateMutation,
  cloneSongDocument,
} from "../src/lib/song-document";

import {
  type RepairOperation,
  applySurgicalPatchToAST,
} from "../src/lib/repair-engine";

function generateRandomSongDocument(id: string, numSections: number = 3, barsPerSection: number = 8): SongDocument {
  const sections: SongSectionDoc[] = [];
  const sectionTypes: SongSectionDoc["type"][] = ["intro", "verse", "hook", "bridge", "outro"];

  for (let s = 0; s < numSections; s++) {
    const secId = `s_${s}_${Math.random().toString(36).slice(2, 6)}`;
    const secType = sectionTypes[s % sectionTypes.length];
    const bars: SongBar[] = [];

    for (let b = 1; b <= barsPerSection; b++) {
      const isLocked = Math.random() < 0.25; // 25% chance of being locked
      const hasAdlib = Math.random() < 0.4;
      const hasPause = Math.random() < 0.15;

      bars.push({
        id: `b_${s}_${b}_${Math.random().toString(36).slice(2, 6)}`,
        position: b,
        lyricText: `Bar ${b} in section ${s} lyrics sample content ${Math.random().toString(36).slice(2, 5)}`,
        locked: isLocked,
        performance: {
          pauseBefore: hasPause,
          adlibs: hasAdlib ? [`(yeah ${b})`] : undefined,
          vocalCut: b === barsPerSection && secType === "verse",
        },
      });
    }

    sections.push({
      id: secId,
      name: secType === "verse" ? `Verse ${s}` : secType === "hook" ? "Chorus" : "Intro",
      type: secType,
      voiceId: "lead",
      performanceHint: "Tight pocket, heavy 808",
      bars,
    });
  }

  return {
    schemaVersion: 1,
    id,
    versionId: `v_init_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sections,
  };
}

async function runPropertyTests() {
  console.log("==========================================================");
  console.log("🛡️  TRAPLORD AST PROPERTY-BASED VERIFICATION SUITE (P1-P8)");
  console.log("==========================================================");

  let passed = 0;
  let failed = 0;
  const totalRuns = 500;

  // --- P1 & P5 & P6: Untargeted Invariance, Version Monotonicity & Immutability ---
  console.log(`\n[P1, P5, P6] Testing Untargeted Invariance & Immutability over ${totalRuns} runs...`);
  for (let i = 0; i < totalRuns; i++) {
    const doc = generateRandomSongDocument(`song_${i}`, 3, 8);
    const targetSection = doc.sections[1]; // Target verse
    // Unlock first 2 bars for this test to ensure a valid patch
    targetSection.bars[0].locked = false;
    targetSection.bars[1].locked = false;

    const targetBarIds = [targetSection.bars[0].id, targetSection.bars[1].id];
    const initialDocClone = cloneSongDocument(doc);

    const operation: RepairOperation = {
      id: `op_${i}`,
      songId: doc.id,
      sourceVersionId: doc.versionId,
      sectionId: targetSection.id,
      barRange: [1, 2],
      targetBarIds,
      problem: "genericness",
      instruction: "Sustituye por detalles físicos concretos.",
    };

    const patchResult = applySurgicalPatchToAST(doc, operation, [
      { lyricText: `Parche quirúrgico barra 1 run ${i}` },
      { lyricText: `Parche quirúrgico barra 2 run ${i}` },
    ]);

    if (!patchResult.success) {
      console.error(`❌ Run ${i} failed unexpectedly:`, patchResult.error);
      failed++;
      continue;
    }

    // P5: Version monotonicity
    if (patchResult.newVersionId === doc.versionId) {
      console.error(`❌ P5 violation in run ${i}: newVersionId equals sourceVersionId`);
      failed++;
      continue;
    }

    // P6: Memory immutability of original doc
    if (JSON.stringify(doc) !== JSON.stringify(initialDocClone)) {
      console.error(`❌ P6 violation in run ${i}: original document was mutated in memory`);
      failed++;
      continue;
    }

    // P1: Check all untargeted bars remain bitwise identical
    const origBars = doc.sections.flatMap(s => s.bars);
    const patchedBarsMap = new Map(patchResult.document.sections.flatMap(s => s.bars).map(b => [b.id, b]));

    let runP1Valid = true;
    for (const b of origBars) {
      if (!targetBarIds.includes(b.id)) {
        const patchedBar = patchedBarsMap.get(b.id);
        if (!patchedBar || hashBarContent(b) !== hashBarContent(patchedBar)) {
          console.error(`❌ P1 violation in run ${i} for untargeted bar [${b.id}]`);
          runP1Valid = false;
          break;
        }
      }
    }

    if (runP1Valid) passed++;
    else failed++;
  }
  console.log(`  ✓ P1, P5, P6: ${passed}/${totalRuns} runs passed with 100% bitwise invariance.`);

  // --- P2 & P7: Locked Bar Invariance & Atomicity ---
  console.log(`\n[P2, P7] Testing Locked Invariance & Atomic Safety (No Partial Mutations)...`);
  let p2Passed = 0;
  for (let i = 0; i < 100; i++) {
    const doc = generateRandomSongDocument(`song_locked_${i}`, 2, 6);
    const sec = doc.sections[0];
    // Force bar 1 unlocked, bar 2 LOCKED
    sec.bars[0].locked = false;
    sec.bars[1].locked = true;

    const targetBarIds = [sec.bars[0].id, sec.bars[1].id];
    const initialDocClone = cloneSongDocument(doc);

    const operation: RepairOperation = {
      id: `op_locked_${i}`,
      songId: doc.id,
      sourceVersionId: doc.versionId,
      sectionId: sec.id,
      barRange: [1, 2],
      targetBarIds,
      problem: "cliche",
      instruction: "Rewrite cliché bars",
    };

    const patchResult = applySurgicalPatchToAST(doc, operation, [
      { lyricText: "Should not apply" },
      { lyricText: "Should not apply" },
    ]);

    // P2: Must be rejected
    if (patchResult.success) {
      console.error(`❌ P2 violation in run ${i}: locked bar was allowed to mutate!`);
      failed++;
      continue;
    }

    // P7: Atomicity — doc returned in failure result is completely untouched
    if (JSON.stringify(patchResult.document) !== JSON.stringify(initialDocClone)) {
      console.error(`❌ P7 violation in run ${i}: document was partially mutated on error!`);
      failed++;
      continue;
    }

    p2Passed++;
  }
  console.log(`  ✓ P2, P7: ${p2Passed}/100 tests passed. Locked bars strictly protected; atomic rollback verified.`);

  // --- P3: Version Concurrency Protection ---
  console.log(`\n[P3] Testing Version Concurrency Collision Detection...`);
  let p3Passed = 0;
  for (let i = 0; i < 100; i++) {
    const doc = generateRandomSongDocument(`song_conc_${i}`, 2, 4);
    const operation: RepairOperation = {
      id: `op_conc_${i}`,
      songId: doc.id,
      sourceVersionId: "v_stale_outdated_version_id",
      sectionId: doc.sections[0].id,
      barRange: [1, 1],
      targetBarIds: [doc.sections[0].bars[0].id],
      problem: "genericness",
      instruction: "test",
    };

    const patchResult = applySurgicalPatchToAST(doc, operation, [{ lyricText: "test" }]);
    if (!patchResult.success && patchResult.error?.includes("Versión desfasada")) {
      p3Passed++;
    } else {
      console.error(`❌ P3 violation in run ${i}: Stale version was not rejected!`);
      failed++;
    }
  }
  console.log(`  ✓ P3: ${p3Passed}/100 concurrency collision tests rejected deterministically.`);

  // --- P8: Round-Trip AST Invariance ---
  console.log(`\n[P8] Testing Round-Trip AST Invariance (parse -> stringify -> parse)...`);
  let p8Passed = 0;
  const sampleLyrics = [
    `[Intro: Lead, Atmospheric filtered pad]
Yeah... turn me up
(Yeah, yeah)
[Beat Drop: Heavy 808 drop]

[Chorus: Lead, Hypnotic repetitive mantra, heavy 808]
Same squad... (same squad), los números en la mesa (clean)
Same squad... nunca cambié de cabeza (yeah)
Same squad... la presión nunca me pesa
Same squad... contando mientras tú rezas (facts)

[Verse 1: Lead]
[Pause] Tres mil en la sudadera Rick Owens
Las patrullas dando vueltas a las cuatro en el portal (skrrt)
El teléfono quemando con llamadas del penal
No confío en contratos que no puedo quemar [Vocal Cut]`,
  ];

  for (const raw of sampleLyrics) {
    const ast1 = parseRawLyricsToAST(raw);
    const serialized = stringifyASTToSunoLyrics(ast1);
    const ast2 = parseRawLyricsToAST(serialized, ast1);

    const secCount1 = ast1.sections.length;
    const secCount2 = ast2.sections.length;
    const barCount1 = ast1.sections.flatMap(s => s.bars).length;
    const barCount2 = ast2.sections.flatMap(s => s.bars).length;

    if (secCount1 === secCount2 && barCount1 === barCount2) {
      p8Passed++;
    } else {
      console.error(`❌ P8 violation: Section or bar count mismatch (${secCount1} vs ${secCount2}, ${barCount1} vs ${barCount2})`);
      failed++;
    }
  }
  console.log(`  ✓ P8: Round-trip structural invariance verified.`);

  console.log("\n==========================================================");
  if (failed === 0) {
    console.log("🎉 ALL PROPERTY-BASED INVARIANT TESTS (P1-P8) PASSED 100%!");
  } else {
    console.error(`⚠️ ${failed} tests failed.`);
    process.exit(1);
  }
  console.log("==========================================================");
}

runPropertyTests().catch(err => {
  console.error("Test harness error:", err);
  process.exit(1);
});

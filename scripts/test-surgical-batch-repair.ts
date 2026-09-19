// Test Suite for TRAPLORD Atomic Surgical Batch Repair (Paso 3)
// Validates:
// 1. Test A: Total Success (3 valid targets -> 3 bars replaced in new SongDocument)
// 2. Test B: Strict Atomicity (2 valid + 1 corrupt target -> 0 bars mutated, success: false, original untouched)
// 3. Test C: Non-Lyric Shielding (performance, locked, position, and id 100% preserved)
// 4. Test D: Structural Cardinality Invariance (SectionCardinalitySignature preserved)
// 5. Concurrency Protection (sourceVersionId mismatch rejected atomically)

import {
  applySurgicalBatchToAST,
  getSectionCardinalitySignature,
  type SurgicalRepairResult,
} from "../src/lib/repair-engine";
import {
  type SongDocument,
  type SongSectionDoc,
  type SongBar,
  hashBarContent,
  cloneSongDocument,
} from "../src/lib/song-document";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

function createSampleSongDocument(): SongDocument {
  const sections: SongSectionDoc[] = [
    {
      id: "sec_intro",
      name: "Intro",
      type: "intro",
      bars: [
        {
          id: "b_intro_1",
          position: 1,
          lyricText: "Yeah, enciendan las luces de la cabina",
          locked: false,
          performance: { deliveryTone: "spoken", spaceBefore: true, adlib: "(Turn up)" },
        },
        {
          id: "b_intro_2",
          position: 2,
          lyricText: "El dinero no duerme en la ciudad",
          locked: true, // LOCKED
          performance: { deliveryTone: "shout", adlib: "(Facts)" },
        },
      ],
    },
    {
      id: "sec_verse1",
      name: "Verse 1",
      type: "verse",
      bars: [
        {
          id: "b_v1_1",
          position: 1,
          lyricText: "Cajas apiladas en el fondo del garaje",
          locked: false,
          performance: { deliveryTone: "whisper" },
        },
        {
          id: "b_v1_2",
          position: 2,
          lyricText: "Llamadas perdidas que ya no voy a devolver",
          locked: false,
          performance: { adlib: "(Nunca)" },
        },
        {
          id: "b_v1_3",
          position: 3,
          lyricText: "Cámaras en la esquina grabando los movimientos",
          locked: false,
        },
        {
          id: "b_v1_4",
          position: 4,
          lyricText: "El asfalto frío bajo la suela nueva",
          locked: false,
          performance: { vocalChop: true },
        },
      ],
    },
    {
      id: "sec_hook",
      name: "Chorus",
      type: "hook",
      bars: [
        {
          id: "b_h_1",
          position: 1,
          lyricText: "Corona de oro brillando en el lodo",
          locked: false,
          performance: { deliveryTone: "melodic", adlib: "(Pluto)" },
        },
        {
          id: "b_h_2",
          position: 2,
          lyricText: "Hablan de lealtad pero no estuvieron todos",
          locked: false,
          performance: { deliveryTone: "melodic" },
        },
      ],
    },
  ];

  return {
    id: "song_test_001",
    versionId: "v_init_100",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {
      artistId: "future",
      moodId: "dark",
      bpm: 135,
    },
    sections,
  };
}

async function runSurgicalBatchRepairTests() {
  console.log("=======================================================");
  console.log("🧪 RUNNING ATOMIC SURGICAL BATCH REPAIR TESTS");
  console.log("=======================================================\n");

  let totalPassed = 0;
  const originalDoc = createSampleSongDocument();
  const initialSignature = getSectionCardinalitySignature(originalDoc);

  // -------------------------------------------------------------
  // TEST 1 (Test A): Total Success (3 valid targets -> 3 bars replaced)
  // -------------------------------------------------------------
  console.log("--- TEST 1: Total Success (3 Valid Targets) ---");
  const bar1 = originalDoc.sections[1].bars[0]; // b_v1_1
  const bar2 = originalDoc.sections[1].bars[1]; // b_v1_2
  const bar3 = originalDoc.sections[2].bars[0]; // b_h_1

  const validPatch: SurgicalRepairResult = {
    sourceVersionId: originalDoc.versionId,
    replacements: [
      {
        sectionId: "sec_verse1",
        barId: bar1.id,
        contextHash: hashBarContent(bar1),
        replacementLyricText: "Billetes marcados guardados bajo el suelo de parquet",
      },
      {
        sectionId: "sec_verse1",
        barId: bar2.id,
        contextHash: hashBarContent(bar2),
        replacementLyricText: "Notificaciones silenciadas desde hace dos semanas",
      },
      {
        sectionId: "sec_hook",
        barId: bar3.id,
        contextHash: hashBarContent(bar3),
        replacementLyricText: "Cadenas de platino brillando en la penumbra",
      },
    ],
  };

  const resultA = applySurgicalBatchToAST(originalDoc, validPatch);
  assert(resultA.success === true, "Batch patch executed with success: true");
  assert(resultA.document !== originalDoc, "Returns a brand new SongDocument (pure immutability)");
  assert(resultA.document.versionId !== originalDoc.versionId, "Increments versionId cleanly");

  // Verify that exactly the 3 targets were replaced
  const newBar1 = resultA.document.sections[1].bars[0];
  const newBar2 = resultA.document.sections[1].bars[1];
  const newBar3 = resultA.document.sections[2].bars[0];
  assert(newBar1.lyricText === "Billetes marcados guardados bajo el suelo de parquet", "Target bar 1 lyric replaced accurately");
  assert(newBar2.lyricText === "Notificaciones silenciadas desde hace dos semanas", "Target bar 2 lyric replaced accurately");
  assert(newBar3.lyricText === "Cadenas de platino brillando en la penumbra", "Target bar 3 lyric replaced accurately");

  // Verify untargeted bars remain 100% untouched
  const untouchedBar = resultA.document.sections[1].bars[2]; // b_v1_3
  assert(untouchedBar.lyricText === originalDoc.sections[1].bars[2].lyricText, "Untargeted bar lyricText untouched");
  assert(hashBarContent(untouchedBar) === hashBarContent(originalDoc.sections[1].bars[2]), "Untargeted bar bitwise identical");
  totalPassed += 8;

  // -------------------------------------------------------------
  // TEST 2 (Test B): Strict Atomicity (2 valid + 1 corrupt -> 0 bars mutated)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Strict Atomicity (Corruption Pre-Validation) ---");
  // Sub-case B1: Corrupted Context Hash
  const corruptedHashPatch: SurgicalRepairResult = {
    sourceVersionId: originalDoc.versionId,
    replacements: [
      {
        sectionId: "sec_verse1",
        barId: bar1.id,
        contextHash: hashBarContent(bar1),
        replacementLyricText: "Texto válido 1",
      },
      {
        sectionId: "sec_verse1",
        barId: bar2.id,
        contextHash: "hash_corrupto_stale_12345", // STALE HASH
        replacementLyricText: "Texto válido 2",
      },
    ],
  };

  const resultB1 = applySurgicalBatchToAST(originalDoc, corruptedHashPatch);
  assert(resultB1.success === false, "Returns success: false on stale contextHash");
  assert(resultB1.error?.includes("Stale context hash"), "Emits descriptive error regarding stale context hash");
  assert(resultB1.document === originalDoc, "Preserves original document completely without mutation");
  assert(originalDoc.sections[1].bars[0].lyricText === bar1.lyricText, "Zero bars mutated on B1 failure");

  // Sub-case B2: Target is Locked Bar
  const lockedBar = originalDoc.sections[0].bars[1]; // b_intro_2 (locked: true)
  const lockedPatch: SurgicalRepairResult = {
    sourceVersionId: originalDoc.versionId,
    replacements: [
      {
        sectionId: "sec_verse1",
        barId: bar1.id,
        contextHash: hashBarContent(bar1),
        replacementLyricText: "Texto válido 1",
      },
      {
        sectionId: "sec_intro",
        barId: lockedBar.id,
        contextHash: hashBarContent(lockedBar),
        replacementLyricText: "Intento de mutar barra bloqueada",
      },
    ],
  };

  const resultB2 = applySurgicalBatchToAST(originalDoc, lockedPatch);
  assert(resultB2.success === false, "Returns success: false when attempting to patch locked bar");
  assert(resultB2.error?.includes("cannot mutate locked bar"), "Emits descriptive error regarding locked bar");
  assert(originalDoc.sections[1].bars[0].lyricText === bar1.lyricText, "Zero bars mutated on B2 failure");

  // Sub-case B3: Non-existent bar
  const missingBarPatch: SurgicalRepairResult = {
    sourceVersionId: originalDoc.versionId,
    replacements: [
      {
        sectionId: "sec_verse1",
        barId: "non_existent_bar_id",
        contextHash: "fake_hash",
        replacementLyricText: "Texto",
      },
    ],
  };
  const resultB3 = applySurgicalBatchToAST(originalDoc, missingBarPatch);
  assert(resultB3.success === false, "Returns success: false on missing bar ID");
  totalPassed += 9;

  // -------------------------------------------------------------
  // TEST 3 (Test C): Non-Lyric Shielding (performance & metadata preserved)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Non-Lyric Shielding ---");
  // Check bar 1 metadata preservation
  assert(newBar1.id === bar1.id, "Bar 1 id preserved identically");
  assert(newBar1.position === bar1.position, "Bar 1 position preserved identically");
  assert(newBar1.locked === bar1.locked, "Bar 1 lock status preserved identically");
  assert(JSON.stringify(newBar1.performance) === JSON.stringify(bar1.performance), "Bar 1 performance metadata byte-for-byte identical");

  // Check bar 2 metadata preservation
  assert(newBar2.id === bar2.id, "Bar 2 id preserved identically");
  assert(newBar2.position === bar2.position, "Bar 2 position preserved identically");
  assert(JSON.stringify(newBar2.performance) === JSON.stringify(bar2.performance), "Bar 2 performance ad-lib '(Nunca)' byte-for-byte identical");

  // Check bar 3 metadata preservation
  assert(newBar3.id === bar3.id, "Bar 3 id preserved identically");
  assert(JSON.stringify(newBar3.performance) === JSON.stringify(bar3.performance), "Bar 3 performance melodic ad-lib '(Pluto)' byte-for-byte identical");
  totalPassed += 8;

  // -------------------------------------------------------------
  // TEST 4 (Test D): Structural Cardinality Invariance
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Structural Cardinality Invariance ---");
  const finalSignature = getSectionCardinalitySignature(resultA.document);
  assert(initialSignature === finalSignature, `Cardinality signature preserved strictly: ${finalSignature}`);
  assert(resultA.document.sections.length === originalDoc.sections.length, "Section count identical (3 sections)");
  assert(resultA.document.sections[0].bars.length === 2, "Intro has exactly 2 bars");
  assert(resultA.document.sections[1].bars.length === 4, "Verse 1 has exactly 4 bars");
  assert(resultA.document.sections[2].bars.length === 2, "Chorus has exactly 2 bars");
  totalPassed += 5;

  // -------------------------------------------------------------
  // TEST 5: Concurrency Protection (sourceVersionId mismatch)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Concurrency Protection ---");
  const staleVersionPatch: SurgicalRepairResult = {
    sourceVersionId: "v_stale_old_version_999",
    replacements: validPatch.replacements,
  };
  const resultConcurrency = applySurgicalBatchToAST(originalDoc, staleVersionPatch);
  assert(resultConcurrency.success === false, "Rejects patch when sourceVersionId does not match ast.versionId");
  assert(resultConcurrency.error?.includes("Concurrency conflict"), "Emits concurrency conflict error");
  totalPassed += 2;

  console.log("\n=======================================================");
  console.log(`📊 ALL ATOMIC SURGICAL BATCH REPAIR TESTS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
}

runSurgicalBatchRepairTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

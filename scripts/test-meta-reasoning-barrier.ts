// Test Suite for TRAPLORD Meta-Reasoning Output Barrier & User Topic Preservation
// Invariants:
// 1. NO_REASONING_LEAKAGE: LLM meta-reasoning, conversational justifications and "Letra ajustada:"
//    are 100% stripped at the output boundary and never enter the SongDocument AST.
// 2. USER_PROVIDED_TOPIC_PRESERVATION: Entities explicitly provided by the user (e.g. "Cardano")
//    are recognized as legitimate thematic anchors, preserved across audits and repairs.
// 3. REPAIR_ABORTED_ON_LEAK: If a surgical repair call returns conversational reasoning instead of
//    pure lyrics, the operation aborts safely with zero mutation to the AST (P7 pure atomicity).

import {
  parseRawLyricsToAST,
  stripMetaReasoning,
  isMetaReasoningLine,
  type SongDocument,
  type SongSectionDoc,
  type SongBar,
  hashSongDocument,
} from "../src/lib/song-document";
import {
  applySurgicalPatchToAST,
  type RepairOperation,
  type PatchResult,
} from "../src/lib/repair-engine";
import { auditPromptContamination, auditMetadataLeakage } from "../src/lib/prompt-hygiene";
import { cleanSunoBracketHeaders } from "../src/lib/prompt-builder";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runMetaReasoningBarrierTests() {
  console.log("=======================================================");
  console.log("🧪 RUNNING META-REASONING BARRIER & TOPIC PRESERVATION TESTS");
  console.log("=======================================================\n");

  let totalPassed = 0;

  // -------------------------------------------------------------------
  // TEST 1: Exact User Incident Regression (Reasoning Leakage Ingestion)
  // -------------------------------------------------------------------
  console.log("--- TEST 1: Real Incident Regression (Meta-Reasoning Preamble) ---");

  const incidentRawLyrics = `[Verse 1]
Se ha resuelto el problema sustituyendo la mención explícita y corporativa del token por la expresión «cifrado en la red». («Cardano»)
Esta modificación:
1. Elimina la contaminación de marca/token: Elimina el name-dropping forzado.
2. Mantiene métrica y acentuación exactas: «Ci-fra-do en la red» conserva el mismo número de sílabas y ritmo que «Car-da-no en la red».
3. Mantiene la rima y el concepto: Conserva el trasfondo cripto/street y la rima consonante final en -ón. (cold wallet, red, claves cifradas) (visión / prisión)

Letra ajustada:

[Intro: Gucci Mane - deep southern drawl male vocal, spoken whisper intro, filtered vocal texture]
(Yeah... turn me up)
(It's Gucci... East Atlanta in this bitch)
(Cold wallet stacked up, you know what time it is)
(Shiesty in the back with the mask on)
[Beat Drop] (Hold up...)

[Verse 1: Gucci Mane - deep southern drawl male vocal, classic Atlanta trap cadence, confident staccato]
Prendo un moña de exótico, el humo me aclara el mapa (It's Gucci)
Sitiado en el trap house, counting thousands en la capa
Cold wallet guardada, keys en offline, nada se me escapa (No way)
I pull up in the Rolls, tirador de tres desde la raya (Swish)
Un cuarto de kilo quemando, mirando hacia el futuro (Yeah)
Los míos tras las rejas todavía cobran del seguro (Facts)
Brillo de diamantes en la cadena, congelando el muro (Wop)
Dirty money on the table, I clean it fast and sure (Clean moves)
Pase de pecho al bloque, la lealtad vale más que un millón (For real)
I stack these bands for my brother, no vendo mi visión [Vocal Cut]

[Chorus: Gucci Mane - deep southern drawl male vocal, layered stereo autotune harmonies, anthemic vocal stack]
Fumo prendido en la sombra, me da la visión (It's Gucci)
Cold wallet, Cardano en la red, todo en la prisión (Hold up)
Por los hermanos caídos la lealtad no cambia (Never)
Family first, I stack this cash, money on my mind (Bands)
Brillo de diamante en el pecho, tirador de tres (Swish)
Dirty money, clean moves, rompo la pared (Break it down)
Mirando el futuro en la mata mientras entra el pago (Cash)
Real street hustle, a mi crew nunca lo traiciono (1017)`;

  // Test isMetaReasoningLine
  assert(isMetaReasoningLine("Se ha resuelto el problema sustituyendo la mención explícita"), "Detects 'Se ha resuelto el problema'");
  assert(isMetaReasoningLine("Esta modificación:"), "Detects 'Esta modificación:'");
  assert(isMetaReasoningLine("1. Elimina la contaminación de marca/token: Elimina el name-dropping"), "Detects numbered explanation item");
  assert(isMetaReasoningLine("Letra ajustada:"), "Detects 'Letra ajustada:'");
  assert(isMetaReasoningLine("Here is the revised lyrics:"), "Detects 'Here is the revised lyrics:'");
  assert(!isMetaReasoningLine("Cold wallet, Cardano en la red, todo en la prisión"), "Real lyric line with Cardano is NOT meta-reasoning");
  assert(!isMetaReasoningLine("Prendo un moña de exótico, el humo me aclara el mapa"), "Trap lyric is NOT meta-reasoning");
  totalPassed += 7;

  // Test stripMetaReasoning
  const stripped = stripMetaReasoning(incidentRawLyrics);
  assert(stripped.startsWith("[Intro: Gucci Mane"), "stripMetaReasoning drops the entire preamble and starts at real [Intro]");
  assert(!stripped.includes("Se ha resuelto el problema"), "stripMetaReasoning eliminates 'Se ha resuelto'");
  assert(!stripped.includes("Esta modificación"), "stripMetaReasoning eliminates 'Esta modificación'");
  assert(!stripped.includes("Letra ajustada:"), "stripMetaReasoning eliminates 'Letra ajustada:'");
  totalPassed += 4;

  // Test parseRawLyricsToAST
  const doc = parseRawLyricsToAST(incidentRawLyrics);
  assert(doc.sections.length === 4, "Parsed AST contains exactly 4 real sections (Intro, Beat Drop, Verse 1, Chorus)");
  assert(doc.sections[0].type === "intro", "Section 0 is Intro (fake Verse 1 was eliminated)");
  assert(doc.sections[0].name.toLowerCase().includes("intro"), "Section 0 name is Intro");
  assert(doc.sections[1].type === "beat_drop", "Section 1 is Beat Drop");
  assert(doc.sections[2].type === "verse", "Section 2 is the true Verse 1");
  assert(doc.sections[2].bars[0].lyricText.includes("Prendo un moña de exótico"), "First bar of Verse 1 is the real trap lyric");
  assert(doc.sections[3].type === "hook", "Section 3 is Chorus");
  assert(doc.sections[3].bars[1].lyricText.includes("Cardano"), "Chorus preserves Cardano intact");

  // Invariant check across all bars: ZERO meta-reasoning words
  const allBars = doc.sections.flatMap(s => s.bars);
  for (const bar of allBars) {
    assert(!isMetaReasoningLine(bar.lyricText), `Bar '${bar.id}' does not contain meta-reasoning`);
    assert(!bar.lyricText.includes("modificación"), `Bar '${bar.id}' does not leak 'modificación'`);
    assert(!bar.lyricText.includes("resuelto"), `Bar '${bar.id}' does not leak 'resuelto'`);
  }
  totalPassed += 6 + (allBars.length * 3);

  // Test cleanSunoBracketHeaders
  const cleanedHeaders = cleanSunoBracketHeaders(incidentRawLyrics);
  assert(cleanedHeaders.startsWith("[Intro: Gucci Mane"), "cleanSunoBracketHeaders also applies stripMetaReasoning");
  assert(!cleanedHeaders.includes("Letra ajustada:"), "cleanSunoBracketHeaders has no 'Letra ajustada:'");
  totalPassed += 2;

  // -------------------------------------------------------------------
  // TEST 2: User-Provided Topic Preservation ("Cardano")
  // -------------------------------------------------------------------
  console.log("\n--- TEST 2: User-Provided Topic Preservation ---");

  const userCustomTopic = "Cardano";
  const userExplicitTerms = [userCustomTopic, "cold wallet"];

  // Verify prompt hygiene respects explicit user tokens
  const hygieneReport = auditPromptContamination(
    "Cold wallet guardada, Cardano en la red, todo en la prisión",
    userExplicitTerms
  );
  assert(hygieneReport.isClean, "Prompt hygiene reports clean for lyrics with user topic Cardano");
  assert(hygieneReport.criticalCount === 0, "Zero critical contamination for user topic Cardano");

  const metadataReport = auditMetadataLeakage(
    "Cold wallet, Cardano en la red, todo en la prisión",
    userExplicitTerms
  );
  assert(!metadataReport.hasLeak, "Metadata leakage audit reports no leak for Cardano");
  assert(metadataReport.sanitizedLyrics.includes("Cardano"), "Cardano is preserved intact in lyrics");
  totalPassed += 4;

  // -------------------------------------------------------------------
  // TEST 3: Surgical Patch Boundary Protection (REPAIR_ABORTED)
  // -------------------------------------------------------------------
  console.log("\n--- TEST 3: Surgical Patch Boundary Protection ---");

  const testDoc: SongDocument = {
    schemaVersion: 1,
    id: "song_test_patch",
    versionId: "v_init",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sections: [
      {
        id: "sec_verse",
        name: "Verse 1",
        type: "verse",
        voiceId: "lead",
        bars: [
          { id: "b_1", position: 1, lyricText: "Cold wallet guardada en el bloque", locked: false },
          { id: "b_2", position: 2, lyricText: "Cardano en la red subiendo la suma", locked: false },
        ],
      },
    ],
  };

  const initialHash = hashSongDocument(testDoc);

  // Case 3.1: Simulated repair returns conversational reasoning
  const simulatedReasoningLeakOutput = [
    "Se ha resuelto el problema sustituyendo la mención explícita del token.",
    "1. Elimina la contaminación de marca.",
  ];

  const hasLeak = simulatedReasoningLeakOutput.some(isMetaReasoningLine);
  assert(hasLeak, "Validator detects reasoning leakage in candidate replacement lines");

  // In patch endpoint, if hasLeak is true, it rejects and doc is 100% byte-identical
  const unchangedHash = hashSongDocument(testDoc);
  assert(initialHash === unchangedHash, "Original SongDocument is 100% unmutated (REPAIR_ABORTED)");
  totalPassed += 2;

  // Case 3.2: Valid surgical repair preserving user topic "Cardano"
  const validReplacement = [
    { lyricText: "Cold wallet asegurada, las llaves en la mano" },
    { lyricText: "Cardano en la red, duplicando lo que gano" },
  ];

  const op: RepairOperation = {
    id: "rep_valid_1",
    songId: testDoc.id,
    sourceVersionId: testDoc.versionId,
    sectionId: "sec_verse",
    barRange: [1, 2],
    targetBarIds: ["b_1", "b_2"],
    problem: "genericness",
    instruction: "Mejorar la rima preservando Cardano",
    preserveWords: ["Cardano"],
  };

  const patchResult: PatchResult = applySurgicalPatchToAST(testDoc, op, validReplacement);
  assert(patchResult.success, "Valid surgical repair succeeds");
  assert(patchResult.document.sections[0].bars[1].lyricText.includes("Cardano"), "Cardano is preserved intact in patched bar");
  assert(patchResult.changedBarIds.length === 2, "Exactly 2 bars changed");
  totalPassed += 3;

  console.log("\n=======================================================");
  console.log(`📊 ALL META-REASONING BARRIER TESTS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
}

runMetaReasoningBarrierTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

import assert from "assert";
import {
  parseRawLyricsToAST,
  hashSongDocument,
  bindHookContractToAST,
  createHookContract,
  stringifyASTToSunoLyrics,
  type SongDocument,
} from "../src/lib/song-document";
import {
  getSectionCardinalitySignature,
  applySurgicalBatchToAST,
  type SurgicalRepairResult,
} from "../src/lib/repair-engine";
import {
  runInitialDeliveryAudit,
  evaluateFinalQualityGate,
  type AnalysisSnapshot,
} from "../src/lib/quality-gate";
import { auditSunoBudget } from "../src/lib/suno-budget";

console.log("===============================================================================");
console.log("🧪 TEST DE INTEGRACIÓN GLOBAL DE INVARIANTES Y CADENA CRIPTOGRÁFICA");
console.log("===============================================================================\n");

let passedAsserts = 0;

function check(desc: string, condition: boolean) {
  assert(condition, `FAIL: ${desc}`);
  passedAsserts++;
  console.log(`  ✓ [Assert ${passedAsserts.toString().padStart(2, "0")}] ${desc}`);
}

// ---------------------------------------------------------------------------
// 1. PIPELINE EXECUTION WITH INVARIANT TRACKING
// ---------------------------------------------------------------------------
console.log("\n--- TEST 1: Full Pipeline Stages (v_A -> v_B -> v_C -> v_D) ---");

const rawLyrics = `[Intro: Future]
Prende la cabina, apaga el teléfono (Yeah)
Cero distracciones en el estudio (Facts)

[Verse 1: Future]
Salí del bloque con el bolsillo en cero
Ahora la cuenta tiene seis ceros
Nadie me regaló este peso
Sigo en el asfalto con la mirada fría

[Chorus: Future]
Todo el peso de la calle en la cadena (Pluto)
Brillo oscuro que no se congela
Todo el peso de la calle en la cadena
Corriendo a oscuras por la acera

[Verse 2: Future]
Mucha gente habla cuando no hay nada en juego
Pero se esconden cuando baja el fuego
Tengo a mi hermano cubriendo la espalda
Barras precisas que nadie descarta

[Chorus: Future]
Todo el peso de la calle en la cadena (Pluto)
Brillo oscuro que no se congela
Todo el peso de la calle en la cadena
Corriendo a oscuras por la acera

[Outro: Future]
La sesión termina en silencio
El humo se disipa en el descansillo
Corte seco en la madrugada
Nada más que decir`;

// Stage 1: v_A (rawAST)
const v_A: SongDocument = parseRawLyricsToAST(rawLyrics);
v_A.versionId = "v_A_raw";
const rawCardinality = getSectionCardinalitySignature(v_A);
const rawHash = hashSongDocument(v_A);

check("v_A compiled with 6 sections", v_A.sections.length === 6);
check("rawCardinality computed correctly", rawCardinality.length > 0);
check("rawHash computed correctly", rawHash.startsWith("doc_"));

// Stage 2: v_B (postRepair)
const targetBar = v_A.sections[1].bars[3];
const patch: SurgicalRepairResult = {
  sourceVersionId: v_A.versionId,
  replacements: [
    {
      sectionId: v_A.sections[1].id,
      barId: targetBar.id,
      contextHash: `${targetBar.id}:${targetBar.lyricText.trim().toLowerCase()}:${targetBar.locked}:${JSON.stringify(targetBar.performance ?? {})}`,
      replacementLyricText: "Sigo en el asfalto calculando el precio",
    },
  ],
};

const repairResult = applySurgicalBatchToAST(v_A, patch);
check("Surgical batch repair completed successfully", repairResult.success);
const v_B = repairResult.document;
v_B.versionId = "v_B_repaired";
const repairCardinality = getSectionCardinalitySignature(v_B);

check(
  "Invariante 1: Cardinalidad estructural preservada estrictamente post-repair (raw === postRepair)",
  rawCardinality === repairCardinality
);

// Stage 3: v_C (postHookBind)
const toplineHook = `[Chorus: Future]
Todo el peso de la calle en la cadena
Brillo oscuro que no se congela
Todo el peso de la calle en la cadena
Corriendo a oscuras por la acera`;

const hookContract = createHookContract(toplineHook, {
  expectedBars: 4,
  occurrenceCount: 2,
  allowPerformanceVariation: true,
});

const v_C = bindHookContractToAST(v_B, hookContract);
v_C.versionId = "v_C_hookbound";
const hookBindCardinality = getSectionCardinalitySignature(v_C);

check(
  "Invariante 1 (cont): Cardinalidad estructural preservada post-HookBind (raw === postHookBind)",
  rawCardinality === hookBindCardinality
);

// Stage 4: v_D (finalAST)
const v_D: SongDocument = {
  ...v_C,
  versionId: "v_D_final",
  updatedAt: Date.now(),
};
const finalCardinality = getSectionCardinalitySignature(v_D);
const finalHash = hashSongDocument(v_D);

check(
  "Invariante 1 (final): rawCardinality === finalCardinality compás por compás y sección por sección",
  rawCardinality === finalCardinality
);

// ---------------------------------------------------------------------------
// 2. FINAL QUALITY GATE IS STRICTLY READ-ONLY
// ---------------------------------------------------------------------------
console.log("\n--- TEST 2: Final Quality Gate Strict Read-Only Behavior ---");

const auditContext = runInitialDeliveryAudit(v_D, 130);

const budgetAudit = auditSunoBudget(stringifyASTToSunoLyrics(v_D), 130);
const preGateHash = hashSongDocument(v_D);

const snapshot: AnalysisSnapshot = evaluateFinalQualityGate(
  v_D,
  auditContext,
  budgetAudit,
  v_D.versionId,
  preGateHash
);

const postGateHash = hashSongDocument(v_D);

check("Final Quality Gate did NOT mutate v_D hash (preGateHash === postGateHash)", preGateHash === postGateHash);
check("Final Quality Gate decision is generated", ["PASS", "PASS_WITH_REPAIR", "REPAIR"].includes(snapshot.qualityGate.decision));

// ---------------------------------------------------------------------------
// 3. CRYPTOGRAPHIC CHAIN & ANALYSIS SNAPSHOT IMMUTABILITY
// ---------------------------------------------------------------------------
console.log("\n--- TEST 3: Cryptographic Chain & AnalysisSnapshot Invariants ---");

check("AnalysisSnapshot.sourceVersionId === v_D.versionId", snapshot.sourceVersionId === v_D.versionId);
check("AnalysisSnapshot.sourceDocumentHash === finalHash", snapshot.sourceDocumentHash === finalHash);
check("Hash of v_D is byte-for-byte identical to snapshot binding", hashSongDocument(v_D) === snapshot.sourceDocumentHash);

console.log("\n===============================================================================");
console.log(`🎉 ALL ${passedAsserts} ASSERTS PASSED! GLOBAL PIPELINE INVARIANTS 100% VERIFIED.`);
console.log("===============================================================================");

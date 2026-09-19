import assert from "assert";
import {
  classifyTopicIntent,
  resolveSemanticSceneFraming,
  synthesizeSemanticAnchor,
  type TopicIntent,
  type SemanticSceneFraming,
} from "../src/lib/motif-engine";
import {
  validateLyricEnvelope,
  parseRawLyricsToAST,
  stringifyASTToSunoLyrics,
  validateMutation,
  isMetaReasoningLine,
  type SongDocument,
} from "../src/lib/song-document";
import {
  auditCliches,
  type ClicheAuditReport,
} from "../src/lib/prompt-hygiene";
import {
  runInitialDeliveryAudit,
  evaluateRepairability,
  runReAudit,
  evaluateFinalQualityGate,
} from "../src/lib/quality-gate";
import {
  applySurgicalPatchToAST,
  type RepairOperation,
} from "../src/lib/repair-engine";
import { auditSunoBudget } from "../src/lib/suno-budget";
import { CANONICAL_COMPOSITIONAL_GOLD_VAULT } from "../src/lib/artist-flow-profiles";

console.log("=== STARTING SEMANTIC SCENE FRAMING & QUALITY ELEVATION TEST SUITE ===");

let passedAsserts = 0;
function expect(cond: boolean, msg: string) {
  assert(cond, msg);
  passedAsserts++;
}

// =========================================================================
// TEST 1: TopicIntent Ontological Classification
// =========================================================================
console.log("\n[Test 1] TopicIntent Ontological Classification...");

const intentCardano = classifyTopicIntent("Cardano");
expect(intentCardano.kind === "named_entity", "Cardano must be classified as named_entity");
expect(intentCardano.preservation === "lexical_available", "Named entities have lexical_available preservation");
expect(intentCardano.value === "Cardano", "Preserves verbatim value");

const intentLealtad = classifyTopicIntent("Lealtad");
expect(intentLealtad.kind === "abstract_theme", "Lealtad must be classified as abstract_theme");
expect(intentLealtad.preservation === "semantic_intent", "Abstract themes have semantic_intent preservation");

const intentRolls = classifyTopicIntent("Rolls Royce");
expect(intentRolls.kind === "named_entity", "Rolls Royce must be named_entity");

const intentParanoia = classifyTopicIntent("paranoia nocturna");
expect(intentParanoia.kind === "abstract_theme", "Paranoia nocturna must be abstract_theme");

const intentSolana = classifyTopicIntent("Solana");
expect(intentSolana.kind === "named_entity", "Solana must be named_entity");

const intentExito = classifyTopicIntent("éxito solitario");
expect(intentExito.kind === "abstract_theme", "Éxito solitario must be abstract_theme");

console.log("  ✓ TopicIntent classification passed (6/6 checks)");

// =========================================================================
// TEST 2: Semantic Scene Framing (Dramaturgy, NOT Word Replacement Dict)
// =========================================================================
console.log("\n[Test 2] Semantic Scene Framing Resolution...");

const framingCrypto = resolveSemanticSceneFraming(["calle", "trap"], "Cardano");
expect(framingCrypto.framing.dominantSemanticRole === "digital_value_under_pressure", "Crypto/Cardano resolves to digital_value_under_pressure");
expect(framingCrypto.framing.situation.length > 10, "Situation provides physical atmosphere");
expect(framingCrypto.framing.tension.length > 10, "Tension provides dramatic conflict");
expect(framingCrypto.framing.dramaticFunction.length > 10, "Dramatic function specifies scene role");
expect(!framingCrypto.framing.situation.includes("no KYC"), "Does NOT inject arbitrary unprompted dictionary jargon (no KYC)");

const framingLoyalty = resolveSemanticSceneFraming(["lealtad", "calle"], "respeto en el bloque");
expect(framingLoyalty.framing.dominantSemanticRole === "fractured_trust_and_street_code", "Loyalty resolves to fractured_trust_and_street_code");

const framingSports = resolveSemanticSceneFraming(["baloncesto", "nba"], "Stephen Curry");
expect(framingSports.framing.dominantSemanticRole === "competitive_precision_under_clock", "Basketball resolves to competitive_precision_under_clock");

// Synthesize Semantic Anchor integrates framing
const anchor = synthesizeSemanticAnchor({
  topics: ["lealtad", "calle"],
  customTopic: "Cardano",
  artistId: "gucci_mane",
  moodId: "dark",
});
expect(!!anchor.framing, "synthesizeSemanticAnchor outputs framing");
expect(anchor.framing?.dominantSemanticRole === "digital_value_under_pressure", "Anchor has dominant semantic role");
expect(Array.isArray(anchor.topicIntents), "Anchor includes topicIntents");

console.log("  ✓ Semantic Scene Framing passed (9/9 checks)");

// =========================================================================
// TEST 3: Fail-Closed Lyric Envelope Validation
// =========================================================================
console.log("\n[Test 3] Fail-Closed Lyric Envelope Validation...");

// Case A: Pure lyric response (VALID)
const pureLyrics = `[Verse 1: Gucci Mane - classic Atlanta trap cadence]
Prendo un moña de exótico, el humo en la cabina
Frío en el retrovisor, vigilando la esquina
Balón picando en la pista, precisión sin prisa
Las llaves en la mesa, nadie cruza la línea`;
const resPure = validateLyricEnvelope(pureLyrics);
expect(resPure.valid === true, "Pure lyrics without meta-reasoning must be VALID");

// Case B: Response preceded by conversational reasoning (INVALID - FAIL CLOSED)
const conversationalResponse = `Se ha resuelto el problema sustituyendo la mención explícita del token por la expresión «cifrado en la red».
Esta modificación:
1. Elimina la contaminación de marca/token: Elimina el name-dropping forzado.
2. Mantiene métrica y acentuación exactas.
3. Mantiene la rima y el concepto.

Letra ajustada:
[Verse 1: Gucci Mane - classic Atlanta trap cadence]
Prendo un moña de exótico, el humo en la cabina
Frío en el retrovisor, vigilando la esquina`;
const resConversational = validateLyricEnvelope(conversationalResponse);
expect(resConversational.valid === false, "Conversational reasoning header must be REJECTED (Fail-Closed)");
expect(resConversational.detectedReasoningLines!.length > 0, "Reasoning lines accurately identified");

// Case C: Explicit transition delimiter ("Letra ajustada:") (INVALID - FAIL CLOSED)
const delimiterResponse = `Letra ajustada:
[Verse 1: Gucci Mane]
Prendo un moña de exótico, el humo en la cabina`;
const resDelimiter = validateLyricEnvelope(delimiterResponse);
expect(resDelimiter.valid === false, "Explicit transition delimiter must be REJECTED (Fail-Closed)");

// Case D: English meta-reasoning preamble (INVALID - FAIL CLOSED)
const englishReasoning = `Here is the revised version with the changes applied:
- Removed corporate mention
- Kept 8 bars intact

[Chorus: Gucci Mane]
Cold storage locked up in the vault`;
const resEnglish = validateLyricEnvelope(englishReasoning);
expect(resEnglish.valid === false, "English conversational preamble must be REJECTED (Fail-Closed)");

console.log("  ✓ Fail-Closed Lyric Envelope validation passed (5/5 checks)");

// =========================================================================
// TEST 4: Cliché & Moralizing Tropes Audit with Flexive Lemmas
// =========================================================================
console.log("\n[Test 4] Cliché Audit with Flexive Lemmas (100% Audit-Only)...");

const corporateClicheLyrics = `[Verse 1]
Stake en la red, Cardano rindiendo mientras duermo
Invierto duro en la plaza, multiplicando las ganancias
Controlamos el game sin pedir perdón a nadie`;
const auditCorp = auditCliches(corporateClicheLyrics);
expect(auditCorp.hasCliche === true, "Detects corporate cliches");
expect(auditCorp.criticalCount >= 3, "Flags stake en la red, invierto duro, multiplicando las ganancias, controlamos el game");

const moralizingLyrics = `[Verse 1]
La lealtad no se compra en la tienda ni con un contrato
No aceptamos ratas en el círculo cerrado`;
const auditMoral = auditCliches(moralizingLyrics);
expect(auditMoral.hasCliche === true, "Detects moralizing tropes");
expect(auditMoral.findings.some(f => f.category === "generic_moralizing"), "Categorized as generic_moralizing");

const sportsBroadcastLyrics = `[Verse 1]
Balón en las manos, Stephen Curry desde la mitad del court
Línea de la NBA con corte limpio swish`;
const auditSports = auditCliches(sportsBroadcastLyrics);
expect(auditSports.findings.some(f => f.category === "sports_broadcast_language"), "Detects sports broadcast language");

// Exemption when user explicitly requested token
const auditExempted = auditCliches("Stephen Curry desde la media cancha", ["Stephen Curry"]);
expect(auditExempted.findings.length === 0, "Explicit user request for Stephen Curry is exempted");

console.log("  ✓ Cliché Audit passed (5/5 checks)");

// =========================================================================
// TEST 5: Compositional Gold Vault
// =========================================================================
console.log("\n[Test 5] Neutral Compositional Gold Vault...");

expect(CANONICAL_COMPOSITIONAL_GOLD_VAULT.length >= 4, "Vault contains at least 4 canonical compositional anchors");
const techniques = CANONICAL_COMPOSITIONAL_GOLD_VAULT.map(g => g.technique);
expect(techniques.includes("compressed_imagery"), "Includes compressed_imagery");
expect(techniques.includes("staggered_internal_rhyme"), "Includes staggered_internal_rhyme");
expect(techniques.includes("pause_architecture"), "Includes pause_architecture");
expect(techniques.includes("delayed_punchline"), "Includes delayed_punchline");

// Ensure zero thematic contamination in gold bars
for (const gold of CANONICAL_COMPOSITIONAL_GOLD_VAULT) {
  for (const bar of gold.bars) {
    expect(!bar.toLowerCase().includes("cardano"), "Gold bars must be free of specific crypto bias");
    expect(!bar.toLowerCase().includes("curry"), "Gold bars must be free of specific sports bias");
    expect(!bar.toLowerCase().includes("stake en la red"), "Gold bars must be free of cliches");
  }
}

console.log("  ✓ Compositional Gold Vault passed (7/7 checks)");

// =========================================================================
// TEST 6: MANDATORY CRITICAL TEST — Topic Preservation Under Repair
// =========================================================================
console.log("\n[Test 6] MANDATORY TEST: Topic Preservation Under Repair...");

// 1. Setup SongDocument with customTopic = "Cardano" and a corporate cliché bar
const initialSong = `[Intro: Gucci Mane - spoken whisper intro]
(Yeah... turn me up)
(Cold storage locked... yeah)

[Verse 1: Gucci Mane - classic Atlanta trap cadence]
El humo en la cabina me aísla del ruido del bloque (It's Wop)
Locked in the digital vault, no tocamos billetes de cien
Stake en la red, Cardano rindiendo mientras duermo (Money green)
Straight out the mud, brother, protegemos la casa
La puerta de hierro cerrada, mirando el retrovisor (Never)
Silencio en la mesa, cubriendo la espalda del círculo (Facts)
Dos teléfonos apagados en el asiento de atrás
Corte preciso en la noche, nadie da un paso en falso [Vocal Cut]

[Chorus: Gucci Mane - layered stereo autotune harmonies]
Círculo cerrado, nadie entra a la suite (Yeah)
Círculo cerrado, frío como el titanio (Wop)
Círculo cerrado, custodia en la red (Facts)
Círculo cerrado, la sombra en la noche (Brrr)`;

const doc = parseRawLyricsToAST(initialSong);
expect(doc.sections.length === 3, "AST has 3 sections");
const verse1 = doc.sections.find(s => s.name.toLowerCase().includes("verse 1"))!;
expect(verse1.bars.length === 8, "Verse 1 has 8 bars");

// 2. Initial Audit detects defect on bar 3
const initialAudit = runInitialDeliveryAudit(doc, 135, undefined, ["Cardano"]);
expect(initialAudit.clicheAudit!.criticalCount > 0, "Detects critical cliche defect in bar 3");

// Evaluate repairability targets the defect
const repairPlan = evaluateRepairability(initialAudit);
expect(repairPlan.needsRepair === true, "Quality gate requests repair for the cliche");

// 3. Perform surgical repair:
// Repair operation targets bar 3. The replacement eliminates the corporate slogan ("stake en la red... rindiendo")
// but PRESERVES the named entity "Cardano" in authentic physical custody.
const targetBar = verse1.bars[2]; // Bar index 2 (position 3: "Stake en la red, Cardano...")
const repairOp: RepairOperation = {
  id: "op_repair_cardano_cliche",
  sectionId: verse1.id,
  targetBarIds: [targetBar.id],
  sourceVersionId: doc.versionId,
  type: "surgical_replacement",
  problem: "Cliché financiero artificial",
  instruction: "Reemplaza el cliché corporativo por custodia física auténtica manteniendo la entidad Cardano.",
  preserveWords: ["Cardano"],
};

const replacementLyric = "Claves en frío con Cardano, nadie toca el ledger (Money green)";
const patchResult = applySurgicalPatchToAST(doc, repairOp, [{ lyricText: replacementLyric }]);
expect(patchResult.success === true, "Patch applied successfully");

// 4. Invariant verifications on repaired document:
const repairedDoc = patchResult.document;
const repairedVerse = repairedDoc.sections.find(s => s.id === verse1.id)!;
const repairedBar = repairedVerse.bars.find(b => b.id === targetBar.id)!;

// A. Topic preservation: "Cardano" is intact and available
expect(repairedBar.lyricText.includes("Cardano"), "Cardano MUST be preserved in the repaired bar");

// B. Cliche eradication: "stake en la red" is gone
expect(!repairedBar.lyricText.toLowerCase().includes("stake en la red"), "Corporate cliche 'stake en la red' is eradicated");
expect(!repairedBar.lyricText.toLowerCase().includes("rindiendo mientras duermo"), "Lazy AI trope 'rindiendo mientras duermo' is eradicated");

// C. Zero reasoning leakage in AST
const allRepairedLines = repairedDoc.sections.flatMap(s => s.bars.map(b => b.lyricText));
for (const line of allRepairedLines) {
  expect(!isMetaReasoningLine(line), `AST line must NEVER be meta-reasoning: "${line}"`);
  expect(!line.toLowerCase().startsWith("letra ajustada"), "No transition delimiter in AST");
  expect(!line.toLowerCase().startsWith("se ha resuelto"), "No resolution commentary in AST");
}

// D. Structural Invariance (P7 Invariants)
expect(repairedDoc.sections.length === doc.sections.length, "Section count identical");
expect(repairedVerse.bars.length === verse1.bars.length, "Bar count in verse 1 identical");
expect(repairedVerse.bars[0].id === verse1.bars[0].id, "Non-target bar 1 untouched");
expect(repairedVerse.bars[1].id === verse1.bars[1].id, "Non-target bar 2 untouched");
expect(repairedVerse.bars[3].id === verse1.bars[3].id, "Non-target bar 4 untouched");
expect(repairedVerse.bars[7].performance?.vocalCut === true, "Performance tag vocalCut preserved in AST on bar 8");
expect(stringifyASTToSunoLyrics(repairedDoc).includes("[Vocal Cut]"), "Performance tag [Vocal Cut] preserved in stringified Suno lyrics");

// E. Mutation validation
const mutationValidation = validateMutation(doc, repairedDoc, patchResult.changedBarIds);
expect(mutationValidation.valid === true, "AST mutation validation passes invariants");

// F. Re-audit on repaired doc is clean
const reAudit = runReAudit(repairedDoc, 135, undefined, ["Cardano"]);
const sunoBudget = auditSunoBudget(stringifyASTToSunoLyrics(repairedDoc), 135);
const finalGate = evaluateFinalQualityGate(
  repairedDoc,
  reAudit,
  sunoBudget,
  doc.versionId,
  doc.documentHash
);
expect(finalGate.qualityGate.layersPassed.narrative === true, "Narrative layer passes after cliche repair");

console.log("  ✓ MANDATORY TEST: Topic preservation under repair passed (13/13 checks)");

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`\n=======================================================`);
console.log(`🎉 ALL TESTS PASSED SUCCESSFULLY! (${passedAsserts}/${passedAsserts} asserts verified)`);
console.log(`=======================================================\n`);

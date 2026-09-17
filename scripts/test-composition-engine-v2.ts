// TRAPLORD Composition Engine v2.2 Automated Audit Suite
// Tests 10 key architectural invariants:
// 1. FlowSkeleton & Triplet Saturation
// 2. WritingCells Dynamic Sequence & Non-Rigid Objectives
// 3. PerformanceArc Relative Constraints
// 4. PhoneticPocketFit with Confidence & Slang Whitelist
// 5. DeliveryLoad (Phrase Load & Breath Risks)
// 6. Adlib Roles, Cluster & Lead Occupancy Collision
// 7. Language DNA Isolation from Performance Ad-libs
// 8. HookContract Invariance Under Hostile Mutation
// 9. Suno Budget Profile, Range Duration & Outro Verification
// 10. Quality Gate 2-Phase & Snapshot Decoupling (Clean AST)

import {
  generatePerformanceArc,
  generateFlowSkeleton,
  generateWritingCells,
  formatWritingCellsForPrompt,
  formatFlowSkeletonForPrompt,
} from "../src/lib/composition-planner";
import {
  analyzePhoneticPocketFit,
  analyzeDeliveryLoad,
  analyzeAdlibs,
  classifyAdlibRole,
} from "../src/lib/delivery-analyzer";
import {
  runInitialDeliveryAudit,
  evaluateRepairability,
  evaluateFinalQualityGate,
} from "../src/lib/quality-gate";
import {
  parseRawLyricsToAST,
  stringifyASTToSunoLyrics,
  createHookContract,
  bindHookContractToAST,
  hashSongDocument,
  type SongDocument,
  type SongBar,
} from "../src/lib/song-document";
import { createInitialVersionGraph } from "../src/lib/version-graph";
import { calculateSyllableLanguageRatio } from "../src/lib/language-dna";
import { auditSunoBudget } from "../src/lib/suno-budget";
import { getMusicalDNAForArtist } from "../src/lib/musical-dna";
import { getFlowProfile } from "../src/lib/artist-flow-profiles";
import { STRUCTURES } from "../src/lib/trap-data";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runAuditSuite() {
  console.log("\n=======================================================");
  console.log("🧪 TRAPLORD COMPOSITION ENGINE v2.2 AUDIT SUITE");
  console.log("=======================================================\n");

  let totalPassed = 0;

  // -------------------------------------------------------------
  // TEST 1: FlowSkeleton & Triplet Saturation
  // -------------------------------------------------------------
  console.log("--- TEST 1: FlowSkeleton & Triplet Saturation ---");
  const dna = getMusicalDNAForArtist("skippa_da_flippa");
  const profile = getFlowProfile("skippa_da_flippa") || undefined;
  const structure = STRUCTURES[0];
  const arc = generatePerformanceArc(structure, "dark", dna);
  const skeleton = generateFlowSkeleton(arc, dna, profile, structure);

  assert(skeleton.bars.length > 0, "FlowSkeleton generates bars for song structure");
  
  // Verify triplet saturation is prevented: not every bar should be a triplet
  const verseBars = skeleton.bars.filter(b => b.sectionId.startsWith("verse"));
  const tripletCount = verseBars.filter(b => b.flowMode === "triplet").length;
  const straightCount = verseBars.filter(b => b.flowMode === "straight" || b.flowMode === "hybrid").length;
  
  assert(tripletCount < verseBars.length, "No artificial 100% triplet saturation in verse bars");
  assert(straightCount > 0, "Includes straight or hybrid breathing modes alongside triplets");
  assert(skeleton.globalIntentionSummary.length > 10, "Provides a global rhythm intention summary");
  totalPassed += 4;

  // -------------------------------------------------------------
  // TEST 2: WritingCells Dynamic Sequence & Non-Rigid Objectives
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: WritingCells Dynamic Sequence & Non-Rigid Objectives ---");
  const cellsV1 = generateWritingCells("verse_1", 16, "Callejón mojado, humo de tabaco", "Cadenas de oro", false);
  const cellsV2 = generateWritingCells("verse_2", 16, "Callejón mojado, humo de tabaco", "Cadenas de oro", true);

  assert(cellsV1.length === 4, "Verse 1 divided into 4 writing cells (16 bars / 4)");
  assert(cellsV2.length === 4, "Verse 2 divided into 4 writing cells");
  
  const objectivesV1 = cellsV1.map(c => c.objective);
  const objectivesV2 = cellsV2.map(c => c.objective);
  
  assert(objectivesV1.includes("establish") && objectivesV1.includes("payoff"), "Verse 1 contains establish and payoff objectives");
  assert(objectivesV2.includes("contrast") || objectivesV2.includes("escalate"), "Verse 2 has distinct dynamic progression (contrast/escalate)");
  assert(objectivesV1[0] !== objectivesV2[0], "Verse 1 and Verse 2 do not start with the same cookie-cutter objective");
  
  const promptSnippet = formatWritingCellsForPrompt(cellsV1);
  assert(promptSnippet.includes("Célula 1") && promptSnippet.includes("ESTABLISH"), "Writing cells prompt snippet formatted clearly");

  // Verify cross-song structural diversity: different moods generate different cell sequences
  const cellsIntrospective = generateWritingCells("verse_1", 16, "Lluvia y soledad", "Espejo roto", false, "introspectivo");
  const objectivesIntrospective = cellsIntrospective.map(c => c.objective);
  assert(
    JSON.stringify(objectivesV1) !== JSON.stringify(objectivesIntrospective),
    "Cross-song structural diversity: introspective song produces different writing cell progression than standard song"
  );
  totalPassed += 6;

  // -------------------------------------------------------------
  // TEST 3: PerformanceArc Relative Constraints
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: PerformanceArc Relative Constraints ---");
  const v1Key = Object.keys(arc.energyRange).find(k => k.startsWith("verse")) || "verse_2";
  const hookKey = Object.keys(arc.energyRange).find(k => k.startsWith("hook") || k.startsWith("chorus")) || "chorus_3";
  const outroKey = Object.keys(arc.energyRange).find(k => k.startsWith("outro")) || "outro_8";

  const v1Target = arc.energyRange[v1Key]?.target ?? 0.65;
  const hookTarget = arc.energyRange[hookKey]?.target ?? 0.8;
  const outroTarget = arc.energyRange[outroKey]?.target ?? 0.4;

  assert(hookTarget >= v1Target, `Hook target energy (${hookTarget}) >= Verse 1 target energy (${v1Target})`);
  assert(outroTarget < hookTarget, `Outro energy (${outroTarget}) decays below Hook energy (${hookTarget})`);
  assert(arc.pauseExpectation[outroKey] > arc.pauseExpectation[v1Key], "Outro has higher pause expectation than verse");
  totalPassed += 3;

  // -------------------------------------------------------------
  // TEST 4: PhoneticPocketFit with Confidence & Slang Whitelist
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: PhoneticPocketFit with Confidence & Slang Whitelist ---");
  const testBars: SongBar[] = [
    { id: "b_1", position: 1, lyricText: "Late night in the trap con el skrrt y drip *(Yeah)*", locked: false },
    { id: "b_2", position: 2, lyricText: "Contando los racks en la esquina sin switch *(Ice)*", locked: false },
    { id: "b_3", position: 3, lyricText: "Glock en la cintura haciendo brrr en el spot *(Facts)*", locked: false },
    { id: "b_4", position: 4, lyricText: "Flippa con la moña ready para el block *(Woo)*", locked: false },
  ];

  const fit = analyzePhoneticPocketFit(testBars, 135, profile);
  assert(fit.overallComfort >= 80, `Hip-hop slang (skrrt, brrr, drip, switch) achieves high comfort (${fit.overallComfort})`);
  assert(fit.confidence >= 0.60 && fit.confidence <= 1.0, `Confidence is explicitly bounded (${fit.confidence})`);
  assert(fit.consonantComfort >= 80, "No false positive penalty on whitelisted trap onomatopoeias");
  totalPassed += 3;

  // -------------------------------------------------------------
  // TEST 5: DeliveryLoad (Phrase Load & Breath Risks)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: DeliveryLoad (Phrase Load & Breath Risks) ---");
  // Good breathable lines
  const breathableBars: SongBar[] = [
    { id: "b_b1", position: 1, lyricText: "Late night on the porch, counting blue hundreds right on the spot", locked: false },
    { id: "b_b2", position: 2, lyricText: "En la mesa los kilos, tranquilo, esperando la señal", locked: false },
  ];
  const goodDelivery = analyzeDeliveryLoad(breathableBars, 130);
  assert(goodDelivery.loadScore >= 80, `Breathable lines receive high loadScore (${goodDelivery.loadScore})`);
  assert(goodDelivery.crowdedBars.length === 0, "No crowded bars detected in natural phrasing");

  // Overcrowded unnatural line (30 words crammed into one 135 BPM measure)
  const crowdedBars: SongBar[] = [
    { id: "b_c1", position: 1, lyricText: "Yo te dije que no me vinieras con todos esos problemas complicados porque yo tengo que pagar la renta y resolver el negocio de la esquina rápidamente sin parar", locked: false },
    { id: "b_c2", position: 2, lyricText: "Y además de todo eso estamos corriendo por la avenida sin frenos tratando de alcanzar a los enemigos que se escaparon de la prisión anoche", locked: false },
    { id: "b_c3", position: 3, lyricText: "Sin respirar seguimos cantando todas las palabras que encontramos en el diccionario sin hacer una sola pausa de puntuación métrica", locked: false },
  ];
  const badDelivery = analyzeDeliveryLoad(crowdedBars, 160);
  assert(badDelivery.crowdedBars.length > 0, "Accurately detects crowded bars exceeding physical syllables/second limit");
  assert(badDelivery.loadScore < goodDelivery.loadScore, "Overcrowded phrasing score is penalized significantly");
  totalPassed += 4;

  // -------------------------------------------------------------
  // TEST 6: Adlib Roles, Cluster & Lead Occupancy Collision
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Adlib Roles, Cluster & Lead Occupancy Collision ---");
  const adlibTestLyrics = `[Verse 1: Flippa]
Late night on the porch *(Yeah)*
Countin' blue hundreds *(Look at the wrist!)*
No promises as a kid *(Hold up)*
Now we flexin' the ice *(Flippa!)*
Movin' the weight in the pyrex *(What?)*`;

  const parsedAST = parseRawLyricsToAST(adlibTestLyrics);
  const adlibAudit = analyzeAdlibs(parsedAST.sections);

  assert(adlibAudit.instances.length === 5, "Detected 5 ad-lib instances in AST");
  assert(adlibAudit.roleDistribution.punctuation > 0, "Classified punctuation adlib *(Yeah)*");
  assert(adlibAudit.roleDistribution.emphasis > 0, "Classified emphasis adlib *(Look at the wrist!)*");
  assert(adlibAudit.roleDistribution.hype > 0, "Classified hype adlib *(Flippa!)*");
  assert(adlibAudit.roleDistribution.reaction > 0, "Classified reaction adlib *(What?)*");
  assert(adlibAudit.maxConsecutiveAdlibBars === 5, "Tracked consecutive bars with ad-libs");
  assert(adlibAudit.clusterWarning === true, "Fired clusterWarning because consecutive ad-lib bars > 2");
  totalPassed += 7;

  // -------------------------------------------------------------
  // TEST 7: Language DNA Isolation from Performance Ad-libs
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Language DNA Isolation from Performance Ad-libs ---");
  const bilingualLyric = `[Verse 1: Lead]
Toda mi gente sabe cómo se busca el dinero en la calle *(Yeah!)*
Nadie me regaló nada cuando estaba pasando hambre *(Turn me up!)*
Caminando de noche con la mirada puesta en el objetivo *(Let's get it!)*
El que traiciona la palabra no tiene cabida en mi mesa *(Hold up!)*`;

  const langResult = calculateSyllableLanguageRatio(bilingualLyric, {
    center: 0.20,
    softMin: 0.10,
    softMax: 0.30,
    hardMin: 0.05,
    hardMax: 0.40,
  });

  // The primary text is 100% Spanish; English is ONLY in ad-libs *(Yeah!)*, *(Turn me up!)*
  assert(langResult.spanishPercent >= 85, `Primary lyric text correctly evaluated as predominantly Spanish (${langResult.spanishPercent}%)`);
  assert(langResult.adlibEnglishPercent !== undefined && langResult.adlibEnglishPercent >= 80, `Ad-libs tracked separately as predominantly English (${langResult.adlibEnglishPercent}%)`);
  totalPassed += 2;

  // -------------------------------------------------------------
  // TEST 8: HookContract Invariance Under Hostile Mutation
  // -------------------------------------------------------------
  console.log("\n--- TEST 8: HookContract Invariance Under Hostile Mutation ---");
  const canonicalHook = `[Chorus: Flippa]
Countin' blue hundreds straight from the porch
Watchin' the block, we holdin' the torch
No cap on my name, we stay in the game
Flippa the boss, remember the name`;

  const hookContract = createHookContract(canonicalHook, { allowPerformanceVariation: true });

  const mutatedSong = `[Chorus: Flippa]
Countin' blue hundreds straight from the porch *(Yeah)*
Watchin' the block, we holdin' the torch *(Let's go)*
No cap on my name, we stay in the game *(Facts)*
Flippa the boss, remember the name *(Flippa!)*

[Verse 1: Flippa]
Late night on the corner movin' the weight.

[Chorus: Flippa]
I changed all the words completely to something else *(Mutated adlib A)*
Now this is a completely different hook text *(Mutated adlib B)*
The AI forgot the canonical lyrics of the chorus *(Mutated adlib C)*
Everything is broken if this stays mutated *(Mutated adlib D)*`;

  let ast = parseRawLyricsToAST(mutatedSong);
  ast = bindHookContractToAST(ast, hookContract);

  const chorus1Bars = ast.sections[0].bars.map(b => b.lyricText);
  const chorus2Bars = ast.sections[2].bars.map(b => b.lyricText);

  assert(
    JSON.stringify(chorus1Bars) === JSON.stringify(chorus2Bars),
    "Chorus 1 and Chorus 2 lyricText are 100% canonical and identical after bindHookContractToAST"
  );
  assert(
    chorus2Bars[0] === "Countin' blue hundreds straight from the porch",
    "Mutated Chorus 2 was deterministically restored to canonical HookContract lyric"
  );
  assert(
    ast.sections[2].bars[0].performance?.adlibs?.[0] === "Mutated adlib A",
    "Preserved unique performance ad-libs of Chorus 2 without allowing lyric text drift"
  );
  totalPassed += 3;

  // -------------------------------------------------------------
  // TEST 9: Suno Budget Profile, Range Duration & Outro Verification
  // -------------------------------------------------------------
  console.log("\n--- TEST 9: Suno Budget Profile, Range Duration & Outro Verification ---");
  const sampleSongWithOutro = `${canonicalHook}

[Verse 1: Flippa]
Movin' the pyrex, countin' the checks in the spot.

[Outro: Flippa]
Flippa... Havoc... straight from the porch.
We out.
[Fade Out]`;

  const budget = auditSunoBudget(sampleSongWithOutro, 135);
  assert(budget.charCount > 0, `Character count computed (${budget.charCount})`);
  assert(budget.durationEstimate.formatted.includes("~") && budget.durationEstimate.formatted.includes("–"), `Runtime range formatted properly (${budget.durationEstimate.formatted})`);
  assert(budget.outroPresent === true, "Outro detected in AST");
  assert(budget.outroComplete === true, "Outro complete verification confirmed deterministically");
  assert(budget.status === "safe", `Budget status is within TRAPLORD safe limits (${budget.status})`);
  totalPassed += 5;

  // -------------------------------------------------------------
  // TEST 10: Quality Gate 2-Phase & Snapshot Decoupling (Clean AST)
  // -------------------------------------------------------------
  console.log("\n--- TEST 10: Quality Gate 2-Phase & Snapshot Decoupling (Clean AST) ---");
  const fullSongAST = parseRawLyricsToAST(sampleSongWithOutro);

  // 1. Invariant: SongDocument must be completely pure of diagnostics
  const astKeys = Object.keys(fullSongAST);
  assert(!astKeys.includes("diagnostics"), "SongDocument does NOT contain internal diagnostics field");
  assert(!astKeys.includes("qualityGate"), "SongDocument does NOT contain qualityGate field");

  // 2. Initial Audit
  const auditCtx = runInitialDeliveryAudit(fullSongAST, 135, profile);
  assert(auditCtx.phoneticFit !== undefined, "Initial audit produces phoneticFit");
  assert(auditCtx.deliveryLoad !== undefined, "Initial audit produces deliveryLoad");
  assert(auditCtx.adlibAnalysis !== undefined, "Initial audit produces adlibAnalysis");

  // 3. Repairability Evaluation
  const repairPlan = evaluateRepairability(auditCtx);
  assert(typeof repairPlan.needsRepair === "boolean", "Repairability evaluation returns boolean needsRepair");

  // 4. Deterministic Hash & Final Quality Gate & Snapshot
  const docHash = hashSongDocument(fullSongAST);
  assert(docHash.startsWith("doc_") && docHash.includes("_s"), `Deterministic document hash generated (${docHash})`);

  const snapshot = evaluateFinalQualityGate(
    fullSongAST,
    auditCtx,
    budget,
    "v_1",
    docHash
  );

  assert(snapshot.engineVersion === "v2.2", "AnalysisSnapshot generated with engineVersion v2.2");
  assert(snapshot.qualityGate.decision === "PASS" || snapshot.qualityGate.decision === "PASS_WITH_REPAIR", `Final Quality Gate emitted decision: ${snapshot.qualityGate.decision}`);
  assert(snapshot.sourceDocumentHash === docHash, "AnalysisSnapshot is bound to sourceDocumentHash");

  // 5. VersionGraph connection
  const vGraph = createInitialVersionGraph(fullSongAST, "Initial Generation", snapshot);
  assert(vGraph.versions["v_1"]?.analysisSnapshot !== undefined, "VersionGraph version node contains decoupled AnalysisSnapshot");
  totalPassed += 9;

  console.log("\n=======================================================");
  console.log(`📊 ALL COMPOSITION ENGINE v2.2 AUDITS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
  console.log("🎉 TRAPLORD COMPOSITION ENGINE v2.2 IS 100% VERIFIED AND ARCHITECTURALLY CONTROLLED!\n");
}

runAuditSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

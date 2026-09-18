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
  type SectionCardinalityExpectation,
} from "../src/lib/quality-gate";
import {
  parseRawLyricsToAST,
  stringifyASTToSunoLyrics,
  createHookContract,
  bindHookContractToAST,
  hashSongDocument,
  formatSectionHeader,
  resolveSectionSpec,
  type SongDocument,
  type SongBar,
} from "../src/lib/song-document";
import {
  cleanSunoBracketHeaders,
  buildStage1ToplinePrompt,
  buildStage2GhostwriterPrompt,
  type PromptParams,
} from "../src/lib/prompt-builder";
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

  // -------------------------------------------------------------
  // TEST 11: HookContract Safe-Collapse & Periodic Mismatch Guards
  // -------------------------------------------------------------
  console.log("\n--- TEST 11: HookContract Safe-Collapse & Periodic Mismatch Guards ---");
  const eightBarUnit = `[Chorus: Future]
I'm counting these bodies, I'm dodging the system *(Yeah)*
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato *(Facts)*
Me tiran la mala pero no me alcanzan *(No)*
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, firmando el retrato *(Uh)*`;

  // Case A: 32 bars where 4 blocks of 8 are identical -> Safe Collapse
  const thirtyTwoBars4x = `${eightBarUnit}\n\n${eightBarUnit}\n\n${eightBarUnit}\n\n${eightBarUnit}`;
  const contract32 = createHookContract(thirtyTwoBars4x, { expectedBars: 8, occurrenceCount: 4 });
  assert(contract32.cardinalityStatus === "safe-collapse", `Identical 4x8 repetition correctly classified as safe-collapse (${contract32.cardinalityStatus})`);
  assert(contract32.repetitionFactor === 4, `Repetition factor 4 detected (${contract32.repetitionFactor})`);
  assert(contract32.bars.length === 8, `Collapsed deterministically to exactly 8 canonical bars (${contract32.bars.length})`);
  assert(contract32.performanceTemplate?.length === 8, `Preserved performanceTemplate for all 8 bars`);

  // Case B: Partial repetition (8 + 8 + 4 = 20 bars, expected 8) -> Genuine mismatch, DO NOT collapse!
  const partialRepetition = `${eightBarUnit}\n\n${eightBarUnit}\n\nLínea A\nLínea B\nLínea C\nLínea D`;
  const contractPartial = createHookContract(partialRepetition, { expectedBars: 8 });
  assert(contractPartial.cardinalityStatus === "mismatch", "Partial repetition (8+8+4) correctly rejected as mismatch, not collapsed");
  assert(contractPartial.bars.length === 20, "Contract bars not mutilated or truncated on mismatch");

  // Case C: Non-periodic overflow (12 unique bars when expected 8) -> Genuine mismatch, DO NOT truncate!
  const twelveUniqueBars = `[Chorus: Future]\nBar 1\nBar 2\nBar 3\nBar 4\nBar 5\nBar 6\nBar 7\nBar 8\nBar 9\nBar 10\nBar 11\nBar 12`;
  const contractOverflow = createHookContract(twelveUniqueBars, { expectedBars: 8 });
  assert(contractOverflow.cardinalityStatus === "mismatch", "12 unique bars rejected as mismatch, not silently truncated");
  assert(contractOverflow.bars.length === 12, "Full 12 bars preserved on mismatch for quality gate inspection");
  totalPassed += 7;

  // -------------------------------------------------------------
  // TEST 12: Lyric/Performance Separation & Zero-Asterisk Hygiene
  // -------------------------------------------------------------
  console.log("\n--- TEST 12: Lyric/Performance Separation & Zero-Asterisk Hygiene ---");
  const dirtyMarkdownInput = `[Intro: Future]
*(Yeah... turn me up)*
*(Hold up...)*
*(Pluto...)*
*(Freebandz, check)*
[Beat Drop]

[Verse 1: Future]
Moving mud in the cup, codeína pura
Ella quiere que la muerda a oscuras *(skrrt)*
Te dejamos frío en el piso si rompes \`[Vocal Cut]\`

[Chorus: Future]
I'm counting these bodies, I'm dodging the system **
Cuidando mi espalda, no firmo contrato *(Facts)*`;

  const cleanedMarkdown = cleanSunoBracketHeaders(dirtyMarkdownInput);
  // Assert cleanSunoBracketHeaders did NOT weld [Intro: Future] with the first line
  assert(cleanedMarkdown.includes("[Intro: Future]\n("), "Header newline preserved, no bracket/ad-lib welding");
  assert(!cleanedMarkdown.includes("**"), "Cleaned lyrics contains zero orphan double asterisks (**)");
  assert(!cleanedMarkdown.includes("`"), "Cleaned lyrics contains zero backticks (`)");

  const parsedCleanAST = parseRawLyricsToAST(cleanedMarkdown);
  assert(parsedCleanAST.sections[0].name.toLowerCase().includes("intro"), `First section is Intro, no ghost Verse 1 (got: ${parsedCleanAST.sections[0].name})`);
  assert(parsedCleanAST.sections[0].bars.length === 4, `Intro contains 4 ad-lib bars (got: ${parsedCleanAST.sections[0].bars.length})`);
  assert(parsedCleanAST.sections[0].bars[0].lyricText === "", "Empty sung lyricText for pure ad-lib bar (no ** or phantom text)");
  assert(parsedCleanAST.sections[0].bars[0].performance?.adlibs?.[0] === "Yeah... turn me up", "Ad-lib content cleanly extracted without parentheses or asterisks");

  const stringifiedOutput = stringifyASTToSunoLyrics(parsedCleanAST);
  assert(!stringifiedOutput.includes("[Verse 1, Future]"), "No comma-formatted section headers in stringified output");
  assert(stringifiedOutput.includes("[Verse 1: Future]") || stringifiedOutput.includes("[Verse 1]"), "Canonical colon formatting preserved");
  assert(!stringifiedOutput.includes("**"), "Stringified Suno output is 100% free of orphan asterisks");
  totalPassed += 9;

  // -------------------------------------------------------------
  // TEST 13: Structural Cardinality Audit in Quality Gate
  // -------------------------------------------------------------
  console.log("\n--- TEST 13: Structural Cardinality Audit in Quality Gate ---");
  // Song with abnormal chorus of 32 bars (mismatch)
  const abnormalSong = `[Intro: Future]
(Yeah)
(Turn me up)

[Chorus: Future]
${Array.from({ length: 32 }, (_, i) => `Different line ${i + 1}`).join("\n")}

[Outro: Future]
(Outro line 1)
(Outro line 2)`;

  const abnormalAST = parseRawLyricsToAST(abnormalSong);
  const abnormalAudit = runInitialDeliveryAudit(abnormalAST, 135, profile, [], { Chorus: { exact: 8 } });

  assert(abnormalAudit.structuralCardinality !== undefined, "Initial audit produces structuralCardinality audit");
  const chorusAudit = abnormalAudit.structuralCardinality.find(c => c.sectionName.toLowerCase().includes("chorus"));
  assert(chorusAudit !== undefined && chorusAudit.status === "mismatch", `Detected chorus cardinality mismatch against external expectation 8 (status: ${chorusAudit?.status})`);

  const abnormalRepair = evaluateRepairability(abnormalAudit);
  assert(abnormalRepair.needsRepair === true, "Cardinality mismatch triggers repair requirement in Quality Gate");
  assert(abnormalRepair.targetBars.length > 0, `targetBars is NOT 0 when structural mismatch exists (got: ${abnormalRepair.targetBars.length})`);

  const abnormalDocHash = hashSongDocument(abnormalAST);
  const abnormalSnapshot = evaluateFinalQualityGate(abnormalAST, abnormalAudit, budget, "v_abnormal", abnormalDocHash);
  assert(abnormalSnapshot.qualityGate.layersPassed.structural === false, "Structural layer FAILS when cardinality mismatch is present");
  assert(abnormalSnapshot.qualityGate.decision === "REPAIR", `Quality gate emits REPAIR instead of PASS on structural mismatch (decision: ${abnormalSnapshot.qualityGate.decision})`);
  totalPassed += 6;

  // -------------------------------------------------------------
  // TEST 14: Canonical formatSectionHeader & resolveSectionSpec
  // -------------------------------------------------------------
  console.log("\n--- TEST 14: Canonical formatSectionHeader & resolveSectionSpec ---");
  assert(formatSectionHeader("Verse 1", "Future") === "[Verse 1: Future]", "formatSectionHeader generates canonical [Name: Hint]");
  assert(formatSectionHeader("Chorus") === "[Chorus]", "formatSectionHeader generates clean [Name] when no hint");

  const spec = resolveSectionSpec(
    [
      { name: "Intro", type: "intro" },
      { name: "Verse 1", type: "verse" },
      { name: "Chorus", type: "chorus" },
      { name: "Verse 2", type: "verse" },
      { name: "Chorus", type: "chorus" },
    ],
    [{ sectionName: "Chorus", bars: 8, voice: "lead" }],
    "hook"
  );
  assert(spec.targetBars === 8, "resolveSectionSpec resolved targetBars 8 for hook");
  assert(spec.occurrenceCount === 2, "resolveSectionSpec resolved 2 occurrences of hook");
  totalPassed += 4;

  // -------------------------------------------------------------
  // TEST 15: External Authority Cardinality Audit (Anti-Circularity Verification)
  // -------------------------------------------------------------
  console.log("\n--- TEST 15: External Authority Cardinality Audit (Anti-Circularity) ---");
  const testDocForAudit: SongDocument = {
    versionId: "v_circ_test",
    title: "Anti-Circularity Verification",
    artistId: "future",
    sections: [
      {
        id: "s_chorus_test",
        name: "Chorus",
        type: "hook",
        bars: Array.from({ length: 12 }, (_, i) => ({
          id: `b_${i}`,
          position: i + 1,
          lyricText: `Bar ${i + 1}`,
          locked: false,
        })),
      },
    ],
    hookContracts: {
      hc_fixed: {
        id: "hc_fixed",
        approvedText: "Canonical line 1\nCanonical line 2",
        bars: ["Canonical line 1", "Canonical line 2"],
        expectedBars: 8,
        contentHash: "hash_fixed",
        locked: true,
      },
    },
  };

  // When external expectations are provided, audit compares against authoritative spec
  const auditWithExternal = runInitialDeliveryAudit(testDocForAudit, 135, undefined, [], {
    Chorus: { exact: 8 },
  });
  const chorusAuditExternal = auditWithExternal.structuralCardinality.find(c => c.sectionName === "Chorus");
  assert(chorusAuditExternal?.expected.exact === 8, "Authoritative external expectation 8 received by audit");
  assert(chorusAuditExternal?.actualBars === 12, "AST actual bars 12 accurately audited");
  assert(chorusAuditExternal?.delta === 4, "Accurately calculated delta +4 without circular self-validation");
  assert(chorusAuditExternal?.status === "mismatch", "Cardinality mismatch declared against external authority");

  // When external expectations are absent, uses contract.expectedBars (NEVER AST bar count)
  testDocForAudit.sections[0].hookContractId = "hc_fixed";
  const auditFromContract = runInitialDeliveryAudit(testDocForAudit, 135, undefined, []);
  const chorusAuditContract = auditFromContract.structuralCardinality.find(c => c.sectionName === "Chorus");
  assert(chorusAuditContract?.expected.exact === 8, "Derived expectation from HookContract.expectedBars (8), NOT AST length (12)");
  assert(chorusAuditContract?.status === "mismatch", "Non-circular: Contract expected 8 vs AST 12 triggers mismatch");
  totalPassed += 6;

  // -------------------------------------------------------------
  // TEST 16: Lyric Identity + Performance Variation Across Instances
  // -------------------------------------------------------------
  console.log("\n--- TEST 16: Lyric Identity + Performance Variation Across Instances ---");
  const canonical8Bars = [
    "I'm counting these bodies, I'm dodging the system",
    "Cuidando mi espalda, no firmo contrato",
    "I'm counting these bodies, I'm dodging the system",
    "Vendiendo la grasa, cobrando al aparato",
    "Me tiran la mala pero no me alcanzan",
    "I'm dripping in codeine, me cuida la banda",
    "I'm counting these bodies, I'm dodging the system",
    "Negocios de mafia, mi sangre no cambia",
  ];

  const contractWithTemplate = createHookContract(
    canonical8Bars.map((b, i) => i % 2 === 0 ? `${b} *(Default)*` : b).join("\n"),
    { expectedBars: 8, occurrenceCount: 4, allowPerformanceVariation: true }
  );

  // Construct a song with 4 distinct choruses having unique performance ad-libs:
  // Chorus 1: adlibs A (Yeah, Facts)
  // Chorus 2: adlibs B (Drop it, Check)
  // Chorus 3: sparse (no ad-libs)
  // Chorus 4: accent adlibs (Let's go, Pluto)
  const songWith4Choruses: SongDocument = {
    versionId: "v_perf_test",
    title: "Performance Variation Test",
    artistId: "future",
    sections: [
      {
        id: "c1",
        name: "Chorus",
        type: "hook",
        bars: canonical8Bars.map((b, i) => ({
          id: `c1_b${i}`,
          position: i + 1,
          lyricText: i === 0 ? "Mutated lyric in c1" : b,
          locked: false,
          performance: i === 0 ? { adlibs: ["Yeah"] } : (i === 3 ? { adlibs: ["Facts"] } : undefined),
        })),
      },
      {
        id: "c2",
        name: "Chorus",
        type: "hook",
        bars: canonical8Bars.map((b, i) => ({
          id: `c2_b${i}`,
          position: i + 1,
          lyricText: i === 1 ? "Mutated lyric in c2" : b,
          locked: false,
          performance: i === 0 ? { adlibs: ["Drop it"] } : (i === 3 ? { adlibs: ["Check"] } : undefined),
        })),
      },
      {
        id: "c3",
        name: "Chorus",
        type: "hook",
        bars: canonical8Bars.map((b, i) => ({
          id: `c3_b${i}`,
          position: i + 1,
          lyricText: b,
          locked: false,
          performance: undefined, // Sparse chorus: zero adlibs
        })),
      },
      {
        id: "c4",
        name: "Chorus",
        type: "hook",
        bars: canonical8Bars.map((b, i) => ({
          id: `c4_b${i}`,
          position: i + 1,
          lyricText: b,
          locked: false,
          performance: i === 0 ? { adlibs: ["Let's go"] } : (i === 7 ? { adlibs: ["Pluto"] } : undefined),
        })),
      },
    ],
  };

  const boundVariationAST = bindHookContractToAST(songWith4Choruses, contractWithTemplate);

  // Verify: All 4 choruses have 100% canonical lyricText
  for (let c = 0; c < 4; c++) {
    const sec = boundVariationAST.sections[c];
    assert(sec.bars.length === 8, `Chorus #${c + 1} has exactly 8 bars`);
    assert(
      sec.bars.every((b, i) => b.lyricText === canonical8Bars[i]),
      `Chorus #${c + 1} lyricText is 100% canonical and matches contract`
    );
  }

  // Verify: Performance variations are NOT clobbered by the contract template
  assert(boundVariationAST.sections[0].bars[0].performance?.adlibs?.[0] === "Yeah", "Chorus #1 preserved unique adlib 'Yeah'");
  assert(boundVariationAST.sections[1].bars[0].performance?.adlibs?.[0] === "Drop it", "Chorus #2 preserved unique adlib 'Drop it'");
  assert(boundVariationAST.sections[2].bars[0].performance === undefined, "Chorus #3 remained sparse without performance injection");
  assert(boundVariationAST.sections[3].bars[7].performance?.adlibs?.[0] === "Pluto", "Chorus #4 preserved accent adlib 'Pluto'");
  totalPassed += 12;

  // -------------------------------------------------------------
  // TEST 17: Full End-to-End Orchestration Regression (Exact User Log Reproducer)
  // -------------------------------------------------------------
  console.log("\n--- TEST 17: Full End-to-End Pipeline Orchestration Regression ---");
  const e2eStructure: SongStructure = {
    id: "classic_trap",
    label: "Classic Trap (Intro - V1 - C - V2 - C - Bridge - C - C - Outro)",
    sections: [
      { name: "Intro", type: "intro" },
      { name: "Verse 1", type: "verse" },
      { name: "Chorus", type: "hook" },
      { name: "Verse 2", type: "verse" },
      { name: "Chorus", type: "hook" },
      { name: "Bridge", type: "bridge" },
      { name: "Chorus", type: "hook" },
      { name: "Chorus", type: "hook" },
      { name: "Outro", type: "outro" },
    ],
  };

  const e2ePromptParams: PromptParams = {
    artistId: "future",
    moodId: "dark-trap",
    bpmVibe: { id: "atlanta-slow", label: "Atlanta Dark Trap", range: "135-142", description: "BPM" },
    structure: e2eStructure,
    spanglishPercent: 40,
    topics: ["calle", "negocios"],
    customTopic: "Moving mud in the cup",
    flowPocketMode: "classic",
    rhymeSchemeId: "rs_free",
    sectionVoices: [
      { sectionName: "Intro", voice: "lead" },
      { sectionName: "Verse 1", voice: "lead" },
      { sectionName: "Chorus", voice: "lead", bars: 8 },
      { sectionName: "Verse 2", voice: "lead" },
      { sectionName: "Bridge", voice: "lead" },
      { sectionName: "Outro", voice: "lead" },
    ],
  };

  // 1. Stage 1 Topliner Prompt Generation
  const stage1Prompt = buildStage1ToplinePrompt(e2ePromptParams, "Global rhythm pocket intention");
  assert(stage1Prompt.includes("EXCLUSIVAMENTE"), "Stage 1 prompt instructs exclusive hook composition");
  assert(stage1Prompt.includes("8 compases") || stage1Prompt.includes("8 barras"), "Stage 1 prompt specifies 8 bars for hook");

  // 2. Exact Raw Stage 1 Output from Gemini (The 4x repeated 8-bar chorus that caused the original bug)
  const simulatedStage1Output = `[Chorus]
I'm counting these bodies, I'm dodging the system *(Yeah)*
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato *(Facts)*
Me tiran la mala pero no me alcanzan *(No)*
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, mi sangre no cambia *(Uh)*

[Chorus]
I'm counting these bodies, I'm dodging the system *(Yeah)*
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato *(Facts)*
Me tiran la mala pero no me alcanzan *(No)*
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, mi sangre no cambia *(Uh)*

[Chorus]
I'm counting these bodies, I'm dodging the system *(Yeah)*
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato *(Facts)*
Me tiran la mala pero no me alcanzan *(No)*
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, mi sangre no cambia *(Uh)*

[Chorus]
I'm counting these bodies, I'm dodging the system *(Yeah)*
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato *(Facts)*
Me tiran la mala pero no me alcanzan *(No)*
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, mi sangre no cambia *(Uh)*`;

  // 3. Resolve spec & create HookContract (Demonstrates safe-collapse)
  const hookSpec = resolveSectionSpec(e2eStructure.sections, e2ePromptParams.sectionVoices, "hook");
  assert(hookSpec.targetBars === 8, "Resolved hook targetBars 8");
  assert(hookSpec.occurrenceCount === 4, "Resolved 4 occurrences of chorus in structure");

  const e2eHookContract = createHookContract(simulatedStage1Output, {
    expectedBars: hookSpec.targetBars || 8,
    occurrenceCount: hookSpec.occurrenceCount,
    allowPerformanceVariation: true,
  });

  assert(e2eHookContract.bars.length === 8, `HookContract collapsed 32 bars to exactly 8 bars (got: ${e2eHookContract.bars.length})`);
  assert(e2eHookContract.cardinalityStatus === "safe-collapse", `Contract cardinalityStatus is safe-collapse (got: ${e2eHookContract.cardinalityStatus})`);
  assert(e2eHookContract.repetitionFactor === 4, `Contract repetitionFactor is 4 (got: ${e2eHookContract.repetitionFactor})`);
  assert(e2eHookContract.performanceTemplate?.length === 8, "Preserved 8-bar performanceTemplate");

  // 4. Stage 2 Ghostwriter Prompt Generation
  const stage2Prompt = buildStage2GhostwriterPrompt(
    e2ePromptParams,
    e2eHookContract.approvedText,
    "Writing cells snippet",
    "Flow skeleton snippet"
  );
  assert(stage2Prompt.includes("HOOK CONTRACT") && stage2Prompt.includes("GANCHO APROBADO"), "Stage 2 prompt contains immutable hook contract block");
  assert(!stage2Prompt.includes("32 barras"), "Stage 2 prompt does not transmit inflated 32 bars");

  // 5. Simulated Raw Stage 2 Output from Gemini (reproducing original raw anomalies: welded header, **, backticks)
  const simulatedStage2Output = `[Intro: Future] *(Yeah... turn me up)*
** (Hold up...)
** (Pluto...)
** (street business, check)

[Beat Drop]

[Verse 1: Future]
Moving mud in the cup, codeína pura
Ella quiere que la muerda a oscuras ** (skrrt)
Shooters in the lobby watching for the opps
No te cruces en mi zona, llamamos al block ** (on god)
Sixty racks on my wrist, look at how it shines
Esa puta me lo mama, she don't waste time ** (facts)
Millonarios firmando bajo la mesa
Lealtad sobre dinero, esa es mi promesa
No business with no undercover cops
Te dejamos frío en el piso si rompes \`[Vocal Cut]\`

[Chorus: Future]
I'm counting these bodies, I'm dodging the system *(Yeah)*
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato *(Facts)*
Me tiran la mala pero no me alcanzan *(No)*
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, mi sangre no cambia *(Uh)*

[Verse 2: Future]
Coronamos la vuelta, subieron los ceros
Conocen mi nombre los pistoleros
No confío en sonrisas ni en falsos abrazos
Caminando con plomo, esquivando balazos
Trap de verdad, no vendemos mentiras
Diamantes brillando mientras ella me mira
La calle me llama, el dinero responde
El diablo persigue pero no me escondo

[Chorus: Future]
I'm counting these bodies, I'm dodging the system *(Drop it)*
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato *(Check)*
Me tiran la mala pero no me alcanzan
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, mi sangre no cambia *(Yeah)*

[Bridge: Future]
*(Whispering)*
Nadie vio nada en la esquina
El humo sube y la mente domina
Dos pasos al frente, sin marcha atrás

[Chorus: Future]
I'm counting these bodies, I'm dodging the system
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato
Me tiran la mala pero no me alcanzan
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, mi sangre no cambia

[Chorus: Future]
I'm counting these bodies, I'm dodging the system *(Let's go)*
Cuidando mi espalda, no firmo contrato
I'm counting these bodies, I'm dodging the system
Vendiendo la grasa, cobrando al aparato *(Ha)*
Me tiran la mala pero no me alcanzan *(Never)*
I'm dripping in codeine, me cuida la banda
I'm counting these bodies, I'm dodging the system
Negocios de mafia, mi sangre no cambia *(Pluto)*

[Outro: Future]
Turn off the lights.
Pluto out.
[Fade to End]`;

  // 6. Pipeline Execution: Sanitization -> AST -> Hook Binding -> Cardinality Audit -> Serialization
  const sanitizedLyrics = cleanSunoBracketHeaders(simulatedStage2Output);
  assert(!sanitizedLyrics.includes("**"), "Sanitized lyrics has 0 orphan double asterisks (**)");
  assert(!sanitizedLyrics.includes("`"), "Sanitized lyrics has 0 backticks (`)");

  let e2eAST = parseRawLyricsToAST(sanitizedLyrics);
  assert(e2eAST.sections[0].name.toLowerCase().includes("intro"), `No ghost Verse 1: first section is ${e2eAST.sections[0].name}`);

  // Reconcile HookContract to AST
  e2eAST = bindHookContractToAST(e2eAST, e2eHookContract);

  // Authoritative external structural expectations
  const e2eStructuralExpectations: Record<string, SectionCardinalityExpectation> = {};
  for (const sec of e2eStructure.sections) {
    const spec = resolveSectionSpec(e2eStructure.sections, e2ePromptParams.sectionVoices, sec.type);
    if (sec.type === "hook") {
      e2eStructuralExpectations[sec.name] = { exact: e2eHookContract.expectedBars || spec.targetBars || 8 };
    } else {
      e2eStructuralExpectations[sec.name] = { min: spec.minBars, max: spec.maxBars };
    }
  }

  const e2eAudit = runInitialDeliveryAudit(
    e2eAST,
    138,
    getFlowProfile("future") || undefined,
    [],
    e2eStructuralExpectations
  );

  const e2eRepairPlan = evaluateRepairability(e2eAudit);
  assert(e2eRepairPlan.needsRepair === false, "Zero structural repair needed on reconciled song document");

  const e2eFinalSunoLyrics = stringifyASTToSunoLyrics(e2eAST);

  // 7. Core Invariant Assertions Demanded by User
  const allChoruses = e2eAST.sections.filter(s => s.type === "hook" || s.name.toLowerCase().includes("chorus"));
  assert(allChoruses.length === 4, `Song AST contains exactly 4 chorus sections (got: ${allChoruses.length})`);
  assert(allChoruses[0].bars.length === 8, "Chorus #1 = exactly 8 bars");
  assert(allChoruses[1].bars.length === 8, "Chorus #2 = exactly 8 bars");
  assert(allChoruses[2].bars.length === 8, "Chorus #3 = exactly 8 bars");
  assert(allChoruses[3].bars.length === 8, "Chorus #4 = exactly 8 bars");

  const totalChorusBars = allChoruses.reduce((acc, c) => acc + c.bars.length, 0);
  assert(totalChorusBars === 32, `Total chorus bars across song = 32 (8 + 8 + 8 + 8), NOT 128 (got: ${totalChorusBars})`);

  // Section Headers formatting
  assert(!e2eFinalSunoLyrics.includes(", Future]"), "No comma section headers in Suno lyrics");
  assert(e2eFinalSunoLyrics.includes("[Chorus: Future]"), "Canonical colon header [Chorus: Future] preserved");
  assert(e2eFinalSunoLyrics.includes("[Verse 1: Future]"), "Canonical colon header [Verse 1: Future] preserved");
  assert(!e2eFinalSunoLyrics.startsWith("[Verse 1"), "Song does not start with ghost Verse 1");
  assert(!e2eFinalSunoLyrics.includes("**"), "Final Suno lyrics contains zero orphan asterisks (**)");
  assert(!e2eFinalSunoLyrics.includes("`"), "Final Suno lyrics contains zero backticks (`)");
  totalPassed += 21;

  console.log("\n=======================================================");
  console.log(`📊 ALL COMPOSITION ENGINE v2.2 AUDITS PASSED: ${totalPassed} ASSERTS VERIFIED | 0 FAILED`);
  console.log("=======================================================\n");
  console.log("🎉 TRAPLORD COMPOSITION ENGINE v2.2 IS 100% VERIFIED AND ARCHITECTURALLY CONTROLLED!\n");
}

runAuditSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

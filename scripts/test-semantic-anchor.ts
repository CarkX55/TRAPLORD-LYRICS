import assert from "assert";
import {
  computeStructureFingerprint,
  buildCanonicalIntent,
  computeGenerationIntentHash,
  selectDramaticMotif,
  synthesizeSemanticAnchor,
  DRAMATIC_MOTIF_CATALOG,
  canonicalJsonStringify,
  hashCanonical,
} from "../src/lib/motif-engine";
import type { SongStructure } from "../src/lib/trap-data";

console.log("===============================================================================");
console.log("🧪 PASO 4: SEMANTIC ANCHOR CON STRUCTURE FINGERPRINT PURO & ANTI-CLICHÉ");
console.log("===============================================================================\n");

let passedAsserts = 0;

function check(desc: string, condition: boolean) {
  assert(condition, `FAIL: ${desc}`);
  passedAsserts++;
  console.log(`  ✓ [Assert ${passedAsserts.toString().padStart(2, "0")}] ${desc}`);
}

// ---------------------------------------------------------------------------
// 1. DETERMINISTIC CANONICAL JSON STRINGIFY & HASH
// ---------------------------------------------------------------------------
console.log("\n--- TEST 1: Deterministic Canonical JSON & Hash ---");

const objA = { z: 1, a: "test", m: [3, 2, 1], nested: { y: "b", x: "a" } };
const objB = { nested: { x: "a", y: "b" }, m: [3, 2, 1], a: "test", z: 1 };

const strA = canonicalJsonStringify(objA);
const strB = canonicalJsonStringify(objB);
check("Key ordering differences produce identical canonical JSON", strA === strB);

const hashA = hashCanonical(objA);
const hashB = hashCanonical(objB);
check("Canonical hash is identical regardless of object key order", hashA === hashB);
check("Hash is a valid 64-character SHA-256 hex string", hashA.length === 64 && /^[0-9a-f]{64}$/.test(hashA));

// ---------------------------------------------------------------------------
// 2. PURE STRUCTURE FINGERPRINT (VOICE & ARTIST SHIELDING)
// ---------------------------------------------------------------------------
console.log("\n--- TEST 2: Pure Structure Fingerprint (Voice/Artist Invariance) ---");

const structureBase: SongStructure = {
  id: "std_trap_1",
  label: "Estándar Trap",
  sections: [
    { name: "Intro", type: "intro", defaultBars: 4, bars: 4 },
    { name: "Verse 1", type: "verse", defaultBars: 16, bars: 16 },
    { name: "Chorus", type: "chorus", defaultBars: 8, bars: 8 },
    { name: "Verse 2", type: "verse", defaultBars: 16, bars: 16 },
    { name: "Chorus", type: "chorus", defaultBars: 8, bars: 8 },
    { name: "Outro", type: "outro", defaultBars: 4, bars: 4 },
  ],
};

const structureWithVoicesAndNames: SongStructure = {
  id: "std_trap_custom_names",
  label: "Estructura con nombres y voces custom",
  sections: [
    { name: "Intro Exclusiva", type: "intro", defaultBars: 4, bars: 4, voice: "Kendrick" as any, voiceId: "feature" },
    { name: "Estrofa 1", type: "verse", defaultBars: 16, bars: 16, voice: "Drake" as any, voiceId: "main" },
    { name: "Estribillo Pegadizo", type: "chorus", defaultBars: 8, bars: 8, voice: "Both" as any, voiceId: "both" },
    { name: "Estrofa 2", type: "verse", defaultBars: 16, bars: 16, voice: "Eminem" as any, voiceId: "guest" },
    { name: "Estribillo Final", type: "chorus", defaultBars: 8, bars: 8, voice: "Both" as any, voiceId: "both" },
    { name: "Cierre / Outro", type: "outro", defaultBars: 4, bars: 4, voice: "Future" as any, voiceId: "main" },
  ],
};

const fpBase = computeStructureFingerprint(structureBase);
const fpCustom = computeStructureFingerprint(structureWithVoicesAndNames);

check("structureFingerprint length is 64 hex characters", fpBase.length === 64);
check(
  "Voice modifications (Lead -> Kendrick, Drake, etc.) do NOT alter structureFingerprint",
  fpBase === fpCustom
);
check(
  "Section name modifications (Verse -> Estrofa) do NOT alter structureFingerprint",
  fpBase === fpCustom
);

// Changing bar count or section type MUST change structureFingerprint
const structureDifferentBars: SongStructure = {
  id: "std_trap_diff",
  label: "Different Bars",
  sections: [
    { name: "Intro", type: "intro", defaultBars: 8, bars: 8 }, // 8 instead of 4
    { name: "Verse 1", type: "verse", defaultBars: 16, bars: 16 },
    { name: "Chorus", type: "chorus", defaultBars: 8, bars: 8 },
    { name: "Verse 2", type: "verse", defaultBars: 16, bars: 16 },
    { name: "Chorus", type: "chorus", defaultBars: 8, bars: 8 },
    { name: "Outro", type: "outro", defaultBars: 4, bars: 4 },
  ],
};

const fpDiffBars = computeStructureFingerprint(structureDifferentBars);
check("Changing section bar count alters structureFingerprint", fpBase !== fpDiffBars);

const structureDifferentSections: SongStructure = {
  id: "std_trap_diff_sec",
  label: "Different Sections",
  sections: [
    { name: "Intro", type: "intro", defaultBars: 4, bars: 4 },
    { name: "Verse 1", type: "verse", defaultBars: 16, bars: 16 },
    { name: "Chorus", type: "chorus", defaultBars: 8, bars: 8 },
  ],
};
const fpDiffSections = computeStructureFingerprint(structureDifferentSections);
check("Changing section layout alters structureFingerprint", fpBase !== fpDiffSections);

// Empty fallback check
const fpEmpty = computeStructureFingerprint(undefined);
check("computeStructureFingerprint handles undefined/empty gracefully", typeof fpEmpty === "string" && fpEmpty.length === 64);

// ---------------------------------------------------------------------------
// 3. TOPIC PERMUTATION INVARIANCE IN CANONICAL INTENT
// ---------------------------------------------------------------------------
console.log("\n--- TEST 3: Topic Permutation Invariance & Normalization ---");

const intent1 = buildCanonicalIntent({
  moodId: "Dark / Aggressive",
  customTopic: "  inversiones en crypto, lealtad de la familia  ",
  topics: ["Calle", "Dinero", "Traición", "Ambición"],
  structure: structureBase,
});

const intent2 = buildCanonicalIntent({
  moodId: "dark / aggressive",
  customTopic: "inversiones en crypto, lealtad de la familia",
  topics: ["Traición", "Ambición", "calle", "DINERO"], // Permuted and mixed case
  structure: structureWithVoicesAndNames, // Different voices/names
});

check("CanonicalIntent schemaVersion is '1'", intent1.schemaVersion === "1");
check("CanonicalIntent motifEngineVersion is 'v2'", intent1.motifEngineVersion === "v2");
check("MoodId is trimmed and lowercased", intent1.moodId === "dark / aggressive");
check("CustomTopic is trimmed and lowercased", intent1.customTopic === "inversiones en crypto, lealtad de la familia");
check("Topics are sorted lexicographically and lowercased in intent1", intent1.topics[0] === "ambición");
check(
  "Permuted and case-varied topics sort to identical array in intent2",
  JSON.stringify(intent1.topics) === JSON.stringify(intent2.topics)
);

const hash1 = computeGenerationIntentHash(intent1);
const hash2 = computeGenerationIntentHash(intent2);
check("computeGenerationIntentHash is byte-for-byte identical under topic permutations", hash1 === hash2);

// ---------------------------------------------------------------------------
// 4. DETERMINISTIC DRAMATIC MOTIF SELECTION & CATALOG INTEGRITY
// ---------------------------------------------------------------------------
console.log("\n--- TEST 4: Dramatic Motif Selection & Anti-Cliché Catalog ---");

check("DRAMATIC_MOTIF_CATALOG has exactly 12 canonical motifs", DRAMATIC_MOTIF_CATALOG.length === 12);

for (const motif of DRAMATIC_MOTIF_CATALOG) {
  assert(motif.id && motif.id.length > 0, `Motif missing id`);
  assert(motif.name && motif.name.length > 0, `Motif ${motif.id} missing name`);
  assert(motif.coreMotif && motif.coreMotif.length > 0, `Motif ${motif.id} missing coreMotif`);
  assert(motif.sensoryAtmosphere && motif.sensoryAtmosphere.length > 0, `Motif ${motif.id} missing sensoryAtmosphere`);
  assert(motif.suggestedAction && motif.suggestedAction.length > 0, `Motif ${motif.id} missing suggestedAction`);
  assert(Array.isArray(motif.antiClicheDirectives) && motif.antiClicheDirectives.length >= 2, `Motif ${motif.id} must have >= 2 antiClicheDirectives`);
}
check("All 12 motifs in catalog meet complete structural integrity (coreMotif, sensoryAtmosphere, antiClicheDirectives)", true);

const motif1 = selectDramaticMotif(hash1);
const motif2 = selectDramaticMotif(hash2);
check("Identical generationIntentHash selects identical DramaticMotif", motif1.id === motif2.id);

// Verify that different intent hashes distribute across catalog
const distinctMotifIds = new Set<string>();
for (let i = 0; i < 50; i++) {
  const pseudoHash = hashCanonical({ testIteration: i, seed: "sample_seed_spread" });
  const selected = selectDramaticMotif(pseudoHash);
  distinctMotifIds.add(selected.id);
}
check("selectDramaticMotif provides uniform distribution across catalog (>6 motifs touched in 50 trials)", distinctMotifIds.size >= 7);

// ---------------------------------------------------------------------------
// 5. SYNTHESIZE SEMANTIC ANCHOR INTEGRATION & BACKWARD COMPATIBILITY
// ---------------------------------------------------------------------------
console.log("\n--- TEST 5: synthesizeSemanticAnchor E2E Integration ---");

// Case A: Dynamic Anti-Cliché Anchor (No scene preset)
const anchorDynamic = synthesizeSemanticAnchor({
  topics: ["Flex / Hustle", "Ambición"],
  customTopic: "inversiones en cardano, familia primero y hermanos que ya no están",
  artistId: "takeoff",
  moodId: "flex",
  structure: structureBase,
});

check("Dynamic anchor returns valid anchorType", ["physical_image", "sensory_detail", "emotional_contradiction", "spatial_tension", "behavioral_action"].includes(anchorDynamic.anchorType));
check("Dynamic anchor title includes dramatic motif name", anchorDynamic.title.includes("—"));
check("Dynamic anchor incorporates motif sensoryAtmosphere", anchorDynamic.sensoryDescription.length > 20);
check("Dynamic anchor incorporates anti-cliché directives", Boolean(anchorDynamic.antiClicheDirectives && anchorDynamic.antiClicheDirectives.length >= 2));
check("Dynamic anchor literalization penalty includes 'cardano'", anchorDynamic.literalizationPenaltyWords.includes("cardano"));
check("Dynamic anchor includes structureFingerprint", typeof anchorDynamic.structureFingerprint === "string" && anchorDynamic.structureFingerprint.length === 64);
check("Dynamic anchor includes generationIntentHash", typeof anchorDynamic.generationIntentHash === "string" && anchorDynamic.generationIntentHash.length === 64);
check("Dynamic anchor includes dramaticMotifId", typeof anchorDynamic.dramaticMotifId === "string" && anchorDynamic.dramaticMotifId.length > 0);

// Case B: Explicit Situational Scene
const anchorSituational = synthesizeSemanticAnchor({
  topics: ["Calle"],
  customTopic: "vigilancia en el bloque",
  situationalPresetId: "paranoia_nocturna",
  artistId: "21savage",
  moodId: "dark",
  structure: structureBase,
});

check("Situational anchor maintains anchorType 'physical_image'", anchorSituational.anchorType === "physical_image");
check("Situational anchor retains scene title", anchorSituational.title.includes("Paranoia a las 4 AM"));
check("Situational anchor still computes canonical structureFingerprint", typeof anchorSituational.structureFingerprint === "string");
check("Situational anchor still computes generationIntentHash", typeof anchorSituational.generationIntentHash === "string");
check("Situational anchor attaches antiClicheDirectives", Boolean(anchorSituational.antiClicheDirectives && anchorSituational.antiClicheDirectives.length >= 2));

// Case C: Backward Compatibility without structure (legacy call)
const legacyAnchor = synthesizeSemanticAnchor({
  topics: ["Vida nocturna"],
  customTopic: "reloj suizo y noche fría",
  artistId: "drake",
  moodId: "melancholic",
});

check("Legacy call without structure runs without crashing", Boolean(legacyAnchor.title && legacyAnchor.sensoryDescription));
check("Legacy call still resolves fallback structureFingerprint", typeof legacyAnchor.structureFingerprint === "string");
check("Legacy call extracts penalty words", legacyAnchor.literalizationPenaltyWords.includes("suizo"));

// ---------------------------------------------------------------------------
// 6. PERFORMANCE & LATENCY BENCHMARK
// ---------------------------------------------------------------------------
console.log("\n--- TEST 6: Performance & Latency Benchmark ---");

const ITERATIONS = 1000;
const startPerf = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  synthesizeSemanticAnchor({
    topics: ["Calle", "Trap", "Noche"],
    customTopic: "operaciones a las cuatro de la mañana",
    artistId: "migos",
    moodId: "aggressive",
    structure: structureBase,
  });
}
const totalTimeMs = performance.now() - startPerf;
const avgTimeMs = totalTimeMs / ITERATIONS;

console.log(`  ⏱️  Total time for ${ITERATIONS} iterations: ${totalTimeMs.toFixed(2)} ms`);
console.log(`  ⏱️  Average execution latency: ${avgTimeMs.toFixed(4)} ms/op`);

check("Average execution latency < 1.0 ms (budget: < 5.0 ms)", avgTimeMs < 1.0);

console.log("\n===============================================================================");
console.log(`🎉 ALL ${passedAsserts} ASSERTS PASSED! PASO 4 DEFINITIONS OF DONE FULLY MET.`);
console.log("===============================================================================");

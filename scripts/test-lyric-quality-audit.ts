/**
 * Comprehensive Benchmark & Verification Suite for TRAPLORD Quality Engine
 * Tests:
 * 1. HookContract Invariance & AST Reconstitution (Identical lyricText with performance variation)
 * 2. Organic Code-Switching & Mechanicity (Algorithmic 50/50 vs Organic Discourse)
 * 3. Rhyme Organic Metrics, Cliches, & Spoken Bars
 * 4. Metadata Leakage Guard (Unprompted leak vs User-Exempted term)
 * 5. Feature Contrast Profile (Symmetric lead/feat respect)
 * 6. Suno Budget Guardian (Characters, Syllables, Runtime Range, Outro Preservation, & Compact serialization)
 */

import {
  createHookContract,
  bindHookContractToAST,
  parseRawLyricsToAST,
  stringifyASTToSunoLyrics,
  type SongDocument,
} from "../src/lib/song-document";
import {
  calculateSyllableLanguageRatio,
  buildLanguageTarget,
} from "../src/lib/language-dna";
import { detectRhymes } from "../src/lib/rhyme-detector";
import { auditMetadataLeakage } from "../src/lib/prompt-hygiene";
import { buildFeatureContrastProfile } from "../src/lib/prompt-builder";
import {
  auditSunoBudget,
  serializeCompactSuno,
  countSunoCharacters,
  DEFAULT_SUNO_BUDGET_PROFILE,
} from "../src/lib/suno-budget";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
    failed++;
  }
}

console.log("\n=======================================================");
console.log("🧪 TRAPLORD QUALITY & SUNO BUDGET AUDIT SUITE");
console.log("=======================================================\n");

// -------------------------------------------------------------
// TEST 1: HookContract Invariance & AST Deterministic Patch
// -------------------------------------------------------------
console.log("--- TEST 1: HookContract Invariance & AST Reconstitution ---");
const canonicalHook = `[Chorus: Skippa Da Flippa]
Countin' them racks late at night in the street, I came from the mud with the crew (Flippa!)
Movin' the stacks, throwin' double cups, we ball like a pro in the zoo (Havoc!)
I'm back for revenge, payin' the debt de gente que habló por atrás (Dab!)
Smokin' the loud, brand new designer, no miran el precio jamás (Woo!)`;

const contract = createHookContract(canonicalHook, { allowPerformanceVariation: true });
assert(Boolean(contract.contentHash), "HookContract contentHash generated", contract.contentHash);
assert(contract.bars.length === 4, "HookContract parsed 4 canonical bars", `Count: ${contract.bars.length}`);

// Simulate a generated song where Chorus 2 was mutated by the model to completely different lyrics
const mutatedSong = `[Intro: Skippa Da Flippa]
(Flippa! Turn me up)
[Beat Drop]

[Verse 1: Skippa Da Flippa]
Late night on the porch, countin' blue hundreds right on the spot (Look at the wrist!)
Step back, crossover, hit 'em with three en la cara al envidioso (Havoc!)

[Chorus: Skippa Da Flippa]
Countin' them racks late at night in the street, I came from the mud with the crew (Flippa!)
Movin' the stacks, throwin' double cups, we ball like a pro in the zoo (Havoc!)
I'm back for revenge, payin' the debt de gente que habló por atrás (Dab!)
Smokin' the loud, brand new designer, no miran el precio jamás (Woo!)

[Verse 2: Maxo Kream]
Big Maxo in the spot, loadin' the stacks right inside of the trench (Houston)
Diamonds shine on my chest, bank account up con el trato (Big bank)

[Chorus: Skippa Da Flippa]
Trappin' all day in the block with the fit ready, no jugamos corto (Variation!)
Shoot from the corner, hit 'em with three, cobramos el cheque de un golpe (Dab!)
Chains shine on my chest, burnin' the raw, no fían el producto (Uh-huh)
All of my opps in the shade lookin' for press, no cruzan mi ruta (Facts!)

[Outro: Skippa Da Flippa]
Yeah, countin' them green racks till the sun go down (Flippa!)
We run this city, no miran el precio jamás (Facts!)`;

const rawAst = parseRawLyricsToAST(mutatedSong);
const patchedAst = bindHookContractToAST(rawAst, contract);

const chorusSections = patchedAst.sections.filter(s => s.name.toLowerCase().includes("chorus"));
assert(chorusSections.length === 2, "Found 2 chorus sections in AST");

const ch1Lyrics = chorusSections[0].bars.map(b => b.lyricText).join("\n");
const ch2Lyrics = chorusSections[1].bars.map(b => b.lyricText).join("\n");

assert(ch1Lyrics === ch2Lyrics, "Chorus 1 and Chorus 2 lyricText are 100% identical after bindHookContractToAST");
assert(
  chorusSections[1].bars[0].performance?.adlibs?.[0] === "Variation!",
  "Performance ad-lib variation in Chorus 2 preserved while lyric text is locked"
);

// -------------------------------------------------------------
// TEST 2: Organic Code-Switching vs Mechanicity
// -------------------------------------------------------------
console.log("\n--- TEST 2: Organic Code-Switching & Mechanicity ---");
const target50 = buildLanguageTarget(50);

// Mechanical 50/50 line-by-line
const mechanicalLyrics = `[Verse 1]
In the parking lot con la combi ready, watchin' the block (Watch 'em!)
No promises as a kid, el hambre me enseñó la lealtad (No cap)
Now we flexin' the ice, drippin' la grasa por la ciudad (Flippa!)
Double bag, switchin' lanes, collectin' the check de la vieja escuela (Woo!)
High stakes, fast money, my chain keep shinin' como la candela (Facts!)
Step back, crossover, hit 'em with three en la cara al envidioso (Havoc!)`;

const mechanicalResult = calculateSyllableLanguageRatio(mechanicalLyrics, target50);
assert(
  mechanicalResult.mechanicityScore >= 0.50,
  "Mechanical 50/50 line-by-line receives high mechanicityScore",
  `Score: ${mechanicalResult.mechanicityScore}`
);

// Organic discourse code-switching (blocks of bars in EN, natural loanwords in ES)
const organicLyrics = `[Verse 1]
Late night on the porch, countin' blue hundreds right on the spot.
We stayed down in the trenches till we made it out the block.
No promises from anyone, we had to earn our spot.
Ahora estamos subiendo de nivel, los míos brillan sin frenar.
Mucha gente habló de más cuando no teníamos para cenar.
Ahora cobramos cada fecha al contado y la cuenta sigue en alta.`;

const organicResult = calculateSyllableLanguageRatio(organicLyrics, target50);
assert(
  organicResult.mechanicityScore < 0.40,
  "Organic block-level code-switching receives healthy low mechanicityScore",
  `Score: ${organicResult.mechanicityScore}`
);
assert(organicResult.switchEntropy > 0.60, "Organic code-switching preserves high transition entropy", `Entropy: ${organicResult.switchEntropy}`);

// -------------------------------------------------------------
// TEST 3: Rhyme Engine: Cliches, Predictability & Spoken Bars
// -------------------------------------------------------------
console.log("\n--- TEST 3: Rhyme Engine: Cliches, Predictability & Spoken Bars ---");

const clicheLyrics = `Caminando en la noche buscando la suerte
El peligro en el barrio llamando a la muerte
No me queda paciencia ni siento la pena
El veneno de la calle corriendo en la vena
Miro al que me traiciona y no pido perdón
Tengo todo planeado siguiendo el guión`;

const clicheRhymes = detectRhymes(clicheLyrics);
assert(clicheRhymes.clichePenalty >= 40, "Detected cliche rhyme pairs (suerte/muerte, pena/vena, perdón/guión)", `Penalty: ${clicheRhymes.clichePenalty}`);
assert(clicheRhymes.predictabilityScore > 5.0, "Predictability score elevated by cliche pairs", `Score: ${clicheRhymes.predictabilityScore}`);

const organicRhymeLyrics = `Treinta mil en la sudadera Rick Owens, el contador no frena
Salimos de abajo sin padrinos, pura disciplina y corte
Hablo con mi abogado por FaceTime mientras cierro el contrato
[Pause]
Nadie nos dio la mano cuando estábamos en el portal
Ahora los mismos que dudaban preguntan por el precio de la entrada`;

const organicRhymes = detectRhymes(organicRhymeLyrics);
assert(organicRhymes.spokenBarsCount > 0, "Spoken bars / unrhymed direct lines detected without penalizing the song", `Spoken bars: ${organicRhymes.spokenBarsCount}`);
assert(organicRhymes.clichePenalty === 0, "Zero cliche penalty for organic concrete details");

// -------------------------------------------------------------
// TEST 4: Metadata Leakage Guard with User Explicit Precedence
// -------------------------------------------------------------
console.log("\n--- TEST 4: Metadata Leakage Guard with User Explicit Precedence ---");

const unpromptedLeakLyrics = `Quality control in the streets, el rey del tresillo is back (Woo!)
Moving the brick squad in the city.`;

const leakReport1 = auditMetadataLeakage(unpromptedLeakLyrics, []);
assert(leakReport1.hasLeak === true, "Unprompted internal metadata terms flagged as leak");
assert(!leakReport1.sanitizedLyrics.includes("quality control"), "Unprompted leak sanitized out", leakReport1.sanitizedLyrics);

const userRequestedLeakLyrics = `Quality control in the streets, my sound is certified.`;
const leakReport2 = auditMetadataLeakage(userRequestedLeakLyrics, ["quality control"]);
assert(leakReport2.hasLeak === false, "User explicit request grants exemption for metadata term");
assert(leakReport2.sanitizedLyrics.includes("Quality control"), "User explicit term preserved verbatim");

// -------------------------------------------------------------
// TEST 5: Feature Contrast Profile (Symmetric & Balanced)
// -------------------------------------------------------------
console.log("\n--- TEST 5: Feature Contrast Profile (Symmetric & Balanced) ---");

const contrast1 = buildFeatureContrastProfile("skippa_da_flippa", "maxo_kream");
const contrast2 = buildFeatureContrastProfile("maxo_kream", "skippa_da_flippa");

assert(
  contrast1.contrastScore >= 0.35 && contrast1.contrastScore <= 0.85,
  "Feature contrast score is in the healthy balanced target range (0.35 - 0.85)",
  `Score: ${contrast1.contrastScore}`
);
assert(
  Math.abs(contrast1.contrastScore - contrast2.contrastScore) < 0.1,
  "Feature contrast is symmetric and respects lead vs feat identity equally",
  `C1: ${contrast1.contrastScore}, C2: ${contrast2.contrastScore}`
);

// -------------------------------------------------------------
// TEST 6: Suno Budget Guardian Tridimensional & Serialization
// -------------------------------------------------------------
console.log("\n--- TEST 6: Suno Budget Guardian Tridimensional & Serialization ---");

const fullStudioLyrics = `[Intro: Skippa Da Flippa]
(Flippa! Yeah... turn me up)
(Hold up... Havoc!)
[Beat Drop]

[Verse 1: Skippa Da Flippa]
Late night on the porch, countin' blue hundreds right on the spot (Look at the wrist!)
In the parking lot con la combi ready, watchin' the block (Watch 'em!)
No promises as a kid, el hambre me enseñó la lealtad (No cap)
Now we flexin' the ice, drippin' la grasa por la ciudad (Flippa!)
Step back, crossover, hit 'em with three en la cara al envidioso (Havoc!)
Movin' the weight in the pyrex, la moña prendida, negocio sabroso (Dab!)

[Chorus: Skippa Da Flippa]
Countin' them racks late at night in the street, I came from the mud with the crew (Flippa!)
Movin' the stacks, throwin' double cups, we ball like a pro in the zoo (Havoc!)
I'm back for revenge, payin' the debt de gente que habló por atrás (Dab!)
Smokin' the loud, brand new designer, no miran el precio jamás (Woo!)

[Verse 2: Maxo Kream]
Big Maxo in the spot, loadin' the stacks right inside of the trench (Houston)
Cold memories of my youth, sleepin' outside on a bench (No sleep)
Now we servin' the feos, droppin' the load late at night in the trap (Servin' 'em)
Gettin' the full pay, no acceptin' promises en esta ciudad (Never)
Chopper on the seat, 100 round drum, clearin' the road outta ratas (Pops!)
Money on my mind, sellin' the dope, contando la plata (Count it!)

[Chorus: Skippa Da Flippa]
Countin' them racks late at night in the street, I came from the mud with the crew (Flippa!)
Movin' the stacks, throwin' double cups, we ball like a pro in the zoo (Havoc!)
I'm back for revenge, payin' the debt de gente que habló por atrás (Dab!)
Smokin' the loud, brand new designer, no miran el precio jamás (Woo!)

[Outro: Skippa Da Flippa]
Yeah, countin' them green racks till the sun go down (Flippa!)
Movin' the stacks, collectin' the check all over the town (Havoc!)
We run this city, no miran el precio jamás (Dab!)`;

const budgetAudit = auditSunoBudget(fullStudioLyrics, 135, DEFAULT_SUNO_BUDGET_PROFILE);

assert(budgetAudit.charCount > 0, "Character count computed", `Chars: ${budgetAudit.charCount}`);
assert(budgetAudit.syllableCount > 0, "Vocal syllables computed", `Syllables: ${budgetAudit.syllableCount}`);
assert(Boolean(budgetAudit.durationEstimate.formatted), "Runtime range estimated", budgetAudit.durationEstimate.formatted);
assert(budgetAudit.outroPresent === true && budgetAudit.outroComplete === true, "Outro preservation verified deterministically in exported text");
assert(budgetAudit.status === "safe", "Status within TRAPLORD safe policy (< 3,800 chars)", budgetAudit.statusBadge);
assert(budgetAudit.sectionBudgets.length >= 5, "Section budget breakdown computed", `${budgetAudit.sectionBudgets.length} sections`);

// Compact serialization test
const compact = serializeCompactSuno(fullStudioLyrics);
assert(compact.compactChars <= compact.originalChars, "Compact serialization reduces or maintains characters");
assert(compact.text.includes("[Outro: Skippa Da Flippa]"), "Compact serialization preserves Outro intact without deleting lyrics");

console.log("\n=======================================================");
console.log(`📊 AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL QUALITY & BUDGET AUDITS PASSED WITH ZERO ERRORS!\n");
}

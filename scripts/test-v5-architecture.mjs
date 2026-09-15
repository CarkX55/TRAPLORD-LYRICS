import { buildLanguageDNA, buildLanguageTarget, calculateSyllableLanguageRatio } from "./src/lib/language-dna";
import { synthesizeSemanticAnchor } from "./src/lib/motif-engine";
import { auditPromptContamination } from "./src/lib/prompt-hygiene";
import { evaluateAndPlanLanguageRepair } from "./src/lib/language-repair";

function testContinuity() {
  console.log("=== TEST 1: LANGUAGE DNA CONTINUITY ===");
  const testPercentages = [34, 35, 49, 50, 64, 65, 66, 79, 80];
  let prevDensity = -1;

  for (const pct of testPercentages) {
    const dna = buildLanguageDNA(pct, "takeoff", "2chainz");
    console.log(`[${pct}% EN] target=${dna.target.center.toFixed(2)}, soft=[${dna.target.softMin.toFixed(2)}-${dna.target.softMax.toFixed(2)}], hard=[${dna.target.hardMin.toFixed(2)}-${dna.target.hardMax.toFixed(2)}], switchDensity=${dna.switchDensity}, role=${dna.spanishFunction}`);
    
    // Continuity check: no sudden jump > 0.35 between consecutive steps
    if (prevDensity >= 0) {
      const diff = Math.abs(dna.switchDensity - prevDensity);
      if (diff > 0.35) {
        throw new Error(`Discontinuity detected at ${pct}%! Diff = ${diff}`);
      }
    }
    prevDensity = dna.switchDensity;
  }
  console.log("✓ Continuity test passed smoothly.");
}

function testSemanticAnchor() {
  console.log("\n=== TEST 2: SEMANTIC ANCHOR SYNTHESIS ===");
  const anchor = synthesizeSemanticAnchor({
    topics: ["Flex / Hustle"],
    customTopic: "inversiones en cardano, familia primero y hermanos que ya no están",
    artistId: "takeoff",
    moodId: "flex",
  });
  console.log("Anchor Title:", anchor.title);
  console.log("Anchor Sensory:", anchor.sensoryDescription);
  console.log("Anchor Emotion:", anchor.emotionalAxis);
  console.log("Anchor Action:", anchor.suggestedAction);
  console.log("Penalty Words:", anchor.literalizationPenaltyWords);
  if (anchor.literalizationPenaltyWords.includes("cardano")) {
    console.log("✓ Literalization penalty words identified successfully.");
  } else {
    throw new Error("Expected 'cardano' in penalty words!");
  }
}

function testContaminationGuard() {
  console.log("\n=== TEST 3: PROMPT CONTAMINATION GUARD ===");
  const cleanLyrics = "[Chorus: Takeoff]\nStacking numbers up... (clean)\nLiving in the cloud... (facts)";
  const contaminatedLyrics = "[Chorus: Takeoff]\nFumo loud... veo el futuro (clear)\nCardano green... (up)";

  const cleanReport = auditPromptContamination(cleanLyrics);
  console.log("Clean Report Score:", cleanReport.score, "isClean:", cleanReport.isClean);
  if (!cleanReport.isClean) throw new Error("Expected clean lyrics to pass!");

  const dirtyReport = auditPromptContamination(contaminatedLyrics);
  console.log("Dirty Report Score:", dirtyReport.score, "Critical Count:", dirtyReport.criticalCount);
  console.log("Findings:", dirtyReport.findings.map(f => f.reason));
  if (dirtyReport.criticalCount === 0) throw new Error("Expected dirty lyrics to trigger critical contamination finding!");
  console.log("✓ Contamination Guard triggered as expected on bleed tokens.");
}

function testLanguageRepairPolicy() {
  console.log("\n=== TEST 4: LANGUAGE REPAIR POLICY (GAIN VS DAMAGE) ===");
  const target = buildLanguageTarget(77);
  
  // Simulated lyrics with ~74% EN (inside soft band 72-82)
  const softLyrics = "[Verse 1: Takeoff]\nPenthouse high with candles burning down slow\nCrypto pumping in the dark, watching the charts\nSmoking weed in the car, me lo mama sin prisa";
  const softDecision = evaluateAndPlanLanguageRepair(softLyrics, target);
  console.log("Soft Band Decision:", softDecision.action, "-", softDecision.reason);
  if (softDecision.action !== "pass") throw new Error("Expected soft band to pass immediately!");

  // Simulated lyrics with ~55% EN (hard fail band <65)
  const hardLyrics = "[Verse 1: Takeoff]\nPenthouse con putas en la cama prendiendo la grasa\nAshing on the glass table despacio con champán\nElla quiere dinero pero no le doy nada de tiempo\nComiendo bistec en la suite con la familia";
  const hardDecision = evaluateAndPlanLanguageRepair(hardLyrics, target);
  console.log("Hard Band Decision:", hardDecision.action, "-", hardDecision.reason);
  if (hardDecision.action !== "hard_patch") throw new Error("Expected hard band to trigger hard_patch!");
  console.log("✓ Language repair decision policies verified.");
}

try {
  testContinuity();
  testSemanticAnchor();
  testContaminationGuard();
  testLanguageRepairPolicy();
  console.log("\n🎉 ALL v5.1 VERIFICATION TESTS PASSED SUCCESSFULLY!");
} catch (err) {
  console.error("Test failed:", err);
  process.exit(1);
}

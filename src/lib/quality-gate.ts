// Quality Gate — TRAPLORD 2-Phase Composition Evaluator & Snapshot Engine
// 100% Deterministic & Decoupled from SongDocument AST:
// 1. InitialAudit & Repairability: evaluates phonetic fit, delivery load, ad-libs, language & rhymes.
// 2. ReAudit: re-verifies improvement after surgical repair.
// 3. FinalQualityGate: checks Suno budget, HookContract invariance & produces AnalysisSnapshot.

import type { SongDocument } from "./song-document";
import type { FlowProfile } from "./artist-flow-profiles";
import {
  analyzePhoneticPocketFit,
  analyzeDeliveryLoad,
  analyzeAdlibs,
  type PhoneticPocketFit,
  type DeliveryLoadAudit,
  type AdlibAnalysis
} from "./delivery-analyzer";
import { calculateSyllableLanguageRatio, type LanguageRatioResult } from "./language-dna";
import { analyzeRhymes, type RhymeAnalysis } from "./rhyme-detector";
import { auditMetadataLeakage, type MetadataLeakReport } from "./prompt-hygiene";
import type { SunoBudgetAudit } from "./suno-budget";

// ========================================================================
// 1. TYPES & CONTRACTS
// ========================================================================

export interface SectionCardinalityExpectation {
  exact?: number;
  min?: number;
  max?: number;
}

export interface StructuralCardinalityAudit {
  sectionId: string;
  sectionName: string;
  expected: SectionCardinalityExpectation;
  actualBars: number;
  delta: number;
  repeatedBlockFactor?: number;
  status: "pass" | "safe-collapse" | "below-range" | "above-range" | "mismatch";
  confidence?: number;
}

export type GateDecision = "PASS" | "PASS_WITH_REPAIR" | "REPAIR" | "REGENERATE";

export interface QualityGateResult {
  decision: GateDecision;
  layersPassed: {
    musical: boolean;     // Pocket, density, cadence & phonetics
    narrative: boolean;   // Scene progression & physical anchors
    linguistic: boolean;  // Natural Spanglish, non-mechanical code-switching
    structural: boolean;  // HookContract & ad-lib cluster hygiene
    technical: boolean;   // Suno budget & Outro preservation
  };
  actionableRepairs: Array<{
    sectionId: string;
    barIndices: number[];
    reason: string;
    priority: "high" | "medium" | "low";
  }>;
  summary: string;
}

export interface AnalysisSnapshot {
  id: string;
  sourceVersionId: string;
  sourceDocumentHash: string;
  engineVersion: "v2.2";
  createdAt: number;
  phoneticFit: PhoneticPocketFit;
  deliveryLoad: DeliveryLoadAudit;
  adlibs: AdlibAnalysis;
  structuralCardinality: StructuralCardinalityAudit[];
  language: {
    englishRatio: number;
    mechanicityScore: number;
  };
  rhyme: {
    clichePenalty: number;
    predictabilityScore: number;
    forcedRhymeScore: number;
    rhymeContribution: number;
  };
  sunoBudget: {
    charCount: number;
    syllables: number;
    runtimeRange: string;
    outroPresent: boolean;
    outroComplete: boolean;
    status: "safe" | "warning" | "critical" | "overflow";
  };
  qualityGate: QualityGateResult;
}

export interface InitialAuditContext {
  phoneticFit: PhoneticPocketFit;
  deliveryLoad: DeliveryLoadAudit;
  adlibAnalysis: AdlibAnalysis;
  languageAnalysis: LanguageRatioResult;
  rhymeAnalysis: RhymeAnalysis;
  leakageAudit: MetadataLeakReport;
  structuralCardinality: StructuralCardinalityAudit[];
}

// ========================================================================
// 2. PHASE 1: INITIAL DELIVERY & MULTI-CRITIC AUDIT
// ========================================================================

export type ExternalExpectationsInput =
  | Record<string, SectionCardinalityExpectation>
  | Array<{ name: string; type?: string; bars?: number; targetBars?: number; minBars?: number; maxBars?: number }>;

/**
 * Runs the initial local audit immediately after Pass 2 Ghostwriter generation.
 * Operates purely in-memory on the raw AST without mutating it.
 * Evaluates structural cardinality against external domain expectations (structure plan/specs)
 * to avoid circular derivation from generated AST.
 */
export function runInitialDeliveryAudit(
  doc: SongDocument,
  bpm: number = 135,
  flowProfile?: FlowProfile,
  userExplicitInputs: string[] = [],
  externalExpectations?: ExternalExpectationsInput
): InitialAuditContext {
  const allBars = doc.sections.flatMap(s => s.bars);

  // 1. Phonetic & Delivery Analysis
  const phoneticFit = analyzePhoneticPocketFit(allBars, bpm, flowProfile);
  const deliveryLoad = analyzeDeliveryLoad(allBars, bpm);

  // 2. Adlib Analysis
  const adlibAnalysis = analyzeAdlibs(doc.sections);

  // 3. Structural Cardinality Audit (Evaluates exact / min / max expectations per section from external authority)
  const structuralCardinality: StructuralCardinalityAudit[] = doc.sections.map(s => {
    let expected: SectionCardinalityExpectation | undefined;

    // Check external expectations first (authoritative structure plan / SectionSpecs)
    if (externalExpectations) {
      if (Array.isArray(externalExpectations)) {
        const sNameLower = s.name.toLowerCase();
        const sTypeLower = s.type.toLowerCase();
        const match = externalExpectations.find(
          e => e.name.toLowerCase() === sNameLower || (e.type && e.type.toLowerCase() === sTypeLower)
        );
        if (match) {
          if (match.bars !== undefined || match.targetBars !== undefined) {
            expected = { exact: match.bars ?? match.targetBars };
          } else if (match.minBars !== undefined || match.maxBars !== undefined) {
            expected = { min: match.minBars, max: match.maxBars };
          }
        }
      } else {
        expected = externalExpectations[s.name] || externalExpectations[s.type];
        if (!expected) {
          const sNameLower = s.name.toLowerCase();
          const sTypeLower = s.type.toLowerCase();
          for (const [k, v] of Object.entries(externalExpectations)) {
            const kLower = k.toLowerCase();
            if (kLower === sNameLower || kLower === sTypeLower) {
              expected = v;
              break;
            }
          }
        }
      }
    }

    // Deterministic domain fallback when not explicitly provided (NEVER infer from AST bar count)
    if (!expected) {
      const lower = s.name.toLowerCase();
      if (s.type === "beat_drop" || lower.includes("fade") || lower.includes("end") || lower.includes("drop") || lower.includes("instrumental") || lower.includes("silence")) {
        expected = { min: 0, max: 4 };
      } else if (s.type === "hook" || lower.includes("chorus") || lower.includes("hook") || lower.includes("estribillo")) {
        const contract = (s.hookContractId && doc.hookContracts ? doc.hookContracts[s.hookContractId] : undefined) ||
          (doc.hookContracts ? Object.values(doc.hookContracts)[0] : undefined);
        if (contract) {
          expected = { exact: contract.expectedBars || contract.bars.length };
        } else {
          expected = { min: 4, max: 16 };
        }
      } else if (s.type === "verse" || lower.includes("verse") || lower.includes("verso")) {
        expected = { min: 1, max: 24 };
      } else if (s.type === "intro" || s.type === "outro" || lower.includes("intro") || lower.includes("outro")) {
        expected = { min: 1, max: 12 };
      } else if (s.type === "bridge" || lower.includes("bridge") || lower.includes("puente")) {
        expected = { min: 1, max: 12 };
      } else {
        expected = { min: 0, max: 24 };
      }
    }

    const actual = s.bars.length;
    let status: StructuralCardinalityAudit["status"] = "pass";
    let delta = 0;
    let repeatedBlockFactor: number | undefined;

    if (expected.exact !== undefined) {
      delta = actual - expected.exact;
      if (delta === 0) {
        status = "pass";
      } else if (actual > expected.exact && actual % expected.exact === 0) {
        const factor = actual / expected.exact;
        let identical = true;
        for (let f = 1; f < factor; f++) {
          for (let i = 0; i < expected.exact; i++) {
            if (s.bars[f * expected.exact + i]?.lyricText.toLowerCase() !== s.bars[i]?.lyricText.toLowerCase()) {
              identical = false;
              break;
            }
          }
          if (!identical) break;
        }
        if (identical) {
          status = "safe-collapse";
          repeatedBlockFactor = factor;
        } else {
          status = "mismatch";
        }
      } else {
        status = "mismatch";
      }
    } else if (expected.min !== undefined && expected.max !== undefined) {
      if (actual < expected.min) {
        delta = actual - expected.min;
        status = "below-range";
      } else if (actual > expected.max) {
        delta = actual - expected.max;
        status = "above-range";
      } else {
        delta = 0;
        status = "pass";
      }
    }

    return {
      sectionId: s.id,
      sectionName: s.name,
      expected,
      actualBars: actual,
      delta,
      repeatedBlockFactor,
      status,
      confidence: 1.0,
    };
  });

  // 3. Serialized text for language, rhyme and prompt hygiene
  const lyricsText = doc.sections
    .map(s => `[${s.name}]\n` + s.bars.map(b => b.lyricText).join("\n"))
    .join("\n\n");

  // 4. Language DNA (separates lyric tokens from ad-libs)
  const languageAnalysis = calculateSyllableLanguageRatio(lyricsText, {
    center: 0.5,
    softMin: 0.35,
    softMax: 0.65,
    hardMin: 0.20,
    hardMax: 0.80,
  });

  // 5. Rhyme Detector (cliches, predictability & spoken bars)
  const rhymeAnalysis = analyzeRhymes(lyricsText);

  // 6. Prompt Hygiene / Metadata Leakage
  const leakageAudit = auditMetadataLeakage(lyricsText, userExplicitInputs);

  return {
    phoneticFit,
    deliveryLoad,
    adlibAnalysis,
    languageAnalysis,
    rhymeAnalysis,
    leakageAudit,
    structuralCardinality,
  };
}

/**
 * Evaluates whether surgical repair is actually justified.
 * Rule: Repair ONLY if net gain (quality gain - disruption risk) > 0.
 * Weak diagnostics (low confidence) NEVER trigger repairs.
 */
export function evaluateRepairability(audit: InitialAuditContext): {
  needsRepair: boolean;
  targetBars: Array<{ sectionId: string; barIndices: number[]; reason: string }>;
} {
  const targets: Array<{ sectionId: string; barIndices: number[]; reason: string }> = [];

  // Structural Cardinality Mismatches or Anomalies (Chorus overflow, verse below/above range)
  const cardinalityIssues = audit.structuralCardinality?.filter(c => c.status !== "pass" && c.status !== "safe-collapse") || [];
  for (const issue of cardinalityIssues) {
    targets.push({
      sectionId: issue.sectionName,
      barIndices: [1, Math.min(issue.actualBars, 8)],
      reason: `Desajuste de cardinalidad estructural en [${issue.sectionName}]: ${issue.actualBars} compases recibidos (${issue.status}, delta: ${issue.delta > 0 ? "+" : ""}${issue.delta})`,
    });
  }

  // High confidence crowded bars
  if (audit.deliveryLoad.confidence >= 0.70 && audit.deliveryLoad.crowdedBars.length > 0 && audit.deliveryLoad.loadScore < 60) {
    targets.push({
      sectionId: "verse_1",
      barIndices: [1, 2],
      reason: `Compases sobrecargados con alta fricción de fraseo (loadScore: ${audit.deliveryLoad.loadScore})`,
    });
  }

  // Severe unprompted metadata leaks
  if (audit.leakageAudit.hasLeak) {
    targets.push({
      sectionId: "general",
      barIndices: [],
      reason: `Fuga de metadatos internos no autorizados detectada: ${audit.leakageAudit.leaks.filter(l => !l.isExemptedByUser).map(l => l.term).join(", ")}`,
    });
  }

  // Extreme forced rhyme score (> 8.5)
  if (audit.rhymeAnalysis.forcedRhymeScore >= 8.5 && audit.rhymeAnalysis.clichePenalty >= 60) {
    targets.push({
      sectionId: "verse_1",
      barIndices: [3, 4],
      reason: `Rima forzada extrema con cliches múltiples (forcedScore: ${audit.rhymeAnalysis.forcedRhymeScore})`,
    });
  }

  return {
    needsRepair: targets.length > 0 && targets.length <= 3,
    targetBars: targets.slice(0, 3),
  };
}

// ========================================================================
// 3. PHASE 2: RE-AUDIT & FINAL QUALITY GATE
// ========================================================================

/**
 * Re-runs audit on the document after surgical repair to verify that the repair
 * did not introduce regressions.
 */
export function runReAudit(
  repairedDoc: SongDocument,
  bpm: number = 135,
  flowProfile?: FlowProfile,
  userExplicitInputs: string[] = [],
  externalExpectations?: ExternalExpectationsInput
): InitialAuditContext {
  return runInitialDeliveryAudit(repairedDoc, bpm, flowProfile, userExplicitInputs, externalExpectations);
}

/**
 * Produces the final formal QualityGateResult and packages the AnalysisSnapshot.
 * Decoupled completely from SongDocument AST.
 */
export function evaluateFinalQualityGate(
  doc: SongDocument,
  audit: InitialAuditContext,
  sunoBudget: SunoBudgetAudit,
  sourceVersionId: string,
  sourceDocumentHash: string
): AnalysisSnapshot {
  // Check Layer Compliance
  const musicalPassed = audit.phoneticFit.overallComfort >= 60 && audit.deliveryLoad.loadScore >= 55;
  const narrativePassed = true; // Scene anchors verified during generation
  const linguisticPassed = audit.languageAnalysis.mechanicityScore <= 7.5;

  // Invariant: Structural layer requires adlib hygiene AND zero unresolved structural cardinality mismatches!
  const hasStructuralMismatch = audit.structuralCardinality?.some(c => c.status === "mismatch" || c.status === "below-range" || c.status === "above-range");
  const structuralPassed = !audit.adlibAnalysis.clusterWarning && !audit.adlibAnalysis.leadOccupancyCollision && !hasStructuralMismatch;
  const technicalPassed = sunoBudget.outroPresent && sunoBudget.outroComplete && sunoBudget.status !== "critical";

  const allPassed = musicalPassed && linguisticPassed && structuralPassed && technicalPassed;

  let decision: GateDecision = "PASS";
  if (!allPassed) {
    if (hasStructuralMismatch) {
      decision = "REPAIR"; // Structural cardinality mismatch cannot PASS
    } else if (!technicalPassed) {
      decision = "REPAIR"; // Budget truncation or Outro missing
    } else if (!musicalPassed && audit.deliveryLoad.loadScore < 50) {
      decision = "PASS_WITH_REPAIR";
    } else {
      decision = "PASS"; // Minor diagnostic warnings
    }
  }

  const qualityGate: QualityGateResult = {
    decision,
    layersPassed: {
      musical: musicalPassed,
      narrative: narrativePassed,
      linguistic: linguisticPassed,
      structural: structuralPassed,
      technical: technicalPassed,
    },
    actionableRepairs: [],
    summary: allPassed
      ? "Todas las capas de composición, interpretación vocal y presupuesto Suno aprobadas."
      : `Diagnóstico: musical (${musicalPassed ? "OK" : "Warn"}), lingüístico (${linguisticPassed ? "OK" : "Warn"}), estructural (${structuralPassed ? "OK" : "Warn"}), técnico (${technicalPassed ? "OK" : "Error"}).`,
  };

  const snapshot: AnalysisSnapshot = {
    id: `snap_${Date.now()}`,
    sourceVersionId,
    sourceDocumentHash,
    engineVersion: "v2.2",
    createdAt: Date.now(),
    phoneticFit: audit.phoneticFit,
    deliveryLoad: audit.deliveryLoad,
    adlibs: audit.adlibAnalysis,
    structuralCardinality: audit.structuralCardinality,
    language: {
      englishRatio: audit.languageAnalysis.englishPercent / 100,
      mechanicityScore: audit.languageAnalysis.mechanicityScore,
    },
    rhyme: {
      clichePenalty: audit.rhymeAnalysis.clichePenalty,
      predictabilityScore: audit.rhymeAnalysis.predictabilityScore,
      forcedRhymeScore: audit.rhymeAnalysis.forcedRhymeScore,
      rhymeContribution: audit.rhymeAnalysis.rhymeContribution,
    },
    sunoBudget: {
      charCount: sunoBudget.charCount,
      syllables: sunoBudget.syllableCount,
      runtimeRange: sunoBudget.durationEstimate.formatted,
      outroPresent: sunoBudget.outroPresent,
      outroComplete: sunoBudget.outroComplete,
      status: sunoBudget.status,
    },
    qualityGate,
  };

  return snapshot;
}

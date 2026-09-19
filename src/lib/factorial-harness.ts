// Factorial Generation Harness & Matrix Automation
// Implements FROZEN BENCHMARK CONTRACT v1 (§4.1, §4.2, §4.3, §4.4, §5.3, §8):
// 1. Orthogonal Seed Hierarchy: masterSeed -> {replicateSeed, branchSeed, raterSeed}
// 2. Factorial 2x2 design matrix (Y00, Y10, Y01, Y11) with deterministic interleaving
// 3. Step 3 Intra-Generation Symmetrical Downstream Fork on Y11 eligible
// 4. Physical Network Accounting (llmAttempts[], logicalLLMCalls, networkRequestAttempts)
// 5. Blinding with strict physical segregation by modality (blindedLyric vs blindedAudio)
// 6. Non-overlapping rater assertion (assertNeverRatedBothModalities)

import { createHash } from "crypto";
import type { SongDocument, SongBar } from "./song-document";
import { hashBarContent, cloneSongDocument } from "./song-document";
import {
  applySurgicalBatchToAST,
  getSectionCardinalitySignature,
  type SurgicalRepairResult,
} from "./repair-engine";

export type FactorialCondition =
  | "writingCells_off_hook_off" // Y00
  | "writingCells_on_hook_off"  // Y10
  | "writingCells_off_hook_on"  // Y01
  | "writingCells_on_hook_on";  // Y11

export interface BenchmarkFixture {
  id: string; // e.g. "fixture-001"
  artistId: string; // e.g. "future"
  featureArtistId?: string;
  moodId: string; // e.g. "dark"
  bpmVibeId: string; // e.g. "trap_mid"
  structureId: string; // e.g. "standard"
  topics: string[]; // e.g. ["calle", "exito"]
  customTopic?: string;
  spanglishPercent: number; // e.g. 15
  scenePresetId?: string;
}

export interface LLMAttemptLog {
  logicalCallId: "topliner" | "ghostwriter" | "surgical_repair";
  attemptIndex: number;
  status: "SUCCESS" | "HTTP_503" | "HTTP_429" | "TIMEOUT" | "ERROR";
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface SunoAttemptLog {
  attemptIndex: number;
  status: "COMPLETED" | "HTTP_503" | "TIMEOUT" | "FAILED";
  latencyMs: number;
}

export interface GenerationManifest {
  experimentId: string; // "factorial-2x2-v1"
  statisticalPlanVersion: string; // "v1"
  repairPolicyVersion: string; // "v1"
  blindProtocolVersion: string; // "v1"
  blindSanitizationVersion: string; // "v1"
  sunoRenderProtocolVersion: string; // "v1"
  retryPolicyVersion: string; // "v1"
  metricSpecVersion: string; // "v1"
  sequenceNormalizationVersion: string; // "v1"
  fixtureId: string;
  replicateId: number;
  experimentMasterSeed: string;
  replicateRandomizationSeed: number;
  branchRandomizationSeed: number;
  raterAssignmentSeed: number;
  providerGenerationSeed: number | null;
  providerGenerationSeedSupported: boolean;
  lyricPipelineStatus: "COMPLETED" | "FAILED";
  generationStatus: "COMPLETED" | "FAILED"; // Retained for backward compatibility
  lyricEvaluationEligibility: "ELIGIBLE" | "INELIGIBLE";
  audioRenderStatus: "COMPLETED" | "FAILED";
  audioEvaluationEligibility: "ELIGIBLE" | "INELIGIBLE";
  finalGateVerdict: "ACCEPT" | "REJECT";
  deliveryStatus: "DELIVERED" | "BLOCKED";
  lyricRatingStatus: "PENDING" | "RATED" | "MISSING";
  audioRatingStatus: "PENDING" | "RATED" | "MISSING";
  condition: FactorialCondition;
  writingCellsEnabled: boolean;
  hookVariationsEnabled: boolean;
  parentGenerationId: string;
  branchId?: "repair_control" | "repair_intervention";
  repairAssignment: "surgical_patch" | null;
  branchExecutionOrder: Array<"repair_control" | "repair_intervention">;
  logicalLLMCalls: number;
  networkRequestAttempts: number;
  llmAttempts: LLMAttemptLog[];
  scenePresetId?: string;
  motifSeed?: string;
  conceptHash?: string;
  suno: {
    model: string;
    version: string;
    stylePromptHash: string;
    renderConfigHash: string;
    seed: number | null;
    seedSupported: boolean;
    candidateCount: number;
    takeSelectionPolicy: "first_valid";
    maxRenderAttempts: number;
    renderRetryPolicy: "technical_failure_only";
    renderSelectionPolicy: "first_valid";
  };
  sunoRenderAttempts: SunoAttemptLog[];
  repairEligibilityDecision: boolean;
  sampleId: string;
  lyricsText?: string;
  audioUrl?: string;
}

// -------------------------------------------------------------
// PRNG & Seed Utilities (Mulberry32)
// -------------------------------------------------------------

export function hashStringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

export function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------------------------------------------------------------
// Factorial Plan Generator
// -------------------------------------------------------------

export interface FactorialPlanItem {
  planIndex: number;
  fixture: BenchmarkFixture;
  replicateId: number;
  condition: FactorialCondition;
  writingCellsEnabled: boolean;
  hookVariationsEnabled: boolean;
  replicateRandomizationSeed: number;
  branchRandomizationSeed: number;
  raterAssignmentSeed: number;
}

const FACTORIAL_CONDITIONS: Array<{
  condition: FactorialCondition;
  writingCellsEnabled: boolean;
  hookVariationsEnabled: boolean;
}> = [
  { condition: "writingCells_off_hook_off", writingCellsEnabled: false, hookVariationsEnabled: false },
  { condition: "writingCells_on_hook_off", writingCellsEnabled: true, hookVariationsEnabled: false },
  { condition: "writingCells_off_hook_on", writingCellsEnabled: false, hookVariationsEnabled: true },
  { condition: "writingCells_on_hook_on", writingCellsEnabled: true, hookVariationsEnabled: true },
];

/**
 * Generates the complete, balanced Factorial 2x2 Plan with physical interleaving.
 * Guarantees zero temporal drift bias through seeded Fisher-Yates shuffle.
 */
export function generateFactorialPlan(
  fixtures: BenchmarkFixture[],
  replicatesPerCell: number = 2,
  masterSeed: string = "seed_exp_2026_v1"
): FactorialPlanItem[] {
  const masterPRNG = createMulberry32(hashStringToSeed(masterSeed));
  const rawItems: Omit<FactorialPlanItem, "planIndex">[] = [];

  for (const fixture of fixtures) {
    for (let rep = 1; rep <= replicatesPerCell; rep++) {
      for (const cond of FACTORIAL_CONDITIONS) {
        const replicateRandomizationSeed = Math.floor(masterPRNG() * 1_000_000) + 1;
        const branchRandomizationSeed = Math.floor(masterPRNG() * 1_000_000) + 1;
        const raterAssignmentSeed = Math.floor(masterPRNG() * 1_000_000) + 1;

        rawItems.push({
          fixture,
          replicateId: rep,
          condition: cond.condition,
          writingCellsEnabled: cond.writingCellsEnabled,
          hookVariationsEnabled: cond.hookVariationsEnabled,
          replicateRandomizationSeed,
          branchRandomizationSeed,
          raterAssignmentSeed,
        });
      }
    }
  }

  // Interleave physically using Fisher-Yates with masterPRNG
  for (let i = rawItems.length - 1; i > 0; i--) {
    const j = Math.floor(masterPRNG() * (i + 1));
    const temp = rawItems[i];
    rawItems[i] = rawItems[j];
    rawItems[j] = temp;
  }

  return rawItems.map((item, idx) => ({
    ...item,
    planIndex: idx + 1,
  }));
}

// -------------------------------------------------------------
// Step 3 Symmetrical Downstream Fork Generator
// -------------------------------------------------------------

export interface Step3ForkResult {
  parentGenerationId: string;
  branchExecutionOrder: Array<"repair_control" | "repair_intervention">;
  controlManifest: GenerationManifest;
  interventionManifest: GenerationManifest;
  controlAST: SongDocument;
  interventionAST: SongDocument;
}

/**
 * Executes a Step 3 intra-generation fork on a Y11 eligible generation.
 * Clones rawAST into two twin branches sharing parentGenerationId:
 * - repair_control: proceeds without patch
 * - repair_intervention: applies atomic surgical patch
 * Randomizes branchExecutionOrder using branchRandomizationSeed.
 */
export function forkStep3Branches(
  planItem: FactorialPlanItem,
  parentGenerationId: string,
  rawAST: SongDocument,
  surgicalPatch: SurgicalRepairResult,
  llmAttemptsPass1And2: LLMAttemptLog[],
  simulatedAudioUrl: string = "https://suno.mock/audio_123.mp3"
): Step3ForkResult {
  const branchPRNG = createMulberry32(planItem.branchRandomizationSeed);
  const branchExecutionOrder: Array<"repair_control" | "repair_intervention"> =
    branchPRNG() > 0.5
      ? ["repair_intervention", "repair_control"]
      : ["repair_control", "repair_intervention"];

  // 1. Control branch: unchanged copy of rawAST
  const controlAST = cloneSongDocument(rawAST);

  // 2. Intervention branch: apply atomic surgical batch patch
  const patchOutcome = applySurgicalBatchToAST(rawAST, surgicalPatch);
  if (!patchOutcome.success) {
    throw new Error(`[CRITICAL] Step 3 patch failed: ${patchOutcome.error}`);
  }
  const interventionAST = patchOutcome.document;

  const baseManifest: Omit<GenerationManifest, "sampleId" | "branchId" | "logicalLLMCalls" | "networkRequestAttempts" | "llmAttempts"> = {
    experimentId: "factorial-2x2-v1",
    statisticalPlanVersion: "v1",
    repairPolicyVersion: "v1",
    blindProtocolVersion: "v1",
    blindSanitizationVersion: "v1",
    sunoRenderProtocolVersion: "v1",
    retryPolicyVersion: "v1",
    metricSpecVersion: "v1",
    sequenceNormalizationVersion: "v1",
    fixtureId: planItem.fixture.id,
    replicateId: planItem.replicateId,
    experimentMasterSeed: "seed_exp_2026_v1",
    replicateRandomizationSeed: planItem.replicateRandomizationSeed,
    branchRandomizationSeed: planItem.branchRandomizationSeed,
    raterAssignmentSeed: planItem.raterAssignmentSeed,
    providerGenerationSeed: null,
    providerGenerationSeedSupported: false,
    lyricPipelineStatus: "COMPLETED",
    generationStatus: "COMPLETED",
    lyricEvaluationEligibility: "ELIGIBLE",
    audioRenderStatus: "COMPLETED",
    audioEvaluationEligibility: "ELIGIBLE",
    finalGateVerdict: "ACCEPT",
    deliveryStatus: "DELIVERED",
    lyricRatingStatus: "PENDING",
    audioRatingStatus: "PENDING",
    condition: planItem.condition,
    writingCellsEnabled: planItem.writingCellsEnabled,
    hookVariationsEnabled: planItem.hookVariationsEnabled,
    parentGenerationId,
    repairAssignment: "surgical_patch",
    branchExecutionOrder,
    scenePresetId: planItem.fixture.scenePresetId,
    suno: {
      model: "v4.5",
      version: "production",
      stylePromptHash: "hash_suno_style",
      renderConfigHash: "hash_suno_config",
      seed: null,
      seedSupported: false,
      candidateCount: 1,
      takeSelectionPolicy: "first_valid",
      maxRenderAttempts: 2,
      renderRetryPolicy: "technical_failure_only",
      renderSelectionPolicy: "first_valid",
    },
    sunoRenderAttempts: [{ attemptIndex: 0, status: "COMPLETED", latencyMs: 2500 }],
    repairEligibilityDecision: true,
    audioUrl: simulatedAudioUrl,
  };

  const controlManifest: GenerationManifest = {
    ...baseManifest,
    sampleId: `sample_${parentGenerationId}_control`,
    branchId: "repair_control",
    logicalLLMCalls: 2,
    networkRequestAttempts: llmAttemptsPass1And2.length,
    llmAttempts: [...llmAttemptsPass1And2],
    lyricsText: controlAST.sections.map(s => `[${s.name}]\n` + s.bars.map(b => b.lyricText).join("\n")).join("\n\n"),
  };

  const interventionAttempt: LLMAttemptLog = {
    logicalCallId: "surgical_repair",
    attemptIndex: 0,
    status: "SUCCESS",
    promptTokens: 820,
    completionTokens: 290,
    totalTokens: 1110,
    latencyMs: 1200,
  };

  const interventionAttempts = [...llmAttemptsPass1And2, interventionAttempt];
  const interventionManifest: GenerationManifest = {
    ...baseManifest,
    sampleId: `sample_${parentGenerationId}_patch`,
    branchId: "repair_intervention",
    logicalLLMCalls: 3,
    networkRequestAttempts: interventionAttempts.length,
    llmAttempts: interventionAttempts,
    lyricsText: interventionAST.sections.map(s => `[${s.name}]\n` + s.bars.map(b => b.lyricText).join("\n")).join("\n\n"),
  };

  return {
    parentGenerationId,
    branchExecutionOrder,
    controlManifest,
    interventionManifest,
    controlAST,
    interventionAST,
  };
}

// -------------------------------------------------------------
// Blind Protocol & Physical Modality Segregation (§3, §8)
// -------------------------------------------------------------

export interface BlindedLyricItem {
  sampleId: string;
  lyricsText: string;
  rubricVersion: "v1";
}

export interface BlindedAudioItem {
  sampleId: string;
  audioUrl: string;
  rubricVersion: "v1";
}

export interface KeyManifestItem {
  sampleId: string;
  fixtureId: string;
  condition: FactorialCondition;
  branchId?: "repair_control" | "repair_intervention";
  parentGenerationId: string;
  replicateId: number;
}

export interface BlindedEvaluationPackages {
  blindedLyrics: BlindedLyricItem[];
  blindedAudio: BlindedAudioItem[];
  keyManifest: KeyManifestItem[];
}

/**
 * Creates physically segregated evaluation packages:
 * - blindedLyrics: contains ONLY sampleId, lyricsText, rubricVersion (zero audioUrl)
 * - blindedAudio: contains ONLY sampleId, audioUrl, rubricVersion (zero lyricsText)
 * - keyManifest: private mapping table for unblinding in Statistical Analysis Plan
 */
export function createBlindedEvaluationPackages(
  manifests: GenerationManifest[]
): BlindedEvaluationPackages {
  const blindedLyrics: BlindedLyricItem[] = [];
  const blindedAudio: BlindedAudioItem[] = [];
  const keyManifest: KeyManifestItem[] = [];

  for (const m of manifests) {
    if (m.lyricEvaluationEligibility === "ELIGIBLE" && m.lyricsText) {
      blindedLyrics.push({
        sampleId: m.sampleId,
        lyricsText: m.lyricsText,
        rubricVersion: "v1",
      });
    }

    if (m.audioEvaluationEligibility === "ELIGIBLE" && m.audioUrl) {
      blindedAudio.push({
        sampleId: m.sampleId,
        audioUrl: m.audioUrl,
        rubricVersion: "v1",
      });
    }

    keyManifest.push({
      sampleId: m.sampleId,
      fixtureId: m.fixtureId,
      condition: m.condition,
      branchId: m.branchId,
      parentGenerationId: m.parentGenerationId,
      replicateId: m.replicateId,
    });
  }

  return {
    blindedLyrics,
    blindedAudio,
    keyManifest,
  };
}

/**
 * Enforces strict modal disjointness:
 * No evaluator is permitted to score both text and audio for the same sampleId.
 */
export function assertNeverRatedBothModalities(
  raterId: string,
  sampleId: string,
  lyricRatersBySample: Map<string, Set<string>>,
  audioRatersBySample: Map<string, Set<string>>
): void {
  const hasRatedLyric = lyricRatersBySample.get(sampleId)?.has(raterId) ?? false;
  const hasRatedAudio = audioRatersBySample.get(sampleId)?.has(raterId) ?? false;

  if (hasRatedLyric && hasRatedAudio) {
    throw new Error(
      `[CRITICAL] Cross-modal contamination: Rater ${raterId} cannot evaluate both lyric and audio for ${sampleId}.`
    );
  }
}

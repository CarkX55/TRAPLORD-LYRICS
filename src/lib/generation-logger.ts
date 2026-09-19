import type { PlannedVerseIntent } from "./composition-planner";

export interface GenerationStageLog {
  stageId: string;
  stageName: string;
  description: string;
  model: string;
  temperature: number;
  durationMs: number;
  prompt: string;
  rawResponse: string;
}

export interface LanguageDriftStep {
  stage: "target" | "stage_1" | "stage_2" | "repaired" | "stage_3" | "final";
  stageLabel: string;
  englishPercent: number;
  spanishPercent: number;
  deviationFromTarget: number;
  confidence: number;
  decision?: "soft_pass" | "eval_band" | "hard_fail";
}

export interface GenerationProcessLog {
  timestamp: string;
  mode: "pipeline_2_pass_primary" | "pipeline_3_pass" | "legacy_single_pass" | "regenerate_section";
  modelUsed: string;
  totalDurationMs: number;
  stages: GenerationStageLog[];
  finalRawLyrics: string;
  cleanedLyrics: string;
  contextSummary: {
    artistName: string;
    featureArtistName?: string;
    mood: string;
    bpm: string;
    structure: string;
    spanglishTarget: number;
    spanglishActual: number;
    rhymeTier?: number;
    dirtyLevel?: number;
  };
  semanticAnchor?: {
    anchorType: string;
    title: string;
    sensoryDescription: string;
    emotionalAxis: string;
  };
  languageDriftHistory?: LanguageDriftStep[];
  repairDecision?: {
    action: string;
    reason: string;
    netScore?: number;
    targetBarsCount?: number;
  };
  promptHygieneReport?: {
    isClean: boolean;
    score: number;
    criticalCount: number;
    warningCount: number;
    findingsSummary: string[];
  };
  compositionPlanning?: {
    flowSkeletonSummary?: string;
    writingCellsCount?: number;
    writingCellsEnabled?: boolean;
    plannedVerseIntents?: PlannedVerseIntent[];
  };
}

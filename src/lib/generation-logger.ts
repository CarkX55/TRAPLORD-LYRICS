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

export interface GenerationProcessLog {
  timestamp: string;
  mode: "pipeline_3_pass" | "legacy_single_pass" | "regenerate_section";
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
}

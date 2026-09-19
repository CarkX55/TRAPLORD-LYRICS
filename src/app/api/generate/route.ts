import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  buildStage1ToplinePrompt,
  buildStage2GhostwriterPrompt,
  buildStage3VocalDirectorPrompt,
  cleanSunoBracketHeaders,
  buildSpanglishInstruction,
  buildSunoStyleResult,
  getRhymeTier,
  type LockedSection,
  type RegenerateSectionParams,
  type SectionVoiceAssignment,
  type PromptParams,
} from "@/lib/prompt-builder";
import type { GenerationProcessLog, GenerationStageLog } from "@/lib/generation-logger";

import {
  MOODS,
  TOPICS,
  BPM_VIBES,
  STRUCTURES,
  NARRATIVE_ARCS,
  BEAT_TYPES,
  generateBeatPrompt,
  getArtistById,
  type SongSection,
  type SongStructure,
} from "@/lib/trap-data";
import { buildCorrectionInstruction, analyzeLanguageRatio, type LanguageAnalysis } from "@/lib/language-detector";
import { getArtistReference } from "@/lib/artist-references";
import { generateArtistReference } from "@/lib/reference-generator";
import { analyzeReferenceTrack } from "@/lib/track-analyzer";
import { parseRawLyricsToAST, stringifyASTToSunoLyrics, createHookContract, bindHookContractToAST, hashSongDocument, resolveSectionSpec, type HookContract } from "@/lib/song-document";
import { synthesizeSemanticAnchor } from "@/lib/motif-engine";
import { buildLanguageDNA, buildLanguageTarget, calculateSyllableLanguageRatio } from "@/lib/language-dna";
import { auditPromptContamination, sanitizeUserInput, auditMetadataLeakage } from "@/lib/prompt-hygiene";
import { auditSunoBudget, type SunoBudgetAudit } from "@/lib/suno-budget";
import type { LanguageDriftStep } from "@/lib/generation-logger";
import {
  generatePerformanceArc,
  generateFlowSkeleton,
  formatFlowSkeletonForPrompt,
  generateWritingCells,
  generatePlannedVerseIntents,
  generateAllWritingCells,
  formatWritingCellsForPrompt,
  type PlannedVerseIntent,
  type WritingCell,
} from "@/lib/composition-planner";
import {
  runInitialDeliveryAudit,
  evaluateRepairability,
  runReAudit,
  evaluateFinalQualityGate,
  type AnalysisSnapshot,
  type InitialAuditContext,
  type SectionCardinalityExpectation,
} from "@/lib/quality-gate";
import { createInitialVersionGraph } from "@/lib/version-graph";
import { getFlowProfile } from "@/lib/artist-flow-profiles";
import { getMusicalDNAForArtist } from "@/lib/musical-dna";
import type { SongDocument } from "@/lib/song-document";

export const runtime = "nodejs";
export const maxDuration = 180;

interface GenerateBody {
  artistId: string;
  featureArtistId?: string;
  moodId: string;
  dirtyLevel?: number;
  topics: string[];
  customTopic: string;
  spanglishPercent: number;
  bpmVibeId: string;
  structureId: string;
  customSections?: SongSection[];
  narrativeArcId: string;
  producerId?: string;
  producerTag: string;
  customDictionary: string;
  dynamicMarkers: boolean;
  chorusLanguageOverride?: "es" | "en" | "auto";
  versesLanguageOverride?: "es" | "en" | "auto";
  barCountOverride?: number;
  temperature?: number;
  rhymeSchemeId?: string;
  lockedSections?: LockedSection[];
  regenerateSection?: RegenerateSectionParams;
  previousLyrics?: string;
  autoCorrect?: boolean;
  referenceTrackLyrics?: string;
  dynamicSongForm?: boolean;
  producerName?: string;
  featureSimId?: string;
  beatTypeId?: string;
  customIntro?: string;
  collabInteraction?: boolean;
  altVoiceAsterisks?: boolean;
  syllableSync?: boolean;
  phoneticAdlibs?: boolean;
  smartBarsMode?: boolean;
  sunoTagsMode?: "detailed" | "minimal";
  dynamismMode?: "classic" | "vanguard";
  adlibStyle?: "textured" | "classic" | "minimal";
  situationalPresetId?: string;
  sectionVoices?: SectionVoiceAssignment[];
  flowPocketMode?: "auto" | "bouncy" | "triplets" | "heavy";
  geminiApiKey?: string;
  geminiModel?: string;
  thinkingBudget?: number; // 0: disabled/instant, 1024-2048: balanced, 4096-8192: deep study, -1: auto
  useLegacySinglePass?: boolean;
  writingCellsEnabled?: boolean;
}

// Unified LLM Caller honoring strictly the user's selected model with progressive retry
async function callLLM(prompt: string, body: GenerateBody, temperature: number = 0.72): Promise<string> {
  if (body.geminiApiKey && body.geminiApiKey.trim()) {
    const model = (body.geminiModel && body.geminiModel.trim()) ? body.geminiModel.trim() : "gemini-2.0-flash";
    let lastError: Error | null = null;

    // Up to 3 attempts on the chosen model with progressive delay
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s per attempt

        // Build generationConfig with optional thinkingConfig
        const generationConfig: Record<string, unknown> = {
          temperature,
          topP: 0.95,
        };

        // Only attach thinkingConfig for models that specifically support thinking tokens
        const isThinkingModel = model.includes("thinking") || model.includes("-exp");
        if (
          isThinkingModel &&
          typeof body.thinkingBudget === "number" &&
          body.thinkingBudget >= 0
        ) {
          generationConfig.thinkingConfig = {
            thinkingBudget: body.thinkingBudget,
          };
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.geminiApiKey.trim()}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig,
            }),
          }
        );
        clearTimeout(timeoutId);

        const json = await res.json();
        if (json.error) {
          const errMsg = json.error.message || json.error.status || `Error ${json.error.code}`;
          console.warn(`[callLLM] Model ${model} returned API error (${json.error.code}, attempt ${attempt}): ${errMsg}`);
          lastError = new Error(`Gemini (${model}): ${errMsg}`);
          
          if (attempt < 3 && (json.error.code === 503 || json.error.code === 429)) {
            // Wait with backoff before retrying on the user's chosen model
            await new Promise(r => setTimeout(r, attempt * 2000));
            continue;
          }
          throw lastError;
        }

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text || !text.trim()) {
          console.warn(`[callLLM] Model ${model} returned empty candidates`);
          lastError = new Error(`Gemini (${model}) no devolvió contenido.`);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          throw lastError;
        }

        return text.trim();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[callLLM] Model ${model} attempt ${attempt} failed: ${lastError.message}`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1500));
        }
      }
    }

    throw lastError || new Error(`No se pudo procesar la solicitud con el modelo ${model}.`);
  } else {
    // Sandbox z-ai with fallback
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
    });
    const text = completion.choices[0]?.message?.content;
    if (!text || !text.trim()) {
      throw new Error("El modelo sandbox no devolvió contenido.");
    }
    return text.trim();
  }
}

// Get a reference for an artist: curated DB first, then generate on-the-fly
async function getOrGenerateReference(artistId: string, geminiApiKey?: string, geminiModel?: string) {
  const curated = getArtistReference(artistId);
  if (curated) return curated;
  const artist = getArtistById(artistId);
  if (!artist) return null;
  try {
    return await generateArtistReference({
      artistId,
      artistName: artist.name,
      geminiApiKey,
      geminiModel,
    });
  } catch (err) {
    console.error(`[generate] ref gen failed for ${artistId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function resolveTopics(topicIds: string[]): string[] {
  return topicIds
    .map(id => TOPICS.find(t => t.id === id)?.label)
    .filter((x): x is string => Boolean(x));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBody;

    // Resolve referenced entities
    const bpmVibe = BPM_VIBES.find(b => b.id === body.bpmVibeId) ?? BPM_VIBES[5];
    const parsedBpm = parseInt((bpmVibe.range || "135").split("-")[0], 10) || 135;
    const structure: SongStructure = body.customSections && body.customSections.length > 0
      ? { id: "custom", label: "Estructura Personalizada", sections: body.customSections }
      : (STRUCTURES.find(s => s.id === body.structureId) ?? STRUCTURES[0]);
    const narrativeArc = NARRATIVE_ARCS.find(a => a.id === body.narrativeArcId) ?? NARRATIVE_ARCS[0];
    const moodObj = MOODS.find(m => m.id === body.moodId);
    const moodId = moodObj ? `${moodObj.label} — ${moodObj.description}` : body.moodId;
    const beatType = body.beatTypeId ? BEAT_TYPES.find(b => b.id === body.beatTypeId) : undefined;

    // If we have previous lyrics + autoCorrect, build the correction instruction
    let correctionInstruction: string | undefined;
    if (body.previousLyrics && body.autoCorrect) {
      const analysis = analyzeLanguageRatio(body.previousLyrics, body.spanglishPercent);
      if (analysis.status === "off") {
        correctionInstruction = buildCorrectionInstruction(analysis);
      }
    }

    // Parallel artist references + track analysis with unified key
    const [mainRef, featRef, refTrack] = await Promise.all([
      getOrGenerateReference(body.artistId, body.geminiApiKey, body.geminiModel),
      body.featureArtistId ? getOrGenerateReference(body.featureArtistId, body.geminiApiKey, body.geminiModel) : Promise.resolve(null),
      body.referenceTrackLyrics?.trim()
        ? analyzeReferenceTrack({
            lyrics: body.referenceTrackLyrics,
            geminiApiKey: body.geminiApiKey,
            geminiModel: body.geminiModel,
          }).catch(err => {
            console.warn("[generate] analyzeReferenceTrack failed:", err instanceof Error ? err.message : err);
            return null;
          })
        : Promise.resolve(null),
    ]);

    const sanitizedCustomTopic = sanitizeUserInput(body.customTopic || "");
    const resolvedTopics = resolveTopics(body.topics);
    const semanticAnchor = synthesizeSemanticAnchor({
      topics: resolvedTopics,
      customTopic: sanitizedCustomTopic,
      situationalPresetId: body.situationalPresetId,
      artistId: body.artistId,
      moodId: body.moodId,
    });
    const languageTarget = buildLanguageTarget(body.spanglishPercent);
    const languageDNA = buildLanguageDNA(body.spanglishPercent, body.artistId, body.featureArtistId);

    const promptParams: PromptParams = {
      artistId: body.artistId,
      featureArtistId: body.featureArtistId ?? "",
      moodId,
      topics: resolvedTopics,
      customTopic: sanitizedCustomTopic,
      spanglishPercent: body.spanglishPercent,
      bpmVibe,
      beatType,
      structure,
      narrativeArcId: body.narrativeArcId,
      narrativeArcDesc: narrativeArc.description,
      producerId: body.producerId ?? "none",
      producerTag: body.producerTag,
      producerName: body.producerName,
      customDictionary: body.customDictionary,
      dynamicMarkers: body.dynamicMarkers,
      featureSimId: body.featureSimId,
      customIntro: body.customIntro,
      collabInteraction: body.collabInteraction,
      altVoiceAsterisks: body.altVoiceAsterisks,
      syllableSync: body.syllableSync,
      phoneticAdlibs: body.phoneticAdlibs,
      smartBarsMode: body.smartBarsMode,
      chorusLanguageOverride: body.chorusLanguageOverride,
      versesLanguageOverride: body.versesLanguageOverride,
      barCountOverride: body.barCountOverride,
      rhymeSchemeId: body.rhymeSchemeId,
      lockedSections: body.lockedSections,
      regenerateSection: body.regenerateSection,
      correctionInstruction,
      mainArtistReference: mainRef,
      featureArtistReference: featRef,
      referenceTrack: refTrack,
      dynamicSongForm: body.dynamicSongForm,
      dirtyLevel: body.dirtyLevel,
      sectionVoices: body.sectionVoices,
      sunoTagsMode: body.sunoTagsMode,
      dynamismMode: body.dynamismMode,
      adlibStyle: body.adlibStyle,
      situationalPresetId: body.situationalPresetId,
      flowPocketMode: body.flowPocketMode,
      semanticAnchor,
      languageDNA,
    };

    const temperature = typeof body.temperature === "number" ? body.temperature : 0.72;
    const modelUsed = (body.geminiApiKey && body.geminiApiKey.trim()) ? (body.geminiModel || "gemini-2.5-flash") : "sandbox-z-ai";
    const pipelineStartTime = Date.now();
    let lyrics = "";
    let finalRaw = "";
    let finalAST: SongDocument | null = null;
    let auditContext: InitialAuditContext | null = null;
    let compositionPlanningInfo: {
      flowSkeletonSummary?: string;
      writingCellsCount?: number;
      writingCellsEnabled?: boolean;
      plannedVerseIntents?: PlannedVerseIntent[];
    } | undefined = undefined;
    let pipelineStagesCompleted: string[] = [];
    const stageLogs: GenerationStageLog[] = [];
    const driftHistory: LanguageDriftStep[] = [];
    let repairDecisionData: GenerationProcessLog["repairDecision"] = undefined;
    let processMode: GenerationProcessLog["mode"] = "pipeline_3_pass";

    // Register initial target drift point
    driftHistory.push({
      stage: "target",
      stageLabel: "Objetivo Configurado",
      englishPercent: Math.round(languageTarget.center * 100),
      spanishPercent: Math.round((1 - languageTarget.center) * 100),
      deviationFromTarget: 0,
      confidence: 1.0,
      decision: "soft_pass",
    });

    // CASE 1: Single section regeneration
    if (body.regenerateSection) {
      processMode = "regenerate_section";
      const singlePrompt = buildSystemPrompt(promptParams);
      const t0 = Date.now();
      const rawLyrics = await callLLM(singlePrompt, body, temperature);
      const dMs = Date.now() - t0;
      finalRaw = rawLyrics;
      lyrics = cleanSunoBracketHeaders(rawLyrics, {
        artistId: body.artistId,
        featureArtistId: body.featureArtistId,
        sectionVoices: body.sectionVoices,
      });
      pipelineStagesCompleted = ["single_section_regenerated"];
      stageLogs.push({
        stageId: "regenerate_section",
        stageName: `Regenerar Sección: ${body.regenerateSection.sectionName}`,
        description: "Re-escritura aislada de una sección manteniendo el contexto de la canción",
        model: modelUsed,
        temperature,
        durationMs: dMs,
        prompt: singlePrompt,
        rawResponse: rawLyrics,
      });
    }
    // CASE 2: Legacy single-pass prompt (if explicitly requested)
    else if (body.useLegacySinglePass) {
      processMode = "legacy_single_pass";
      const singlePrompt = buildSystemPrompt(promptParams);
      const t0 = Date.now();
      const rawLyrics = await callLLM(singlePrompt, body, temperature);
      const dMs = Date.now() - t0;
      finalRaw = rawLyrics;
      lyrics = cleanSunoBracketHeaders(rawLyrics, {
        artistId: body.artistId,
        featureArtistId: body.featureArtistId,
        sectionVoices: body.sectionVoices,
      });
      pipelineStagesCompleted = ["legacy_single_pass"];
      stageLogs.push({
        stageId: "legacy_single_pass",
        stageName: "Generación Monolítica (1 Pasada)",
        description: "Generación clásica en un único prompt",
        model: modelUsed,
        temperature,
        durationMs: dMs,
        prompt: singlePrompt,
        rawResponse: rawLyrics,
      });
    }
    // CASE 3: STUDIO PIPELINE SNAPPY (2-PASS PRIMARY + EXCEPTIONAL REPAIR ONLY)
    else {
      processMode = "pipeline_2_pass_primary";

      // --- ETAPA PREVIA: PLANIFICACIÓN RÍTMICA BEAT-FIRST (Determinista Local <5ms) ---
      const flowProfile = getFlowProfile(body.artistId) || undefined;
      const mainDNA = getMusicalDNAForArtist(body.artistId);

      const performanceArc = generatePerformanceArc(structure, body.moodId, mainDNA);
      const flowSkeleton = generateFlowSkeleton(performanceArc, mainDNA, flowProfile, structure, body.flowPocketMode);

      // --- PASADA 1: Topliner & Contrato de Gancho (Hooks & Mantras) ---
      const stage1Prompt = buildStage1ToplinePrompt(promptParams, flowSkeleton.globalIntentionSummary);
      const t1 = Date.now();
      const stage1Topline = await callLLM(stage1Prompt, body, 0.82);
      const d1Ms = Date.now() - t1;
      
      // Resolve canonical Hook specification dynamically from structure & voice assignments
      const hookSpec = resolveSectionSpec(structure.sections, body.sectionVoices, "hook");

      // Invariant: Create canonical HookContract with expectedBars, occurrenceCount, and provable safe collapse
      const hookContract = createHookContract(stage1Topline, {
        allowPerformanceVariation: true,
        expectedBars: hookSpec.targetBars || 8,
        occurrenceCount: hookSpec.occurrenceCount,
      });

      pipelineStagesCompleted.push("hook_contract_locked");
      stageLogs.push({
        stageId: "stage_1_topline",
        stageName: "Pasada 1: Topliner & Contrato de Gancho",
        description: `Diseño melódico canónico fijado (${hookContract.bars.length} barras, status: ${hookContract.cardinalityStatus}, factor: ${hookContract.repetitionFactor}x, Hash: ${hookContract.contentHash})`,
        model: modelUsed,
        temperature: 0.82,
        durationMs: d1Ms,
        prompt: stage1Prompt,
        rawResponse: stage1Topline,
      });

      const stage1Syllable = calculateSyllableLanguageRatio(stage1Topline, languageTarget);
      driftHistory.push({
        stage: "stage_1",
        stageLabel: "Pasada 1 (Hook Contract)",
        englishPercent: stage1Syllable.englishPercent,
        spanishPercent: stage1Syllable.spanishPercent,
        deviationFromTarget: stage1Syllable.deviationFromTarget,
        confidence: stage1Syllable.confidence,
        decision: stage1Syllable.bandDecision,
      });

      // --- SCAFFOLDING DE CÉLULAS DE ESCRITURA PARA VERSOS (4-Bar Writing Cells con Factorial Flag) ---
      const writingCellsEnabled = body.writingCellsEnabled !== false;
      let writingCellsSnippet: string | undefined = undefined;
      let plannedVerseIntents: PlannedVerseIntent[] = [];
      let allWritingCells: WritingCell[] = [];

      if (writingCellsEnabled) {
        plannedVerseIntents = generatePlannedVerseIntents(
          structure,
          body.moodId,
          mainDNA,
          flowProfile,
          semanticAnchor?.title,
          semanticAnchor?.sensoryDescription
        );
        allWritingCells = generateAllWritingCells(structure, plannedVerseIntents);
        writingCellsSnippet = formatWritingCellsForPrompt(allWritingCells);
      }

      const flowSkeletonSnippet = formatFlowSkeletonForPrompt(flowSkeleton, "verse_1");
      compositionPlanningInfo = {
        flowSkeletonSummary: flowSkeleton.globalIntentionSummary,
        writingCellsCount: allWritingCells.length,
        writingCellsEnabled,
        plannedVerseIntents,
      };

      // --- PASADA 2: Ghostwriter & Vocal Director Master (con Células y Skeleton) ---
      const stage2Prompt = buildStage2GhostwriterPrompt(
        promptParams,
        hookContract.approvedText,
        writingCellsSnippet,
        flowSkeletonSnippet
      );
      const t2 = Date.now();
      const stage2Lyrics = await callLLM(stage2Prompt, body, 0.72);
      const d2Ms = Date.now() - t2;
      pipelineStagesCompleted.push("studio_master_completed");
      stageLogs.push({
        stageId: "stage_2_ghostwriter",
        stageName: "Pasada 2: Master de Estudio (Ghostwriter & Vocal)",
        description: "Estructura completa con 4-Bar Writing Cells y Flow Skeleton interpretativo",
        model: modelUsed,
        temperature: 0.72,
        durationMs: d2Ms,
        prompt: stage2Prompt,
        rawResponse: stage2Lyrics,
      });

      let candidateLyrics = cleanSunoBracketHeaders(stage2Lyrics, {
        artistId: body.artistId,
        featureArtistId: body.featureArtistId,
        sectionVoices: body.sectionVoices,
      });
      let candidateAST = parseRawLyricsToAST(candidateLyrics);

      // --- AUDITORÍA DE FUGA DE METADATOS (USER EXPLICIT PRECEDENCE) ---
      const userExplicitTerms = [body.customTopic, body.customDictionary, ...(body.topics || [])].filter(Boolean) as string[];
      const leakReport = auditMetadataLeakage(candidateLyrics, userExplicitTerms);
      if (leakReport.hasLeak) {
        candidateLyrics = leakReport.sanitizedLyrics;
        candidateAST = parseRawLyricsToAST(candidateLyrics);
      }

      // --- ESPECIFICACIÓN Y EXPECTATIVAS DE CARDINALIDAD ESTRUCTURAL ---
      const structuralExpectations: Record<string, SectionCardinalityExpectation> = {};
      for (const sec of structure.sections) {
        const spec = resolveSectionSpec(structure.sections, body.sectionVoices, sec.type);
        const sectionVa = body.sectionVoices?.find(v => v.sectionName === sec.name);
        if (sec.type === "hook") {
          structuralExpectations[sec.name] = { exact: hookContract.expectedBars || sectionVa?.bars || spec.targetBars || 8 };
        } else if (sectionVa?.bars) {
          structuralExpectations[sec.name] = { exact: sectionVa.bars };
        } else {
          structuralExpectations[sec.name] = { min: spec.minBars, max: spec.maxBars };
        }
      }

      // --- FASE 1: INITIAL DELIVERY AUDIT & MULTI-CRITIC (Determinista en memoria) ---
      auditContext = runInitialDeliveryAudit(candidateAST, parsedBpm, flowProfile, userExplicitTerms, structuralExpectations);
      const repairPlan = evaluateRepairability(auditContext);

      finalRaw = stage2Lyrics;
      lyrics = candidateLyrics;
      finalAST = candidateAST;

      // --- RUTA DE REPARACIÓN EXCEPCIONAL QUIRÚRGICA (Solo ante ganancia neta justificada) ---
      if (repairPlan.needsRepair && repairPlan.targetBars.length > 0) {
        try {
          const tRepair = Date.now();
          const target = repairPlan.targetBars[0];
          const patchInstruction = `Ajusta estas barras específicas de la canción resolviendo este problema detectado ("${target.reason}") manteniendo rima, métrica y flow:\n${candidateLyrics}`;
          const patchedText = await callLLM(patchInstruction, body, 0.65);
          const dRepairMs = Date.now() - tRepair;
          if (patchedText && patchedText.trim()) {
            finalRaw = patchedText;
            lyrics = cleanSunoBracketHeaders(patchedText, {
              artistId: body.artistId,
              featureArtistId: body.featureArtistId,
              sectionVoices: body.sectionVoices,
            });
            finalAST = parseRawLyricsToAST(lyrics);
            pipelineStagesCompleted.push("exceptional_repair_calibrated");
            stageLogs.push({
              stageId: "stage_exceptional_repair",
              stageName: "🩺 Reparación Excepcional Quirúrgica",
              description: `Reparación atómica aplicada: ${target.reason}`,
              model: modelUsed,
              temperature: 0.65,
              durationMs: dRepairMs,
              prompt: patchInstruction,
              rawResponse: patchedText,
            });

            // Re-Audit tras la reparación quirúrgica
            auditContext = runReAudit(finalAST, parsedBpm, flowProfile, userExplicitTerms, structuralExpectations);
          }
        } catch {
          // Si falla la llamada quirúrgica, preservamos el Master de la Pasada 2
          lyrics = candidateLyrics;
          finalAST = candidateAST;
        }
      }

      // --- RECONCILIACIÓN DETERMINISTA DE ESTRIBILLO (HOOK INVARIANT) ---
      finalAST = bindHookContractToAST(finalAST, hookContract);
      lyrics = stringifyASTToSunoLyrics(finalAST);

      // --- FINAL AUDIT: Auditoría completa de TODO el AST definitivo con Hook reconciliado ---
      auditContext = runInitialDeliveryAudit(finalAST, parsedBpm, flowProfile, userExplicitTerms, structuralExpectations);

      repairDecisionData = {
        action: repairPlan.needsRepair ? "exceptional_repair" : "direct_deliver",
        reason: repairPlan.needsRepair
          ? `Reparación quirúrgica ejecutada (${repairPlan.targetBars.map(t => t.reason).join("; ")})`
          : `Calidad, HookContract (${hookContract.cardinalityStatus}, factor: ${hookContract.repetitionFactor}x) y estructura verificadas en 2 pasadas`,
        netScore: auditContext.deliveryLoad.loadScore,
        targetBarsCount: repairPlan.targetBars.length,
      };
    }

    if (!lyrics || !lyrics.trim()) {
      return NextResponse.json({ error: "El motor de estudio no devolvió contenido válido." }, { status: 502 });
    }

    // Post-generation: final syllable-weighted and token-based language analysis
    const syllableFinal = calculateSyllableLanguageRatio(lyrics, languageTarget);
    const analysis: LanguageAnalysis = analyzeLanguageRatio(lyrics, body.spanglishPercent);
    const spanglishInfo = buildSpanglishInstruction(body.spanglishPercent);

    // Contamination Guard Audit
    const hygieneReport = auditPromptContamination(lyrics, [sanitizedCustomTopic, ...resolvedTopics]);

    // Generate a beat prompt (Suno/Udio-style) from the config
    const beatPrompt = generateBeatPrompt(body.artistId, body.moodId, body.bpmVibeId, body.producerId ?? "none");

    // Generate Suno v4.5 4-layer style prompt
    const sunoStyleResult = buildSunoStyleResult({
      beatType,
      bpmVibe,
      moodId: body.moodId,
      artistId: body.artistId,
      featureArtistId: body.featureArtistId,
      producerId: body.producerId ?? "none",
      structureLabel: structure.label,
      dirtyLevel: body.dirtyLevel,
    });

    const artistObj = getArtistById(body.artistId);
    const featObj = body.featureArtistId ? getArtistById(body.featureArtistId) : undefined;
    const totalDurationMs = Date.now() - pipelineStartTime;

    const generationLog: GenerationProcessLog = {
      timestamp: new Date().toISOString(),
      mode: processMode,
      modelUsed,
      totalDurationMs,
      stages: stageLogs,
      finalRawLyrics: finalRaw,
      cleanedLyrics: lyrics,
      contextSummary: {
        artistName: artistObj?.name ?? "Libre",
        featureArtistName: featObj?.name,
        mood: moodObj?.label ?? body.moodId,
        bpm: `${bpmVibe.range} BPM (${bpmVibe.label})`,
        structure: structure.label,
        spanglishTarget: body.spanglishPercent,
        spanglishActual: syllableFinal.englishPercent,
        rhymeTier: getRhymeTier(body.artistId),
        dirtyLevel: body.dirtyLevel ?? 2,
      },
      semanticAnchor: {
        anchorType: semanticAnchor.anchorType,
        title: semanticAnchor.title,
        sensoryDescription: semanticAnchor.sensoryDescription,
        emotionalAxis: semanticAnchor.emotionalAxis,
      },
      compositionPlanning: compositionPlanningInfo,
      languageDriftHistory: driftHistory,
      repairDecision: repairDecisionData,
      promptHygieneReport: {
        isClean: hygieneReport.isClean,
        score: hygieneReport.score,
        criticalCount: hygieneReport.criticalCount,
        warningCount: hygieneReport.warningCount,
        findingsSummary: hygieneReport.findings.map(f => `[${f.severity.toUpperCase()}] ${f.reason}`),
      },
    };

    if (!finalAST) finalAST = parseRawLyricsToAST(lyrics);
    if (!auditContext) auditContext = runInitialDeliveryAudit(finalAST, parsedBpm, getFlowProfile(body.artistId) || undefined, [], structure.sections);

    const sunoBudget = auditSunoBudget(lyrics, parsedBpm);

    // --- FASE 2: FINAL QUALITY GATE & ANALYSIS SNAPSHOT (Desacoplado del AST con Hash Canónico) ---
    const docHash = hashSongDocument(finalAST);
    const analysisSnapshot = evaluateFinalQualityGate(
      finalAST,
      auditContext,
      sunoBudget,
      finalAST.versionId || "v_1",
      docHash
    );

    // --- VERSION GRAPH (Inmutable con AnalysisSnapshot adjunto) ---
    const versionGraph = createInitialVersionGraph(
      finalAST,
      "Studio 2-Pass Generation (Beat-First)",
      analysisSnapshot
    );

    return NextResponse.json({
      lyrics,
      songDocument: finalAST,
      analysisSnapshot,
      versionGraph,
      analysis,
      spanglishLabel: spanglishInfo.label,
      promptPreview: `Pipeline de Estudio (${stageLogs.length} ${stageLogs.length === 1 ? "Pasada" : "Pasadas"}) completado con éxito: ${pipelineStagesCompleted.join(" ➔ ")}`,
      temperature,
      beatPrompt,
      sunoStylePrompt: sunoStyleResult.prompt,
      sunoLayers: sunoStyleResult.layers,
      sunoCharCount: sunoStyleResult.charCount,
      sunoBudget,
      refTrackSummary: refTrack?.summary ?? null,
      pipelineStages: pipelineStagesCompleted,
      generationLog,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en la generación de estudio.";
    console.error("[generate] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

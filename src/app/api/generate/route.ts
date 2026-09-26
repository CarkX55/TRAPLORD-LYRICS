import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  buildSystemPrompt,
  buildHolisticPrompt,
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
  type CompositionMode,
} from "@/lib/prompt-builder";
import type { GenerationProcessLog, GenerationStageLog, DiagnosticCallAttempt } from "@/lib/generation-logger";

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
import { parseRawLyricsToAST, stringifyASTToSunoLyrics, createHookContract, bindHookContractToAST, hashSongDocument, resolveSectionSpec, validateLyricEnvelope, stripMetaReasoning, type HookContract } from "@/lib/song-document";
import { synthesizeSemanticAnchor } from "@/lib/motif-engine";
import { buildLanguageDNA, buildLanguageTarget, calculateSyllableLanguageRatio } from "@/lib/language-dna";
import { auditDialectAndTranslationArtifacts, type SpanishFlavor } from "@/lib/dialect-engine";
import { auditPromptContamination, sanitizeUserInput, auditMetadataLeakage, detectApiKeyLikeContent } from "@/lib/prompt-hygiene";
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
import { createInitialVersionGraph, type VersionNodeMeta } from "@/lib/version-graph";
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
  hookVariationsEnabled?: boolean;
  spanishFlavor?: SpanishFlavor;
  hideArtistNames?: boolean;
  // Ghostwriter Engine v2.2 Fields:
  editedGenerationPrompt?: string;
  compositionMode?: CompositionMode;
}

import {
  getEffectiveApiKey,
  GEMINI_SAFETY_SETTINGS,
  GEMINI_SAFETY_SETTINGS_FALLBACK,
  extractGeminiText,
  isThinkingModel,
  normalizeGeminiModel,
  GEMINI_MODEL_CASCADE,
  GEMINI_DEFAULT_MODEL,
} from "@/lib/gemini-config";

// Unified Resilient LLM Caller with Model Cascade, Auto-Fallback, Safety Protections & Live Diagnostics
async function callLLM(
  prompt: string,
  body: GenerateBody,
  temperature: number = 0.72,
  diagnosticCollector?: DiagnosticCallAttempt[]
): Promise<string> {
  const apiKey = getEffectiveApiKey(body.geminiApiKey);
  const primaryModel = normalizeGeminiModel(body.geminiModel);

  // Build resilient modern fallback cascade: Primary user model -> 3.5-flash-lite -> 3.5-flash -> 3.6-flash -> 3.7-flash -> 3.8-flash
  const modelCascade: string[] = [primaryModel];
  for (const m of GEMINI_MODEL_CASCADE) {
    if (!modelCascade.includes(m)) {
      modelCascade.push(m);
    }
  }

  let lastError: Error | null = null;
  let activeSafetySettings = GEMINI_SAFETY_SETTINGS;

  for (let mIdx = 0; mIdx < modelCascade.length; mIdx++) {
    const currentModel = modelCascade[mIdx];
    const isFallback = mIdx > 0;
    if (isFallback) {
      // Exponential backoff between cascade models to allow Google TPU clusters to clear 503 demand spikes
      const backoffMs = Math.min(1200 * Math.pow(1.4, mIdx - 1), 3500);
      console.warn(`[callLLM] Cascading to fallback model: ${currentModel} (pausing ${Math.round(backoffMs)}ms backoff after ${modelCascade[mIdx - 1]} failed)`);
      await new Promise(r => setTimeout(r, backoffMs));
    }

    // Try up to 2 attempts on this candidate model (unless aborted/timed out)
    for (let attempt = 1; attempt <= 2; attempt++) {
      const attemptStart = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 65000); // 65s per attempt for complex 10k+ char prompts

        // Build generationConfig with safe thinkingConfig
        const generationConfig: Record<string, unknown> = {
          temperature,
          topP: 0.95,
        };

        const supportsThinking = isThinkingModel(currentModel);
        if (supportsThinking) {
          if (typeof body.thinkingBudget === "number") {
            if (body.thinkingBudget === 0) {
              generationConfig.thinkingConfig = { thinkingBudget: 0 };
            } else if (body.thinkingBudget > 0) {
              generationConfig.thinkingConfig = { thinkingBudget: body.thinkingBudget };
            }
          } else {
            // Default to 0 (instant) for speed and to prevent hanging thinking models
            generationConfig.thinkingConfig = { thinkingBudget: 0 };
          }
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig,
              safetySettings: activeSafetySettings,
            }),
          }
        );
        clearTimeout(timeoutId);
        const durationMs = Date.now() - attemptStart;

        const json = await res.json();
        if (json.error) {
          const errMsg = json.error.message || json.error.status || `Error ${json.error.code}`;
          const errCode = json.error.code;
          console.warn(`[callLLM] Model ${currentModel} returned API error (${errCode}, attempt ${attempt}): ${errMsg}`);
          lastError = new Error(`Gemini (${currentModel}): ${errMsg}`);

          diagnosticCollector?.push({
            timestamp: new Date().toISOString(),
            model: currentModel,
            attempt,
            durationMs,
            status: "error",
            httpCode: errCode,
            error: errMsg,
          });

          // If 400 is due to thinkingConfig not supported, strip thinkingConfig and retry immediately
          if (errCode === 400 && (errMsg.toLowerCase().includes("thinking") || errMsg.toLowerCase().includes("thinkingconfig"))) {
            console.warn(`[callLLM] Model ${currentModel} does not support thinkingConfig, retrying without it...`);
            delete generationConfig.thinkingConfig;
            continue;
          }

          // If 400 is due to safety settings threshold BLOCK_NONE, downgrade to BLOCK_ONLY_HIGH
          if (errCode === 400 && errMsg.toLowerCase().includes("safety")) {
            console.warn(`[callLLM] Model ${currentModel} rejected BLOCK_NONE safety threshold, retrying with BLOCK_ONLY_HIGH...`);
            activeSafetySettings = GEMINI_SAFETY_SETTINGS_FALLBACK;
            continue;
          }

          // If 429 (Rate Limit / Quota Exceeded)
          if (errCode === 429) {
            console.warn(`[callLLM] Model ${currentModel} quota exhausted (429) on attempt ${attempt}`);
            lastError = new Error(`Gemini (${currentModel}): Límite de cuota alcanzado (Error 429).`);
            if (attempt === 1) {
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            // Advance to next model in cascade on attempt 2
            break;
          }

          // If 404 (model not found/deprecated) or 410, advance immediately to next model in cascade
          if (errCode === 400 || errCode === 404 || errCode === 410) {
            console.warn(`[callLLM] Model ${currentModel} returned ${errCode}, cascading immediately...`);
            break;
          }

          // If 503 (High Demand / Overloaded), cascade immediately to next model to avoid queue delays
          if (errCode === 503) {
            console.warn(`[callLLM] Model ${currentModel} is experiencing high demand (503), cascading immediately to avoid queue delay...`);
            break;
          }

          break;
        }

        if (json.promptFeedback?.blockReason === "SAFETY") {
          console.warn(`[callLLM] Model ${currentModel} prompt blocked by safety filter`);
          lastError = new Error(`Gemini (${currentModel}) bloqueó el prompt por política de seguridad (SAFETY).`);
          diagnosticCollector?.push({
            timestamp: new Date().toISOString(),
            model: currentModel,
            attempt,
            durationMs,
            status: "safety_blocked",
            error: "Prompt bloqueado por política de seguridad (SAFETY).",
          });
          break;
        }

        const candidate = json.candidates?.[0];
        if (candidate?.finishReason === "SAFETY") {
          console.warn(`[callLLM] Model ${currentModel} candidate blocked by safety filter`);
          lastError = new Error(`Gemini (${currentModel}) bloqueó la respuesta por política de seguridad (SAFETY).`);
          diagnosticCollector?.push({
            timestamp: new Date().toISOString(),
            model: currentModel,
            attempt,
            durationMs,
            status: "safety_blocked",
            finishReason: "SAFETY",
            error: "Respuesta bloqueada por política de seguridad (SAFETY).",
          });
          break;
        }

        // Safely extract genuine text (filtering out thought parts)
        const text = extractGeminiText(candidate);
        if (!text || !text.trim()) {
          console.warn(`[callLLM] Model ${currentModel} returned empty text`);
          lastError = new Error(`Gemini (${currentModel}) no devolvió contenido lírico.`);
          diagnosticCollector?.push({
            timestamp: new Date().toISOString(),
            model: currentModel,
            attempt,
            durationMs,
            status: "empty",
            finishReason: candidate?.finishReason || "UNKNOWN",
            error: "Respuesta vacía o sin contenido lírico.",
          });
          if (attempt === 1) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          break;
        }

        // Success!
        diagnosticCollector?.push({
          timestamp: new Date().toISOString(),
          model: currentModel,
          attempt,
          durationMs,
          status: "success",
          finishReason: candidate?.finishReason || "STOP",
          textSnippet: text.substring(0, 80),
        });

        return text.trim();
      } catch (err) {
        const durationMs = Date.now() - attemptStart;
        const isAbort = err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"));
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[callLLM] Model ${currentModel} attempt ${attempt} exception: ${lastError.message}`);

        diagnosticCollector?.push({
          timestamp: new Date().toISOString(),
          model: currentModel,
          attempt,
          durationMs,
          status: isAbort ? "timeout" : "error",
          error: lastError.message,
        });

        // If timed out, do NOT retry same slow model - cascade immediately!
        if (isAbort) {
          lastError = new Error(`Gemini (${currentModel}) agotó el tiempo de espera (timeout 65s).`);
          break;
        }

        if (attempt === 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  const isQuotaError = lastError?.message.includes("429") || lastError?.message.toLowerCase().includes("quota") || lastError?.message.toLowerCase().includes("exhausted");
  if (isQuotaError) {
    throw new Error("⚠️ Límite de cuota alcanzado en Google Gemini (Error 429). Tu API Key de Google AI Studio gratuita tiene un límite por minuto. Por favor, espera 30-45 segundos antes de volver a pulsar 'Generar Letra', o activa el 'Modo Rápido (1 Pasada)' para ahorrar llamadas.");
  }

  throw lastError || new Error(`No se pudo procesar la solicitud tras intentar con los modelos: ${modelCascade.join(", ")}`);
}

// Get a reference for an artist: curated DB first, then generate on-the-fly
async function getOrGenerateReference(artistId: string, geminiApiKey?: string, geminiModel?: string) {
  const curated = getArtistReference(artistId);
  if (curated) return curated;
  const artist = getArtistById(artistId);
  if (!artist) return null;
  try {
    const refPromise = generateArtistReference({
      artistId,
      artistName: artist.name,
      geminiApiKey,
      geminiModel,
    });
    // 8-second circuit breaker so reference generation never blocks the song pipeline
    const timeoutPromise = new Promise<null>(r => setTimeout(() => r(null), 8000));
    return await Promise.race([refPromise, timeoutPromise]);
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
  const pipelineStartTime = Date.now();
  let capturedBody: GenerateBody | undefined;
  let modelUsed = GEMINI_DEFAULT_MODEL;
  let processMode: GenerationProcessLog["mode"] = "pipeline_2_pass_primary";
  let lyrics = "";
  let finalRaw = "";
  const stageLogs: GenerationStageLog[] = [];
  const diagnosticAttempts: DiagnosticCallAttempt[] = [];
  const driftHistory: LanguageDriftStep[] = [];

  try {
    const body = (await req.json()) as GenerateBody;
    capturedBody = body;

    // P0: Seguridad & Privacidad — Rechazar explícitamente posibles secretos en el prompt editado (HTTP 400).
    // Nunca alterar silenciosamente el prompt activo del usuario.
    if (body.editedGenerationPrompt && body.editedGenerationPrompt.trim()) {
      const secretMatch = detectApiKeyLikeContent(body.editedGenerationPrompt);
      if (secretMatch) {
        return NextResponse.json(
          { error: "El prompt contiene una posible clave de API o secreto. Elimínalo antes de generar." },
          { status: 400 }
        );
      }
    }

    const rawModelInit = body.geminiModel?.trim();
    if (rawModelInit) modelUsed = normalizeGeminiModel(rawModelInit);

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
      structure,
    });
    const languageTarget = buildLanguageTarget(body.spanglishPercent);
    const mappedSections = structure.sections.map(s => {
      const va = body.sectionVoices?.find(v => v.sectionName === s.name);
      let voiceArtistId = body.artistId;
      if (va?.voice === "feature" || s.name.toLowerCase().includes("feat")) {
        voiceArtistId = body.featureArtistId || body.artistId;
      }
      return {
        id: s.name.toLowerCase().replace(/\s+/g, "_"),
        name: s.name,
        type: s.type,
        voiceArtistId,
      };
    });
    const languageDNA = buildLanguageDNA(body.spanglishPercent, body.artistId, body.featureArtistId, body.spanishFlavor, mappedSections);

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
      spanishFlavor: body.spanishFlavor,
      hideArtistNames: body.hideArtistNames !== false,
    };

    const temperature = typeof body.temperature === "number" ? body.temperature : 0.72;
    const rawModel = body.geminiModel?.trim();
    modelUsed = normalizeGeminiModel(rawModel);
    const userExplicitTerms = [body.customTopic, body.customDictionary, ...(body.topics || [])].filter(Boolean) as string[];
    let finalAST: SongDocument | null = null;
    let auditContext: InitialAuditContext | null = null;
    let dialectAudit: any = null;
    let compositionPlanningInfo: {
      flowSkeletonSummary?: string;
      writingCellsCount?: number;
      writingCellsEnabled?: boolean;
      hookVariationsEnabled?: boolean;
      plannedVerseIntents?: PlannedVerseIntent[];
    } | undefined = undefined;
    let pipelineStagesCompleted: string[] = [];
    let repairDecisionData: GenerationProcessLog["repairDecision"] = undefined;
    processMode = "pipeline_3_pass";

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

    let compiledPromptResolved = "";
    let activePromptResolved = "";
    let promptHashResolved = "";
    let promptWasEditedResolved = false;
    let promptOriginResolved: "compiled" | "edited" = "compiled";

    // CASE 1: Single section regeneration (con contexto completo de canción y Ficha Operativa)
    if (body.regenerateSection) {
      processMode = "regenerate_section";
      const compiledPrompt = buildSystemPrompt(promptParams);
      const isEdited = Boolean(body.editedGenerationPrompt?.trim() && body.editedGenerationPrompt.trim() !== compiledPrompt.trim());
      const activePrompt = isEdited ? body.editedGenerationPrompt!.trim() : compiledPrompt;
      const promptOrigin: "compiled" | "edited" = isEdited ? "edited" : "compiled";
      const promptHash = crypto.createHash("sha256").update(activePrompt).digest("hex");

      compiledPromptResolved = compiledPrompt;
      activePromptResolved = activePrompt;
      promptHashResolved = promptHash;
      promptWasEditedResolved = isEdited;
      promptOriginResolved = promptOrigin;

      const t0 = Date.now();
      const rawLyrics = await callLLM(activePrompt, body, temperature, diagnosticAttempts);
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
        description: isEdited ? "Re-escritura con prompt editado manteniendo el contexto" : "Re-escritura aislada de una sección manteniendo el contexto de la canción",
        model: modelUsed,
        temperature,
        durationMs: dMs,
        prompt: activePrompt,
        rawResponse: rawLyrics,
      });
    }
    // CASE 2: MULTIPASS LAB (Solo si explícitamente se solicita compositionMode === "multipass" o useLegacySinglePass)
    else if (body.compositionMode === "multipass" || body.useLegacySinglePass) {
      processMode = "pipeline_2_pass_primary";

      // --- ETAPA PREVIA: PLANIFICACIÓN RÍTMICA BEAT-FIRST (Determinista Local <5ms) ---
      const flowProfile = getFlowProfile(body.artistId) || undefined;
      const mainDNA = getMusicalDNAForArtist(body.artistId);

      const performanceArc = generatePerformanceArc(structure, body.moodId, mainDNA);
      const flowSkeleton = generateFlowSkeleton(performanceArc, mainDNA, flowProfile, structure, body.flowPocketMode);

      // --- PASADA 1: Topliner & Contrato de Gancho (Hooks & Mantras con Factorial Flag) ---
      const hookVariationsEnabled = body.hookVariationsEnabled !== false;
      const stage1Prompt = buildStage1ToplinePrompt(promptParams, flowSkeleton.globalIntentionSummary, hookVariationsEnabled);
      const t1 = Date.now();
      const stage1Topline = await callLLM(stage1Prompt, body, 0.82, diagnosticAttempts);
      const d1Ms = Date.now() - t1;
      
      // Resolve canonical Hook specification dynamically from structure & voice assignments
      const hookSpec = resolveSectionSpec(structure.sections, body.sectionVoices, "hook");

      // Invariant: Create canonical HookContract with expectedBars, occurrenceCount, and provable safe collapse
      const cleanedTopline = stripMetaReasoning(stage1Topline);
      const hookContract = createHookContract(cleanedTopline, {
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
        hookVariationsEnabled,
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
      let stage2Lyrics = await callLLM(stage2Prompt, body, 0.72, diagnosticAttempts);

      // Resilient Lyric Envelope Validation & Sanitization
      const envelopeCheck = validateLyricEnvelope(stage2Lyrics);
      if (!envelopeCheck.valid) {
        console.warn(`[generate] Envelope validation notice: ${envelopeCheck.reason}. Sanitizing with stripMetaReasoning.`);
        const cleanedCandidate = stripMetaReasoning(stage2Lyrics);
        const hasValidSections = /\[(?:intro|verse|chorus|hook|bridge|outro|pre-chorus|post-chorus)/i.test(cleanedCandidate);

        if (hasValidSections) {
          // Gracefully recovered: preamble, meta-reasoning, or markdown delimiters stripped, preserving genuine song
          stage2Lyrics = cleanedCandidate;
        } else {
          // If no genuine sections were found at all, retry once with strict direct prompt
          console.warn("[generate] Zero valid sections found after stripping. Retrying once with strict zero-reasoning instruction.");
          try {
            const retryPrompt = `${stage2Prompt}\n\n⚠️ ALERTA DE COMPOSICIÓN CRÍTICA: Devuelve ÚNICAMENTE la letra de la canción comenzando directamente en el primer corchete [Intro]. CERO texto conversacional antes o después.`;
            const retryLyrics = await callLLM(retryPrompt, body, 0.55, diagnosticAttempts);
            const retryCleaned = stripMetaReasoning(retryLyrics);
            if (/\[(?:intro|verse|chorus|hook|bridge|outro)/i.test(retryCleaned)) {
              stage2Lyrics = retryCleaned;
            } else if (stage2Lyrics && stage2Lyrics.trim()) {
              stage2Lyrics = cleanedCandidate || stage2Lyrics;
            }
          } catch (retryErr) {
            console.warn("[generate] Envelope retry failed, proceeding with sanitized candidate:", retryErr);
            stage2Lyrics = cleanedCandidate || stage2Lyrics;
          }
        }
      }
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

      // --- AUDITORÍA DE DIALECTO Y ARTEFACTOS DE TRADUCCIÓN (LANGUAGE & DIALECT AUDIT) ---
      if (languageDNA.flavorProfile && languageDNA.leadDialectProfile) {
        dialectAudit = auditDialectAndTranslationArtifacts(
          candidateAST,
          languageDNA.flavorProfile,
          languageDNA.leadDialectProfile,
          languageDNA.featureDialectProfile
        );
      }

      // --- FASE 1: INITIAL DELIVERY AUDIT & MULTI-CRITIC (UNIFIED DEFECT SET) ---
      // Evaluates structural cardinality, delivery load, metadata leaks, rhymes and dialect calques
      auditContext = runInitialDeliveryAudit(
        candidateAST,
        parsedBpm,
        flowProfile,
        userExplicitTerms,
        structuralExpectations,
        dialectAudit
      );
      const repairPlan = evaluateRepairability(auditContext);

      // Record observed English ratio post-generation on actual AST syllables
      if (languageDNA.allocationPlan && auditContext.languageAnalysis) {
        languageDNA.allocationPlan.observedEnglishRatio = Number((auditContext.languageAnalysis.englishPercent / 100).toFixed(2));
      }

      finalRaw = stage2Lyrics;
      lyrics = candidateLyrics;
      finalAST = candidateAST;

      // --- RUTA DE REPARACIÓN EXCEPCIONAL QUIRÚRGICA (Solo ante ganancia neta justificada) ---
      if (repairPlan.needsRepair && repairPlan.targetBars.length > 0) {
        try {
          const tRepair = Date.now();
          const target = repairPlan.targetBars[0];
          const userTopicsClause = userExplicitTerms.length > 0
            ? `\nPRESERVACIÓN DE TEMÁTICA DEL USUARIO: Los términos [${userExplicitTerms.join(", ")}] fueron solicitados explícitamente por el usuario. Son entidades temáticas legítimas e inviolables. NO los consideres como error ni los censures ni los sustituyas por perífrasis genéricas.`
            : "";
          const patchInstruction = `Eres un Cirujano Lírico de Trap de élite. Tu misión es corregir las barras problemáticas resolviendo este defecto detectado: "${target.reason}", manteniendo rima, métrica y flow.
REGLAS ESTRICTAS DE SALIDA:
1. Devuelve ÚNICAMENTE la letra completa de la canción con el arreglo integrado.
2. PROHIBIDO terminantemente incluir explicaciones, introducciones, justificaciones, listas de cambios o frases como "Letra ajustada:", "Se ha resuelto el problema" o "He modificado...".
3. Comienza directamente con la primera etiqueta de sección de la canción (ej. [Intro...]).${userTopicsClause}

CANCIÓN A CORREGIR:
${candidateLyrics}`;
          const patchedText = await callLLM(patchInstruction, body, 0.65, diagnosticAttempts);
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
            if (dialectAudit && languageDNA.flavorProfile && languageDNA.leadDialectProfile) {
              dialectAudit = auditDialectAndTranslationArtifacts(
                finalAST,
                languageDNA.flavorProfile,
                languageDNA.leadDialectProfile,
                languageDNA.featureDialectProfile
              );
            }
            auditContext = runReAudit(finalAST, parsedBpm, flowProfile, userExplicitTerms, structuralExpectations, dialectAudit);
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
    // CASE 3: MOTOR GHOSTWRITER HOLÍSTICO (MODO PRIMARIO & POR DEFECTO EN PRODUCCIÓN v2.2)
    else {
      processMode = "holistic_ghostwriter";
      const compiledPrompt = buildHolisticPrompt(promptParams);
      const isEdited = Boolean(body.editedGenerationPrompt?.trim() && body.editedGenerationPrompt.trim() !== compiledPrompt.trim());
      const activePrompt = isEdited ? body.editedGenerationPrompt!.trim() : compiledPrompt;
      const promptOrigin: "compiled" | "edited" = isEdited ? "edited" : "compiled";
      const promptHash = crypto.createHash("sha256").update(activePrompt).digest("hex");

      compiledPromptResolved = compiledPrompt;
      activePromptResolved = activePrompt;
      promptHashResolved = promptHash;
      promptWasEditedResolved = isEdited;
      promptOriginResolved = promptOrigin;

      const t0 = Date.now();
      const rawLyrics = await callLLM(activePrompt, body, temperature, diagnosticAttempts);
      const dMs = Date.now() - t0;
      finalRaw = rawLyrics;
      lyrics = cleanSunoBracketHeaders(rawLyrics, {
        artistId: body.artistId,
        featureArtistId: body.featureArtistId,
        sectionVoices: body.sectionVoices,
      });
      pipelineStagesCompleted = ["holistic_generation_completed"];
      stageLogs.push({
        stageId: "holistic_ghostwriter",
        stageName: "Ghostwriter Holístico (1 Pasada Global)",
        description: isEdited ? "Generación con prompt personalizado y verificado" : "Generación holística con contexto global y jerarquía de prioridades",
        model: modelUsed,
        temperature,
        durationMs: dMs,
        prompt: activePrompt,
        rawResponse: rawLyrics,
      });

      finalAST = parseRawLyricsToAST(lyrics);

      // Auditoría no destructiva (Quality Gate observador, CERO auto-reparaciones destructivas)
      const flowProfile = getFlowProfile(body.artistId) || undefined;
      const structuralExpectations: Record<string, SectionCardinalityExpectation> = {};
      for (const sec of structure.sections) {
        const spec = resolveSectionSpec(structure.sections, body.sectionVoices, sec.type);
        const sectionVa = body.sectionVoices?.find(v => v.sectionName === sec.name);
        if (sectionVa?.bars) {
          structuralExpectations[sec.name] = { exact: sectionVa.bars };
        } else {
          structuralExpectations[sec.name] = { min: spec.minBars, max: spec.maxBars };
        }
      }

      if (languageDNA.flavorProfile && languageDNA.leadDialectProfile) {
        dialectAudit = auditDialectAndTranslationArtifacts(
          finalAST,
          languageDNA.flavorProfile,
          languageDNA.leadDialectProfile,
          languageDNA.featureDialectProfile
        );
      }

      auditContext = runInitialDeliveryAudit(
        finalAST,
        parsedBpm,
        flowProfile,
        userExplicitTerms,
        structuralExpectations,
        dialectAudit
      );
    }

    if (!lyrics || !lyrics.trim()) {
      return NextResponse.json({ error: "El motor de estudio no devolvió contenido válido." }, { status: 502 });
    }

    // Post-generation: final syllable-weighted and token-based language analysis
    const syllableFinal = calculateSyllableLanguageRatio(lyrics, languageTarget);
    if (languageDNA?.allocationPlan) {
      languageDNA.allocationPlan.observedEnglishRatio = Number((syllableFinal.englishPercent / 100).toFixed(2));
    }
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
      diagnosticAttempts,
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
        structureFingerprint: semanticAnchor.structureFingerprint,
        generationIntentHash: semanticAnchor.generationIntentHash,
        dramaticMotifId: semanticAnchor.dramaticMotifId,
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
      dialectAuditReport: dialectAudit ? {
        passed: dialectAudit.passed,
        translationArtifactScore: dialectAudit.translationArtifactScore,
        dialectContaminationScore: dialectAudit.dialectContaminationScore,
        slangChecklistScore: dialectAudit.slangChecklistScore,
        issuesCount: dialectAudit.issues.length,
      } : undefined,
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

    // --- VERSION GRAPH (Inmutable con AnalysisSnapshot adjunto y Metadatos de Trazabilidad) ---
    const resolvedTopP = 0.95;
    const isSectionRegen = Boolean(body.regenerateSection);
    const nodeMeta: VersionNodeMeta = {
      source: isSectionRegen ? "section-regeneration" : "initial",
      promptOrigin: promptOriginResolved,
      compiledPrompt: compiledPromptResolved,
      activePrompt: activePromptResolved,
      promptHash: promptHashResolved,
      promptWasEdited: promptWasEditedResolved,
      topP: resolvedTopP,
      lyrics,
    };

    const versionGraph = createInitialVersionGraph(
      finalAST,
      isSectionRegen
        ? `Regeneración de [${body.regenerateSection?.sectionName}]`
        : promptWasEditedResolved
        ? "Ghostwriter Holístico (Prompt Editado)"
        : "Ghostwriter Holístico v2.2",
      analysisSnapshot,
      nodeMeta
    );

    const promptPreviewLabel = isSectionRegen
      ? `Regeneración de sección [${body.regenerateSection?.sectionName}]`
      : promptWasEditedResolved
      ? `Ghostwriter Holístico (Prompt Editado — ${activePromptResolved.length} caracteres)`
      : `Ghostwriter Holístico v2.2 (1 Pasada — ${activePromptResolved.length} caracteres)`;

    return NextResponse.json({
      lyrics,
      songDocument: finalAST,
      analysisSnapshot,
      versionGraph,
      analysis,
      spanglishLabel: spanglishInfo.label,
      promptPreview: promptPreviewLabel,
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

    const targetArtistId = capturedBody?.artistId;
    const targetFeatId = capturedBody?.featureArtistId;
    const targetMoodId = capturedBody?.moodId;
    const targetBpmId = capturedBody?.bpmVibeId;
    const artistObj = targetArtistId ? getArtistById(targetArtistId) : undefined;
    const featObj = targetFeatId ? getArtistById(targetFeatId) : undefined;
    const moodObj = targetMoodId ? MOODS.find(m => m.id === targetMoodId) : undefined;
    const bpmVibe = targetBpmId ? BPM_VIBES.find(b => b.id === targetBpmId) : undefined;

    const errorLog: GenerationProcessLog = {
      timestamp: new Date().toISOString(),
      mode: processMode,
      modelUsed,
      totalDurationMs: Date.now() - pipelineStartTime,
      stages: stageLogs,
      diagnosticAttempts,
      finalRawLyrics: finalRaw,
      cleanedLyrics: lyrics,
      error: message,
      contextSummary: {
        artistName: artistObj?.name ?? capturedBody?.artistId ?? "Desconocido",
        featureArtistName: featObj?.name ?? capturedBody?.featureArtistId,
        mood: moodObj?.label ?? capturedBody?.moodId ?? "N/A",
        bpm: bpmVibe ? `${bpmVibe.range} BPM (${bpmVibe.label})` : (capturedBody?.bpmVibeId ?? "N/A"),
        structure: capturedBody?.structureId ?? "N/A",
        spanglishTarget: capturedBody?.spanglishPercent ?? 50,
        spanglishActual: 0,
        rhymeTier: capturedBody?.artistId ? getRhymeTier(capturedBody.artistId) : 1,
        dirtyLevel: capturedBody?.dirtyLevel ?? 2,
      },
    };

    return NextResponse.json({ error: message, generationLog: errorLog }, { status: 500 });
  }
}

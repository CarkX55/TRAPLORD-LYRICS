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
import { parseRawLyricsToAST } from "@/lib/song-document";

export const runtime = "nodejs";
export const maxDuration = 90;

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
  useLegacySinglePass?: boolean;
}

// Unified LLM Caller: Gemini API (User Key) or Z.ai SDK (Sandbox)
async function callLLM(prompt: string, body: GenerateBody, temperature: number = 0.72): Promise<string> {
  if (body.geminiApiKey && body.geminiApiKey.trim()) {
    const model = body.geminiModel || "gemini-2.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${body.geminiApiKey.trim()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            topP: 0.95,
          },
        }),
      }
    );
    const json = await res.json();
    if (json.error) {
      throw new Error(`Gemini: ${json.error.message}`);
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || !text.trim()) {
      throw new Error("Gemini no devolvió contenido.");
    }
    return text.trim();
  } else {
    // Sandbox z-ai
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
          })
        : Promise.resolve(null),
    ]);

    const promptParams: PromptParams = {
      artistId: body.artistId,
      featureArtistId: body.featureArtistId ?? "",
      moodId,
      topics: resolveTopics(body.topics),
      customTopic: body.customTopic,
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
    };

    const temperature = typeof body.temperature === "number" ? body.temperature : 0.72;
    const modelUsed = (body.geminiApiKey && body.geminiApiKey.trim()) ? (body.geminiModel || "gemini-2.5-flash") : "sandbox-z-ai";
    const pipelineStartTime = Date.now();
    let lyrics = "";
    let finalRaw = "";
    let pipelineStagesCompleted: string[] = [];
    const stageLogs: GenerationStageLog[] = [];
    let processMode: GenerationProcessLog["mode"] = "pipeline_3_pass";

    // CASE 1: Single section regeneration
    if (body.regenerateSection) {
      processMode = "regenerate_section";
      const singlePrompt = buildSystemPrompt(promptParams);
      const t0 = Date.now();
      const rawLyrics = await callLLM(singlePrompt, body, temperature);
      const dMs = Date.now() - t0;
      finalRaw = rawLyrics;
      lyrics = cleanSunoBracketHeaders(rawLyrics);
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
      lyrics = cleanSunoBracketHeaders(rawLyrics);
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
    // CASE 3: STUDIO PIPELINE IN 3 PASSES (STANDARD)
    else {
      processMode = "pipeline_3_pass";
      // --- PASADA 1: Topliner & Rhythmic Engine (Hooks & Mantras) ---
      const stage1Prompt = buildStage1ToplinePrompt(promptParams);
      const t1 = Date.now();
      const stage1Topline = await callLLM(stage1Prompt, body, 0.82);
      const d1Ms = Date.now() - t1;
      pipelineStagesCompleted.push("topline_and_mantras_locked");
      stageLogs.push({
        stageId: "stage_1_topline",
        stageName: "Pasada 1: Topliner & Diseñador de Ganchos",
        description: "Diseño melódico, mantras rítmicos, economía de palabras y anáforas de estribillo",
        model: modelUsed,
        temperature: 0.82,
        durationMs: d1Ms,
        prompt: stage1Prompt,
        rawResponse: stage1Topline,
      });

      // --- PASADA 2: Ghostwriter & Verse Architect (Barras alrededor del Hook) ---
      const stage2Prompt = buildStage2GhostwriterPrompt(promptParams, stage1Topline);
      const t2 = Date.now();
      const stage2Lyrics = await callLLM(stage2Prompt, body, 0.72);
      const d2Ms = Date.now() - t2;
      pipelineStagesCompleted.push("verses_and_storytelling_completed");
      stageLogs.push({
        stageId: "stage_2_ghostwriter",
        stageName: "Pasada 2: Ghostwriter & Versos Cinemáticos",
        description: "Estructura de la canción alrededor del Hook, ADN musical, rimas y giro dramático (Scene Engine)",
        model: modelUsed,
        temperature: 0.72,
        durationMs: d2Ms,
        prompt: stage2Prompt,
        rawResponse: stage2Lyrics,
      });

      // --- PASADA 3: Vocal Director & Call & Response Engineer ---
      const stage3Prompt = buildStage3VocalDirectorPrompt(promptParams, stage2Lyrics);
      const t3 = Date.now();
      const stage3Lyrics = await callLLM(stage3Prompt, body, 0.75);
      const d3Ms = Date.now() - t3;
      pipelineStagesCompleted.push("vocal_call_and_response_mastered");
      stageLogs.push({
        stageId: "stage_3_vocal_director",
        stageName: "Pasada 3: Director Vocal & Mezcla de Efectos",
        description: "Call & Response dialéctico, ad-libs con actitud, textura humana compás a compás y tags Suno v4.5",
        model: modelUsed,
        temperature: 0.75,
        durationMs: d3Ms,
        prompt: stage3Prompt,
        rawResponse: stage3Lyrics,
      });

      finalRaw = stage3Lyrics;
      lyrics = cleanSunoBracketHeaders(stage3Lyrics);
    }

    if (!lyrics || !lyrics.trim()) {
      return NextResponse.json({ error: "El motor de estudio no devolvió contenido válido." }, { status: 502 });
    }

    // Post-generation: analyze the language ratio
    const analysis: LanguageAnalysis = analyzeLanguageRatio(lyrics, body.spanglishPercent);
    const spanglishInfo = buildSpanglishInstruction(body.spanglishPercent);

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
        spanglishActual: analysis.englishPercent,
        rhymeTier: getRhymeTier(body.artistId),
        dirtyLevel: body.dirtyLevel ?? 2,
      },
    };

    return NextResponse.json({
      lyrics,
      songDocument: parseRawLyricsToAST(lyrics),
      analysis,
      spanglishLabel: spanglishInfo.label,
      promptPreview: `Pipeline de Estudio (${stageLogs.length} ${stageLogs.length === 1 ? "Pasada" : "Pasadas"}) completado con éxito: ${pipelineStagesCompleted.join(" ➔ ")}`,
      temperature,
      beatPrompt,
      sunoStylePrompt: sunoStyleResult.prompt,
      sunoLayers: sunoStyleResult.layers,
      sunoCharCount: sunoStyleResult.charCount,
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

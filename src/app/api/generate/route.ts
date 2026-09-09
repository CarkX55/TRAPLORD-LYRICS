import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, buildSpanglishInstruction, buildSunoStyleResult, type LockedSection, type RegenerateSectionParams, type SectionVoiceAssignment } from "@/lib/prompt-builder";

import { MOODS, TOPICS, BPM_VIBES, STRUCTURES, NARRATIVE_ARCS, BEAT_TYPES, generateBeatPrompt, getArtistById, type SongSection, type SongStructure } from "@/lib/trap-data";
import { buildCorrectionInstruction, analyzeLanguageRatio, type LanguageAnalysis } from "@/lib/language-detector";
import { getArtistReference } from "@/lib/artist-references";
import { generateArtistReference } from "@/lib/reference-generator";
import { analyzeReferenceTrack } from "@/lib/track-analyzer";

export const runtime = "nodejs";
export const maxDuration = 90; // increased for reference generation + track analysis

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
  previousLyrics?: string; // for re-generation with correction
  autoCorrect?: boolean; // enable post-generation verification + auto re-gen
  referenceTrackLyrics?: string; // NEW Phase 4
  dynamicSongForm?: boolean; // NEW Phase 6
  producerName?: string; // ensure passed
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
}

// Get a reference for an artist: curated DB first, then generate on-the-fly (sandbox uses z-ai SDK)
async function getOrGenerateReference(artistId: string) {
  const curated = getArtistReference(artistId);
  if (curated) return curated;
  const artist = getArtistById(artistId);
  if (!artist) return null;
  try {
    return await generateArtistReference({ artistId, artistName: artist.name });
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

    // Phase 3+4: fetch/generate artist references + analyze reference track (all in parallel, sandbox uses z-ai SDK)
    const [mainRef, featRef, refTrack] = await Promise.all([
      getOrGenerateReference(body.artistId),
      body.featureArtistId ? getOrGenerateReference(body.featureArtistId) : Promise.resolve(null),
      body.referenceTrackLyrics?.trim()
        ? analyzeReferenceTrack({ lyrics: body.referenceTrackLyrics })
        : Promise.resolve(null),
    ]);

    const prompt = buildSystemPrompt({
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
    });

    // Call the LLM via z-ai-web-dev-sdk (server-side only)
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    // Temperature control: lower = more adherence to rules, higher = more creativity
    // Default 0.72 for tight rhymes and authentic flow
    const temperature = typeof body.temperature === "number" ? body.temperature : 0.72;
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "user", content: prompt },
      ],
      temperature,
    });

    const lyrics = completion.choices[0]?.message?.content;
    if (!lyrics || !lyrics.trim()) {
      return NextResponse.json({ error: "El modelo no devolvió contenido válido." }, { status: 502 });
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

    return NextResponse.json({
      lyrics,
      analysis,
      spanglishLabel: spanglishInfo.label,
      promptPreview: prompt.slice(0, 500) + "...",
      temperature,
      beatPrompt,
      sunoStylePrompt: sunoStyleResult.prompt,
      sunoLayers: sunoStyleResult.layers,
      sunoCharCount: sunoStyleResult.charCount,
      refTrackSummary: refTrack?.summary ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido en la generación.";
    console.error("[generate] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

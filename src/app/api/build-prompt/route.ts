import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, buildSpanglishInstruction, buildSunoStylePrompt, type LockedSection, type RegenerateSectionParams, type SectionVoiceAssignment } from "@/lib/prompt-builder";
import { MOODS, TOPICS, BPM_VIBES, STRUCTURES, NARRATIVE_ARCS, BEAT_TYPES, generateBeatPrompt, getArtistById } from "@/lib/trap-data";
import { analyzeLanguageRatio, buildCorrectionInstruction } from "@/lib/language-detector";
import { getArtistReference } from "@/lib/artist-references";
import { generateArtistReference } from "@/lib/reference-generator";
import { analyzeReferenceTrack } from "@/lib/track-analyzer";

export const runtime = "nodejs";
export const maxDuration = 60; // increased for on-the-fly reference generation + track analysis

interface BuildPromptBody {
  artistId: string;
  featureArtistId?: string;
  moodId: string;
  topics: string[];
  customTopic: string;
  spanglishPercent: number;
  bpmVibeId: string;
  beatTypeId?: string;
  structureId: string;
  narrativeArcId: string;
  producerId?: string;
  producerTag: string;
  producerName?: string;
  customDictionary: string;
  dynamicMarkers: boolean;
  featureSimId?: string;
  customIntro?: string;
  collabInteraction?: boolean;
  altVoiceAsterisks?: boolean;
  syllableSync?: boolean;
  phoneticAdlibs?: boolean;
  smartBarsMode?: boolean;
  sectionVoices?: { sectionName: string; voice: string; bars?: number; density?: "sparse" | "normal" | "dense" | "extra_dense" }[];
  chorusLanguageOverride?: "es" | "en" | "auto";
  versesLanguageOverride?: "es" | "en" | "auto";
  barCountOverride?: number;
  temperature?: number;
  rhymeSchemeId?: string;
  lockedSections?: LockedSection[];
  regenerateSection?: RegenerateSectionParams;
  previousLyrics?: string;
  autoCorrect?: boolean;
  geminiApiKey?: string;   // NEW — for reference generation on Vercel
  geminiModel?: string;    // NEW
  referenceTrackLyrics?: string;  // NEW Phase 4 — pasted reference track to extract DNA from
  dynamicSongForm?: boolean;      // NEW Phase 6 — toggle dynamic structure
}

function resolveTopics(topicIds: string[]): string[] {
  return topicIds
    .map(id => TOPICS.find(t => t.id === id)?.label)
    .filter((x): x is string => Boolean(x));
}

// Get a reference for an artist: curated DB first, then generate on-the-fly (graceful fallback)
async function getOrGenerateReference(
  artistId: string,
  geminiApiKey?: string,
  geminiModel?: string
) {
  // 1. Check curated DB (50 artists) — instant
  const curated = getArtistReference(artistId);
  if (curated) return curated;

  // 2. Non-curated artist — generate on-the-fly
  const artist = getArtistById(artistId);
  if (!artist) return null;

  try {
    const generated = await generateArtistReference({
      artistId,
      artistName: artist.name,
      geminiApiKey,
      geminiModel,
    });
    return generated;
  } catch (err) {
    console.error(`[build-prompt] reference generation failed for ${artistId}:`, err instanceof Error ? err.message : err);
    return null; // graceful — build prompt without reference
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BuildPromptBody;

    const bpmVibe = BPM_VIBES.find(b => b.id === body.bpmVibeId) ?? BPM_VIBES[5];
    const structure = STRUCTURES.find(s => s.id === body.structureId) ?? STRUCTURES[0];
    const narrativeArc = NARRATIVE_ARCS.find(a => a.id === body.narrativeArcId) ?? NARRATIVE_ARCS[0];
    const moodObj = MOODS.find(m => m.id === body.moodId);
    const moodId = moodObj ? `${moodObj.label} — ${moodObj.description}` : body.moodId;
    const beatType = body.beatTypeId ? BEAT_TYPES.find(b => b.id === body.beatTypeId) : undefined;

    let correctionInstruction: string | undefined;
    if (body.previousLyrics && body.autoCorrect) {
      const analysis = analyzeLanguageRatio(body.previousLyrics, body.spanglishPercent);
      if (analysis.status === "off") {
        correctionInstruction = buildCorrectionInstruction(analysis);
      }
    }

    // Phase 3: fetch/generate peak-era references for main + feature artists + Phase 4: analyze reference track (all in parallel)
    const [mainRef, featRef, refTrack] = await Promise.all([
      getOrGenerateReference(body.artistId, body.geminiApiKey, body.geminiModel),
      body.featureArtistId
        ? getOrGenerateReference(body.featureArtistId, body.geminiApiKey, body.geminiModel)
        : Promise.resolve(null),
      body.referenceTrackLyrics?.trim()
        ? analyzeReferenceTrack({ lyrics: body.referenceTrackLyrics, geminiApiKey: body.geminiApiKey, geminiModel: body.geminiModel })
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
      sectionVoices: body.sectionVoices,
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
    });

    const spanglishInfo = buildSpanglishInstruction(body.spanglishPercent);
    const beatPrompt = generateBeatPrompt(body.artistId, body.moodId, body.bpmVibeId, body.producerId ?? "none");
    const sunoStylePrompt = buildSunoStylePrompt({
      beatType,
      bpmVibe,
      moodId: body.moodId,
      artistId: body.artistId,
      producerId: body.producerId ?? "none",
      structureLabel: structure.label,
    });

    return NextResponse.json({
      prompt,
      spanglishLabel: spanglishInfo.label,
      beatPrompt,
      sunoStylePrompt,
      temperature: body.temperature ?? 0.72,
      mainRefSource: mainRef?.source ?? null,
      featRefSource: featRef?.source ?? null,
      refTrackSummary: refTrack?.summary ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error construyendo el prompt.";
    console.error("[build-prompt] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

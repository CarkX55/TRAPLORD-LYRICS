"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Mic2, Music, Zap, Settings2, ChevronDown, Copy, RotateCcw, Sparkles,
  Languages, Target, Activity, Save, Trash2, Wand2, Gauge,
  Disc3, Flame, Heart, Skull, PartyPopper, Brain, MapPin,
  Download, History, Keyboard, Thermometer, FileText, Hash,
  Lock, Unlock, GitCompare, Waves, Mic, Type,
  RefreshCw, Share2, Link2, Shuffle, BarChart3, Clock, TrendingUp,
  MessageSquare, Award, AlertCircle, Lightbulb, AudioLines, Music2,
  Image, Star, Quote, Instagram, Twitter, Video, ListMusic, Radio, Key
} from "lucide-react";
import {
  ARTISTS_DATA, MOODS, TOPICS, BPM_VIBES, STRUCTURES, NARRATIVE_ARCS, PRODUCERS, RHYME_SCHEMES,
  BEAT_TYPES, FEATURE_SIMS,
  getArtistById, getProducerById, getRhymeSchemeById, getBeatTypeById, getFeatureSimById, generateBeatPrompt,
  type Artist, type BeatPrompt
} from "@/lib/trap-data";
import { buildSpanglishInstruction, buildSunoStylePrompt, type LockedSection, type SectionVoiceAssignment } from "@/lib/prompt-builder";
import { getFlowProfile, getCadenceLabel, type FlowProfile } from "@/lib/artist-flow-profiles";
import { analyzeLanguageRatio, type LanguageAnalysis } from "@/lib/language-detector";
import { analyzeRhymes, getRhymeGroupForLine, type RhymeAnalysis } from "@/lib/rhyme-detector";
import { analyzeWordStats, type WordStats } from "@/lib/word-stats";
import { diffLyrics, type DiffResult } from "@/lib/lyrics-diff";
import { computeQualityScore, type QualityScore } from "@/lib/quality-score";
import { analyzeMoodMatch, type MoodMatchResult } from "@/lib/mood-match";
import { analyzeSyllables, type SyllableAnalysis } from "@/lib/syllable-counter";
import { analyzeThemes, type ThemeResult } from "@/lib/theme-analyzer";
import { detectRhymeScheme, type SchemeAnalysis } from "@/lib/rhyme-scheme-detector";
import { calculateBeatFit, estimateVocalRange, type BeatFitResult, type VocalRange } from "@/lib/beat-fit";
import { detectPunchlines, type PunchlineAnalysis } from "@/lib/punchline-detector";
import { generateFlowWaveform, getIntensityColor, type FlowWaveform } from "@/lib/flow-visualizer";
import { analyzePlaylistFit, type PlaylistFitResult } from "@/lib/playlist-fit";
import { simulatePerformance, type PerformanceSimulation } from "@/lib/live-performance";

interface GenerateResponse {
  lyrics: string;
  analysis: LanguageAnalysis;
  spanglishLabel: string;
  promptPreview: string;
  beatPrompt?: BeatPrompt;
}

interface Preset {
  date: string;
  artist: string;
  mood: string;
  bpm: string;
  structure: string;
  spanglish: number;
  topics: string[];
  label: string;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  artistName: string;
  moodLabel: string;
  spanglishPercent: number;
  actualEnglishPercent: number;
  deviation: number;
  status: "perfect" | "close" | "off";
  lyricsPreview: string;
  fullLyrics: string;
  analysis: LanguageAnalysis;
}

const MOOD_ICONS: Record<string, typeof Flame> = {
  agresivo: Flame, melancolico: Heart, flex: Zap, fiesta: PartyPopper,
  introspectivo: Brain, oscuro: Skull, romantico: Heart, calle: MapPin,
};

// Parse lyrics into sections for styled display
function parseLyrics(raw: string) {
  const lines = raw.split("\n");
  const sections: { tag: string; interpreter: string; lines: string[] }[] = [];
  let current: { tag: string; interpreter: string; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const tagMatch = trimmed.match(/^(?:[*#\-\s]*)(\[[^\]]+\])(?:[*#\-\s:]*)$/);
    const interpMatch = trimmed.match(/^\*?Interpr[èe]te?:\s*(.+?)\*?$/i)
      || trimmed.match(/^\*?Intérprete?:\s*(.+?)\*?$/i);

    if (tagMatch) {
      if (current) sections.push(current);
      const fullTag = tagMatch[1];
      const colonMatch = fullTag.match(/^\[([^:]+):\s*([^\]]+)\]$/);
      if (colonMatch) {
        current = { tag: `[${colonMatch[1].trim()}]`, interpreter: colonMatch[2].trim(), lines: [] };
      } else {
        current = { tag: fullTag, interpreter: "", lines: [] };
      }
    } else if (interpMatch && current) {
      current.interpreter = interpMatch[1].replace(/\*/g, "").trim();
    } else if (current) {
      current.lines.push(line);
    } else if (trimmed) {
      // preamble before first tag — attach as "Intro"
      current = { tag: "[Intro]", interpreter: "", lines: [line] };
    }
  }
  if (current) sections.push(current);
  return sections;
}

function renderLyricLine(line: string, key: string) {
  // Highlight [tags] and (ad-libs)
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let idx = 0;
  const regex = /(\[[^\]]*\]|\([^)]*\))/g;
  let match;
  let lastIndex = 0;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${idx}`}>{line.slice(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    if (token.startsWith("[")) {
      parts.push(<span key={`tag-${idx}`} className="section-tag">{token}</span>);
    } else {
      parts.push(<span key={`ad-${idx}`} className="adlib">{token}</span>);
    }
    lastIndex = match.index + token.length;
    idx++;
  }
  if (lastIndex < line.length) {
    parts.push(<span key={`end-${idx}`}>{line.slice(lastIndex)}</span>);
  }
  return <div key={key}>{parts.length > 0 ? parts : line}</div>;
}

export default function TrapGhostPage() {
  // ===== State =====
  const [artistId, setArtistId] = useState<string>("future");
  const [featureArtistId, setFeatureArtistId] = useState<string>("none");
  const [moodId, setMoodId] = useState<string>("agresivo");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["t_dinero", "t_enemigos"]);
  const [customTopic, setCustomTopic] = useState<string>("");
  const [spanglishPercent, setSpanglishPercent] = useState<number>(50);
  const [bpmVibeId, setBpmVibeId] = useState<string>("bpm_trap_standard");
  const [structureId, setStructureId] = useState<string>("std_basic");
  const [narrativeArcId, setNarrativeArcId] = useState<string>("none");
  const [producerTag, setProducerTag] = useState<string>("");
  const [producerId, setProducerId] = useState<string>("none");
  const [customDictionary, setCustomDictionary] = useState<string>("");
  const [dynamicMarkers, setDynamicMarkers] = useState<boolean>(false);
  const [autoCorrect, setAutoCorrect] = useState<boolean>(true);
  // NEW: advanced controls
  const [temperature, setTemperature] = useState<number>(0.9);
  const [chorusLangOverride, setChorusLangOverride] = useState<"auto" | "es" | "en">("auto");
  const [versesLangOverride, setVersesLangOverride] = useState<"auto" | "es" | "en">("auto");
  const [barCountOverride, setBarCountOverride] = useState<number>(0); // 0 = auto
  const [rhymeSchemeId, setRhymeSchemeId] = useState<string>("rs_free");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  // Round 3: lock sections + compare + beat prompt
  const [lockedSections, setLockedSections] = useState<LockedSection[]>([]);
  const [compareEntryId, setCompareEntryId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState<boolean>(false);
  const [beatPrompt, setBeatPrompt] = useState<BeatPrompt | null>(null);
  // Round 4: rhyme heatmap + share URL
  const [rhymeHeatmapOn, setRhymeHeatmapOn] = useState<boolean>(true);
  const [shareUrl, setShareUrl] = useState<string>("");
  // Round 5: diff view + word stats + randomize
  const [diffTargetId, setDiffTargetId] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState<boolean>(false);
  // Round 7: translation + remix
  const [translatedLyrics, setTranslatedLyrics] = useState<string | null>(null);
  const [translating, setTranslating] = useState<boolean>(false);
  const [translationOpen, setTranslationOpen] = useState<boolean>(false);
  const [remixOpen, setRemixOpen] = useState<boolean>(false);
  const [remixSelections, setRemixSelections] = useState<Record<string, string>>({}); // sectionName -> historyEntryId
  // Round 8: lyrics critic
  const [criticResult, setCriticResult] = useState<{ overallScore: number; summary: string; feedback: { type: string; line?: string; text: string }[]; raw?: boolean } | null>(null);
  const [criticLoading, setCriticLoading] = useState<boolean>(false);
  const [criticOpen, setCriticOpen] = useState<boolean>(false);
  // Round 9: cover art
  const [coverArt, setCoverArt] = useState<string | null>(null);  // base64 image
  const [coverArtLoading, setCoverArtLoading] = useState<boolean>(false);
  const [coverArtOpen, setCoverArtOpen] = useState<boolean>(false);
  // Round 10: social caption
  const [socialCaption, setSocialCaption] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState<boolean>(false);
  const [socialOpen, setSocialOpen] = useState<boolean>(false);
  const [socialPlatform, setSocialPlatform] = useState<"instagram" | "twitter" | "tiktok">("instagram");
  // Round 11: beat type + feature sim + advanced toggles + section voices + suno prompt
  const [beatTypeId, setBeatTypeId] = useState<string>("");
  const [featureSimId, setFeatureSimId] = useState<string>("solo");
  const [customIntro, setCustomIntro] = useState<string>("");
  const [collabInteraction, setCollabInteraction] = useState<boolean>(false);
  const [altVoiceAsterisks, setAltVoiceAsterisks] = useState<boolean>(false);
  const [syllableSync, setSyllableSync] = useState<boolean>(false);
  const [phoneticAdlibs, setPhoneticAdlibs] = useState<boolean>(false);
  const [smartBarsMode, setSmartBarsMode] = useState<boolean>(false);
  const [dynamicSongForm, setDynamicSongForm] = useState<boolean>(true); // Phase 6 — default ON
  const [sectionVoices, setSectionVoices] = useState<SectionVoiceAssignment[]>([]);
  const [sunoStylePrompt, setSunoStylePrompt] = useState<string>("");
  // Round 12: API Key + model selector + producer name + flow profile
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [geminiModel, setGeminiModel] = useState<string>("gemini-2.0-flash");
  const [producerName, setProducerName] = useState<string>("Markoff");
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [fixingFromCritic, setFixingFromCritic] = useState<boolean>(false);
  // Producer Tag Generator
  const [producerTags, setProducerTags] = useState<{ text: string; style: string }[]>([]);
  const [producerTagLoading, setProducerTagLoading] = useState<boolean>(false);
  const [producerTagOpen, setProducerTagOpen] = useState<boolean>(false);
  // Agent Polish (multi-agente IA)
  const [polishResult, setPolishResult] = useState<{
    originalScore: number;
    finalScore: number;
    polishedLyrics: string;
    agentReports: { agent: string; score: number; issues: string[]; suggestions: string[] }[];
    improvements: string[];
    iterations?: { iteration: number; score: number; agents: { agent: string; score: number }[] }[];
    autoIterate?: boolean;
    threshold?: number;
    tier?: number;
    tierLabel?: string;
    stoppedReason?: string;
  } | null>(null);
  const [polishLoading, setPolishLoading] = useState<boolean>(false);
  const [polishOpen, setPolishOpen] = useState<boolean>(false);
  const [polishAutoIterate, setPolishAutoIterate] = useState<boolean>(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  // Reference Track Importer (Phase 4)
  const [refTrackOpen, setRefTrackOpen] = useState<boolean>(false);
  const [refTrackLyrics, setRefTrackLyrics] = useState<string>("");
  const [refTrackAnalysis, setRefTrackAnalysis] = useState<string | null>(null);

  // Output state
  const [lyrics, setLyrics] = useState<string>("");
  const [analysis, setAnalysis] = useState<LanguageAnalysis | null>(null);
  const [spanglishLabel, setSpanglishLabel] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [regenCount, setRegenCount] = useState<number>(0);

  // Presets
  const [presets, setPresets] = useState<Preset[]>([]);
  const [advOpen, setAdvOpen] = useState<boolean>(false);

  const lyricsRef = useRef<HTMLDivElement>(null);

  // ===== Load presets from localStorage on mount =====
  useEffect(() => {
    try {
      const stored = localStorage.getItem("trapghost_presets");
      if (stored) setPresets(JSON.parse(stored));
    } catch {}
    try {
      const storedKey = localStorage.getItem("gemini_api_key");
      if (storedKey) {
        setGeminiApiKey(storedKey);
        // Cargar modelos vía proxy del servidor
        fetch("/api/gemini-models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: storedKey }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.models) setAvailableModels(data.models);
          })
          .catch(() => {});
      }
      const storedModel = localStorage.getItem("gemini_model");
      if (storedModel) setGeminiModel(storedModel);
      const storedProducer = localStorage.getItem("producer_name");
      if (storedProducer) setProducerName(storedProducer);
    } catch {}
  }, []);

  // ===== Fetch available Gemini models from API =====
  const fetchGeminiModels = useCallback(async (apiKey: string) => {
    if (!apiKey.trim()) {
      setAvailableModels([]);
      return;
    }
    setLoadingModels(true);
    try {
      // Usar proxy del servidor para evitar CORS
      const res = await fetch("/api/gemini-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(`Error: ${data.error}`);
        setAvailableModels([]);
        return;
      }
      const models = data.models || [];
      setAvailableModels(models);
      if (models.length > 0) {
        const currentExists = models.some((m: { id: string }) => m.id === geminiModel);
        if (!currentExists) setGeminiModel(models[0].id);
        toast.success(`${models.length} modelos disponibles cargados`);
      }
    } catch {
      toast.error("No se pudo cargar la lista de modelos");
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [geminiModel]);

  // ===== Derived: spanglish info (FIXED: single source of truth) =====
  const spanglishInfo = useMemo(
    () => buildSpanglishInstruction(spanglishPercent),
    [spanglishPercent]
  );

  // ===== Derived: artist info =====
  const artist = useMemo(() => getArtistById(artistId), [artistId]);
  const featureArtist = useMemo(() => featureArtistId && featureArtistId !== "none" ? getArtistById(featureArtistId) : null, [featureArtistId]);
  const bpmVibe = useMemo(() => BPM_VIBES.find(b => b.id === bpmVibeId) ?? BPM_VIBES[5], [bpmVibeId]);
  const structure = useMemo(() => STRUCTURES.find(s => s.id === structureId) ?? STRUCTURES[0], [structureId]);
  const beatType = useMemo(() => beatTypeId ? getBeatTypeById(beatTypeId) : undefined, [beatTypeId]);
  const featureSim = useMemo(() => getFeatureSimById(featureSimId) ?? FEATURE_SIMS[0], [featureSimId]);
  const flowProfile = useMemo(() => artistId ? getFlowProfile(artistId) : null, [artistId]);

  // When artist changes, apply their default spanglish suggestion (only if user hasn't manually touched recently)
  const artistDefaultApplied = useRef(false);
  useEffect(() => {
    if (artist?.defaultSpanglish !== undefined && !artistDefaultApplied.current) {
      setSpanglishPercent(artist.defaultSpanglish);
    }
    artistDefaultApplied.current = false;
  }, [artistId]);

  // ===== Topic toggle =====
  const toggleTopic = useCallback((id: string) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }, []);

  // ===== Generate =====
  const handleGenerate = useCallback(async (isRegen: boolean = false) => {
    setLoading(true);
    setRegenCount(isRegen ? regenCount + 1 : 0);

    const configPayload = {
      artistId,
      featureArtistId: featureArtistId === "none" ? "" : featureArtistId,
      moodId,
      topics: selectedTopics,
      customTopic,
      spanglishPercent,
      bpmVibeId,
      beatTypeId: beatTypeId || undefined,
      structureId,
      narrativeArcId,
      producerId,
      producerTag,
      producerName,
      customDictionary,
      dynamicMarkers,
      featureSimId,
      customIntro: customIntro || undefined,
      collabInteraction,
      altVoiceAsterisks,
      syllableSync,
      phoneticAdlibs,
      smartBarsMode,
      sectionVoices: sectionVoices.length > 0 ? sectionVoices : undefined,
      chorusLanguageOverride: chorusLangOverride,
      versesLanguageOverride: versesLangOverride,
      barCountOverride: barCountOverride > 0 ? barCountOverride : undefined,
      rhymeSchemeId,
      lockedSections: lockedSections.length > 0 ? lockedSections : undefined,
      temperature,
      autoCorrect: autoCorrect && isRegen,
      previousLyrics: isRegen ? lyrics : undefined,
      geminiApiKey: geminiApiKey || undefined,
      geminiModel,
      referenceTrackLyrics: refTrackOpen && refTrackLyrics.trim() ? refTrackLyrics : undefined,
      dynamicSongForm,
    };

    try {
      // === MODO GEMINI DIRECTO (desde el navegador del usuario) ===
      if (geminiApiKey && geminiApiKey.trim()) {
        const promptRes = await fetch("/api/build-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(configPayload),
        });
        const promptData: { prompt?: string; spanglishLabel?: string; beatPrompt?: BeatPrompt; sunoStylePrompt?: string; temperature?: number; error?: string; refTrackSummary?: string } = await promptRes.json();
        if (!promptRes.ok || promptData.error) {
          throw new Error(promptData.error || "Error construyendo el prompt");
        }
        // Capture reference track analysis summary (Phase 4)
        if (promptData.refTrackSummary) {
          setRefTrackAnalysis(promptData.refTrackSummary);
        }

        const model = geminiModel || "gemini-2.5-flash";
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey.trim()}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptData.prompt }] }],
              generationConfig: {
                temperature: promptData.temperature ?? 0.72,
                topP: 0.95,
                thinkingConfig: { thinkingBudget: -1 },
              },
            }),
          }
        );
        const geminiJson = await geminiRes.json();
        if (geminiJson.error) {
          throw new Error(`Gemini: ${geminiJson.error.message}`);
        }
        const newLyrics = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!newLyrics || !newLyrics.trim()) {
          throw new Error("Gemini no devolvió contenido válido.");
        }

        const langAnalysis = analyzeLanguageRatio(newLyrics, spanglishPercent);
        setLyrics(newLyrics);
        setAnalysis(langAnalysis);
        setSpanglishLabel(promptData.spanglishLabel ?? "");
        if (promptData.beatPrompt) setBeatPrompt(promptData.beatPrompt);
        if (promptData.sunoStylePrompt) setSunoStylePrompt(promptData.sunoStylePrompt);
        if (lockedSections.length > 0) setLockedSections([]);

        const moodLabel = MOODS.find(m => m.id === moodId)?.label ?? moodId;
        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
          artistName: artist?.name ?? "Libre",
          moodLabel,
          spanglishPercent,
          actualEnglishPercent: langAnalysis.englishPercent,
          deviation: langAnalysis.deviation,
          status: langAnalysis.status,
          lyricsPreview: newLyrics.slice(0, 120).replace(/\n/g, " "),
          fullLyrics: newLyrics,
          analysis: langAnalysis,
        };
        setHistory(prev => [entry, ...prev].slice(0, 8));
        toast.success(isRegen ? "Letra regenerada con corrección" : "Letra generada (Gemini)");
        setTimeout(() => lyricsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        return;
      }

      // === MODO Z.ai SDK (servidor sandbox) ===
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configPayload),
      });
      const data: GenerateResponse & { error?: string; refTrackSummary?: string } = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error en la generación");
      }
      // Capture reference track analysis summary (Phase 4)
      if (data.refTrackSummary) {
        setRefTrackAnalysis(data.refTrackSummary);
      }
      setLyrics(data.lyrics);
      setAnalysis(data.analysis);
      setSpanglishLabel(data.spanglishLabel);
      if (data.beatPrompt) setBeatPrompt(data.beatPrompt);
      if ((data as { sunoStylePrompt?: string }).sunoStylePrompt) setSunoStylePrompt((data as { sunoStylePrompt?: string }).sunoStylePrompt!);
      if (lockedSections.length > 0) setLockedSections([]);
      const moodLabel = MOODS.find(m => m.id === moodId)?.label ?? moodId;
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        artistName: artist?.name ?? "Libre",
        moodLabel,
        spanglishPercent,
        actualEnglishPercent: data.analysis.englishPercent,
        deviation: data.analysis.deviation,
        status: data.analysis.status,
        lyricsPreview: data.lyrics.slice(0, 120).replace(/\n/g, " "),
        fullLyrics: data.lyrics,
        analysis: data.analysis,
      };
      setHistory(prev => [entry, ...prev].slice(0, 8));
      toast.success(isRegen ? "Letra regenerada con corrección de idioma" : "Letra generada");
      setTimeout(() => lyricsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [artistId, featureArtistId, moodId, selectedTopics, customTopic, spanglishPercent,
      bpmVibeId, structureId, narrativeArcId, producerId, producerTag, customDictionary,
      dynamicMarkers, autoCorrect, chorusLangOverride, versesLangOverride, barCountOverride,
      temperature, rhymeSchemeId, lockedSections, lyrics, regenCount, artist,
      beatTypeId, featureSimId, customIntro, collabInteraction, altVoiceAsterisks,
      syllableSync, phoneticAdlibs, smartBarsMode, sectionVoices,
      geminiApiKey, geminiModel, producerName, refTrackOpen, refTrackLyrics, dynamicSongForm]);

  // ===== Copy for Suno AI (Clean Bracketed Format) =====
  const handleCopySuno = useCallback(async () => {
    if (!lyrics) return;
    try {
      const clean = lyrics
        .replace(/^###\s*(\[[^\]]+\])/gm, "$1")
        .replace(/^\*+Interpr[èe]te?:\s*([^*\n]+)\*+$/gim, "")
        .replace(/^\s*[\r\n]/gm, "\n")
        .trim();
      await navigator.clipboard.writeText(clean);
      toast.success("⚡ Letra copiada limpia (lista para Suno AI)");
    } catch {
      toast.error("No se pudo copiar");
    }
  }, [lyrics]);

  // ===== Copy lyrics (raw) =====
  const handleCopy = useCallback(async () => {
    if (!lyrics) return;
    try {
      await navigator.clipboard.writeText(lyrics);
      toast.success("Letra copiada al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  }, [lyrics]);

  // ===== Copy as Markdown =====
  const handleCopyMarkdown = useCallback(async () => {
    if (!lyrics) return;
    const md = `# Letra Generada — TrapGhost\n\n**Artista:** ${artist?.name ?? "Libre"}  \n**Mood:** ${MOODS.find(m => m.id === moodId)?.label ?? moodId}  \n**Spanglish:** ${spanglishPercent}% EN (objetivo) → ${analysis?.englishPercent ?? "?"}% EN (real)  \n**BPM:** ${bpmVibe.range}  \n**Estructura:** ${structure.label}\n\n---\n\n${lyrics}`;
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Letra copiada como Markdown");
    } catch {
      toast.error("No se pudo copiar");
    }
  }, [lyrics, artist, moodId, spanglishPercent, analysis, bpmVibe, structure]);

  // ===== Download as .txt =====
  const handleDownload = useCallback(() => {
    if (!lyrics) return;
    const blob = new Blob([lyrics], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trapghost-${artist?.id ?? "libre"}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Letra descargada");
  }, [lyrics, artist]);

  // ===== Export as PDF (opens print dialog with styled layout) =====
  const handleExportPDF = useCallback(() => {
    if (!lyrics) return;
    const moodLabel = MOODS.find(m => m.id === moodId)?.label ?? moodId;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión (permite popups)");
      return;
    }
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>TrapGhost — ${artist?.name ?? "Libre"} · ${moodLabel}</title>
<style>
  @page { size: A4; margin: 2cm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    color: #111;
    background: #fff;
    line-height: 1.8;
    padding: 20px;
  }
  .header {
    text-align: center;
    border-bottom: 3px solid #00ff41;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .title {
    font-size: 28px;
    font-weight: bold;
    color: #050505;
    margin: 0 0 4px;
  }
  .subtitle {
    font-size: 13px;
    color: #666;
    margin: 0;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    margin-top: 12px;
    font-size: 11px;
    color: #888;
  }
  .meta span {
    padding: 3px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  .section {
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  .section-tag {
    color: #00aa33;
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .interpreter {
    color: #999;
    font-style: italic;
    font-size: 11px;
    margin-bottom: 6px;
  }
  .lyric-line {
    padding: 1px 0;
  }
  .adlib {
    color: #ff0055;
    font-style: italic;
  }
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    text-align: center;
    font-size: 10px;
    color: #aaa;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1 class="title">TrapGhost Letra</h1>
    <p class="subtitle">${artist?.name ?? "Artista Libre"} · ${moodLabel}</p>
    <div class="meta">
      <span>🎵 ${bpmVibe.range} BPM</span>
      <span>🌐 ${spanglishPercent}% EN / ${100 - spanglishPercent}% ES</span>
      <span>📋 ${structure.label}</span>
      ${producerId !== "none" ? `<span>🎛️ ${getProducerById(producerId)?.name ?? ""}</span>` : ""}
      ${analysis ? `<span>📊 ${analysis.englishPercent}% EN real</span>` : ""}
    </div>
  </div>
  <div class="lyrics">
    ${parsedSections.map(sec => `
      <div class="section">
        <div class="section-tag">${sec.tag}</div>
        ${sec.interpreter ? `<div class="interpreter">Intérprete: ${sec.interpreter}</div>` : ""}
        <div>${sec.lines.filter(l => l.trim()).map(line => `<div class="lyric-line">${line.replace(/\(([^)]*)\)/g, '<span class="adlib">($1)</span>')}</div>`).join("")}</div>
      </div>
    `).join("")}
  </div>
  <div class="footer">
    Generado con TrapGhost · ${new Date().toLocaleString("es-ES")} · Powered by Z.ai
  </div>
  <div class="no-print" style="text-align:center; margin-top: 20px;">
    <button onclick="window.print()" style="padding: 10px 24px; font-size: 14px; background: #00ff41; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🖨️ Imprimir / Guardar PDF</button>
  </div>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success("PDF abierto en nueva ventana (usa Imprimir → Guardar como PDF)");
  }, [lyrics, artist, moodId, bpmVibe, structure, producerId, analysis, spanglishPercent]);

  // ===== Restore from history =====
  const restoreFromHistory = useCallback((entry: HistoryEntry) => {
    setLyrics(entry.fullLyrics);
    setAnalysis(entry.analysis);
    setSpanglishLabel(buildSpanglishInstruction(entry.spanglishPercent).label);
    setHistoryOpen(false);
    toast.success(`Letra restaurada del historial (${entry.timestamp})`);
    setTimeout(() => lyricsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    toast.success("Historial borrado");
  }, []);

  // ===== Lock section (pin a section to keep it during re-generation) =====
  const toggleLockSection = useCallback((sectionName: string, content: string) => {
    setLockedSections(prev => {
      const existing = prev.find(s => s.name === sectionName);
      if (existing) {
        const filtered = prev.filter(s => s.name !== sectionName);
        toast.success(`Sección "${sectionName}" desbloqueada`);
        return filtered;
      } else {
        toast.success(`Sección "${sectionName}" bloqueada`);
        return [...prev, { name: sectionName, content }];
      }
    });
  }, []);

  const isSectionLocked = useCallback((sectionName: string) => {
    return lockedSections.some(s => s.name === sectionName);
  }, [lockedSections]);

  // ===== Compare two generations =====
  const compareWith = useCallback((entry: HistoryEntry) => {
    setCompareEntryId(entry.id);
    setCompareOpen(true);
  }, []);

  // ===== Show diff (line-by-line changes) =====
  const showDiff = useCallback((entry: HistoryEntry) => {
    setDiffTargetId(entry.id);
    setDiffOpen(true);
  }, []);

  // ===== Copy beat prompt (Suno/Udio style) =====
  const handleCopyBeatPrompt = useCallback(async () => {
    if (!beatPrompt) return;
    const text = `Style: ${beatPrompt.styleTags}\n\nDescription: ${beatPrompt.description}\n\nInstruments: ${beatPrompt.instruments.join(", ")}\nEnergy: ${beatPrompt.energy}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Beat prompt copiado (para Suno/Udio)");
    } catch {
      toast.error("No se pudo copiar");
    }
  }, [beatPrompt]);

  // ===== Rhyme analysis (memoized from lyrics) =====
  const rhymeAnalysis: RhymeAnalysis | null = useMemo(() => {
    if (!lyrics || !rhymeHeatmapOn) return null;
    return analyzeRhymes(lyrics);
  }, [lyrics, rhymeHeatmapOn]);

  // ===== Word stats (memoized from lyrics) =====
  const wordStats: WordStats | null = useMemo(() => {
    if (!lyrics) return null;
    return analyzeWordStats(lyrics);
  }, [lyrics]);

  // ===== Quality score (memoized from wordStats + rhymeAnalysis + analysis) =====
  const qualityScore: QualityScore | null = useMemo(() => {
    if (!lyrics || !wordStats || !rhymeAnalysis || !analysis) return null;
    return computeQualityScore(
      wordStats,
      rhymeAnalysis,
      wordStats.nonEmptyLines,
      analysis.deviation,
      structure.sections.length,
      wordStats.sectionCount,
    );
  }, [lyrics, wordStats, rhymeAnalysis, analysis, structure]);

  // ===== Mood match (memoized from lyrics + moodId) =====
  const moodMatch: MoodMatchResult | null = useMemo(() => {
    if (!lyrics) return null;
    return analyzeMoodMatch(lyrics, moodId, structure.sections.length);
  }, [lyrics, moodId, structure]);

  // ===== Syllable analysis (memoized from lyrics) =====
  const syllableAnalysis: SyllableAnalysis | null = useMemo(() => {
    if (!lyrics) return null;
    return analyzeSyllables(lyrics);
  }, [lyrics]);

  // ===== Theme analysis (memoized from lyrics) =====
  const themeResult: ThemeResult | null = useMemo(() => {
    if (!lyrics) return null;
    return analyzeThemes(lyrics);
  }, [lyrics]);

  // ===== Rhyme scheme detection (memoized from lyrics + rhymeAnalysis) =====
  const schemeAnalysis: SchemeAnalysis | null = useMemo(() => {
    if (!lyrics || !rhymeAnalysis) return null;
    return detectRhymeScheme(lyrics, rhymeAnalysis);
  }, [lyrics, rhymeAnalysis]);

  // ===== Beat fit (memoized from syllableAnalysis + bpmVibe) =====
  const beatFit: BeatFitResult | null = useMemo(() => {
    if (!lyrics || !syllableAnalysis) return null;
    return calculateBeatFit(syllableAnalysis, bpmVibe);
  }, [lyrics, syllableAnalysis, bpmVibe]);

  // ===== Vocal range (memoized from artist) =====
  const vocalRange: VocalRange | null = useMemo(() => {
    return estimateVocalRange(artist ?? undefined);
  }, [artist]);

  // ===== Punchline detection (memoized from lyrics) =====
  const punchlineAnalysis: PunchlineAnalysis | null = useMemo(() => {
    if (!lyrics) return null;
    return detectPunchlines(lyrics);
  }, [lyrics]);

  // ===== Flow waveform (memoized from lyrics + syllableAnalysis) =====
  const flowWaveform: FlowWaveform | null = useMemo(() => {
    if (!lyrics || !syllableAnalysis) return null;
    return generateFlowWaveform(lyrics, syllableAnalysis);
  }, [lyrics, syllableAnalysis]);

  // ===== Playlist fit (memoized from all analyses) =====
  const playlistFit: PlaylistFitResult | null = useMemo(() => {
    if (!lyrics || !wordStats || !rhymeAnalysis) return null;
    const bpmNum = parseInt(bpmVibe.range.split("-")[1] ?? "130");
    return analyzePlaylistFit(bpmNum, spanglishPercent, moodId, themeResult, wordStats, rhymeAnalysis);
  }, [lyrics, wordStats, rhymeAnalysis, bpmVibe, spanglishPercent, moodId, themeResult]);

  // ===== Live performance simulation (memoized from lyrics + syllableAnalysis) =====
  const performanceSim: PerformanceSimulation | null = useMemo(() => {
    if (!lyrics || !syllableAnalysis) return null;
    return simulatePerformance(lyrics, syllableAnalysis, bpmVibe);
  }, [lyrics, syllableAnalysis, bpmVibe]);

  // ===== Lyrics diff (memoized from current lyrics + target history entry) =====
  const diffResult: DiffResult | null = useMemo(() => {
    if (!lyrics || !diffTargetId) return null;
    const target = history.find(h => h.id === diffTargetId);
    if (!target) return null;
    return diffLyrics(target.fullLyrics, lyrics);
  }, [lyrics, diffTargetId, history]);

  // ===== Randomize config (for inspiration) =====
  const handleRandomize = useCallback(() => {
    const allArtists = ARTISTS_DATA.flatMap(g => g.artists);
    const randomArtist = allArtists[Math.floor(Math.random() * allArtists.length)];
    const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    const randomBpm = BPM_VIBES[Math.floor(Math.random() * BPM_VIBES.length)];
    const randomStructure = STRUCTURES[Math.floor(Math.random() * STRUCTURES.length)];
    const randomArc = NARRATIVE_ARCS[Math.floor(Math.random() * NARRATIVE_ARCS.length)];
    const randomProducer = PRODUCERS[Math.floor(Math.random() * PRODUCERS.length)];
    const randomRhyme = RHYME_SCHEMES[Math.floor(Math.random() * RHYME_SCHEMES.length)];
    // Pick 2-4 random topics
    const shuffledTopics = [...TOPICS].sort(() => Math.random() - 0.5);
    const randomTopics = shuffledTopics.slice(0, Math.floor(Math.random() * 3) + 2).map(t => t.id);

    artistDefaultApplied.current = true;
    setArtistId(randomArtist.id);
    setMoodId(randomMood.id);
    setBpmVibeId(randomBpm.id);
    setStructureId(randomStructure.id);
    setNarrativeArcId(randomArc.id);
    setProducerId(randomProducer.id);
    setProducerTag(randomProducer.tag || "");
    setRhymeSchemeId(randomRhyme.id);
    setSelectedTopics(randomTopics);
    if (randomArtist.defaultSpanglish !== undefined) {
      setSpanglishPercent(randomArtist.defaultSpanglish);
    } else {
      setSpanglishPercent(Math.floor(Math.random() * 101));
    }
    setTemperature(0.7 + Math.random() * 0.6);
    toast.success(`🎲 Configuración aleatoria: ${randomArtist.name} · ${randomMood.label}`);
  }, []);

  // ===== Regenerate single section =====
  const handleRegenerateSection = useCallback(async (sectionName: string, sectionContent: string) => {
    setLoading(true);
    try {
      // Build context: all lyrics EXCEPT the section being regenerated
      const context = lyrics.replace(
        new RegExp(`###?\\s*\\[${sectionName}\\][^]*?(?=###?\\s*\\[|$)`, "i"),
        `### [${sectionName}] — [REGENERAR]`
      );
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          featureArtistId: featureArtistId === "none" ? "" : featureArtistId,
          moodId,
          topics: selectedTopics,
          customTopic,
          spanglishPercent,
          bpmVibeId,
          structureId,
          narrativeArcId,
          producerId,
          producerTag,
          customDictionary,
          dynamicMarkers,
          chorusLanguageOverride: chorusLangOverride,
          versesLanguageOverride: versesLangOverride,
          barCountOverride: barCountOverride > 0 ? barCountOverride : undefined,
          rhymeSchemeId,
          temperature,
          regenerateSection: {
            sectionName,
            keepContext: context,
          },
        }),
      });
      const data: GenerateResponse & { error?: string } = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error en re-generación");
      // Replace just the section in the existing lyrics
      const newSectionText = data.lyrics.trim();
      // Simple replacement: find the old section and replace with new
      const updatedLyrics = lyrics.replace(
        new RegExp(`###?\\s*\\[${sectionName}\\][^]*?(?=###?\\s*\\[|$)`, "i"),
        newSectionText + "\n\n"
      );
      setLyrics(updatedLyrics);
      setAnalysis(analyzeLanguageRatio(updatedLyrics, spanglishPercent));
      toast.success(`Sección "${sectionName}" re-generada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [artistId, featureArtistId, moodId, selectedTopics, customTopic, spanglishPercent,
      bpmVibeId, structureId, narrativeArcId, producerId, producerTag, customDictionary,
      dynamicMarkers, chorusLangOverride, versesLangOverride, barCountOverride,
      rhymeSchemeId, temperature, lyrics]);

  // ===== Share URL (encode config into URL hash) =====
  const handleShareUrl = useCallback(() => {
    const config = {
      a: artistId, f: featureArtistId, m: moodId, t: selectedTopics,
      ct: customTopic, sp: spanglishPercent, bpm: bpmVibeId, st: structureId,
      na: narrativeArcId, p: producerId, pt: producerTag, cd: customDictionary,
      dm: dynamicMarkers, cl: chorusLangOverride, vl: versesLangOverride,
      bc: barCountOverride, rs: rhymeSchemeId, tp: temperature,
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(config)));
    const url = `${window.location.origin}${window.location.pathname}#config=${encoded}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url).then(() => {
      toast.success("URL de configuración copiada");
    }).catch(() => {
      toast.success("URL generada (cópiala manualmente)");
    });
  }, [artistId, featureArtistId, moodId, selectedTopics, customTopic, spanglishPercent,
      bpmVibeId, structureId, narrativeArcId, producerId, producerTag, customDictionary,
      dynamicMarkers, chorusLangOverride, versesLangOverride, barCountOverride,
      rhymeSchemeId, temperature]);

  // ===== Load config from URL hash on mount =====
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.includes("config=")) return;
    try {
      const encoded = hash.split("config=")[1];
      const config = JSON.parse(decodeURIComponent(atob(encoded)));
      if (config.a) setArtistId(config.a);
      if (config.f) setFeatureArtistId(config.f);
      if (config.m) setMoodId(config.m);
      if (config.t) setSelectedTopics(config.t);
      if (config.ct !== undefined) setCustomTopic(config.ct);
      if (config.sp !== undefined) setSpanglishPercent(config.sp);
      if (config.bpm) setBpmVibeId(config.bpm);
      if (config.st) setStructureId(config.st);
      if (config.na) setNarrativeArcId(config.na);
      if (config.p) setProducerId(config.p);
      if (config.pt !== undefined) setProducerTag(config.pt);
      if (config.cd !== undefined) setCustomDictionary(config.cd);
      if (config.dm !== undefined) setDynamicMarkers(config.dm);
      if (config.cl) setChorusLangOverride(config.cl);
      if (config.vl) setVersesLangOverride(config.vl);
      if (config.bc !== undefined) setBarCountOverride(config.bc);
      if (config.rs) setRhymeSchemeId(config.rs);
      if (config.tp !== undefined) setTemperature(config.tp);
      toast.success("Configuración cargada desde URL");
    } catch {
      toast.error("URL de configuración inválida");
    }
  }, []);

  // ===== Translate lyrics (EN↔ES) =====
  const handleTranslate = useCallback(async (targetLang: "es" | "en") => {
    if (!lyrics) return;
    setTranslating(true);
    setTranslationOpen(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lyrics, targetLang }),
      });
      const data: { translated?: string; error?: string } = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error en la traducción");
      }
      setTranslatedLyrics(data.translated ?? "");
      toast.success(`Letra traducida al ${targetLang === "es" ? "español" : "inglés"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setTranslating(false);
    }
  }, [lyrics]);

  // ===== Lyrics critic (AI-powered feedback) =====
  const handleCritic = useCallback(async () => {
    if (!lyrics) return;
    setCriticLoading(true);
    setCriticOpen(true);
    try {
      const moodLabel = MOODS.find(m => m.id === moodId)?.label ?? moodId;
      const res = await fetch("/api/critic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics,
          artistName: artist?.name ?? "Libre",
          moodLabel,
          spanglishTarget: spanglishPercent,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error en el crítico");
      }
      setCriticResult(data);
      toast.success("Análisis del crítico completado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCriticLoading(false);
    }
  }, [lyrics, artist, moodId, spanglishPercent]);

  // ===== Agent Polish (4 agentes IA que revisan y mejoran) =====
  const handleAgentPolish = useCallback(async () => {
    if (!lyrics) {
      toast.error("Genera una letra primero");
      return;
    }
    if (!geminiApiKey?.trim()) {
      setPolishError("Necesitas tu API Key de Gemini para usar Agent Polish. Ponla arriba en la UI.");
      setPolishOpen(true);
      return;
    }
    setPolishError(null);
    setPolishLoading(true);
    setPolishResult(null);
    try {
      const structurePlan = structure.sections.map(s => `[${s.name}]`).join(", ");
      const res = await fetch("/api/agent-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics,
          artistName: artist?.name ?? "Libre",
          artistId,
          moodId,
          spanglishPercent,
          bpmRange: bpmVibe.range,
          structurePlan,
          geminiApiKey: geminiApiKey || undefined,
          geminiModel,
          autoIterate: polishAutoIterate,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error en Agent Polish");
      }
      setPolishResult(data);
      toast.success(polishAutoIterate ? `Auto-iterate completado: ${data.iterations?.length ?? 1} iteraciones` : "Agent Polish completado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setPolishError(msg);
      toast.error(msg);
    } finally {
      setPolishLoading(false);
    }
  }, [lyrics, artist, artistId, moodId, spanglishPercent, bpmVibe, structure, geminiApiKey, geminiModel, polishAutoIterate]);

  // ===== Aplicar letra pulida =====
  const applyPolishedLyrics = useCallback(() => {
    if (!polishResult?.polishedLyrics) return;
    setLyrics(polishResult.polishedLyrics);
    setAnalysis(analyzeLanguageRatio(polishResult.polishedLyrics, spanglishPercent));
    setPolishOpen(false);
    toast.success("Letra pulida aplicada");
  }, [polishResult, spanglishPercent]);

  // ===== Producer Tag Generator =====
  const handleProducerTag = useCallback(async () => {
    if (!lyrics) {
      toast.error("Genera una letra primero");
      return;
    }
    setProducerTagLoading(true);
    setProducerTagOpen(true);
    setProducerTags([]);
    try {
      const res = await fetch("/api/producer-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producerName,
          producerId,
          lyrics,
          artistName: artist?.name ?? "Libre",
          moodId,
          geminiApiKey: geminiApiKey || undefined,
          geminiModel,
        }),
      });
      const data: { tags?: { text: string; style: string }[]; error?: string } = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error generando producer tag");
      }
      setProducerTags(data.tags ?? []);
      toast.success("Producer tags generados");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setProducerTagLoading(false);
    }
  }, [lyrics, producerName, producerId, artist, moodId, geminiApiKey, geminiModel]);

  // ===== Inyectar producer tag en la letra =====
  const injectProducerTag = useCallback((tagText: string) => {
    if (!lyrics) return;
    // Si la letra ya empieza con el tag, no duplicar
    if (lyrics.startsWith(`"${tagText}"`) || lyrics.includes(`"${tagText}"`)) {
      toast.error("Ese tag ya está en la letra");
      return;
    }
    // Buscar el primer ### [Intro] o ### [ y inyectar antes
    const introMatch = lyrics.match(/###\s*\[Intro\]/i);
    if (introMatch) {
      const idx = introMatch.index!;
      const before = lyrics.slice(0, idx);
      const after = lyrics.slice(idx);
      const newLyrics = `${before}"${tagText}"\n${after}`;
      setLyrics(newLyrics);
      toast.success(`Tag inyectado: "${tagText}"`);
    } else {
      // Si no hay Intro, poner al principio
      const newLyrics = `"${tagText}"\n\n${lyrics}`;
      setLyrics(newLyrics);
      toast.success(`Tag inyectado: "${tagText}"`);
    }
    setProducerTagOpen(false);
  }, [lyrics]);

  // ===== Cover art generation (AI image) =====
  const handleCoverArt = useCallback(async () => {
    setCoverArtLoading(true);
    setCoverArtOpen(true);
    try {
      const res = await fetch("/api/cover-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          moodId,
          bpmVibeId,
          producerId,
          spanglishPercent,
        }),
      });
      const data: { imageBase64?: string; error?: string } = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error en la generación de cover art");
      }
      setCoverArt(data.imageBase64 ?? null);
      toast.success("Cover art generado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCoverArtLoading(false);
    }
  }, [artistId, moodId, bpmVibeId, producerId, spanglishPercent]);

  // ===== Social media caption generation =====
  const handleSocialCaption = useCallback(async (platform: "instagram" | "twitter" | "tiktok") => {
    setSocialLoading(true);
    setSocialOpen(true);
    setSocialPlatform(platform);
    try {
      const res = await fetch("/api/social-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          moodId,
          bpmVibeId,
          producerId,
          spanglishPercent,
          qualityScore: qualityScore?.total,
          punchlineText: punchlineAnalysis?.topPunchline?.text,
          platform,
        }),
      });
      const data: { caption?: string; error?: string } = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error en la generación del caption");
      }
      setSocialCaption(data.caption ?? null);
      toast.success(`Caption de ${platform} generado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSocialLoading(false);
    }
  }, [artistId, moodId, bpmVibeId, producerId, spanglishPercent, qualityScore, punchlineAnalysis]);

  // ===== Remix: combine sections from different history entries =====
  const handleRemix = useCallback(() => {
    if (Object.keys(remixSelections).length === 0) {
      toast.error("Selecciona al menos una sección de otra generación");
      return;
    }
    // Build remixed lyrics from selected sections
    const sectionNames = structure.sections.map(s => s.name);
    const remixedSections: string[] = [];

    for (const sectionName of sectionNames) {
      const entryId = remixSelections[sectionName];
      if (entryId) {
        // Use section from history entry
        const entry = history.find(h => h.id === entryId);
        if (entry) {
          // Parse the entry's lyrics to find this section
          const entrySections = parseLyrics(entry.fullLyrics);
          const found = entrySections.find(s => s.tag.replace(/[[\]]/g, "").includes(sectionName));
          if (found) {
            remixedSections.push(`### [${sectionName}]\n*Intérprete: Remix*\n${found.lines.filter(l => l.trim()).join("\n")}`);
            continue;
          }
        }
      }
      // Use current section if no remix selection for this section
      const currentSection = parsedSections.find(s => s.tag.replace(/[[\]]/g, "").includes(sectionName));
      if (currentSection) {
        remixedSections.push(`### [${sectionName}]\n*Intérprete: Remix*\n${currentSection.lines.filter(l => l.trim()).join("\n")}`);
      }
    }

    const remixedLyrics = remixedSections.join("\n\n");
    setLyrics(remixedLyrics);
    setAnalysis(analyzeLanguageRatio(remixedLyrics, spanglishPercent));
    setRemixOpen(false);
    setRemixSelections({});
    toast.success(`🎵 Remix creado con ${Object.keys(remixSelections).length} secciones de otras generaciones`);
  }, [remixSelections, history, structure, spanglishPercent]);

  // ===== Keyboard shortcuts =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter = generate
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!loading) handleGenerate(false);
      }
      // Ctrl/Cmd + Shift + C = copy
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        handleCopy();
      }
      // Ctrl/Cmd + Shift + R = regenerate
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault();
        if (!loading && lyrics) handleGenerate(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleGenerate, handleCopy, loading, lyrics]);

  // ===== Save preset =====
  const savePreset = useCallback(() => {
    const preset: Preset = {
      date: new Date().toLocaleString("es-ES"),
      artist: artistId,
      mood: moodId,
      bpm: bpmVibeId,
      structure: structureId,
      spanglish: spanglishPercent,
      topics: selectedTopics,
      label: `${artist?.name ?? "Libre"} · ${structure.label.split(" ")[0]} · ${spanglishPercent}%EN`,
    };
    const updated = [preset, ...presets].slice(0, 6);
    setPresets(updated);
    try { localStorage.setItem("trapghost_presets", JSON.stringify(updated)); } catch {}
    toast.success("Preset guardado");
  }, [artistId, moodId, bpmVibeId, structureId, spanglishPercent, selectedTopics, presets, artist, structure]);

  const loadPreset = useCallback((p: Preset) => {
    setArtistId(p.artist);
    setMoodId(p.mood);
    setBpmVibeId(p.bpm);
    setStructureId(p.structure);
    setSpanglishPercent(p.spanglish);
    setSelectedTopics(p.topics);
    toast.success(`Preset "${p.label}" cargado`);
  }, []);

  const clearPresets = useCallback(() => {
    setPresets([]);
    try { localStorage.removeItem("trapghost_presets"); } catch {}
    toast.success("Presets borrados");
  }, []);

  // ===== Parsed lyrics for display =====
  const parsedSections = useMemo(() => lyrics ? parseLyrics(lyrics) : [], [lyrics]);

  // ===== Slider track gradient style =====
  const sliderStyle = { "--pct": `${spanglishPercent}%` } as React.CSSProperties;

  const MoodIcon = MOOD_ICONS[moodId] ?? Flame;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Ambient orbs */}
      <div className="ambient-orb bg-cyber" style={{ width: 400, height: 400, top: "-100px", left: "-100px" }} />
      <div className="ambient-orb bg-slime" style={{ width: 350, height: 350, bottom: "-80px", right: "-80px" }} />

      {/* ===== Header ===== */}
      <header className="relative z-10 border-b border-border/40 backdrop-blur-md bg-black/40 sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slime to-cyber flex items-center justify-center glow-slime">
                <Mic2 className="w-6 h-6 text-black" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight gradient-text-trap">TrapGhost</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">Generador de letras con sabor · v13.0</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="outline" className="border-slime/40 text-slime gap-1.5">
              <span className="bpm-pulse" style={{ "--bpm-dur": `${60 / Math.min(180, Math.max(70, parseInt(bpmVibe.range.split("-")[1] ?? "130")))}s` } as React.CSSProperties} />
              {bpmVibe.range} BPM
            </Badge>
            <Badge variant="outline" className="border-cyber/40 text-cyber gap-1.5">
              <Languages className="w-3 h-3" />
              {spanglishPercent}% EN
            </Badge>
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="relative z-10 flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">

          {/* ===== LEFT: Controls ===== */}
          <div className="space-y-5">

            {/* --- API Key & Model Card --- */}
            <Card className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-cyber" />
                <h2 className="font-display text-lg font-semibold">API Key de Gemini</h2>
                <Badge variant="outline" className={`ml-auto text-[10px] ${geminiApiKey ? "border-slime/40 text-slime" : "border-yellow-400/40 text-yellow-400"}`}>
                  {geminiApiKey ? "✓ Configurada" : "⚠ Vacía (usa Z.ai SDK)"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pon tu API Key de Google Gemini para usar la app desde cualquier sitio. Consíguela gratis en{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyber underline">aistudio.google.com</a>
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <div className="flex gap-2">
                  <Input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="AIza..." className="bg-black/40 font-mono text-[11px]" />
                  <Button variant="outline" size="sm" onClick={() => {
                    try {
                      localStorage.setItem("gemini_api_key", geminiApiKey.trim());
                      localStorage.setItem("gemini_model", geminiModel);
                      localStorage.setItem("producer_name", producerName);
                      toast.success("API Key guardada");
                      if (geminiApiKey.trim()) fetchGeminiModels(geminiApiKey);
                    } catch { toast.error("No se pudo guardar"); }
                  }} className="border-slime/30 hover:bg-slime/10 hover:text-slime shrink-0">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Modelo de Gemini</Label>
                  {availableModels.length > 0 && (
                    <Badge variant="outline" className="text-[9px] border-slime/30 text-slime">{availableModels.length} disponibles</Badge>
                  )}
                  {loadingModels && <span className="text-[10px] text-muted-foreground">Cargando...</span>}
                </div>
                <Select value={geminiModel} onValueChange={setGeminiModel}>
                  <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableModels.length > 0 ? availableModels.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    )) : (
                      <>
                        <SelectItem value="gemini-2.5-flash">✨ Gemini 2.5 Flash (Thinking Máximo · Recomendado)</SelectItem>
                        <SelectItem value="gemini-2.5-pro">✨ Gemini 2.5 Pro (Máxima Calidad Lírica)</SelectItem>
                        <SelectItem value="gemini-2.0-flash">🔥 Gemini 2.0 Flash</SelectItem>
                        <SelectItem value="gemini-1.5-flash">📊 Gemini 1.5 Flash</SelectItem>
                        <SelectItem value="gemini-1.5-pro">📊 Gemini 1.5 Pro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* --- Artist & Feature --- */}
            <Card className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-slime" />
                <h2 className="font-display text-lg font-semibold">Identidad del Artista</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Artista Principal</Label>
                  <Select value={artistId} onValueChange={(v) => { artistDefaultApplied.current = true; setArtistId(v); }}>
                    <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ARTISTS_DATA.map(group => (
                        <SelectGroup key={group.label}>
                          <SelectLabel className="text-slime">{group.label}</SelectLabel>
                          {group.artists.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="flex items-center gap-2">
                                <span>👤</span>{a.name}
                                <span className="text-muted-foreground text-xs">· {a.origin}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Feature (opcional)</Label>
                  <Select value={featureArtistId} onValueChange={setFeatureArtistId}>
                    <SelectTrigger className="bg-black/40"><SelectValue placeholder="Sin invitado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sin feature —</SelectItem>
                      {ARTISTS_DATA.flatMap(g => g.artists).filter(a => a.id !== artistId).map(a => (
                        <SelectItem key={a.id} value={a.id}>👤 {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Feature Sim selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Tipo de colaboración (Feature Sim)
                </Label>
                <Select value={featureSimId} onValueChange={setFeatureSimId}>
                  <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEATURE_SIMS.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {featureSimId !== "solo" && featureSim && (
                  <p className="text-[11px] text-muted-foreground">{featureSim.description}</p>
                )}
              </div>
              {artist && (
                <div className="rounded-lg border border-slime/20 bg-slime/5 p-3 text-sm">
                  <p className="font-semibold text-slime mb-1">{artist.name} <span className="text-muted-foreground text-xs font-normal">· {artist.origin}</span></p>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">{artist.style}</p>
                  {artist.defaultSpanglish !== undefined && (
                    <button
                      onClick={() => setSpanglishPercent(artist.defaultSpanglish!)}
                      className="mt-2 text-[11px] text-slime/80 hover:text-slime underline underline-offset-2"
                    >
                      ✨ Aplicar Spanglish sugerido del artista ({artist.defaultSpanglish}% EN)
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* --- Mood & Topics --- */}
            <Card className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-cyber" />
                <h2 className="font-display text-lg font-semibold">Mood & Temática</h2>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mood (atmósfera)</Label>
                <Select value={moodId} onValueChange={setMoodId}>
                  <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOODS.map(m => {
                      const Icon = MOOD_ICONS[m.id] ?? Flame;
                      return (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{m.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {(() => {
                  const mood = MOODS.find(m => m.id === moodId);
                  return mood ? <p className="text-[12px] text-muted-foreground leading-relaxed">{mood.description}</p> : null;
                })()}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Temas (selecciona varios)</Label>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map(t => (
                    <button
                      key={t.id}
                      className="tag-chip"
                      data-active={selectedTopics.includes(t.id)}
                      onClick={() => toggleTopic(t.id)}
                    >
                      {selectedTopics.includes(t.id) && <Sparkles className="w-3 h-3" />}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tema personalizado (idea a la carta)</Label>
                <Textarea
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Ej: una noche robando coches en Madrid con mi hermano pequeño..."
                  className="bg-black/40 resize-none"
                  rows={2}
                />
              </div>
            </Card>

            {/* --- Spanglish Ratio (THE FIX) --- */}
            <Card className="glass-card p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slime/5 rounded-full blur-3xl" />
              <div className="flex items-center gap-2 relative">
                <Languages className="w-5 h-5 text-slime" />
                <h2 className="font-display text-lg font-semibold">Spanglish Ratio</h2>
                <Badge variant="outline" className="ml-auto border-slime/40 text-slime gap-1">
                  <Target className="w-3 h-3" />
                  Verificado
                </Badge>
              </div>

              {/* The actual ratio bar */}
              <div className="ratio-bar relative">
                <div className="es-segment" style={{ width: `${100 - spanglishPercent}%` }} />
                <div className="en-segment" style={{ width: `${spanglishPercent}%` }} />
                {/* target marker is implicit (the bar IS the target) */}
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-cyber">🇪🇸 Español {100 - spanglishPercent}%</span>
                <span className="text-slime">English {spanglishPercent}% 🇺🇸</span>
              </div>

              {/* Custom slider */}
              <input
                type="range"
                min={0}
                max={100}
                value={spanglishPercent}
                onChange={(e) => setSpanglishPercent(Number(e.target.value))}
                className="spanglish-slider"
                style={sliderStyle}
                aria-label="Spanglish ratio"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>100% ES</span><span>50/50</span><span>100% EN</span>
              </div>

              {/* Live label (FIXED: unified with prompt logic) */}
              <div className="rounded-lg border border-slime/20 bg-black/30 p-3">
                <p className="text-[13px] font-medium text-slime">{spanglishInfo.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {spanglishInfo.prompt.replace(/\*\*[^*]*\*\*\.?/g, "").trim()}
                </p>
              </div>

              {/* Auto-correct toggle */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slime" />
                  <div>
                    <Label className="text-[13px] cursor-pointer">Verificación post-generación</Label>
                    <p className="text-[11px] text-muted-foreground">Analiza el ratio real y ofrece regenerar si se desvía &gt;20%</p>
                  </div>
                </div>
                <Switch checked={autoCorrect} onCheckedChange={setAutoCorrect} />
              </div>
            </Card>

            {/* --- BPM & Structure --- */}
            <Card className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-slime" />
                <h2 className="font-display text-lg font-semibold">BPM & Estructura</h2>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vibe / BPM</Label>
                <Select value={bpmVibeId} onValueChange={setBpmVibeId}>
                  <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BPM_VIBES.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        <span className="flex items-center gap-2">
                          <span className="bpm-pulse" style={{ "--bpm-dur": `${60 / parseInt(b.range.split("-")[1] ?? "130")}s` } as React.CSSProperties} />
                          {b.label} <span className="text-muted-foreground text-xs">({b.range})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[12px] text-muted-foreground">{bpmVibe.description} · Densidad: {bpmVibe.density}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Estructura</Label>
                <Select value={structureId} onValueChange={setStructureId}>
                  <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STRUCTURES.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {structure.sections.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] py-0.5 px-2 border-border/50">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
              {/* Beat Type selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5" /> Beat Type (subgénero · Suno/Udio)
                </Label>
                <Select value={beatTypeId || "none"} onValueChange={(v) => setBeatTypeId(v === "none" ? "" : v)}>
                  <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Auto (sin tipo específico) —</SelectItem>
                    {BEAT_TYPES.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {beatType && (
                  <div className="rounded-md border border-slime/20 bg-slime/5 p-2.5">
                    <p className="text-[11px] text-muted-foreground">{beatType.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {beatType.sunoTags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] border-slime/30 text-slime">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Section Voice Assignment */}
              <div className="space-y-2 rounded-lg border border-border/40 bg-black/20 p-3">
                <div className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-slime" />
                  <Label className="text-xs text-muted-foreground">Asignación de voces por sección</Label>
                </div>
                <p className="text-[10px] text-muted-foreground/70 -mt-1">Asigna quién rapea cada sección y cuántas barras</p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scroll pr-1">
                  {structure.sections.map((sec, secIdx) => {
                    const assign = sectionVoices.find(v => v.sectionName === sec.name);
                    const isVerseOrChorus = sec.type === "verse" || sec.type === "chorus";
                    return (
                      <div key={`${sec.name}-${secIdx}`} className="flex items-center gap-2 p-2 rounded-md border border-border/40 bg-black/30">
                        <span className="text-[11px] font-medium min-w-0 flex-1 truncate">{sec.name}</span>
                        <Select
                          value={assign?.voice ?? "auto"}
                          onValueChange={(v) => {
                            setSectionVoices(prev => {
                              const others = prev.filter(p => p.sectionName !== sec.name);
                              if (v === "auto") return others;
                              return [...others, { sectionName: sec.name, voice: v, bars: assign?.bars }];
                            });
                          }}
                        >
                          <SelectTrigger className="bg-black/40 h-7 text-[10px] w-[150px] sm:w-[170px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">— Auto —</SelectItem>
                            <SelectItem value="main">Main Artist</SelectItem>
                            {featureArtist && <SelectItem value="feature">Feature Artist</SelectItem>}
                            <SelectItem value="both">Both (Unísono)</SelectItem>
                            <SelectItem value="hype">Hype Man</SelectItem>
                            <SelectSeparator className="bg-border/40" />
                            {ARTISTS_DATA.map(group => (
                              <SelectGroup key={group.label}>
                                <SelectLabel className="text-slime/80 px-2 py-1 text-[10px] font-semibold">{group.label}</SelectLabel>
                                {group.artists.map(a => (
                                  <SelectItem key={a.id} value={a.id}>
                                    <span className="flex items-center gap-1.5"><span>👤</span>{a.name}<span className="text-muted-foreground text-[10px]">· {a.origin}</span></span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                        {isVerseOrChorus && (
                          <Select
                            value={assign?.bars ? String(assign.bars) : "0"}
                            onValueChange={(v) => {
                              const bars = parseInt(v);
                              setSectionVoices(prev => {
                                const others = prev.filter(p => p.sectionName !== sec.name);
                                const currentVoice = assign?.voice ?? "auto";
                                if (currentVoice === "auto" && bars === 0) return others;
                                return [...others, { sectionName: sec.name, voice: currentVoice, bars: bars || undefined }];
                              });
                            }}
                          >
                            <SelectTrigger className="bg-black/40 h-7 text-[10px] w-[60px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Auto</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="16">16</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                              <SelectItem value="32">32</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {isVerseOrChorus && (
                          <Select
                            value={assign?.density ?? "auto"}
                            onValueChange={(v) => {
                              const density = v === "auto" ? undefined : v as "sparse" | "normal" | "dense" | "extra_dense";
                              setSectionVoices(prev => {
                                const others = prev.filter(p => p.sectionName !== sec.name);
                                const currentVoice = assign?.voice ?? "auto";
                                const currentBars = assign?.bars;
                                if (currentVoice === "auto" && !currentBars && !density) return others;
                                return [...others, { sectionName: sec.name, voice: currentVoice, bars: currentBars, density }];
                              });
                            }}
                          >
                            <SelectTrigger className="bg-black/40 h-7 text-[10px] w-[70px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="sparse">Sparse</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="dense">Dense</SelectItem>
                              <SelectItem value="extra_dense">X-Dense</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* --- Advanced --- */}
            <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
              <Card className="glass-card p-5 space-y-4">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full">
                    <Settings2 className="w-5 h-5 text-slime" />
                    <h2 className="font-display text-lg font-semibold">Opciones Avanzadas</h2>
                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${advOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Arco Narrativo</Label>
                    <Select value={narrativeArcId} onValueChange={setNarrativeArcId}>
                      <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NARRATIVE_ARCS.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {narrativeArcId !== "none" && (() => {
                      const arc = NARRATIVE_ARCS.find(a => a.id === narrativeArcId);
                      return arc ? <p className="text-[12px] text-muted-foreground">{arc.description}</p> : null;
                    })()}
                  </div>

                  {/* NEW: Producer selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Disc3 className="w-3.5 h-3.5" /> Productor (beat & producer tag)
                    </Label>
                    <Select value={producerId} onValueChange={(v) => { setProducerId(v); setProducerTag(getProducerById(v)?.tag ?? ""); }}>
                      <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRODUCERS.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.id === "none" ? "— Sin productor —" : `🎛️ ${p.name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {producerId !== "none" && (() => {
                      const p = getProducerById(producerId);
                      return p ? (
                        <div className="rounded-md border border-slime/20 bg-slime/5 p-2.5">
                          <p className="text-[11px] text-slime font-medium">Tag: "{p.tag}"</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{p.style}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* NEW: Temperature control */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Thermometer className="w-3.5 h-3.5" /> Temperatura (creatividad)
                      </Label>
                      <Badge variant="outline" className="text-[10px] border-slime/30 text-slime">{temperature.toFixed(2)}</Badge>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={1.5}
                      step={0.05}
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="spanglish-slider"
                      style={{ "--pct": `${((temperature - 0.3) / 1.2) * 100}%` } as React.CSSProperties}
                      aria-label="Temperature"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {temperature < 0.6 ? "🥶 Más estricto: mejor adherencia al ratio, menos creatividad" :
                       temperature < 1.0 ? "⚖️ Balanceado: creatividad + adherencia" :
                       temperature < 1.3 ? "🔥 Creativo: más original, ratio puede desviarse" :
                       "🌀 Caótico: máxima originalidad, ratio impredecible"}
                    </p>
                  </div>

                  {/* NEW: Per-section language override */}
                  <div className="space-y-2 rounded-lg border border-border/40 bg-black/20 p-3">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Override de idioma por sección
                    </Label>
                    <p className="text-[10px] text-muted-foreground/70 -mt-1">Fuerza un idioma específico en chorus/verses (ignora el ratio general)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Chorus</p>
                        <div className="flex gap-1">
                          {(["auto", "es", "en"] as const).map(opt => (
                            <button
                              key={opt}
                              onClick={() => setChorusLangOverride(opt)}
                              className={`flex-1 text-[10px] py-1.5 rounded-md border transition-colors ${
                                chorusLangOverride === opt
                                  ? "border-slime bg-slime/15 text-slime"
                                  : "border-border/40 text-muted-foreground hover:border-slime/30"
                              }`}
                            >
                              {opt === "auto" ? "Auto" : opt === "es" ? "🇪🇸 ES" : "🇺🇸 EN"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Verses</p>
                        <div className="flex gap-1">
                          {(["auto", "es", "en"] as const).map(opt => (
                            <button
                              key={opt}
                              onClick={() => setVersesLangOverride(opt)}
                              className={`flex-1 text-[10px] py-1.5 rounded-md border transition-colors ${
                                versesLangOverride === opt
                                  ? "border-slime bg-slime/15 text-slime"
                                  : "border-border/40 text-muted-foreground hover:border-slime/30"
                              }`}
                            >
                              {opt === "auto" ? "Auto" : opt === "es" ? "🇪🇸 ES" : "🇺🇸 EN"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NEW: Bar count override */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> Barras por verso (0 = auto)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={32}
                      value={barCountOverride}
                      onChange={(e) => setBarCountOverride(Math.max(0, Math.min(32, parseInt(e.target.value) || 0)))}
                      className="bg-black/40"
                      placeholder="0 = automático (8-12)"
                    />
                  </div>

                  {/* NEW: Rhyme scheme selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" /> Esquema de rima
                    </Label>
                    <Select value={rhymeSchemeId} onValueChange={setRhymeSchemeId}>
                      <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RHYME_SCHEMES.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-slime text-xs">{r.pattern}</span>
                              {r.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {rhymeSchemeId !== "rs_free" && (() => {
                      const rs = getRhymeSchemeById(rhymeSchemeId);
                      return rs ? <p className="text-[11px] text-muted-foreground">{rs.description}</p> : null;
                    })()}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Producer Tag personalizado (override libre)</Label>
                    <Input value={producerTag} onChange={(e) => setProducerTag(e.target.value)} placeholder="Ej: Markoff, Bizarrap" className="bg-black/40" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Diccionario personalizado (nombres propios, lugares)</Label>
                    <Textarea value={customDictionary} onChange={(e) => setCustomDictionary(e.target.value)} placeholder="Ej: mi bloque es Los Ángeles, mi crew es Glizzy Gang, mi opp es 'el de la esquina'" className="bg-black/40 resize-none" rows={2} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-slime" />
                      <div>
                        <Label className="text-[13px] cursor-pointer">Marcadores dinámicos de voz</Label>
                        <p className="text-[11px] text-muted-foreground">Añade [BEAT DROP], [WHISPERING], etc.</p>
                      </div>
                    </div>
                    <Switch checked={dynamicMarkers} onCheckedChange={setDynamicMarkers} />
                  </div>

                  {/* Round 11: Advanced toggles */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Custom Intro / Skit</Label>
                    <Textarea value={customIntro} onChange={(e) => setCustomIntro(e.target.value)} placeholder="Ej: Sonido de sirena a lo lejos, voz susurrando 'ya llegamos'..." className="bg-black/40 resize-none" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Disc3 className="w-3.5 h-3.5" /> Nombre de Productor (tu tag personalizado)
                    </Label>
                    <Input value={producerName} onChange={(e) => setProducerName(e.target.value)} placeholder="Ej: Markoff, DJ Sombra..." className="bg-black/40" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-slime" /><div><Label className="text-[13px] cursor-pointer">Smart Bars Mode</Label><p className="text-[11px] text-muted-foreground">Auto-calcular barras según BPM</p></div></div>
                    <Switch checked={smartBarsMode} onCheckedChange={setSmartBarsMode} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Mic2 className="w-4 h-4 text-slime" /><div><Label className="text-[13px] cursor-pointer">Interacción orgánica de colaboración</Label><p className="text-[11px] text-muted-foreground">Artistas se reconocen mutuamente</p></div></div>
                    <Switch checked={collabInteraction} onCheckedChange={setCollabInteraction} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-slime" /><div><Label className="text-[13px] cursor-pointer">Asteriscos de voz alternativa (Hack Suno)</Label><p className="text-[11px] text-muted-foreground">*palabra* para tono alternativo</p></div></div>
                    <Switch checked={altVoiceAsterisks} onCheckedChange={setAltVoiceAsterisks} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-slime" /><div><Label className="text-[13px] cursor-pointer">Strict Pocket / Silabas matemáticas</Label><p className="text-[11px] text-muted-foreground">Conteo silábico rígido, AABB/ABAB</p></div></div>
                    <Switch checked={syllableSync} onCheckedChange={setSyllableSync} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Languages className="w-4 h-4 text-slime" /><div><Label className="text-[13px] cursor-pointer">Ad-libs fonéticos</Label><p className="text-[11px] text-muted-foreground">"Skirrrrt" en vez de "Skrrt"</p></div></div>
                    <Switch checked={phoneticAdlibs} onCheckedChange={setPhoneticAdlibs} />
                  </div>

                  {/* Song Form Intelligence (Phase 6) */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Music2 className="w-4 h-4 text-sky-400" /><div><Label className="text-[13px] cursor-pointer">Song Form Intelligence</Label><p className="text-[11px] text-muted-foreground">Estructura dinámica: expanding chorus, pre-chorus, beat drops, verse variable (auto per-artista)</p></div></div>
                    <Switch checked={dynamicSongForm} onCheckedChange={setDynamicSongForm} />
                  </div>

                  {/* Reference Track Importer (Phase 4) — moved OUTSIDE Advanced for visibility */}

                  {/* Keyboard shortcuts hint */}
                  <div className="rounded-lg border border-border/40 bg-black/20 p-3 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Keyboard className="w-3.5 h-3.5" /> Atajos de teclado
                    </p>
                    <div className="space-y-0.5 text-[10px] text-muted-foreground/80">
                      <p><kbd className="px-1 py-0.5 rounded bg-white/5 border border-border/40">Ctrl+Enter</kbd> Generar letra</p>
                      <p><kbd className="px-1 py-0.5 rounded bg-white/5 border border-border/40">Ctrl+Shift+C</kbd> Copiar letra</p>
                      <p><kbd className="px-1 py-0.5 rounded bg-white/5 border border-border/40">Ctrl+Shift+R</kbd> Re-generar con corrección</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* --- Reference Track Importer (Phase 4) — standalone, always visible --- */}
            <Card className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-sky-400" />
                <h2 className="font-display text-lg font-semibold">Reference Track Importer</h2>
                <Badge variant="outline" className={`ml-auto text-[10px] ${refTrackOpen ? "border-sky-400/60 text-sky-400" : "border-border/40 text-muted-foreground"}`}>
                  {refTrackOpen ? "● ACTIVO" : "Desactivado"}
                </Badge>
                <Switch checked={refTrackOpen} onCheckedChange={setRefTrackOpen} />
              </div>
              {refTrackOpen ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-muted-foreground">
                    Pega la letra de una canción que te guste (tuya o de otro artista). Al generar, la app extraerá su <span className="text-sky-400 font-medium">ADN estructural</span> (secciones, esquema de rima, densidad, ad-libs, idioma, hook style) y lo replicará con el contenido del artista seleccionado.
                  </p>
                  <textarea
                    value={refTrackLyrics}
                    onChange={(e) => setRefTrackLyrics(e.target.value)}
                    placeholder={"Pega aquí la letra completa de la canción de referencia...\n\n### [Verse 1]\n...\n\n### [Chorus]\n..."}
                    className="w-full min-h-[140px] max-h-[300px] overflow-y-auto rounded-lg border border-border/40 bg-black/30 p-3 text-[12px] font-mono text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none focus:border-sky-400/50 resize-y"
                  />
                  {refTrackLyrics.trim() && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-sky-400/40 text-sky-400">
                        {refTrackLyrics.trim().split("\n").length} líneas listas
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => { setRefTrackLyrics(""); setRefTrackAnalysis(null); }} className="text-[10px] text-muted-foreground hover:text-foreground h-7">
                        Limpiar
                      </Button>
                    </div>
                  )}
                  {refTrackAnalysis && (
                    <div className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-3">
                      <p className="text-[10px] text-sky-400 uppercase font-medium mb-1">ADN extraído del último análisis:</p>
                      <p className="text-[11px] text-foreground/70">{refTrackAnalysis}</p>
                    </div>
                  )}
                  <div className="rounded-lg border border-sky-400/10 bg-sky-400/5 p-2.5">
                    <p className="text-[10px] text-sky-400/80">
                      💡 La estructura, rima, densidad y dinámica de esta canción se usarán como esqueleto. El contenido será del artista seleccionado.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Actívalo para pegar una canción de referencia. La app replicará su estructura, esquema de rima, densidad y dinámica con el contenido del artista seleccionado.
                </p>
              )}
            </Card>

            {/* --- Presets --- */}
            {presets.length > 0 && (
              <Card className="glass-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Save className="w-5 h-5 text-slime" />
                  <h2 className="font-display text-lg font-semibold">Mis Presets</h2>
                  <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-cyber" onClick={clearPresets}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll">
                  {presets.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => loadPreset(p)}
                      className="w-full text-left rounded-lg border border-border/40 bg-black/20 hover:border-slime/40 hover:bg-slime/5 p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium truncate">{p.label}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{p.date}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ===== RIGHT: Output ===== */}
          <div className="space-y-5" ref={lyricsRef}>

            {/* --- Generate Button --- */}
            <Card className="glass-card p-5 space-y-3 sticky top-20 z-20">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleGenerate(false)}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-slime to-emerald-400 text-black font-semibold hover:opacity-90 glow-slime h-12"
                >
                  {loading ? (
                    <><div className="trap-spinner !w-5 !h-5 !border-2 mr-2" />Generando...</>
                  ) : (
                    <><Mic2 className="w-4 h-4 mr-2" />Generar Letra <span className="hidden sm:inline text-[10px] opacity-60 ml-2">⌘↵</span></>
                  )}
                </Button>
                <Button variant="outline" onClick={handleRandomize} className="border-cyber/30 hover:bg-cyber/10 hover:text-cyber h-12" title="Configuración aleatoria (inspiración)">
                  <Shuffle className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={savePreset} className="border-slime/30 hover:bg-slime/10 hover:text-slime h-12" title="Guardar preset">
                  <Save className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={handleShareUrl} className="border-cyber/30 hover:bg-cyber/10 hover:text-cyber h-12" title="Generar URL compartible">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={handleCoverArt} disabled={coverArtLoading} className="border-purple-400/30 hover:bg-purple-400/10 hover:text-purple-400 h-12" title="Generar cover art (IA)">
                  {coverArtLoading ? <div className="trap-spinner !w-4 !h-4 !border-2" /> : <Image className="w-4 h-4" />}
                </Button>
                {history.length > 0 && (
                  <Button variant="outline" onClick={() => setHistoryOpen(!historyOpen)} className="border-cyber/30 hover:bg-cyber/10 hover:text-cyber h-12" title="Historial">
                    <History className="w-4 h-4" />
                    {history.length > 0 && <span className="ml-1 text-xs">{history.length}</span>}
                  </Button>
                )}
              </div>
              {lyrics && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-slime" />
                    <div>
                      <Label className="text-[12px] cursor-pointer">Rhyme Heatmap</Label>
                      <p className="text-[10px] text-muted-foreground">Colorea líneas que riman</p>
                    </div>
                  </div>
                  <Switch checked={rhymeHeatmapOn} onCheckedChange={setRhymeHeatmapOn} />
                </div>
              )}
              {shareUrl && (
                <div className="rounded-md border border-cyber/30 bg-cyber/5 p-2 flex items-center gap-2">
                  <Link2 className="w-3 h-3 text-cyber shrink-0" />
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-[10px] text-muted-foreground outline-none truncate font-mono"
                  />
                  <button onClick={() => setShareUrl("")} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
                </div>
              )}
              {regenCount > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Re-generaciones con corrección: <span className="text-slime font-medium">{regenCount}</span>
                </p>
              )}
            </Card>

            {/* --- History Panel (NEW) --- */}
            {historyOpen && history.length > 0 && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Historial de Generaciones</h2>
                  <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-cyber" onClick={clearHistory}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scroll">
                  {history.map(entry => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border/40 bg-black/20 hover:border-slime/40 hover:bg-slime/5 p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <button
                          onClick={() => restoreFromHistory(entry)}
                          className="text-left flex-1 min-w-0"
                        >
                          <span className="text-[12px] font-medium truncate block">{entry.artistName} · {entry.moodLabel}</span>
                        </button>
                        <span className="text-[10px] text-muted-foreground shrink-0">{entry.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <Badge
                          variant="outline"
                          className={`text-[9px] py-0 h-4 shrink-0 ${
                            entry.status === "perfect" ? "border-slime/50 text-slime" :
                            entry.status === "close" ? "border-yellow-400/50 text-yellow-400" :
                            "border-cyber/50 text-cyber"
                          }`}
                        >
                          {entry.actualEnglishPercent}% EN (Δ{entry.deviation}%)
                        </Badge>
                        <span className="text-muted-foreground truncate flex-1">{entry.lyricsPreview}...</span>
                        {lyrics && (
                          <>
                            <button
                              onClick={() => compareWith(entry)}
                              className="shrink-0 p-1 rounded text-muted-foreground hover:text-slime"
                              title="Comparar con actual"
                            >
                              <GitCompare className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => showDiff(entry)}
                              className="shrink-0 p-1 rounded text-muted-foreground hover:text-cyber"
                              title="Ver diff (cambios línea por línea)"
                            >
                              <BarChart3 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* --- Language Analysis Panel (NEW FEATURE) --- */}
            {analysis && (
              <Card className="glass-card p-5 space-y-4 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Activity className={`w-5 h-5 ${analysis.status === "perfect" ? "text-slime" : analysis.status === "close" ? "text-yellow-400" : "text-cyber"}`} />
                  <h2 className="font-display text-lg font-semibold">Análisis de Idioma</h2>
                  <Badge
                    variant="outline"
                    className={`ml-auto gap-1.5 ${
                      analysis.status === "perfect" ? "border-slime/50 text-slime" :
                      analysis.status === "close" ? "border-yellow-400/50 text-yellow-400" :
                      "border-cyber/50 text-cyber"
                    }`}
                  >
                    {analysis.status === "perfect" ? "✓ Perfecto" : analysis.status === "close" ? "≈ Cerca" : "✗ Desviado"}
                  </Badge>
                </div>

                {/* Target vs Actual */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-black/30 border border-border/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Objetivo</p>
                    <p className="font-display text-lg font-bold">{analysis.targetEnglishPercent}% EN</p>
                    <p className="text-[10px] text-muted-foreground">{100 - analysis.targetEnglishPercent}% ES</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Real</p>
                    <p className="font-display text-lg font-bold text-slime">{analysis.englishPercent}% EN</p>
                    <p className="text-[10px] text-cyber">{analysis.spanishPercent}% ES</p>
                  </div>
                </div>

                {/* Actual ratio bar with target marker */}
                <div className="space-y-1.5">
                  <div className="ratio-bar relative">
                    <div className="es-segment" style={{ width: `${analysis.spanishPercent}%` }} />
                    <div className="en-segment" style={{ width: `${analysis.englishPercent}%` }} />
                    <div className="target-marker" style={{ left: `${analysis.targetEnglishPercent}%` }} title="Objetivo" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>La línea blanca = objetivo</span>
                    <span>Desviación: {analysis.deviation}%</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div><p className="text-muted-foreground">Palabras</p><p className="font-semibold">{analysis.totalWords}</p></div>
                  <div><p className="text-cyber">🇪🇸 Detectadas</p><p className="font-semibold">{analysis.spanishWords}</p></div>
                  <div><p className="text-slime">🇺🇸 Detectadas</p><p className="font-semibold">{analysis.englishWords}</p></div>
                </div>

                {/* Samples */}
                {(analysis.sampleSpanish.length > 0 || analysis.sampleEnglish.length > 0) && (
                  <div className="space-y-2">
                    {analysis.sampleEnglish.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Muestras en inglés:</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.sampleEnglish.map((w, i) => <Badge key={i} variant="outline" className="text-[10px] border-slime/30 text-slime">{w}</Badge>)}
                        </div>
                      </div>
                    )}
                    {analysis.sampleSpanish.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Muestras en español:</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.sampleSpanish.map((w, i) => <Badge key={i} variant="outline" className="text-[10px] border-cyber/30 text-cyber">{w}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Re-generate button if off */}
                {analysis.status === "off" && (
                  <Button
                    onClick={() => handleGenerate(true)}
                    disabled={loading}
                    variant="outline"
                    className="w-full border-cyber/40 text-cyber hover:bg-cyber/10 h-11"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Re-generar con corrección de idioma
                  </Button>
                )}
              </Card>
            )}

            {/* --- Lyrics Display --- */}
            <Card className="glass-card p-5 min-h-[400px]">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Music className="w-5 h-5 text-slime" />
                <h2 className="font-display text-lg font-semibold">Letra Generada</h2>
                {rhymeAnalysis && rhymeAnalysis.groups.length > 0 && (
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-[10px] text-muted-foreground">Rimas:</span>
                    {rhymeAnalysis.groups.slice(0, 6).map(g => (
                      <span
                        key={g.id}
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: g.color, boxShadow: `0 0 6px ${g.color}` }}
                        title={`Grupo ${g.id + 1}: ${g.words.slice(0, 3).join(", ")}`}
                      />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-1">({rhymeAnalysis.totalRhymes} líneas)</span>
                  </div>
                )}
                {lyrics && (
                  <div className="ml-auto flex gap-1.5 flex-wrap items-center">
                    <Button variant="default" size="sm" onClick={handleCopySuno} className="bg-slime text-black font-semibold hover:bg-slime/90 glow-slime h-8 px-3" title="Copiar letra 100% limpia para Suno AI (sin markdown)">
                      <Zap className="w-3.5 h-3.5 mr-1 fill-black" />Copiar para Suno
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground hover:text-slime h-8" title="Copiar texto plano">
                      <Copy className="w-3.5 h-3.5 mr-1" />Copiar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setPolishOpen(true); setPolishError(null); }} disabled={polishLoading} className="text-muted-foreground hover:text-cyber h-8" title="Agent Polish — 4 agentes IA revisan y mejoran la letra">
                      <Sparkles className="w-3.5 h-3.5 mr-1" />Polish
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCritic} disabled={criticLoading} className="text-muted-foreground hover:text-yellow-400 h-8" title="Crítico de letra (feedback IA)">
                      <MessageSquare className="w-3.5 h-3.5 mr-1" />Crítico
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRefTrackOpen(!refTrackOpen)} className={`h-8 ${refTrackOpen ? "text-sky-400" : "text-muted-foreground hover:text-sky-400"}`} title="Reference Track Importer">
                      <Music2 className="w-3.5 h-3.5 mr-1" />Ref Track
                    </Button>

                    {/* Export Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8">
                          <Download className="w-3.5 h-3.5 mr-1" />Exportar <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-md border-border/60">
                        <DropdownMenuItem onClick={handleCopyMarkdown} className="text-xs cursor-pointer">
                          <FileText className="w-3.5 h-3.5 mr-2 text-slime" />Copiar como Markdown (.md)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownload} className="text-xs cursor-pointer">
                          <Download className="w-3.5 h-3.5 mr-2 text-cyber" />Descargar archivo .txt
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF} className="text-xs cursor-pointer">
                          <FileText className="w-3.5 h-3.5 mr-2 text-purple-400" />Exportar a PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Translate Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={translating} className="text-muted-foreground hover:text-cyber h-8">
                          <Languages className="w-3.5 h-3.5 mr-1" />Traducir <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-md border-border/60">
                        <DropdownMenuItem onClick={() => handleTranslate("en")} className="text-xs cursor-pointer">
                          🇺🇸 Traducir al inglés (EN)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTranslate("es")} className="text-xs cursor-pointer">
                          🇪🇸 Traducir al español (ES)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Social & Media Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-pink-400 h-8">
                          <Share2 className="w-3.5 h-3.5 mr-1" />Social <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-md border-border/60">
                        <DropdownMenuItem onClick={() => handleSocialCaption("instagram")} disabled={socialLoading} className="text-xs cursor-pointer">
                          <Instagram className="w-3.5 h-3.5 mr-2 text-pink-400" />Instagram Caption
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSocialCaption("twitter")} disabled={socialLoading} className="text-xs cursor-pointer">
                          <Twitter className="w-3.5 h-3.5 mr-2 text-cyan-400" />Twitter / X Post
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSocialCaption("tiktok")} disabled={socialLoading} className="text-xs cursor-pointer">
                          <Video className="w-3.5 h-3.5 mr-2 text-foreground" />TikTok Script
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleProducerTag} disabled={producerTagLoading} className="text-xs cursor-pointer">
                          <Disc3 className="w-3.5 h-3.5 mr-2 text-purple-400" />Generar Producer Tag
                        </DropdownMenuItem>
                        {history.length > 0 && (
                          <DropdownMenuItem onClick={() => setRemixOpen(!remixOpen)} className="text-xs cursor-pointer">
                            <Sparkles className="w-3.5 h-3.5 mr-2 text-purple-400" />Remix de Secciones
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="sm" onClick={() => handleGenerate(false)} disabled={loading} className="text-muted-foreground hover:text-slime h-8" title="Otra letra (Ctrl+Enter)">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />Otra
                    </Button>
                  </div>
                )}
              </div>

              {/* Suno Quick Style Prompt Banner */}
              {lyrics && sunoStylePrompt && (
                <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-black/50 border border-cyber/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-cyber shrink-0" />
                    <span className="text-muted-foreground text-[11px] shrink-0 font-medium">Suno Style:</span>
                    <span className="text-cyber text-[11px] font-mono truncate">{sunoStylePrompt}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(sunoStylePrompt); toast.success("Suno Style Prompt copiado"); }}
                    className="border-cyber/40 text-cyber hover:bg-cyber/10 h-7 text-[11px] shrink-0 font-mono"
                    title="Copiar prompt de estilo para Suno"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copiar Estilo
                  </Button>
                </div>
              )}

              {loading && !lyrics ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="trap-spinner" />
                  <p className="text-sm text-muted-foreground">Cocinando la letra...</p>
                  <p className="text-[11px] text-muted-foreground/70">El ghostwriter está escribiendo</p>
                </div>
              ) : lyrics ? (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="lyrics-display space-y-4">
                    {parsedSections.length > 0 ? (() => {
                      // Build a global line index map for rhyme heatmap
                      let globalLineIdx = 0;
                      return parsedSections.map((sec, i) => {
                        const secName = sec.tag.replace(/[[\]]/g, "");
                        const locked = isSectionLocked(secName);
                        const sectionContent = sec.lines.filter(l => l.trim()).join("\n");
                        const nonEmptyLines = sec.lines.filter(l => l.trim());
                        return (
                          <div key={i} className="space-y-1 group relative">
                            <div className="flex items-center gap-2">
                              <div className="section-tag text-sm">{sec.tag}</div>
                              <button
                                onClick={() => toggleLockSection(secName, sectionContent)}
                                className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${locked ? "opacity-100 text-slime" : "text-muted-foreground hover:text-slime"}`}
                                title={locked ? "Desbloquear sección" : "Bloquear sección (mantener en re-gen)"}
                              >
                                {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleRegenerateSection(secName, sectionContent)}
                                disabled={loading}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-cyber disabled:opacity-30"
                                title="Re-generar solo esta sección"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {sec.interpreter && <div className="interpreter">Intérprete: {sec.interpreter}</div>}
                            <div className={`pl-3 border-l-2 ${locked ? "border-slime/60 bg-slime/5" : "border-slime/20"}`}>
                              {nonEmptyLines.map((line, j) => {
                                const thisLineIdx = globalLineIdx++;
                                const rhymeGroup = rhymeAnalysis ? getRhymeGroupForLine(rhymeAnalysis, thisLineIdx) : null;
                                return (
                                  <div
                                    key={`${i}-${j}`}
                                    style={rhymeGroup ? {
                                      borderLeft: `3px solid ${rhymeGroup.color}`,
                                      paddingLeft: "8px",
                                      marginLeft: "-3px",
                                    } : undefined}
                                  >
                                    {renderLyricLine(line, `${i}-${j}`)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })() : (
                      <pre className="whitespace-pre-wrap">{lyrics}</pre>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-slime/5 flex items-center justify-center">
                    <Mic2 className="w-8 h-8 text-slime/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Tu letra aparecerá aquí</p>
                  <p className="text-[11px] text-muted-foreground/70 max-w-xs">Configura el artista, mood y spanglish ratio, luego pulsa "Generar Letra"</p>
                </div>
              )}
            </Card>

            {/* --- Playlist Fit Panel (NEW) --- */}
            {playlistFit && lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-slime" />
                  <h2 className="font-display text-lg font-semibold">Playlist Fit</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-slime/40 text-slime">
                    Mejor: {playlistFit.bestFit?.matchScore}%
                  </Badge>
                </div>
                {playlistFit.bestFit && (
                  <div className="rounded-lg border border-slime/30 bg-slime/5 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Mejor playlist para tu canción</p>
                    <p className="font-display text-base font-bold text-slime">{playlistFit.bestFit.emoji} {playlistFit.bestFit.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{playlistFit.bestFit.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {playlistFit.bestFit.reasons.map((r, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] border-slime/30 text-slime">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {playlistFit.playlists.slice(0, 5).map((p) => (
                    <div key={p.id} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-foreground/80">{p.emoji} {p.name}</span>
                        <span className={p.matchScore >= 70 ? "text-slime font-semibold" : p.matchScore >= 50 ? "text-yellow-400" : "text-muted-foreground"}>{p.matchScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${p.matchScore >= 70 ? "bg-slime" : p.matchScore >= 50 ? "bg-yellow-400" : "bg-muted-foreground/30"}`}
                          style={{ width: `${p.matchScore}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* --- Live Performance Simulator Panel (NEW) --- */}
            {performanceSim && lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Live Performance Sim</h2>
                  <Badge variant="outline" className={`ml-auto text-[10px] ${
                    performanceSim.verdict === "hype" ? "border-cyber/50 text-cyber" :
                    performanceSim.verdict === "balanced" ? "border-yellow-400/50 text-yellow-400" :
                    "border-cyan-400/50 text-cyan-400"
                  }`}>
                    {performanceSim.verdict === "hype" ? "🔥 Hype" : performanceSim.verdict === "balanced" ? "⚖️ Balanced" : "🧊 Chill"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-cyber">{Math.floor(performanceSim.totalDuration / 60)}:{String(performanceSim.totalDuration % 60).padStart(2, "0")}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Duración</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-slime">{performanceSim.avgEnergy}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Energía avg</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-yellow-400">{performanceSim.peakEnergy}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Pico</p>
                  </div>
                </div>
                {/* Energy curve visualization */}
                <div className="flex items-end gap-0.5 h-20 px-2 py-1 bg-black/30 rounded-lg border border-border/40">
                  {performanceSim.energyCurve.map((energy, i) => (
                    <div
                      key={i}
                      className="flex-1 min-w-[2px] rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${Math.max(energy, 5)}%`,
                        backgroundColor: energy >= 80 ? "#ff0055" : energy >= 60 ? "#ff6600" : energy >= 40 ? "#00ff41" : "#66ddff",
                      }}
                      title={`${performanceSim.moments[i]?.label ?? ""} — ${energy}%`}
                    />
                  ))}
                </div>
                {/* Timeline highlights */}
                {performanceSim.highlights.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Momentos destacados:</p>
                    <div className="space-y-1">
                      {performanceSim.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px]">
                          <span className="text-cyber shrink-0">●</span>
                          <span className="text-foreground/70">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* --- Social Caption Panel (NEW) --- */}
            {socialOpen && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  {socialPlatform === "instagram" ? <Instagram className="w-5 h-5 text-pink-400" /> :
                   socialPlatform === "twitter" ? <Twitter className="w-5 h-5 text-cyan-400" /> :
                   <Video className="w-5 h-5 text-foreground" />}
                  <h2 className="font-display text-lg font-semibold">Caption {socialPlatform}</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setSocialOpen(false); setSocialCaption(null); }} className="ml-auto text-muted-foreground hover:text-foreground h-8">
                    ✕
                  </Button>
                </div>
                {socialLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="trap-spinner" />
                    <p className="text-sm text-muted-foreground">Generando caption para {socialPlatform}...</p>
                  </div>
                ) : socialCaption ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border/40 bg-black/30 p-3">
                      <pre className="text-[12px] whitespace-pre-wrap text-foreground/80 leading-relaxed font-sans">{socialCaption}</pre>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(socialCaption);
                        toast.success("Caption copiado");
                      }} className={`h-8 ${
                        socialPlatform === "instagram" ? "border-pink-400/30 hover:bg-pink-400/10 hover:text-pink-400" :
                        socialPlatform === "twitter" ? "border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-400" :
                        "border-foreground/30 hover:bg-foreground/10"
                      }`}>
                        <Copy className="w-3.5 h-3.5 mr-1" />Copiar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSocialCaption(socialPlatform)} className="border-border/40 hover:bg-white/5 h-8">
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />Otro
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Esperando caption...</p>
                )}
              </Card>
            )}

            {/* --- Cover Art Panel (NEW) --- */}
            {coverArtOpen && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-purple-400" />
                  <h2 className="font-display text-lg font-semibold">Cover Art (IA)</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setCoverArtOpen(false); setCoverArt(null); }} className="ml-auto text-muted-foreground hover:text-foreground h-8">
                    ✕
                  </Button>
                </div>
                {coverArtLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="trap-spinner" />
                    <p className="text-sm text-muted-foreground">Generando cover art con IA...</p>
                    <p className="text-[11px] text-muted-foreground/70">Esto puede tardar 10-20 segundos</p>
                  </div>
                ) : coverArt ? (
                  <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden border border-purple-400/30 glow-cyber">
                      <img src={`data:image/png;base64,${coverArt}`} alt="Cover art generado por IA para esta canción de trap" className="w-full h-auto" />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => {
                        const link = document.createElement("a");
                        link.href = `data:image/png;base64,${coverArt}`;
                        link.download = `trapghost-cover-${Date.now()}.png`;
                        link.click();
                        toast.success("Cover art descargado");
                      }} className="border-purple-400/30 hover:bg-purple-400/10 hover:text-purple-400 h-8">
                        <Download className="w-3.5 h-3.5 mr-1" />Descargar PNG
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCoverArt} className="border-purple-400/30 hover:bg-purple-400/10 hover:text-purple-400 h-8">
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />Otra
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Esperando generación...</p>
                )}
              </Card>
            )}

            {/* --- Punchline Detector Panel (NEW) --- */}
            {punchlineAnalysis && lyrics && punchlineAnalysis.punchlines.length > 0 && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h2 className="font-display text-lg font-semibold">Punchlines</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-yellow-400/40 text-yellow-400">
                    {punchlineAnalysis.punchlines.length} líneas fuertes · {punchlineAnalysis.punchlineDensity}% densidad
                  </Badge>
                </div>
                {punchlineAnalysis.topPunchline && (
                  <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-3">
                    <p className="text-[10px] text-yellow-400 uppercase mb-1 flex items-center gap-1">
                      <Quote className="w-3 h-3" /> Top Punchline (score: {punchlineAnalysis.topPunchline.score})
                    </p>
                    <p className="text-[13px] text-foreground italic leading-relaxed">"{punchlineAnalysis.topPunchline.text}"</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {punchlineAnalysis.topPunchline.reasons.map((r, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] border-yellow-400/30 text-yellow-400">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scroll">
                  {punchlineAnalysis.punchlines.slice(0, 8).map((p, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-black/20 border border-border/40">
                      <span className="text-[10px] font-bold text-yellow-400 shrink-0 w-8 text-right">{p.score}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground/80 truncate">{p.text}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {p.reasons.slice(0, 3).map((r, j) => (
                            <span key={j} className="text-[8px] text-muted-foreground/60">{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* --- Flow Waveform Panel (NEW) --- */}
            {flowWaveform && lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <AudioLines className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Flow Waveform</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-cyber/40 text-cyber">
                    {flowWaveform.totalBars} barras · max {flowWaveform.maxSyllables} sílabas
                  </Badge>
                </div>
                <div className="flex items-end justify-between gap-0.5 h-32 px-2 py-2 bg-black/30 rounded-lg border border-border/40 overflow-x-auto custom-scroll">
                  {flowWaveform.bars.map((bar, i) => (
                    <div
                      key={i}
                      className="flex-1 min-w-[3px] rounded-t-sm transition-all duration-300 hover:opacity-80 group relative"
                      style={{
                        height: `${Math.max(bar.height, 4)}%`,
                        backgroundColor: getIntensityColor(bar.intensity),
                        boxShadow: flowWaveform.peakIndices.includes(i) ? `0 0 8px ${getIntensityColor(bar.intensity)}` : undefined,
                      }}
                      title={`Línea ${bar.lineIndex + 1}: ${bar.syllables} sílabas${bar.label ? `\n"${bar.label}"` : ""}`}
                    >
                      {flowWaveform.peakIndices.includes(i) && (
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-yellow-400">★</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400"></span>Low (&lt;6)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slime"></span>Mid (6-9)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span>High (10-13)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyber"></span>Peak (14+)</span>
                </div>
              </Card>
            )}

            {/* --- Rhyme Scheme Detector Panel (NEW) --- */}
            {schemeAnalysis && lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Music2 className="w-5 h-5 text-slime" />
                  <h2 className="font-display text-lg font-semibold">Rhyme Scheme Detector</h2>
                  <Badge variant="outline" className={`ml-auto text-[10px] ${
                    schemeAnalysis.verdict === "structured" ? "border-slime/50 text-slime" :
                    schemeAnalysis.verdict === "loose" ? "border-yellow-400/50 text-yellow-400" :
                    "border-cyber/50 text-cyber"
                  }`}>
                    {schemeAnalysis.verdict === "structured" ? "📋 Estructurado" : schemeAnalysis.verdict === "loose" ? "≈ Suelto" : "🌀 Libre"}
                  </Badge>
                </div>
                <div className="rounded-lg border border-slime/30 bg-slime/5 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Esquema dominante</p>
                  <p className="font-display text-2xl font-bold text-slime tracking-widest">{schemeAnalysis.dominantScheme}</p>
                  <p className="text-[10px] text-muted-foreground">Consistencia: {schemeAnalysis.schemeConsistency}%</p>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scroll">
                  {schemeAnalysis.sections.slice(0, 6).map((sec, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span className="text-muted-foreground w-20 shrink-0 truncate">{sec.sectionName}</span>
                      <span className="font-mono text-slime font-bold tracking-wider">{sec.pattern}</span>
                      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${sec.consistency >= 70 ? "bg-slime" : sec.consistency >= 40 ? "bg-yellow-400" : "bg-cyber"}`}
                          style={{ width: `${sec.consistency}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 text-right">{sec.consistency}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* --- Beat Fit Panel (NEW) --- */}
            {beatFit && lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <AudioLines className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Beat Fit</h2>
                  <Badge variant="outline" className={`ml-auto text-[10px] ${
                    beatFit.verdict === "perfect" ? "border-slime/50 text-slime" :
                    beatFit.verdict === "good" ? "border-yellow-400/50 text-yellow-400" :
                    "border-cyber/50 text-cyber"
                  }`}>
                    {beatFit.verdict === "perfect" ? "✓ Perfecto" : beatFit.verdict === "good" ? "≈ Bien" : beatFit.verdict === "tight" ? "⚠ Denso" : "⚠ Sparse"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-slime">{beatFit.bpm}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">BPM</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-cyber">{beatFit.avgSyllablesPerLine}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Actual/Línea</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-yellow-400">{beatFit.idealSyllablesPerLine}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Ideal</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Fit score</span>
                    <span>{beatFit.fitScore}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        beatFit.fitScore >= 80 ? "bg-slime" :
                        beatFit.fitScore >= 50 ? "bg-yellow-400" :
                        "bg-cyber"
                      }`}
                      style={{ width: `${beatFit.fitScore}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{beatFit.recommendation}</p>
                <div className="text-[10px] text-muted-foreground/60 text-center">
                  {beatFit.beatsPerSyllable} beats por sílaba
                </div>
              </Card>
            )}

            {/* --- Vocal Range Panel (NEW) --- */}
            {vocalRange && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-purple-400" />
                  <h2 className="font-display text-lg font-semibold">Vocal Range</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-purple-400/40 text-purple-400">
                    Dificultad: {"⭐".repeat(vocalRange.difficulty)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Registro</p>
                    <p className="font-display text-sm font-bold text-purple-400 capitalize">{vocalRange.register}</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Tono</p>
                    <p className="font-display text-sm font-bold text-cyber capitalize">{vocalRange.tone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Técnicas:</p>
                  <div className="flex flex-wrap gap-1">
                    {vocalRange.techniques.map((tech, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] border-purple-400/30 text-purple-400">{tech}</Badge>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{vocalRange.description}</p>
              </Card>
            )}

            {/* --- Lyrics Critic Panel (NEW) --- */}
            {criticOpen && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-yellow-400" />
                  <h2 className="font-display text-lg font-semibold">Crítico de Letra</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setCriticOpen(false); setCriticResult(null); }} className="ml-auto text-muted-foreground hover:text-foreground h-8">
                    ✕
                  </Button>
                </div>
                {criticLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="trap-spinner" />
                    <p className="text-sm text-muted-foreground">El crítico está analizando...</p>
                  </div>
                ) : criticResult ? (
                  <>
                    {criticResult.raw ? (
                      <div className="rounded-md border border-yellow-400/20 bg-yellow-400/5 p-3">
                        <pre className="text-[11px] whitespace-pre-wrap text-foreground/80">{criticResult.summary}</pre>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center font-display font-bold text-xl border-2 ${
                            criticResult.overallScore >= 80 ? "border-slime text-slime" :
                            criticResult.overallScore >= 60 ? "border-yellow-400 text-yellow-400" :
                            "border-cyber text-cyber"
                          }`}>
                            {criticResult.overallScore}
                          </div>
                          <p className="flex-1 text-[12px] text-foreground/80 leading-relaxed">{criticResult.summary}</p>
                        </div>
                        <div className="space-y-2">
                          {criticResult.feedback.map((fb, i) => (
                            <div
                              key={i}
                              className={`rounded-lg border p-2.5 ${
                                fb.type === "strength" ? "border-slime/30 bg-slime/5" :
                                fb.type === "weakness" ? "border-cyber/30 bg-cyber/5" :
                                "border-yellow-400/30 bg-yellow-400/5"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {fb.type === "strength" ? <Award className="w-3.5 h-3.5 text-slime mt-0.5 shrink-0" /> :
                                 fb.type === "weakness" ? <AlertCircle className="w-3.5 h-3.5 text-cyber mt-0.5 shrink-0" /> :
                                 <Lightbulb className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />}
                                <div>
                                  {fb.line && <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">{fb.line}</span>}
                                  <p className="text-[11px] text-foreground/80 leading-relaxed">{fb.text}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Configura las opciones arriba y pulsa <span className="text-cyber font-medium">"Start Analysis"</span> para comenzar.</p>
                )}
              </Card>
            )}

            {/* --- Syllable Analysis Panel (NEW) --- */}
            {syllableAnalysis && lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slime" />
                  <h2 className="font-display text-lg font-semibold">Flow Analysis</h2>
                  <Badge variant="outline" className={`ml-auto text-[10px] ${
                    syllableAnalysis.verdict === "tight" ? "border-slime/50 text-slime" :
                    syllableAnalysis.verdict === "balanced" ? "border-yellow-400/50 text-yellow-400" :
                    "border-cyber/50 text-cyber"
                  }`}>
                    {syllableAnalysis.verdict === "tight" ? "🔥 Tight" : syllableAnalysis.verdict === "balanced" ? "⚖️ Balanced" : "🌀 Loose"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-slime">{syllableAnalysis.totalSyllables}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Sílabas totales</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-cyber">{syllableAnalysis.avgSyllablesPerLine}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Avg/línea</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-yellow-400">{syllableAnalysis.flowScore}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Flow score</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5">
                    <p className="font-display text-lg font-bold stat-number text-purple-400">{syllableAnalysis.denseLines.length}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Líneas densas</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Consistencia del flow</span>
                    <span>{syllableAnalysis.flowScore}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        syllableAnalysis.flowScore >= 70 ? "bg-slime" :
                        syllableAnalysis.flowScore >= 50 ? "bg-yellow-400" :
                        "bg-cyber"
                      }`}
                      style={{ width: `${syllableAnalysis.flowScore}%` }}
                    />
                  </div>
                </div>
                {(syllableAnalysis.denseLines.length > 0 || syllableAnalysis.sparseLines.length > 0) && (
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {syllableAnalysis.denseLines.length > 0 && (
                      <div className="rounded-md bg-orange-400/10 border border-orange-400/20 p-2">
                        <p className="text-orange-400">⚠️ {syllableAnalysis.denseLines.length} líneas densas (&gt;12 sílabas)</p>
                      </div>
                    )}
                    {syllableAnalysis.sparseLines.length > 0 && (
                      <div className="rounded-md bg-blue-400/10 border border-blue-400/20 p-2">
                        <p className="text-blue-400">💡 {syllableAnalysis.sparseLines.length} líneas cortas (&lt;4 sílabas)</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* --- Theme Analyzer Panel (NEW) --- */}
            {themeResult && lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Theme Analyzer</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-cyber/40 text-cyber">
                    {themeResult.themeCount} temas detectados
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Tema dominante:</p>
                  <div className="rounded-lg border border-cyber/30 bg-cyber/5 p-3">
                    <p className="font-display text-base font-bold text-cyber">{themeResult.dominantLabel}</p>
                  </div>
                  <div className="space-y-1.5">
                    {themeResult.themes.filter(t => t.score > 0).slice(0, 6).map((theme, i) => {
                      const maxScore = Math.max(...themeResult.themes.map(t => t.score), 1);
                      const pct = Math.round((theme.score / maxScore) * 100);
                      return (
                        <div key={theme.id} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-foreground/80">{theme.label}</span>
                            <span className="text-muted-foreground">{theme.score} keywords</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                i === 0 ? "bg-cyber" : "bg-slime/60"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* --- Quality Score Panel (NEW) --- */}
            {qualityScore && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-slime" />
                  <h2 className="font-display text-lg font-semibold">Quality Score</h2>
                  <div className="ml-auto flex items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-xl border-2 ${
                      qualityScore.grade === "S" ? "border-slime text-slime glow-slime" :
                      qualityScore.grade === "A" ? "border-slime text-slime" :
                      qualityScore.grade === "B" ? "border-yellow-400 text-yellow-400" :
                      qualityScore.grade === "C" ? "border-orange-400 text-orange-400" :
                      "border-cyber text-cyber"
                    }`}>
                      {qualityScore.grade}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl font-bold stat-number text-slime">{qualityScore.total}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">/ 100</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {qualityScore.breakdown.map((b, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{b.label} <span className="text-muted-foreground/50">({b.weight}%)</span></span>
                        <span className="font-semibold text-foreground">{b.score}<span className="text-muted-foreground text-[9px]">/100</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            b.score >= 70 ? "bg-slime" :
                            b.score >= 50 ? "bg-yellow-400" :
                            "bg-cyber"
                          }`}
                          style={{ width: `${b.score}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground/60">{b.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* --- Mood Match Panel (NEW) --- */}
            {moodMatch && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Target className={`w-5 h-5 ${
                    moodMatch.verdict === "perfect" ? "text-slime" :
                    moodMatch.verdict === "good" ? "text-yellow-400" :
                    moodMatch.verdict === "weak" ? "text-orange-400" :
                    "text-cyber"
                  }`} />
                  <h2 className="font-display text-lg font-semibold">Mood Match</h2>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-[10px] ${
                      moodMatch.verdict === "perfect" ? "border-slime/50 text-slime" :
                      moodMatch.verdict === "good" ? "border-yellow-400/50 text-yellow-400" :
                      moodMatch.verdict === "weak" ? "border-orange-400/50 text-orange-400" :
                      "border-cyber/50 text-cyber"
                    }`}
                  >
                    {moodMatch.verdict === "perfect" ? "✓ Perfecto" :
                     moodMatch.verdict === "good" ? "≈ Bien" :
                     moodMatch.verdict === "weak" ? "⚠ Débil" :
                     "✗ Desconectado"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{moodMatch.moodLabel}</span>
                      <span>{moodMatch.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          moodMatch.score >= 70 ? "bg-slime" :
                          moodMatch.score >= 50 ? "bg-yellow-400" :
                          moodMatch.score >= 30 ? "bg-orange-400" :
                          "bg-cyber"
                        }`}
                        style={{ width: `${moodMatch.score}%` }}
                      />
                    </div>
                  </div>
                </div>
                {moodMatch.matched.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">✓ Palabras del mood encontradas ({moodMatch.matched.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {moodMatch.matched.map((w, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] border-slime/30 text-slime">{w}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {moodMatch.missing.length > 0 && moodMatch.verdict !== "perfect" && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">💡 Sugerencias (no usadas):</p>
                    <div className="flex flex-wrap gap-1">
                      {moodMatch.missing.map((w, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] border-muted-foreground/20 text-muted-foreground/60">{w}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* --- Word Stats Panel (NEW) --- */}
            {wordStats && lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slime" />
                  <h2 className="font-display text-lg font-semibold">Estadísticas</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5 text-center">
                    <Type className="w-3.5 h-3.5 mx-auto text-slime mb-1" />
                    <p className="font-display text-lg font-bold stat-number text-slime">{wordStats.totalWords}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Palabras</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5 text-center">
                    <TrendingUp className="w-3.5 h-3.5 mx-auto text-cyber mb-1" />
                    <p className="font-display text-lg font-bold stat-number text-cyber">{wordStats.uniqueWords}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Únicas ({wordStats.uniqueRatio}%)</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5 text-center">
                    <Clock className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-1" />
                    <p className="font-display text-lg font-bold stat-number text-yellow-400">{wordStats.readingTimeSec}s</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Lectura</p>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-border/40 p-2.5 text-center">
                    <Mic className="w-3.5 h-3.5 mx-auto text-purple-400 mb-1" />
                    <p className="font-display text-lg font-bold stat-number text-purple-400">{wordStats.adlibCount}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Ad-libs</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded-md bg-black/20 p-2">
                    <p className="text-muted-foreground">Líneas</p>
                    <p className="font-semibold">{wordStats.nonEmptyLines}</p>
                  </div>
                  <div className="rounded-md bg-black/20 p-2">
                    <p className="text-muted-foreground">Avg/Línea</p>
                    <p className="font-semibold">{wordStats.avgWordsPerLine}</p>
                  </div>
                  <div className="rounded-md bg-black/20 p-2">
                    <p className="text-muted-foreground">Secciones</p>
                    <p className="font-semibold">{wordStats.sectionCount}</p>
                  </div>
                </div>
                {wordStats.topWords.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Palabras más frecuentes:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {wordStats.topWords.map((tw, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-slime/30 text-slime gap-1">
                          {tw.word} <span className="text-muted-foreground">×{tw.count}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* --- Diff Panel (NEW: line-by-line changes) --- */}
            {diffOpen && diffResult && (() => {
              const entry = history.find(h => h.id === diffTargetId);
              return (
                <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-cyber" />
                    <h2 className="font-display text-lg font-semibold">Diff de Letra</h2>
                    <Badge variant="outline" className="ml-auto text-[10px] border-slime/30 text-slime">
                      {diffResult.similarity}% similar
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => setDiffOpen(false)} className="text-muted-foreground hover:text-foreground h-8">
                      ✕
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="rounded-md bg-slime/10 border border-slime/20 p-2">
                      <p className="text-slime">+{diffResult.additions} nuevas</p>
                    </div>
                    <div className="rounded-md bg-cyber/10 border border-cyber/20 p-2">
                      <p className="text-cyber">-{diffResult.deletions} eliminadas</p>
                    </div>
                    <div className="rounded-md bg-yellow-400/10 border border-yellow-400/20 p-2">
                      <p className="text-yellow-400">~{diffResult.lines.filter(d => d.type === "modified").length} modificadas</p>
                    </div>
                  </div>
                  {entry && (
                    <p className="text-[10px] text-muted-foreground">Comparando actual vs historial ({entry.artistName} · {entry.timestamp})</p>
                  )}
                  <div className="rounded-md border border-border/40 bg-black/30 p-3 max-h-80 overflow-y-auto custom-scroll font-mono text-[10px] leading-relaxed">
                    {diffResult.lines.slice(0, 50).map((dl, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 py-0.5 ${
                          dl.type === "add" ? "bg-slime/10" :
                          dl.type === "del" ? "bg-cyber/10" :
                          dl.type === "modified" ? "bg-yellow-400/5" : ""
                        }`}
                      >
                        <span className="text-muted-foreground/40 w-4 shrink-0">
                          {dl.type === "add" ? "+" : dl.type === "del" ? "-" : dl.type === "modified" ? "~" : " "}
                        </span>
                        <span className="flex-1">
                          {dl.type === "modified" && dl.wordDiffs ? (
                            dl.wordDiffs.map((wd, j) => (
                              <span key={j} className={
                                wd.type === "add" ? "text-slime bg-slime/15 px-0.5 rounded" :
                                wd.type === "del" ? "text-cyber line-through bg-cyber/15 px-0.5 rounded" :
                                "text-muted-foreground/70"
                              }>{wd.text}</span>
                            ))
                          ) : dl.type === "add" ? (
                            <span className="text-slime">{dl.newLine}</span>
                          ) : dl.type === "del" ? (
                            <span className="text-cyber line-through">{dl.oldLine}</span>
                          ) : (
                            <span className="text-muted-foreground/70">{dl.newLine}</span>
                          )}
                        </span>
                      </div>
                    ))}
                    {diffResult.lines.length > 50 && (
                      <p className="text-muted-foreground text-center py-2">... y {diffResult.lines.length - 50} líneas más</p>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* --- Flow Profile Panel (Suno) --- */}
            {flowProfile && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-slime" />
                  <h2 className="font-display text-lg font-semibold">Flow Profile (Suno)</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-slime/40 text-slime">
                    {getCadenceLabel(flowProfile.cadence)}
                  </Badge>
                </div>
                <div className="rounded-lg border border-slime/20 bg-slime/5 p-3 space-y-1.5">
                  <p className="text-[10px] text-slime uppercase font-medium">🎵 Cadencia rítmica</p>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{flowProfile.cadenceInstruction}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="text-center"><p className="font-display text-base font-bold text-slime">{flowProfile.syllablesPerBar}</p><p className="text-[9px] text-muted-foreground">síl/barra</p></div>
                    <div className="text-[10px] text-muted-foreground">{flowProfile.speedLabel}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{flowProfile.accentPattern}</p>
                </div>
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 space-y-1">
                  <p className="text-[10px] text-cyan-400 uppercase font-medium">🫁 Patrón de respiración</p>
                  <p className="text-[11px] text-foreground/80">{flowProfile.breathStyle} cada {flowProfile.breathEveryBars} barras</p>
                </div>
                <div>
                  <p className="text-[10px] text-cyber uppercase mb-1.5 font-medium">🎤 Vocal tags (Suno Style Prompt)</p>
                  <div className="flex flex-wrap gap-1">
                    {flowProfile.vocalTags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] border-cyber/30 text-cyber">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* --- Suno Style Prompt Panel --- */}
            {lyrics && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Suno Style Prompt</h2>
                  <span className="ml-auto text-[10px] text-muted-foreground">{sunoStylePrompt.length}/1000</span>
                </div>
                <Textarea
                  value={sunoStylePrompt}
                  onChange={(e) => setSunoStylePrompt(e.target.value.slice(0, 1000))}
                  placeholder="Style tags for Suno/Udio (auto-generated or write your own)..."
                  className="bg-black/40 resize-none font-mono text-[11px]"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const generated = buildSunoStylePrompt({ beatType, bpmVibe, moodId, artistId, producerId, structureLabel: structure.label });
                    setSunoStylePrompt(generated);
                    toast.success("Suno style prompt auto-generado");
                  }} className="border-cyber/30 hover:bg-cyber/10 hover:text-cyber h-8">
                    <Sparkles className="w-3.5 h-3.5 mr-1" />Auto
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(sunoStylePrompt); toast.success("Suno prompt copiado"); }} className="border-cyber/30 hover:bg-cyber/10 hover:text-cyber h-8">
                    <Copy className="w-3.5 h-3.5 mr-1" />Copiar
                  </Button>
                </div>
              </Card>
            )}

            {/* --- Beat Prompt Panel (NEW: Suno/Udio-style) --- */}
            {beatPrompt && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Beat Prompt (Suno/Udio)</h2>
                  <Button variant="ghost" size="sm" onClick={handleCopyBeatPrompt} className="ml-auto text-muted-foreground hover:text-cyber h-8" title="Copiar beat prompt">
                    <Copy className="w-3.5 h-3.5 mr-1" />Copiar
                  </Button>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Style Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {beatPrompt.styleTags.split(", ").map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-cyber/30 text-cyber">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Descripción</p>
                    <p className="text-[12px] text-foreground/80 leading-relaxed">{beatPrompt.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Instrumentos</p>
                      <div className="flex flex-wrap gap-1">
                        {beatPrompt.instruments.map((inst, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] border-slime/30 text-slime">{inst}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Energía</p>
                      <p className="text-[11px] text-foreground/70">{beatPrompt.energy}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* --- Agent Polish Panel --- */}
            {polishOpen && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Agent Polish</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-cyber/40 text-cyber">
                    4 Checkers + Rewriter
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => { setPolishOpen(false); setPolishResult(null); }} className="text-muted-foreground hover:text-foreground h-8">
                    ✕
                  </Button>
                </div>

                {/* Auto-iterate toggle — siempre visible cuando no está cargando */}
                {!polishLoading && (
                  <label className="flex items-center gap-2 rounded-lg border border-purple-400/30 bg-purple-400/5 p-2.5 cursor-pointer hover:bg-purple-400/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={polishAutoIterate}
                      onChange={(e) => setPolishAutoIterate(e.target.checked)}
                      className="w-4 h-4 accent-purple-400"
                    />
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-purple-400">⚡ Auto-iterate (hasta 3 ciclos)</p>
                      <p className="text-[10px] text-muted-foreground">Reescribe automáticamente hasta superar el umbral del tier del artista. TIER 1=80, TIER 2=70, TIER 3=60.</p>
                    </div>
                  </label>
                )}

                {/* Error display */}
                {polishError && !polishLoading && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <p className="text-[12px] font-medium text-red-400">Error en Agent Polish:</p>
                    </div>
                    <p className="text-[11px] text-foreground/80">{polishError}</p>
                    <Button variant="outline" size="sm" onClick={() => { setPolishError(null); handleAgentPolish(); }} className="h-7 text-[11px] border-red-400/40 text-red-400 hover:bg-red-500/10">
                      Reintentar
                    </Button>
                  </div>
                )}

                {/* Start Analysis button — solo cuando no está cargando y no hay resultado/error */}
                {!polishLoading && !polishResult && !polishError && (
                  <Button onClick={handleAgentPolish} className="w-full bg-gradient-to-r from-cyber to-purple-500 text-white font-semibold hover:opacity-90 h-11">
                    <Sparkles className="w-4 h-4 mr-2" />Start Analysis
                  </Button>
                )}

                {polishLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="trap-spinner" />
                    <p className="text-sm text-muted-foreground">
                      {polishAutoIterate ? `Auto-iterate: analizando y reescribiendo (hasta 3 ciclos)...` : `4 agentes analizando la letra...`}
                    </p>
                    <div className="space-y-1.5 text-[11px] text-muted-foreground/70">
                      <p>🎤 Agente 1: Rhyme Checker — analizando rimas...</p>
                      <p>🎵 Agente 2: Flow Checker — analizando métrica...</p>
                      <p>📝 Agente 3: Content Checker — analizando contenido...</p>
                      <p>🪝 Agente 4: Hook Analyzer — analizando hook por estilo...</p>
                      <p>✨ Agente 5: Rewriter — reescribiendo con mejoras...{polishAutoIterate ? " (iterando)" : ""}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50">
                      {polishAutoIterate ? "Auto-iterate puede tardar 2-5 minutos (múltiples ciclos)" : "Esto puede tardar 30-90 segundos"}
                    </p>
                  </div>
                ) : polishResult ? (
                  <div className="space-y-3">
                    {/* Tier + threshold badge (auto-iterate) */}
                    {polishResult.autoIterate && polishResult.tierLabel && (
                      <div className="flex items-center gap-2 rounded-lg border border-purple-400/30 bg-purple-400/5 p-2">
                        <Zap className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] text-purple-400 font-medium">Tier: {polishResult.tierLabel}</span>
                        {polishResult.stoppedReason === "threshold_reached" ? (
                          <Badge variant="outline" className="text-[9px] border-slime/40 text-slime ml-auto">✓ Umbral superado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] border-yellow-400/40 text-yellow-400 ml-auto">Máx iteraciones</Badge>
                        )}
                      </div>
                    )}

                    {/* Score comparison */}
                    <div className="flex items-center gap-3 rounded-lg border border-cyber/20 bg-cyber/5 p-3">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Original</p>
                        <p className="font-display text-2xl font-bold text-muted-foreground">{polishResult.originalScore}</p>
                      </div>
                      <div className="text-2xl text-cyber">→</div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Pulido</p>
                        <p className="font-display text-2xl font-bold text-slime">{polishResult.finalScore}</p>
                      </div>
                      <div className="ml-auto">
                        <Badge variant="outline" className="text-[10px] border-slime/40 text-slime">
                          {polishResult.finalScore >= polishResult.originalScore ? "+" : ""}{polishResult.finalScore - polishResult.originalScore} pts
                        </Badge>
                      </div>
                    </div>

                    {/* Iterations progress (auto-iterate) */}
                    {polishResult.autoIterate && polishResult.iterations && polishResult.iterations.length > 0 && (
                      <div className="rounded-lg border border-purple-400/20 bg-purple-400/5 p-3">
                        <p className="text-[10px] text-purple-400 uppercase font-medium mb-2">Iteraciones:</p>
                        <div className="flex items-center gap-2">
                          {polishResult.iterations.map((it, i) => (
                            <div key={i} className="flex-1 text-center">
                              <p className="text-[9px] text-muted-foreground">#{it.iteration}</p>
                              <p className={`font-display text-lg font-bold ${it.score >= (polishResult.threshold ?? 70) ? "text-slime" : "text-yellow-400"}`}>{it.score}</p>
                            </div>
                          ))}
                          {polishResult.iterations.length > 1 && <div className="text-[10px] text-muted-foreground ml-2">→</div>}
                        </div>
                      </div>
                    )}

                    {/* Agent reports */}
                    <div className="space-y-2">
                      {polishResult.agentReports.map((report, i) => (
                        <div key={i} className="rounded-lg border border-border/40 bg-black/20 p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium">{report.agent}</span>
                            <Badge variant="outline" className={`text-[9px] ${
                              report.score >= 70 ? "border-slime/40 text-slime" :
                              report.score >= 50 ? "border-yellow-400/40 text-yellow-400" :
                              "border-cyber/40 text-cyber"
                            }`}>
                              {report.score}/100
                            </Badge>
                          </div>
                          {report.issues.length > 0 && (
                            <div className="space-y-0.5">
                              {report.issues.slice(0, 3).map((issue, j) => (
                                <div key={j} className="flex items-start gap-1.5 text-[10px]">
                                  <AlertCircle className="w-3 h-3 text-cyber mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground">{issue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {report.suggestions.length > 0 && (
                            <div className="space-y-0.5">
                              {report.suggestions.slice(0, 2).map((sug, j) => (
                                <div key={j} className="flex items-start gap-1.5 text-[10px]">
                                  <Lightbulb className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground">{sug}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Improvements summary */}
                    <div className="rounded-lg border border-slime/20 bg-slime/5 p-3">
                      <p className="text-[10px] text-slime uppercase font-medium mb-1">Mejoras aplicadas:</p>
                      {polishResult.improvements.map((imp, i) => (
                        <p key={i} className="text-[11px] text-foreground/70">✓ {imp}</p>
                      ))}
                    </div>

                    {/* Apply button */}
                    <Button onClick={applyPolishedLyrics} className="w-full bg-gradient-to-r from-cyber to-purple-500 text-white font-semibold hover:opacity-90 h-11">
                      <Sparkles className="w-4 h-4 mr-2" />Aplicar Letra Pulida
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Configura las opciones arriba y pulsa <span className="text-cyber font-medium">"Start Analysis"</span> para comenzar.</p>
                )}
              </Card>
            )}

            {/* --- Reference Track Importer Panel (Phase 4) --- */}
            {refTrackOpen && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Music2 className="w-5 h-5 text-sky-400" />
                  <h2 className="font-display text-lg font-semibold">Reference Track Importer</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-sky-400/40 text-sky-400">
                    ADN estructural
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setRefTrackOpen(false)} className="text-muted-foreground hover:text-foreground h-8">
                    ✕
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pega la letra de una canción que te guste (tuya o de otro artista). La app analiza su ADN estructural (secciones, esquema de rima, densidad, ad-libs, idioma, hook style) y lo replica con el contenido del artista seleccionado.
                </p>
                <textarea
                  value={refTrackLyrics}
                  onChange={(e) => setRefTrackLyrics(e.target.value)}
                  placeholder="Pega aquí la letra completa de la canción de referencia...&#10;&#10;### [Verse 1]&#10;...&#10;&#10;### [Chorus]&#10;..."
                  className="w-full min-h-[140px] max-h-[300px] overflow-y-auto rounded-lg border border-border/40 bg-black/30 p-3 text-[12px] font-mono text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none focus:border-sky-400/50 resize-y custom-scroll"
                />
                {refTrackLyrics.trim() && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-sky-400/40 text-sky-400">
                      {refTrackLyrics.trim().split("\n").length} líneas
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setRefTrackLyrics(""); setRefTrackAnalysis(null); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground h-7"
                    >
                      Limpiar
                    </Button>
                  </div>
                )}
                {refTrackAnalysis && (
                  <div className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-3">
                    <p className="text-[10px] text-sky-400 uppercase font-medium mb-1">ADN extraído:</p>
                    <p className="text-[11px] text-foreground/70">{refTrackAnalysis}</p>
                  </div>
                )}
                <div className="rounded-lg border border-sky-400/10 bg-sky-400/5 p-2.5">
                  <p className="text-[10px] text-sky-400/80">
                    💡 Cuando generes, la app extraerá la estructura, esquema de rima, densidad, patrón de ad-libs, ratio de idioma y hook style de esta canción, y replicará ese ADN con el contenido del artista seleccionado.
                  </p>
                </div>
              </Card>
            )}

            {/* --- Producer Tag Generator Panel --- */}
            {producerTagOpen && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Disc3 className="w-5 h-5 text-purple-400" />
                  <h2 className="font-display text-lg font-semibold">Producer Tag Generator</h2>
                  <Badge variant="outline" className="ml-auto text-[10px] border-purple-400/40 text-purple-400">
                    {producerName}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => { setProducerTagOpen(false); setProducerTags([]); }} className="text-muted-foreground hover:text-foreground h-8">
                    ✕
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Genera 5 variants de producer tag para "{producerName}" adaptadas a la letra y el mood de la canción.
                  Click en uno para inyectarlo al inicio de la letra.
                </p>
                {producerTagLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="trap-spinner" />
                    <p className="text-sm text-muted-foreground">Generando tags para {producerName}...</p>
                  </div>
                ) : producerTags.length > 0 ? (
                  <div className="space-y-2">
                    {producerTags.map((tag, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-purple-400/30 bg-purple-400/5 p-3 hover:border-purple-400/60 hover:bg-purple-400/10 cursor-pointer transition-all"
                        onClick={() => injectProducerTag(tag.text)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] border-purple-400/30 text-purple-400 shrink-0">
                            {tag.style}
                          </Badge>
                          <p className="text-[13px] text-foreground italic flex-1">"{tag.text}"</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">Click para inyectar →</span>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleProducerTag} disabled={producerTagLoading} className="w-full border-purple-400/30 hover:bg-purple-400/10 hover:text-purple-400 h-8">
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />Generar otros
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Esperando tags...</p>
                )}
              </Card>
            )}

            {/* --- Translation Panel (NEW: EN↔ES) --- */}
            {translationOpen && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-cyber" />
                  <h2 className="font-display text-lg font-semibold">Traducción</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setTranslationOpen(false); setTranslatedLyrics(null); }} className="ml-auto text-muted-foreground hover:text-foreground h-8">
                    ✕
                  </Button>
                </div>
                {translating ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="trap-spinner" />
                    <p className="text-sm text-muted-foreground">Traduciendo letra...</p>
                  </div>
                ) : translatedLyrics ? (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="lyrics-display space-y-3">
                      {parseLyrics(translatedLyrics).map((sec, i) => (
                        <div key={i} className="space-y-1">
                          <div className="section-tag text-sm">{sec.tag}</div>
                          {sec.interpreter && <div className="interpreter">Intérprete: {sec.interpreter}</div>}
                          <div className="pl-3 border-l-2 border-cyber/20">
                            {sec.lines.filter(l => l.trim()).map((line, j) => renderLyricLine(line, `t-${i}-${j}`))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No hay traducción disponible</p>
                )}
                {translatedLyrics && (
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(translatedLyrics)} className="border-cyber/30 hover:bg-cyber/10 hover:text-cyber h-8">
                      <Copy className="w-3.5 h-3.5 mr-1" />Copiar traducción
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setLyrics(translatedLyrics); setTranslationOpen(false); setTranslatedLyrics(null); setAnalysis(analyzeLanguageRatio(translatedLyrics, spanglishPercent)); }} className="border-slime/30 hover:bg-slime/10 hover:text-slime h-8">
                      Usar como letra
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* --- Remix Panel (NEW: combine sections from history) --- */}
            {remixOpen && history.length > 0 && (
              <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h2 className="font-display text-lg font-semibold">Remix Studio</h2>
                  <Button variant="ghost" size="sm" onClick={() => setRemixOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground h-8">
                    ✕
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Selecciona qué sección usar de cada generación histórica. Las no seleccionadas usarán la versión actual.</p>
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scroll">
                  {structure.sections.map((sec) => (
                    <div key={sec.name} className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-black/20">
                      <span className="text-[12px] font-medium min-w-0 flex-1 truncate">{sec.name}</span>
                      <select
                        value={remixSelections[sec.name] ?? ""}
                        onChange={(e) => {
                          setRemixSelections(prev => {
                            const next = { ...prev };
                            if (e.target.value) next[sec.name] = e.target.value;
                            else delete next[sec.name];
                            return next;
                          });
                        }}
                        className="bg-black/40 border border-border/40 rounded-md text-[10px] px-2 py-1 max-w-[200px] truncate"
                      >
                        <option value="">Actual</option>
                        {history.map(h => (
                          <option key={h.id} value={h.id}>{h.artistName} · {h.timestamp}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <Button onClick={handleRemix} className="w-full bg-gradient-to-r from-purple-500 to-cyber text-white font-semibold hover:opacity-90 h-11">
                  <Sparkles className="w-4 h-4 mr-2" />Crear Remix
                </Button>
              </Card>
            )}

            {/* --- Compare Panel (NEW: side-by-side diff) --- */}
            {compareOpen && compareEntryId && (() => {
              const entry = history.find(h => h.id === compareEntryId);
              if (!entry) return null;
              return (
                <Card className="glass-card p-5 space-y-3 animate-fade-slide">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-slime" />
                    <h2 className="font-display text-lg font-semibold">Comparar Generaciones</h2>
                    <Button variant="ghost" size="sm" onClick={() => setCompareOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground h-8">
                      ✕
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] border-cyber/40 text-cyber">Actual</Badge>
                        <span className="text-[11px] text-muted-foreground truncate">{artist?.name}</span>
                      </div>
                      <div className="rounded-md border border-border/40 bg-black/30 p-2.5 max-h-72 overflow-y-auto custom-scroll">
                        <pre className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed">{lyrics.slice(0, 800)}</pre>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] border-slime/40 text-slime">Historial</Badge>
                        <span className="text-[11px] text-muted-foreground truncate">{entry.artistName} · {entry.timestamp}</span>
                      </div>
                      <div className="rounded-md border border-border/40 bg-black/30 p-2.5 max-h-72 overflow-y-auto custom-scroll">
                        <pre className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed">{entry.fullLyrics.slice(0, 800)}</pre>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center text-[10px]">
                    <div>
                      <p className="text-muted-foreground">Ratio actual: <span className="text-slime">{analysis?.englishPercent ?? "?"}% EN</span></p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ratio historial: <span className="text-slime">{entry.actualEnglishPercent}% EN</span></p>
                    </div>
                  </div>
                </Card>
              );
            })()}
          </div>
        </div>
      </main>

      {/* ===== Footer (sticky) ===== */}
      <footer className="relative z-10 border-t border-border/40 backdrop-blur-md bg-black/40 mt-auto">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>TrapGhost v13.0 · API Key Gemini · Beat Types · Voice Assignment · Flow Profiles · Suno Style Prompt · {history.length > 0 ? `${history.length} en historial` : "Sin historial"}</p>
          <p className="flex items-center gap-2">
            <span className="bpm-pulse" />
            Powered by Z.ai · {regenCount > 0 ? `${regenCount} correcciones aplicadas` : "Sin correcciones aún"}
          </p>
        </div>
      </footer>
    </div>
  );
}

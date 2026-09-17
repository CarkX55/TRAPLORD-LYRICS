// Song Document AST — Core Data Model for TRAPLORD DAW Textual
// Every song is an Abstract Syntax Tree (AST) of sections and bars with strict invariants.

export interface BarPerformanceMarkup {
  pauseBefore?: boolean;       // [Pause]
  pauseAfter?: boolean;
  adlibs?: string[];           // (ad-lib text)
  vocalCut?: boolean;          // [Vocal Cut]
  emphasis?: string[];         // Words emphasized
}

export interface BarAnalysis {
  barId: string;
  position: number;
  text: string;
  syllableCount: number;
  rhymeDensity: number;
  sceneContribution: number;
  originality: number;
  specificity: number;          // Concreción visual / detalles físicos
  genericnessPenalty: number;   // Penalización por líneas vacías de significado
  sceneDependency: number;      // ¿Tiene sentido únicamente dentro de esta canción?
  registerFit: number;
  clichePenalty: number;
  score: number;
}

export interface SongBar {
  id: string;                  // Inmutable unique ID (e.g. "b_1a2b3c4d")
  position: number;            // 1-based bar index within the section
  lyricText: string;           // Clean sung lyrics without performance tags
  performance?: BarPerformanceMarkup;
  locked: boolean;             // 🔒 When true, NEVER mutated by patch or regeneration
  analysis?: BarAnalysis;
}

export interface HookContract {
  id: string;
  approvedText: string;             // Texto lírico canónico estricto
  bars: string[];                   // Líneas limpias de cada compás
  contentHash: string;              // Hash de verificación de inmutabilidad
  locked: boolean;
  sourceVersionId?: string;
  allowPerformanceVariation: boolean; // default true: lyricText canónico, performance (ad-libs, cortes) con variación
}

export interface SongSectionDoc {
  id: string;                  // e.g. "s_intro", "s_verse1", "s_hook"
  name: string;                // Display title: "Verse 1", "Chorus", etc.
  type: "intro" | "verse" | "hook" | "bridge" | "outro" | "beat_drop";
  voiceId: "lead" | "feature" | "adlib_layer" | "whisper_layer" | "both";
  performanceHint?: string;    // Suno acoustic hint: "Hypnotic repetitive mantra, heavy 808"
  hookContractId?: string;     // Reference to HookContract if this section is a hook
  bars: SongBar[];
}

export interface SongVersion {
  id: string;                  // e.g. "v_1", "v_2"
  songId: string;
  parentVersionId?: string;
  createdAt: number;
  createdBy: "generator" | "user" | "patch" | "section_regeneration";
  changeType: "initial" | "manual_edit" | "patch" | "section_regeneration";
  changedBarIds: string[];
}

export interface SongDocument {
  schemaVersion: 1;
  id: string;
  versionId: string;
  createdAt: number;
  updatedAt: number;
  hookContracts?: Record<string, HookContract>;
  sections: SongSectionDoc[];
}

/**
 * Deep clones a SongDocument AST guaranteeing pure immutability.
 */
export function cloneSongDocument(doc: SongDocument): SongDocument {
  return JSON.parse(JSON.stringify(doc));
}

/**
 * Calculates a deterministic content hash of a bar to verify structural invariants.
 */
export function hashBarContent(bar: SongBar): string {
  const perf = bar.performance ?? {};
  return `${bar.id}:${bar.lyricText.trim().toLowerCase()}:${bar.locked}:${JSON.stringify(perf)}`;
}

/**
 * Calculates a deterministic content hash for an entire SongDocument AST.
 * Guarantees that any bar text change, performance modification or structural
 * alteration produces a distinct hash.
 */
export function hashSongDocument(doc: SongDocument): string {
  const barStrings = doc.sections.map(s => `${s.id}:${s.name}:${s.bars.map(hashBarContent).join("|")}`).join("::");
  const hash = Math.abs(
    barStrings.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  ).toString(36);
  return `doc_${hash}_s${doc.sections.length}`;
}

/**
 * Serializes a SongBar into a Suno-native sung line with brackets & ad-libs.
 */
export function stringifyBar(bar: SongBar): string {
  const parts: string[] = [];
  if (bar.performance?.pauseBefore) parts.push("[Pause]");
  parts.push(bar.lyricText);
  if (bar.performance?.adlibs && bar.performance.adlibs.length > 0) {
    const adlibStr = bar.performance.adlibs
      .map(a => (a.startsWith("(") && a.endsWith(")") ? a : `(${a})`))
      .join(" ");
    parts.push(adlibStr);
  }
  if (bar.performance?.vocalCut) parts.push("[Vocal Cut]");
  if (bar.performance?.pauseAfter) parts.push("[Pause]");
  return parts.join(" ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Serializes a full SongDocument AST into standard Suno AI lyrics text.
 */
export function stringifyASTToSunoLyrics(doc: SongDocument): string {
  return doc.sections
    .map(section => {
      const hint = section.performanceHint ? `, ${section.performanceHint}` : "";
      const header = `[${section.name}${hint}]`;
      const barLines = section.bars.map(stringifyBar);
      return `${header}\n${barLines.join("\n")}`;
    })
    .join("\n\n");
}

/**
 * Creates an immutable HookContract from a raw or parsed hook topline.
 */
export function createHookContract(
  approvedTopline: string,
  options: { allowPerformanceVariation?: boolean; sourceVersionId?: string } = {}
): HookContract {
  const lines = approvedTopline
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("["));

  // Clean lines for canonical bars: strip bracket markup & ad-libs
  const cleanBars = lines.map(line => {
    return line
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\([^)]+\)/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }).filter(b => b.length > 0);

  const cleanApprovedText = cleanBars.join("\n");
  const contentHash = `hook_${Math.abs(
    cleanApprovedText.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  ).toString(36)}`;

  return {
    id: `hc_${Math.random().toString(36).substring(2, 9)}`,
    approvedText: cleanApprovedText,
    bars: cleanBars,
    contentHash,
    locked: true,
    sourceVersionId: options.sourceVersionId,
    allowPerformanceVariation: options.allowPerformanceVariation ?? true,
  };
}

/**
 * Deterministically binds and reconciles a HookContract to all Hook/Chorus sections in a SongDocument AST.
 * Invariant: canonical lyricText is guaranteed 100% identical across all chorus instances.
 * Performance (ad-libs, pauses, cuts) is preserved per section if allowPerformanceVariation is true.
 */
export function bindHookContractToAST(
  doc: SongDocument,
  contract: HookContract
): SongDocument {
  const cloned = cloneSongDocument(doc);
  if (!cloned.hookContracts) {
    cloned.hookContracts = {};
  }
  cloned.hookContracts[contract.id] = contract;

  for (const section of cloned.sections) {
    const isHook =
      section.type === "hook" ||
      section.name.toLowerCase().includes("chorus") ||
      section.name.toLowerCase().includes("hook") ||
      section.name.toLowerCase().includes("estribillo");

    if (isHook) {
      section.hookContractId = contract.id;

      const targetBarCount = contract.bars.length;
      if (targetBarCount === 0) continue;

      // Reconcile each bar to canonical lyricText
      for (let i = 0; i < targetBarCount; i++) {
        const canonicalLyric = contract.bars[i];
        if (section.bars[i]) {
          section.bars[i].lyricText = canonicalLyric;
          if (!contract.allowPerformanceVariation) {
            section.bars[i].performance = undefined;
          }
        } else {
          section.bars.push({
            id: `b_hc_${Math.random().toString(36).substring(2, 8)}`,
            position: i + 1,
            lyricText: canonicalLyric,
            locked: true,
          });
        }
      }

      // Trim any surplus bars beyond canonical hook
      if (section.bars.length > targetBarCount) {
        section.bars = section.bars.slice(0, targetBarCount);
      }
    }
  }

  return cloned;
}

/**
 * Parses raw lyric text into a structured SongDocument AST.
 * Preserves existing bar IDs and locks if provided.
 */
export function parseRawLyricsToAST(rawLyrics: string, existingDoc?: SongDocument): SongDocument {
  const lines = rawLyrics.split(/\r?\n/);
  const sections: SongSectionDoc[] = [];

  let currentSection: SongSectionDoc | null = null;
  let barPos = 1;
  const existingBarsMap = new Map<string, SongBar>();

  if (existingDoc) {
    for (const sec of existingDoc.sections) {
      for (const b of sec.bars) {
        existingBarsMap.set(b.lyricText.trim().toLowerCase(), b);
      }
    }
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check for section header [Section Name: Details]
    const headerMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (headerMatch) {
      const inner = headerMatch[1].trim();
      const parts = inner.split(":");
      const rawName = parts[0].trim();
      const afterColon = parts.slice(1).join(":").trim();

      let type: SongSectionDoc["type"] = "verse";
      const lowerName = rawName.toLowerCase();
      if (lowerName.includes("intro")) type = "intro";
      else if (lowerName.includes("chorus") || lowerName.includes("hook") || lowerName.includes("estribillo")) type = "hook";
      else if (lowerName.includes("bridge") || lowerName.includes("puente")) type = "bridge";
      else if (lowerName.includes("outro") || lowerName.includes("final")) type = "outro";
      else if (lowerName.includes("beat drop") || lowerName.includes("switch")) type = "beat_drop";

      let voiceId: SongSectionDoc["voiceId"] = "lead";
      if (afterColon.toLowerCase().includes("feature")) voiceId = "feature";
      else if (afterColon.toLowerCase().includes("&") || afterColon.toLowerCase().includes("both")) voiceId = "both";

      currentSection = {
        id: `s_${Math.random().toString(36).substring(2, 9)}`,
        name: rawName,
        type,
        voiceId,
        performanceHint: afterColon || undefined,
        bars: [],
      };
      sections.push(currentSection);
      barPos = 1;
      continue;
    }

    // It's a sung bar line
    if (!currentSection) {
      currentSection = {
        id: `s_${Math.random().toString(36).substring(2, 9)}`,
        name: "Verse 1",
        type: "verse",
        voiceId: "lead",
        bars: [],
      };
      sections.push(currentSection);
      barPos = 1;
    }

    // Extract performance tags: [Pause], [Vocal Cut], (ad-lib)
    let lineText = trimmed;
    const pauseBefore = lineText.startsWith("[Pause]");
    if (pauseBefore) lineText = lineText.replace(/^\[Pause\]\s*/, "");

    const vocalCut = lineText.includes("[Vocal Cut]");
    if (vocalCut) lineText = lineText.replace(/\s*\[Vocal Cut\]/, "");

    const pauseAfter = lineText.endsWith("[Pause]");
    if (pauseAfter) lineText = lineText.replace(/\s*\[Pause\]$/, "");

    // Extract (ad-libs)
    const adlibs: string[] = [];
    const adlibMatches = lineText.match(/\(([^)]+)\)/g);
    if (adlibMatches) {
      for (const m of adlibMatches) {
        adlibs.push(m.replace(/[()]/g, "").trim());
      }
      lineText = lineText.replace(/\(([^)]+)\)/g, "").trim();
    }

    const cleanLyric = lineText.replace(/\s{2,}/g, " ").trim();
    const existing = existingBarsMap.get(cleanLyric.toLowerCase());

    const bar: SongBar = {
      id: existing ? existing.id : `b_${Math.random().toString(36).substring(2, 9)}`,
      position: barPos++,
      lyricText: cleanLyric,
      locked: existing ? existing.locked : false,
      performance: {
        pauseBefore: pauseBefore || undefined,
        pauseAfter: pauseAfter || undefined,
        adlibs: adlibs.length > 0 ? adlibs : undefined,
        vocalCut: vocalCut || undefined,
      },
    };

    currentSection.bars.push(bar);
  }

  return {
    schemaVersion: 1,
    id: existingDoc?.id ?? `song_${Math.random().toString(36).substring(2, 9)}`,
    versionId: existingDoc ? `v_${Date.now()}` : "v_1",
    createdAt: existingDoc?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    sections,
  };
}

export interface MutationValidationResult {
  valid: boolean;
  error?: string;
  violatedBarIds?: string[];
}

/**
 * Enforces mathematical invariants before applying any mutation or patch to a SongDocument.
 * Guarantees that:
 * 1. Locked bars CANNOT be modified.
 * 2. Bars outside allowedBarIds remain 100% identical.
 */
export function validateMutation(
  originalDoc: SongDocument,
  updatedDoc: SongDocument,
  allowedBarIds: string[]
): MutationValidationResult {
  if (originalDoc.id !== updatedDoc.id) {
    return { valid: false, error: "Song ID mismatch" };
  }

  const origBars = originalDoc.sections.flatMap(s => s.bars);
  const updatedBarsMap = new Map(updatedDoc.sections.flatMap(s => s.bars).map(b => [b.id, b]));

  for (const origBar of origBars) {
    const updatedBar = updatedBarsMap.get(origBar.id);
    if (!updatedBar) continue;

    // Rule 1: Locked bar invariance
    if (origBar.locked && hashBarContent(origBar) !== hashBarContent(updatedBar)) {
      return {
        valid: false,
        error: `Invariante violada: la barra bloqueada [${origBar.id} / pos ${origBar.position}] fue modificada en el backend.`,
        violatedBarIds: [origBar.id],
      };
    }

    // Rule 2: Outside target range invariance
    if (!allowedBarIds.includes(origBar.id) && hashBarContent(origBar) !== hashBarContent(updatedBar)) {
      return {
        valid: false,
        error: `Invariante violada: la barra no autorizada [${origBar.id} / pos ${origBar.position}] fue alterada fuera de rango.`,
        violatedBarIds: [origBar.id],
      };
    }
  }

  return { valid: true };
}

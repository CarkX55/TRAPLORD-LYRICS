// Song Document AST — Core Data Model for TRAPLORD DAW Textual
// Every song is an Abstract Syntax Tree (AST) of sections and bars with strict invariants.

export interface BarPerformanceMarkup {
  pauseBefore?: boolean;       // [Pause]
  pauseAfter?: boolean;
  adlibs?: string[];           // (ad-lib text)
  vocalCut?: boolean;          // [Vocal Cut]
  emphasis?: string[];         // Words emphasized
  performanceDirective?: string; // e.g. "abrupt_cutoff", "faded_echo", etc.
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
  approvedText: string;             // Texto lírico canónico estricto (sin marcadores ni adlibs)
  bars: string[];                   // Líneas limpias de cada compás
  expectedBars?: number;            // Cardinalidad canónica esperada (ej: 8)
  occurrenceCount?: number;         // Número de apariciones en la estructura de la canción
  performanceTemplate?: BarPerformanceMarkup[]; // Plantilla de interpretación vocal original (adlibs, pausas, cortes)
  repetitionFactor?: number;        // Factor de repetición detectado (ej: 4 si vino x4 y colapsó a 1)
  cardinalityStatus?: "pass" | "safe-collapse" | "mismatch";
  contentHash: string;              // Hash de verificación de inmutabilidad
  locked: boolean;
  sourceVersionId?: string;
  allowPerformanceVariation: boolean; // default true: lyricText canónico, performance (ad-libs, cortes) con variación
}

/**
 * Single canonical formatter for Suno AI section headers: [Section: Voice/Hint] or [Section].
 * Eliminates any rogue commas or inconsistencies across the codebase.
 */
export function formatSectionHeader(name: string, voiceOrHint?: string): string {
  const cleanName = name.trim();
  if (voiceOrHint && voiceOrHint.trim()) {
    return `[${cleanName}: ${voiceOrHint.trim()}]`;
  }
  return `[${cleanName}]`;
}

export interface SectionSpec {
  id: string;
  name: string;
  type: "intro" | "verse" | "hook" | "bridge" | "outro" | "beat_drop" | string;
  voiceId: string;
  targetBars?: number;
  minBars?: number;
  maxBars?: number;
  occurrenceCount: number;
}

/**
 * Resolves a canonical SectionSpec for a given section type from a song structure and voice assignments.
 */
export function resolveSectionSpec(
  structureSections: Array<{ name: string; type: string }>,
  sectionVoices: Array<{ sectionName: string; bars?: number; voice?: string }> | undefined,
  targetType: "hook" | "verse" | "intro" | "bridge" | "outro" | "beat_drop" | "chorus" | string
): SectionSpec {
  const matchingSections = structureSections.filter(s => {
    const lower = s.name.toLowerCase();
    if (targetType === "hook") return s.type === "chorus" || s.type === "hook" || lower.includes("chorus") || lower.includes("hook") || lower.includes("estribillo");
    if (targetType === "verse") return s.type === "verse" || lower.includes("verse") || lower.includes("verso");
    if (targetType === "intro") return s.type === "intro" || lower.includes("intro");
    if (targetType === "bridge") return s.type === "bridge" || lower.includes("bridge") || lower.includes("puente");
    if (targetType === "outro") return s.type === "outro" || lower.includes("outro") || lower.includes("final");
    return false;
  });

  const occurrenceCount = matchingSections.length;
  const firstMatch = matchingSections[0];
  const va = sectionVoices?.find(v => firstMatch && v.sectionName === firstMatch.name);

  let targetBars = va?.bars;
  let minBars = 4;
  let maxBars = 16;

  if (targetType === "hook") {
    targetBars = targetBars || 8;
    minBars = 4;
    maxBars = 16;
  } else if (targetType === "verse") {
    targetBars = targetBars || 16;
    minBars = 8;
    maxBars = 16;
  } else if (targetType === "intro" || targetType === "outro") {
    targetBars = targetBars || 4;
    minBars = 2;
    maxBars = 8;
  } else if (targetType === "bridge") {
    targetBars = targetBars || 6;
    minBars = 4;
    maxBars = 8;
  }

  return {
    id: `spec_${targetType}`,
    name: firstMatch?.name || targetType,
    type: targetType,
    voiceId: va?.voice || "lead",
    targetBars,
    minBars,
    maxBars,
    occurrenceCount,
  };
}

export interface SongSectionDoc {
  id: string;                  // e.g. "s_intro", "s_verse1", "s_hook"
  name: string;                // Display title: "Verse 1", "Chorus", etc.
  type: "intro" | "verse" | "hook" | "bridge" | "outro" | "beat_drop";
  voiceId: "lead" | "feature" | "adlib_layer" | "whisper_layer" | "both";
  performanceHint?: string;    // Suno acoustic hint: "Hypnotic repetitive mantra, heavy 808"
  hookContractId?: string;     // Reference to HookContract if this section is a hook
  performanceDirective?: string; // Segregated performance directive (e.g. "abrupt_cutoff")
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
      const header = formatSectionHeader(section.name, section.performanceHint);
      const barLines = section.bars.map(stringifyBar);
      return `${header}\n${barLines.join("\n")}`;
    })
    .join("\n\n");
}

/**
 * Creates an immutable HookContract from a raw or parsed hook topline.
 * Preserves performanceTemplate without losing ad-lib metadata.
 * Safely collapses periodic identical repetitions (e.g. 32 bars -> 8 bars with repetitionFactor: 4).
 * Declares structural mismatch without blind truncation if repetition is not provably identical.
 */
export function createHookContract(
  approvedTopline: string,
  options: {
    allowPerformanceVariation?: boolean;
    sourceVersionId?: string;
    expectedBars?: number;
    occurrenceCount?: number;
  } = {}
): HookContract {
  const lines = approvedTopline
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("["));

  // 1. Extract performance metadata template per bar before cleaning text
  const performanceTemplate: BarPerformanceMarkup[] = [];
  const rawCleanLines: string[] = [];

  for (const line of lines) {
    const pauseBefore = line.startsWith("[Pause]");
    const vocalCut = line.includes("[Vocal Cut]");
    const pauseAfter = line.endsWith("[Pause]");

    const adlibs: string[] = [];
    const adlibMatches = line.match(/\(([^)]+)\)/g);
    if (adlibMatches) {
      for (const m of adlibMatches) {
        // Strip any residual asterisks around/inside the adlib
        const cleanAdlib = m.replace(/[()]/g, "").replace(/[*_]/g, "").trim();
        if (cleanAdlib) adlibs.push(cleanAdlib);
      }
    }

    if (pauseBefore || vocalCut || pauseAfter || adlibs.length > 0) {
      performanceTemplate.push({
        pauseBefore: pauseBefore || undefined,
        pauseAfter: pauseAfter || undefined,
        adlibs: adlibs.length > 0 ? adlibs : undefined,
        vocalCut: vocalCut || undefined,
      });
    } else {
      performanceTemplate.push({});
    }

    // Clean lines for canonical bars: strip bracket markup, ad-libs, and any markdown asterisks/backticks
    let clean = line
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\*[ \t]*\([^)]+\)[ \t]*\*/g, "")
      .replace(/\([^)]+\)/g, "")
      .replace(/[*_`]/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    if (clean.length > 0) {
      rawCleanLines.push(clean);
    }
  }

  let canonicalBars = rawCleanLines;
  let template = performanceTemplate.slice(0, canonicalBars.length);
  let cardinalityStatus: "pass" | "safe-collapse" | "mismatch" = "pass";
  let repetitionFactor = 1;

  // 2. Strict Cardinality Verification & Provable Safe Collapse
  if (options.expectedBars && options.expectedBars > 0) {
    const exp = options.expectedBars;
    if (canonicalBars.length === exp) {
      cardinalityStatus = "pass";
      repetitionFactor = 1;
    } else if (canonicalBars.length > exp && canonicalBars.length % exp === 0) {
      const factor = canonicalBars.length / exp;
      let allBlocksIdentical = true;

      for (let f = 1; f < factor; f++) {
        for (let i = 0; i < exp; i++) {
          if (canonicalBars[f * exp + i].toLowerCase() !== canonicalBars[i].toLowerCase()) {
            allBlocksIdentical = false;
            break;
          }
        }
        if (!allBlocksIdentical) break;
      }

      if (allBlocksIdentical) {
        // Safe Collapse: provably identical periodic repetitions (e.g. 4x8 -> 8)
        canonicalBars = canonicalBars.slice(0, exp);
        template = template.slice(0, exp);
        cardinalityStatus = "safe-collapse";
        repetitionFactor = factor;
      } else {
        // Genuine mismatch: distinct bars beyond target. DO NOT SILENTLY TRUNCATE!
        cardinalityStatus = "mismatch";
        repetitionFactor = 1;
      }
    } else {
      // Below target or partial non-periodic repetition (e.g. 8 + 8 + 4). Mismatch!
      cardinalityStatus = "mismatch";
      repetitionFactor = 1;
    }
  }

  const cleanApprovedText = canonicalBars.join("\n");
  const contentHash = `hook_${Math.abs(
    cleanApprovedText.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  ).toString(36)}`;

  return {
    id: `hc_${Math.random().toString(36).substring(2, 9)}`,
    approvedText: cleanApprovedText,
    bars: canonicalBars,
    expectedBars: options.expectedBars,
    occurrenceCount: options.occurrenceCount,
    performanceTemplate: template,
    repetitionFactor,
    cardinalityStatus,
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
            section.bars[i].performance = contract.performanceTemplate?.[i] || undefined;
          }
        } else {
          section.bars.push({
            id: `b_hc_${Math.random().toString(36).substring(2, 8)}`,
            position: i + 1,
            lyricText: canonicalLyric,
            locked: true,
            performance: contract.performanceTemplate?.[i] || undefined,
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
 * Detects whether a text line is meta-reasoning, conversational commentary, or justification
 * emitted by an LLM instead of genuine musical lyrics.
 */
export function isMetaReasoningLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const reasoningPatterns = [
    /^(?:se ha resuelto|he resuelto|se resolvi[óo]|se corrigi[óo]|he corregido)\b/i,
    /^(?:esta modificaci[óo]n|estos cambios|modificaciones realizadas|cambios aplicados|cambios realizados)\b/i,
    /^(?:letra ajustada|letra corregida|versi[óo]n ajustada|versi[óo]n corregida|versi[óo]n final|letra final|letra mejorada|texto ajustado|texto corregido)\s*:/i,
    /^(?:aqu[íi] est[áa]|aqu[íi] tienes|a continuaci[óo]n presento|a continuaci[óo]n se presenta)\b/i,
    /^(?:here is the|here are the|revised lyrics|adjusted lyrics|final lyrics|changes made|modifications)\b/i,
    /^(?:i have modified|i have replaced|i resolved|this modification|i have corrected)\b/i,
    /^(?:explicaci[óo]n|justificaci[óo]n|motivo del cambio|nota del autor|notas?)\s*:/i,
    /^\d+\.\s*(?:elimina|mantiene|sustituye|ajusta|corrige|cambia|preserva|evita|añade|agrega|reemplaza)\b/i,
    /^[-*]\s*(?:elimina|mantiene|sustituye|ajusta|corrige|cambia|preserva|evita|añade|agrega|reemplaza)\b/i,
    /^(?:elimina la contaminaci[óo]n|mantiene m[ée]trica|mantiene la rima|name-dropping forzado|trasfondo cripto)\b/i,
    /^(?:sustituyendo la menci[óo]n|eliminando la menci[óo]n|conserva el mismo n[úu]mero|conserva el trasfondo)\b/i,
  ];

  return reasoningPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Strips any conversational preamble, meta-reasoning blocks, or explanation headers
 * from raw LLM output before it is parsed into the SongDocument AST.
 * Handles cases like:
 * - Prose preamble before first bracket
 * - "[Verse 1]\nSe ha resuelto...\nLetra ajustada:\n\n[Intro: ...]"
 * - "Letra ajustada:\n\n[Intro: ...]"
 */
export function stripMetaReasoning(rawText: string): string {
  if (!rawText) return "";
  let text = rawText.trim();

  // 1. Remove Markdown code block wrappers
  text = text.replace(/^```(?:text|markdown|lyrics)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 2. Check for explicit transition delimiters like "Letra ajustada:", "Letra corregida:", "Revised lyrics:", etc.
  const delimiterRegex = /(?:^|\n)\s*(?:letra ajustada|letra corregida|versi[óo]n ajustada|versi[óo]n corregida|versi[óo]n final|letra final|letra mejorada|texto ajustado|texto corregido|adjusted lyrics|revised lyrics|final lyrics)\s*:\s*\n+/i;
  const delimiterMatch = text.match(delimiterRegex);
  if (delimiterMatch && delimiterMatch.index !== undefined) {
    const afterDelimiter = text.slice(delimiterMatch.index + delimiterMatch[0].length).trim();
    if (afterDelimiter.includes("[")) {
      text = afterDelimiter;
    }
  }

  // 3. Detect fake initial section tags that precede meta-reasoning blocks.
  // E.g., [Verse 1]\nSe ha resuelto el problema... \n\n[Intro: ...]
  const lines = text.split(/\r?\n/);
  const firstLine = lines[0]?.trim() || "";
  if (/^\[[^\]]+\]$/.test(firstLine)) {
    const nextNonEmptyLines = lines.slice(1).map((l) => l.trim()).filter(Boolean);
    const hasReasoningAtStart = nextNonEmptyLines.slice(0, 4).some(isMetaReasoningLine);
    if (hasReasoningAtStart) {
      let nextSectionIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i].trim();
        if (/^\[[^\]]+\]/.test(l)) {
          const subLines = lines.slice(i + 1).map((sl) => sl.trim()).filter(Boolean);
          if (!subLines.slice(0, 3).some(isMetaReasoningLine)) {
            nextSectionIndex = i;
            break;
          }
        }
      }
      if (nextSectionIndex !== -1) {
        text = lines.slice(nextSectionIndex).join("\n").trim();
      }
    }
  }

  // 4. Remove any loose conversational preamble before the first genuine section bracket
  const firstBracketIdx = text.search(/(?:###\s*)?\[/);
  if (firstBracketIdx > 0) {
    const preamble = text.slice(0, firstBracketIdx).trim();
    if (preamble.split(/\r?\n/).some(isMetaReasoningLine) || !preamble.includes("\n\n")) {
      text = text.slice(firstBracketIdx).trim();
    }
  }

  // 5. Remove any meta-section headers like [Explicación], [Notas], etc.
  text = text.replace(/^\[(?:Explicaci[óo]n|Notas?|Justificaci[óo]n|Cambios?|Reasoning|Notes)[^\]]*\]\s*[\s\S]*?(?=\[(?:Intro|Verse|Chorus|Hook|Bridge|Outro|Beat Drop))/i, "");

  return text.trim();
}

/**
 * Parses raw lyric text into a structured SongDocument AST.
 * Preserves existing bar IDs and locks if provided.
 */
export function parseRawLyricsToAST(rawLyrics: string, existingDoc?: SongDocument): SongDocument {
  const sanitized = stripMetaReasoning(rawLyrics);
  const lines = sanitized.split(/\r?\n/);
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

    // Never parse meta-reasoning, explanations, or justification lines as song bars
    if (isMetaReasoningLine(trimmed)) {
      continue;
    }

    // Check for section header [Section Name: Details] with optional trailing bar text
    const headerMatch = trimmed.match(/^\[([^\]]+)\](?:\s*(.*))?$/);
    if (headerMatch) {
      const inner = headerMatch[1].trim();
      const parts = inner.split(":");
      const rawName = parts[0].trim();
      const afterColon = parts.slice(1).join(":").trim();
      const trailingBarText = headerMatch[2] ? headerMatch[2].trim() : "";

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

      // If there was trailing bar text on the same line as the header (e.g. [Intro: Future] (Yeah)), parse it as the first bar
      if (!trailingBarText) {
        continue;
      }
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
    let lineText = (headerMatch && headerMatch[2] ? headerMatch[2].trim() : trimmed)
      .replace(/`{1,3}/g, "")
      .replace(/\*[ \t]*\(([^)]+)\)[ \t]*\*/g, "($1)")
      .replace(/[*_]{1,3}[ \t]*\(([^)]+)\)/g, "($1)");

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
        const cleanAdlib = m.replace(/[()]/g, "").replace(/[*_]/g, "").trim();
        if (cleanAdlib) adlibs.push(cleanAdlib);
      }
      lineText = lineText.replace(/\(([^)]+)\)/g, "").trim();
    }

    let cleanLyric = lineText
      .replace(/[*_]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // If cleanLyric contains no sung text (only punctuation, asterisks, or whitespace), set to empty string
    if (!/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/.test(cleanLyric)) {
      cleanLyric = "";
    }

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

  const validSections = sections.filter((s) => s.bars.length > 0);

  return {
    schemaVersion: 1,
    id: existingDoc?.id ?? `song_${Math.random().toString(36).substring(2, 9)}`,
    versionId: existingDoc ? `v_${Date.now()}` : "v_1",
    createdAt: existingDoc?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    sections: validSections.length > 0 ? validSections : sections,
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

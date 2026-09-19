// Repair Engine — Patch Surgery, Bar Analysis, and Versioned AST Mutations
// Handles surgical replacement of flawed bars without altering untouched parts of the song.

import {
  type SongDocument,
  type SongBar,
  type SongSectionDoc,
  type SongVersion,
  validateMutation,
  hashBarContent,
  cloneSongDocument,
} from "./song-document";

export interface RepairOperation {
  id: string;
  songId: string;
  sourceVersionId: string;      // Enforces strict concurrency control
  sectionId: string;
  barRange: [number, number];   // Visual reference (e.g. bars 9 to 12)
  targetBarIds: string[];        // Immutable identity of bars to be replaced
  problem:
    | "cliche"
    | "register"
    | "repetition"
    | "weak_hook"
    | "scene_stall"
    | "genericness"
    | "rhythm"
    | "language_drift";
  instruction: string;
  preserveWords?: string[];
}

export interface RepairBudget {
  maxOperations: number;        // Default: 3
  maxBars: number;              // Default: 8
  maxPasses: number;            // Default: 2
}

export const DEFAULT_REPAIR_BUDGET: RepairBudget = {
  maxOperations: 3,
  maxBars: 8,
  maxPasses: 2,
};

export interface PatchResult {
  success: boolean;
  error?: string;
  sourceVersionId: string;
  newVersionId: string;
  changedBarIds: string[];
  unchangedBarIds: string[];
  appliedOperation: RepairOperation;
  document: SongDocument;
  newVersionRecord: SongVersion;
}

/**
 * Applies a surgical patch to a SongDocument AST.
 * Enforces:
 * 1. P1 & P2: Untargeted & locked bars remain 100% bitwise identical.
 * 2. P3: Concurrency protection (sourceVersionId must match doc.versionId).
 * 3. P6: Pure immutability (originalDoc is never mutated in memory).
 * 4. P7: Pure atomicity (pre-validates all target bars before applying; on failure, doc remains byte-for-byte untouched).
 */
export function applySurgicalPatchToAST(
  originalDoc: SongDocument,
  operation: RepairOperation,
  newBarsContent: { lyricText: string; performance?: SongBar["performance"] }[]
): PatchResult {
  const origBars = originalDoc.sections.flatMap(s => s.bars);

  // Concurrency check (P3)
  if (originalDoc.versionId !== operation.sourceVersionId) {
    return {
      success: false,
      error: `Versión desfasada: la operación se calculó sobre ${operation.sourceVersionId} pero el documento actual es ${originalDoc.versionId}.`,
      sourceVersionId: operation.sourceVersionId,
      newVersionId: originalDoc.versionId,
      changedBarIds: [],
      unchangedBarIds: origBars.map(b => b.id),
      appliedOperation: operation,
      document: cloneSongDocument(originalDoc),
      newVersionRecord: {
        id: `v_err`,
        songId: originalDoc.id,
        createdAt: Date.now(),
        createdBy: "patch",
        changeType: "patch",
        changedBarIds: [],
      },
    };
  }

  // Pre-validate target section & locked bars for pure atomicity (P2 & P7)
  const targetSection = originalDoc.sections.find(s => s.id === operation.sectionId);
  if (!targetSection) {
    return {
      success: false,
      error: `Sección no encontrada: ${operation.sectionId}`,
      sourceVersionId: operation.sourceVersionId,
      newVersionId: originalDoc.versionId,
      changedBarIds: [],
      unchangedBarIds: origBars.map(b => b.id),
      appliedOperation: operation,
      document: cloneSongDocument(originalDoc),
      newVersionRecord: {
        id: `v_err`,
        songId: originalDoc.id,
        createdAt: Date.now(),
        createdBy: "patch",
        changeType: "patch",
        changedBarIds: [],
      },
    };
  }

  for (const barId of operation.targetBarIds) {
    const bar = targetSection.bars.find(b => b.id === barId);
    if (!bar) {
      return {
        success: false,
        error: `Compás no encontrado en sección: ${barId}`,
        sourceVersionId: operation.sourceVersionId,
        newVersionId: originalDoc.versionId,
        changedBarIds: [],
        unchangedBarIds: origBars.map(b => b.id),
        appliedOperation: operation,
        document: cloneSongDocument(originalDoc),
        newVersionRecord: {
          id: `v_err`,
          songId: originalDoc.id,
          createdAt: Date.now(),
          createdBy: "patch",
          changeType: "patch",
          changedBarIds: [],
        },
      };
    }
    if (bar.locked) {
      return {
        success: false,
        error: `Invariante violada: el compás bloqueado [${bar.id} / pos ${bar.position}] no puede ser mutado.`,
        sourceVersionId: operation.sourceVersionId,
        newVersionId: originalDoc.versionId,
        changedBarIds: [],
        unchangedBarIds: origBars.map(b => b.id),
        appliedOperation: operation,
        document: cloneSongDocument(originalDoc),
        newVersionRecord: {
          id: `v_err`,
          songId: originalDoc.id,
          createdAt: Date.now(),
          createdBy: "patch",
          changeType: "patch",
          changedBarIds: [],
        },
      };
    }
  }

  // Clone document deeply for pure immutability (P6)
  const workingDoc = cloneSongDocument(originalDoc);

  const newSections: SongSectionDoc[] = workingDoc.sections.map(section => {
    if (section.id !== operation.sectionId) {
      return section;
    }

    const updatedBars: SongBar[] = [];
    let replacementIdx = 0;

    for (const bar of section.bars) {
      if (operation.targetBarIds.includes(bar.id)) {
        const replacementData = newBarsContent[replacementIdx++];
        if (replacementData) {
          updatedBars.push({
            id: bar.id, // Preserve immutable identity
            position: bar.position,
            lyricText: replacementData.lyricText,
            locked: false,
            performance: replacementData.performance ?? bar.performance,
            analysis: undefined,
          });
        } else {
          updatedBars.push(bar);
        }
      } else {
        updatedBars.push(bar);
      }
    }

    return {
      ...section,
      bars: updatedBars,
    };
  });

  const newVersionId = `v_${Date.now()}`;
  const updatedDoc: SongDocument = {
    ...originalDoc,
    versionId: newVersionId,
    updatedAt: Date.now(),
    sections: newSections,
  };

  // Mathematical validation of invariant before committing
  const validation = validateMutation(originalDoc, updatedDoc, operation.targetBarIds);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Fallo de validación de invariante en el parche");
  }

  const changedBarIds = operation.targetBarIds;
  const unchangedBarIds = origBars.map(b => b.id).filter(id => !changedBarIds.includes(id));

  const newVersionRecord: SongVersion = {
    id: newVersionId,
    songId: originalDoc.id,
    parentVersionId: originalDoc.versionId,
    createdAt: Date.now(),
    createdBy: "patch",
    changeType: "patch",
    changedBarIds,
  };

  return {
    success: true,
    sourceVersionId: originalDoc.versionId,
    newVersionId,
    changedBarIds,
    unchangedBarIds,
    appliedOperation: operation,
    document: updatedDoc,
    newVersionRecord,
  };
}

// ========================================================================
// BATCH SURGICAL REPAIR (Paso 3: Reparación Quirúrgica Atómica)
// ========================================================================

export interface SurgicalBarTarget {
  sectionId: string;
  barId: string;
  contextHash: string; // OBLIGATORIO: hash previo del compás
  issue: string;
  instruction: string;
}

export interface SurgicalReplacement {
  sectionId: string;
  barId: string;
  contextHash: string; // Verificación estricta de concurrencia
  replacementLyricText: string; // Texto lírico puro (sin corchetes ni performance)
}

export interface SurgicalRepairResult {
  sourceVersionId: string;
  replacements: SurgicalReplacement[];
}

/**
 * Generates an immutable structural cardinality signature for a SongDocument.
 * Used to mathematically verify that surgical mutations never alter section or bar counts.
 */
export function getSectionCardinalitySignature(doc: SongDocument): string {
  return doc.sections.map(s => `${s.id}:${s.type}:${s.bars.length}`).join("|");
}

/**
 * Applies an atomic batch of surgical bar replacements to a SongDocument AST.
 * Guarantees:
 * 1. Strict atomicity: if ANY replacement is invalid or stale, 0 bars are mutated and original doc is preserved.
 * 2. Concurrency protection: sourceVersionId and contextHash must match existing AST.
 * 3. Non-lyric shielding: bar.id, position, locked, and performance metadata remain 100% byte-for-byte identical.
 * 4. Structural cardinality invariance: SectionCardinalitySignature remains strictly identical.
 */
export function applySurgicalBatchToAST(
  ast: SongDocument,
  patch: SurgicalRepairResult
): { success: boolean; document: SongDocument; error?: string } {
  // 1. Concurrency guard: versionId must match sourceVersionId
  if (ast.versionId !== patch.sourceVersionId) {
    return {
      success: false,
      document: ast,
      error: `Concurrency conflict: sourceVersionId mismatch (expected ${patch.sourceVersionId}, got ${ast.versionId})`,
    };
  }

  // 2. Pre-validate all replacements atomically before modifying anything
  const sectionMap = new Map<string, SongSectionDoc>();
  for (const sec of ast.sections) {
    sectionMap.set(sec.id, sec);
  }

  const targetBarIds: string[] = [];
  const cleanReplacements = new Map<string, string>();

  for (const r of patch.replacements) {
    const sec = sectionMap.get(r.sectionId);
    if (!sec) {
      return {
        success: false,
        document: ast,
        error: `Section not found: ${r.sectionId}`,
      };
    }

    const bar = sec.bars.find(b => b.id === r.barId);
    if (!bar) {
      return {
        success: false,
        document: ast,
        error: `Bar not found: ${r.barId} in section ${r.sectionId}`,
      };
    }

    if (bar.locked) {
      return {
        success: false,
        document: ast,
        error: `Bar locked: cannot mutate locked bar ${r.barId}`,
      };
    }

    // Strict concurrency / context hash check
    const currentHash = hashBarContent(bar);
    if (currentHash !== r.contextHash) {
      return {
        success: false,
        document: ast,
        error: `Stale context hash for bar ${r.barId}: expected ${r.contextHash}, found ${currentHash}`,
      };
    }

    // Clean replacement text: sanitize headers, asterisks, brackets
    let cleanText = r.replacementLyricText.trim();
    if (cleanText.startsWith("[") && cleanText.endsWith("]")) {
      return {
        success: false,
        document: ast,
        error: `Invalid replacement: cannot replace lyric text with a section bracket header: ${cleanText}`,
      };
    }

    // Strip any backticks or accidental markdown asterisks
    cleanText = cleanText.replace(/[`*]/g, "").trim();

    cleanReplacements.set(bar.id, cleanText);
    targetBarIds.push(bar.id);
  }

  // Initial cardinality signature before patch
  const initialCardinality = getSectionCardinalitySignature(ast);

  // 3. Deep-clone the document for pure immutability
  const workingDoc = cloneSongDocument(ast);

  // 4. Apply all replacements cleanly preserving non-lyric metadata (performance, locked, position, id)
  const updatedSections: SongSectionDoc[] = workingDoc.sections.map(section => {
    const hasTargets = section.bars.some(b => cleanReplacements.has(b.id));
    if (!hasTargets) return section;

    const newBars: SongBar[] = section.bars.map(bar => {
      const newText = cleanReplacements.get(bar.id);
      if (newText !== undefined) {
        return {
          id: bar.id, // Preserved immutable identity
          position: bar.position, // Preserved position
          lyricText: newText, // Only lyric text changes
          locked: bar.locked, // Preserved lock status
          performance: bar.performance ? { ...bar.performance } : undefined, // Deep copy non-lyric performance
          analysis: undefined,
        };
      }
      return bar;
    });

    return {
      ...section,
      bars: newBars,
    };
  });

  const newVersionId = `v_${Date.now()}`;
  const updatedDoc: SongDocument = {
    ...workingDoc,
    versionId: newVersionId,
    updatedAt: Date.now(),
    sections: updatedSections,
  };

  // 5. Cardinality invariance check: signature must be byte-for-byte identical
  const finalCardinality = getSectionCardinalitySignature(updatedDoc);
  if (initialCardinality !== finalCardinality) {
    return {
      success: false,
      document: ast,
      error: `Cardinality signature violated: expected ${initialCardinality}, got ${finalCardinality}`,
    };
  }

  // 6. Mathematical validation of mutation invariants
  const validation = validateMutation(ast, updatedDoc, targetBarIds);
  if (!validation.valid) {
    return {
      success: false,
      document: ast,
      error: validation.error ?? "Mutation invariant validation failed",
    };
  }

  return {
    success: true,
    document: updatedDoc,
  };
}


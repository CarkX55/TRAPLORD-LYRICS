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
    | "rhythm";
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

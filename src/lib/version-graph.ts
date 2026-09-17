// Song Version Graph — Non-destructive DAG Versioning for TRAPLORD DAW Textual
// Every mutation or revert creates a new version node; past history is never destroyed.

import { type SongDocument, cloneSongDocument } from "./song-document";
import type { AnalysisSnapshot } from "./quality-gate";

export interface SongVersionNode {
  id: string;                  // e.g. "v_1", "v_2"
  songId: string;
  parentVersionId?: string;     // Allows branching and future merges
  changeReason: string;         // e.g. "Initial generation", "Surgical patch: genericness", "Reverted to v2"
  document: SongDocument;
  createdAt: number;
  changedBarIds: string[];
  analysisSnapshot?: AnalysisSnapshot;
}

export interface SongVersionGraph {
  songId: string;
  currentVersionId: string;
  versions: Record<string, SongVersionNode>;
  order: string[];              // Chronological sequence of version IDs created
}

/**
 * Initializes a new Version Graph from a freshly generated SongDocument.
 */
export function createInitialVersionGraph(
  doc: SongDocument,
  reason: string = "Initial Studio Generation",
  analysisSnapshot?: AnalysisSnapshot
): SongVersionGraph {
  const versionId = doc.versionId || "v_1";
  const node: SongVersionNode = {
    id: versionId,
    songId: doc.id,
    changeReason: reason,
    document: cloneSongDocument(doc),
    createdAt: doc.createdAt || Date.now(),
    changedBarIds: doc.sections.flatMap(s => s.bars.map(b => b.id)),
    analysisSnapshot,
  };

  return {
    songId: doc.id,
    currentVersionId: versionId,
    versions: {
      [versionId]: node,
    },
    order: [versionId],
  };
}

/**
 * Appends a new version node to the graph following a surgical patch, manual edit, or regeneration.
 * Returns an updated immutable version graph.
 */
export function addVersionNode(
  graph: SongVersionGraph,
  newDoc: SongDocument,
  reason: string,
  changedBarIds: string[] = [],
  analysisSnapshot?: AnalysisSnapshot
): SongVersionGraph {
  const newVersionId = newDoc.versionId || `v_${Date.now()}`;
  const parentId = graph.currentVersionId;

  const node: SongVersionNode = {
    id: newVersionId,
    songId: graph.songId,
    parentVersionId: parentId,
    changeReason: reason,
    document: cloneSongDocument(newDoc),
    createdAt: Date.now(),
    changedBarIds,
    analysisSnapshot,
  };

  return {
    ...graph,
    currentVersionId: newVersionId,
    versions: {
      ...graph.versions,
      [newVersionId]: node,
    },
    order: [...graph.order, newVersionId],
  };
}

/**
 * Non-destructive Revert:
 * Reverting to targetVersionId does NOT destroy subsequent history.
 * It produces a brand new version node whose content mirrors targetVersionId,
 * with parent set to currentVersionId and changeReason = "Reverted to vX".
 */
export function revertToVersionNode(
  graph: SongVersionGraph,
  targetVersionId: string
): { graph: SongVersionGraph; newDocument: SongDocument } {
  const targetNode = graph.versions[targetVersionId];
  if (!targetNode) {
    throw new Error(`No se encontró la versión objetivo: ${targetVersionId}`);
  }

  const newVersionId = `v_${Date.now()}`;
  const newDoc: SongDocument = {
    ...cloneSongDocument(targetNode.document),
    versionId: newVersionId,
    updatedAt: Date.now(),
  };

  const revertedNode: SongVersionNode = {
    id: newVersionId,
    songId: graph.songId,
    parentVersionId: graph.currentVersionId,
    changeReason: `Reverted to ${targetVersionId} ("${targetNode.changeReason}")`,
    document: cloneSongDocument(newDoc),
    createdAt: Date.now(),
    changedBarIds: newDoc.sections.flatMap(s => s.bars.map(b => b.id)),
  };

  const updatedGraph: SongVersionGraph = {
    ...graph,
    currentVersionId: newVersionId,
    versions: {
      ...graph.versions,
      [newVersionId]: revertedNode,
    },
    order: [...graph.order, newVersionId],
  };

  return {
    graph: updatedGraph,
    newDocument: newDoc,
  };
}

/**
 * Returns chronological list of all version nodes in the graph.
 */
export function getVersionLinearHistory(graph: SongVersionGraph): SongVersionNode[] {
  return graph.order
    .map(id => graph.versions[id])
    .filter((node): node is SongVersionNode => Boolean(node));
}

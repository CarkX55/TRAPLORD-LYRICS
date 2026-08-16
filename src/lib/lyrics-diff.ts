// Lyrics Diff
// Computes a line-by-line diff between two lyrics versions.
// Additions = green, deletions = red, unchanged = gray.
// Also supports word-level diff within modified lines.

export interface WordDiff {
  type: "add" | "del" | "same";
  text: string;
}

export interface DiffLine {
  type: "add" | "del" | "same" | "modified";
  oldLine?: string;
  newLine?: string;
  oldIdx?: number;
  newIdx?: number;
  wordDiffs?: WordDiff[];  // word-level diff for "modified" lines
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
  similarity: number; // 0-100, percentage of unchanged lines
}

/**
 * Computes word-level diff between two lines using LCS.
 */
function diffWords(oldLine: string, newLine: string): WordDiff[] {
  const oldWords = oldLine.split(/(\s+)/).filter(w => w.length > 0);
  const newWords = newLine.split(/(\s+)/).filter(w => w.length > 0);
  const m = oldWords.length;
  const n = newWords.length;

  // LCS table
  const lcs: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result: WordDiff[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: "same", text: newWords[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      result.unshift({ type: "add", text: newWords[j - 1] });
      j--;
    } else {
      result.unshift({ type: "del", text: oldWords[i - 1] });
      i--;
    }
  }
  return result;
}

/**
 * Computes a line-by-line diff between old and new lyrics.
 * Uses a simple LCS (Longest Common Subsequence) algorithm.
 * Post-processes adjacent del+add pairs into "modified" lines with word-level diffs.
 */
export function diffLyrics(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split("\n").map(l => l.trim()).filter(l => l);
  const newLines = newText.split("\n").map(l => l.trim()).filter(l => l);

  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const lcs: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Backtrack to build raw diff (add/del/same)
  const rawDiff: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      rawDiff.unshift({ type: "same", newLine: newLines[j - 1], oldIdx: i - 1, newIdx: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      rawDiff.unshift({ type: "add", newLine: newLines[j - 1], newIdx: j - 1 });
      j--;
    } else {
      rawDiff.unshift({ type: "del", oldLine: oldLines[i - 1], oldIdx: i - 1 });
      i--;
    }
  }

  // Post-process: merge adjacent del+add pairs into "modified" lines with word-level diffs
  const diffLines: DiffLine[] = [];
  for (let k = 0; k < rawDiff.length; k++) {
    const cur = rawDiff[k];
    const next = rawDiff[k + 1];
    if (cur.type === "del" && next && next.type === "add") {
      // This is a modified line — compute word-level diff
      const wordDiffs = diffWords(cur.oldLine ?? "", next.newLine ?? "");
      diffLines.push({
        type: "modified",
        oldLine: cur.oldLine,
        newLine: next.newLine,
        oldIdx: cur.oldIdx,
        newIdx: next.newIdx,
        wordDiffs,
      });
      k++; // skip the "add" since we merged it
    } else {
      diffLines.push(cur);
    }
  }

  const additions = diffLines.filter(d => d.type === "add").length;
  const deletions = diffLines.filter(d => d.type === "del").length;
  const modified = diffLines.filter(d => d.type === "modified").length;
  const unchanged = diffLines.filter(d => d.type === "same").length;
  const total = Math.max(additions + deletions + modified + unchanged, 1);
  const similarity = Math.round((unchanged / total) * 100);

  return { lines: diffLines, additions, deletions, unchanged, similarity };
}

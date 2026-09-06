import type { ChangedSeed, Diagnostic, TextRange } from "./types";
import { ImpactError } from "./errors";
import { gitOutput, repositoryRoot, shouldIncludePath } from "./snapshot";
import { compareText, normalizeRepoPath } from "./util";

export interface GitChange {
  status: "added" | "modified" | "deleted" | "renamed";
  path: string;
  oldPath?: string;
  oldRanges: TextRange[];
  newRanges: TextRange[];
}

export interface GitChangeResult {
  root: string;
  base: string;
  head?: string;
  changes: GitChange[];
  diagnostics: Diagnostic[];
}

export function collectGitChanges(rootInput: string | undefined, baseInput: string, headInput?: string, worktree = false): GitChangeResult {
  const root = repositoryRoot(rootInput);
  if (worktree === (headInput !== undefined)) {
    throw new ImpactError("INVALID_ARGUMENT", "Pass exactly one of head or worktree for changed analysis");
  }
  const base = baseInput.trim();
  if (!base || base.startsWith("-")) {
    throw new ImpactError("INVALID_ARGUMENT", "A valid base revision is required");
  }
  const head = headInput?.trim();
  if (!worktree && (!head || head.startsWith("-"))) {
    throw new ImpactError("INVALID_ARGUMENT", "A valid head revision is required when worktree is false");
  }
  const captureBefore = worktree ? gitOutput(root, ["status", "--porcelain=v1", "-z"]) : undefined;
  const endpoint = worktree ? undefined : head;
  const args = ["diff", "--name-status", "-z", "--find-renames", "--no-ext-diff", "--no-textconv", base];
  if (endpoint) {
    args.push(endpoint);
  }
  const raw = gitOutput(root, args);
  const changes = parseNameStatus(raw);
  const patchArgs = ["diff", "--unified=0", "--find-renames", "--no-ext-diff", "--no-textconv", base];
  if (endpoint) {
    patchArgs.push(endpoint);
  }
  const patch = gitOutput(root, patchArgs);
  const ranges = parsePatchRanges(patch);
  for (const change of changes) {
    const key = `${change.oldPath ?? ""}->${change.path}`;
    const range = ranges.get(key) ?? ranges.get(change.path);
    if (range) {
      change.oldRanges = range.oldRanges;
      change.newRanges = range.newRanges;
    }
  }
  const diagnostics: Diagnostic[] = [];
  const hasConflictStatus = hasUnmergedStatus(raw);
  let hasIndexConflict = false;
  if (worktree) {
    try {
      hasIndexConflict = gitOutput(root, ["ls-files", "-u", "-z"]).length > 0;
    } catch {
      hasIndexConflict = false;
    }
  }
  if (hasConflictStatus || hasIndexConflict) {
    diagnostics.push({ code: "GIT_CONFLICT_STATE", message: "Git reported an unmerged/conflicted path; impact results are partial", severity: "warning" });
  }
  const untracked = worktree ? parseUntracked(root) : [];
  for (const path of untracked) {
    if (!changes.some((change) => change.path === path)) {
      changes.push({ status: "added", path, oldRanges: [], newRanges: [{ start: { line: 1, column: 1 }, end: { line: Number.MAX_SAFE_INTEGER, column: 1 } }] });
    }
  }
  changes.sort((a, b) => compareText(`${a.path}:${a.oldPath ?? ""}`, `${b.path}:${b.oldPath ?? ""}`));
  if (worktree) {
    const captureAfter = gitOutput(root, ["status", "--porcelain=v1", "-z"]);
    if (captureBefore !== captureAfter) {
      diagnostics.push({ code: "WORKTREE_CHANGED_DURING_CAPTURE", message: "Working-tree status changed while the snapshot was being captured; results are partial", severity: "warning" });
    }
    diagnostics.push({ code: "WORKTREE_SNAPSHOT", message: "Working-tree analysis includes tracked net changes and non-ignored untracked files", severity: "info" });
  }
  return { root, base, head: endpoint, changes, diagnostics };
}

function parseUntracked(root: string): string[] {
  return gitOutput(root, ["ls-files", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean)
    .map(normalizeRepoPath)
    .filter(shouldIncludePath)
    .filter((path) => !path.split("/").includes("node_modules"));
}

function parseNameStatus(raw: string): GitChange[] {
  const tokens = raw.split("\0").filter(Boolean);
  const changes: GitChange[] = [];
  for (let index = 0; index < tokens.length;) {
    const statusToken = tokens[index++];
    const status = statusToken[0];
    if (status === "R" || status === "C") {
      const oldPath = normalizeRepoPath(tokens[index++] ?? "");
      const path = normalizeRepoPath(tokens[index++] ?? "");
      changes.push({ status: "renamed", path, oldPath, oldRanges: [], newRanges: [] });
      continue;
    }
    const path = normalizeRepoPath(tokens[index++] ?? "");
    const mapped = status === "A" ? "added" : status === "D" ? "deleted" : "modified";
    changes.push({ status: mapped, path, oldRanges: [], newRanges: [] });
  }
  return changes;
}

function hasUnmergedStatus(raw: string): boolean {
  const tokens = raw.split("\0").filter(Boolean);
  for (let index = 0; index < tokens.length;) {
    const statusToken = tokens[index++];
    if (/^U/.test(statusToken)) {
      return true;
    }
    index += statusToken[0] === "R" || statusToken[0] === "C" ? 2 : 1;
  }
  return false;
}

interface RangePair {
  oldRanges: TextRange[];
  newRanges: TextRange[];
}

function parsePatchRanges(patch: string): Map<string, RangePair> {
  const result = new Map<string, RangePair>();
  let oldPath = "";
  let newPath = "";
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
      if (match) {
        oldPath = normalizeRepoPath(match[1]);
        newPath = normalizeRepoPath(match[2]);
      }
      continue;
    }
    if (!line.startsWith("@@ ")) {
      continue;
    }
    const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!match) {
      continue;
    }
    const oldStart = Number(match[1]);
    const oldCount = Number(match[2] ?? "1");
    const newStart = Number(match[3]);
    const newCount = Number(match[4] ?? "1");
    const oldRange = lineRange(oldStart, oldCount);
    const newRange = lineRange(newStart, newCount);
    const key = `${oldPath}->${newPath}`;
    const current = result.get(key) ?? { oldRanges: [], newRanges: [] };
    current.oldRanges.push(oldRange);
    current.newRanges.push(newRange);
    result.set(key, current);
    result.set(newPath, current);
  }
  return result;
}

function lineRange(start: number, count: number): TextRange {
  const safeStart = Math.max(1, start);
  const endLine = count === 0 ? safeStart : safeStart + count - 1;
  return { start: { line: safeStart, column: 1 }, end: { line: Math.max(safeStart, endLine), column: Number.MAX_SAFE_INTEGER } };
}

export function changedSeedFromChange(change: GitChange, oldSymbols: string[], newSymbols: string[], snapshots: ChangedSeed["snapshots"]): ChangedSeed {
  const configuration = /(?:^|\/)(?:tsconfig|jsconfig)\.json$|(?:^|\/)package\.json$/.test(change.path);
  return {
    path: change.path,
    ...(change.oldPath ? { oldPath: change.oldPath } : {}),
    status: configuration ? "configuration" : change.status,
    oldSymbols: [...oldSymbols].sort(compareText),
    newSymbols: [...newSymbols].sort(compareText),
    snapshots,
  };
}

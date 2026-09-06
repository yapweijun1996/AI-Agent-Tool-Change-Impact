import { execFileSync } from "node:child_process";
import { closeSync, existsSync, openSync, realpathSync, readSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { ImpactError } from "./errors";
import type { Diagnostic, SnapshotRef } from "./types";
import { DEFAULT_LIMITS, type Limits, type SnapshotKind } from "./types";
import { compareText, createDiagnosticCollector, normalizeRepoPath, relativeRepoPath, sha256, snapshotId } from "./util";

export interface SnapshotLoadResult {
  snapshot: SourceSnapshot;
  diagnostics: Diagnostic[];
}

export class SourceSnapshot {
  public readonly root: string;
  public readonly ref: SnapshotRef;
  public readonly files: ReadonlyMap<string, string>;
  public readonly externalFallback: boolean;

  public constructor(
    root: string,
    kind: SnapshotKind,
    files: Map<string, string>,
    revision?: string,
    externalFallback = false,
  ) {
    this.root = resolve(root);
    this.files = new Map(files);
    this.externalFallback = externalFallback;
    this.ref = {
      kind,
      id: snapshotId(kind, revision, this.files),
      ...(revision ? { revision } : {}),
    };
  }

  public fileExists(fileName: string): boolean {
    try {
      const relativePath = this.toRepoPath(fileName);
      return this.files.has(relativePath);
    } catch {
      return false;
    }
  }

  public readFile(fileName: string): string | undefined {
    try {
      const relativePath = this.toRepoPath(fileName);
      return this.files.get(relativePath);
    } catch {
      return undefined;
    }
  }

  public absolutePath(fileName: string): string {
    const relativePath = this.toRepoPath(fileName);
    return join(this.root, ...relativePath.split("/"));
  }

  public toRepoPath(fileName: string): string {
    if (!isAbsolute(fileName)) {
      return normalizeRepoPath(fileName);
    }
    return relativeRepoPath(this.root, fileName);
  }

  public projectFiles(): string[] {
    return [...this.files.keys()].sort(compareText);
  }
}

function runGit(root: string, args: string[], encoding: BufferEncoding = "utf8", maxBuffer = 64 * 1024 * 1024): string {
  // A repository can configure core.fsmonitor as an executable helper. Disable
  // it so read-only analysis never runs repository-configured processes.
  const safeArgs = ["-c", "core.fsmonitor=false", ...args];
  try {
    return execFileSync("git", safeArgs, {
      cwd: root,
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
        GIT_TERMINAL_PROMPT: "0",
      },
      maxBuffer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ImpactError("GIT_ERROR", `Git command failed: git ${safeArgs.join(" ")}`, { cause: message });
  }
}

export function repositoryRoot(inputRoot?: string): string {
  const requested = resolve(inputRoot ?? process.cwd());
  if (inputRoot !== undefined) {
    let isDirectory = false;
    try {
      isDirectory = existsSync(requested) && statSync(requested).isDirectory();
    } catch {
      isDirectory = false;
    }
    if (!isDirectory) {
      throw new ImpactError("ROOT_NOT_FOUND", `Repository root does not exist or is not a directory: ${inputRoot}`);
    }
  }
  try {
    const root = runGit(requested, ["rev-parse", "--show-toplevel"]).trim();
    return resolve(root);
  } catch (error) {
    if (error instanceof ImpactError) {
      throw new ImpactError("NOT_A_REPOSITORY", `No Git repository found at or above ${requested}`);
    }
    throw error;
  }
}

export function shouldIncludePath(pathName: string): boolean {
  const segments = pathName.split("/");
  return !segments.includes(".git") && !segments.includes("node_modules") && !segments.includes("dist") && !segments.includes("coverage");
}

export interface BoundedTextRead {
  content: string;
  bytes: number;
  exceeded: false;
}

export interface ExceededTextRead {
  content?: undefined;
  bytes: number;
  exceeded: true;
}

export type BoundedTextReadResult = BoundedTextRead | ExceededTextRead;

/** Read UTF-8 text while never buffering more than maxBytes plus one byte. */
export function readTextFileBounded(fileName: string, maxBytes: number): BoundedTextReadResult {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new TypeError("maxBytes must be a non-negative safe integer");
  }
  const chunks: Buffer[] = [];
  let total = 0;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(fileName, "r");
    while (true) {
      // Once the limit is full, read one byte only to detect growth beyond it.
      const remaining = maxBytes - total;
      const size = remaining > 0 ? Math.min(remaining, 64 * 1024) : 1;
      const chunk = Buffer.allocUnsafe(size);
      const bytesRead = readSync(descriptor, chunk, 0, size, null);
      if (bytesRead === 0) {
        return { content: Buffer.concat(chunks, total).toString("utf8"), bytes: total, exceeded: false };
      }
      total += bytesRead;
      if (total > maxBytes) {
        return { bytes: total, exceeded: true };
      }
      chunks.push(chunk.subarray(0, bytesRead));
    }
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }
}

function parseNullList(output: string): string[] {
  return output.split("\0").filter(Boolean).map(normalizeRepoPath);
}

function loadWorkingTreeFiles(root: string, limits: Limits): { files: Map<string, string>; diagnostics: Diagnostic[] } {
  const names = parseNullList(runGit(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]));
  const files = new Map<string, string>();
  const diagnostics = createDiagnosticCollector(limits.maxDiagnostics);
  let totalBytes = 0;
  for (const relativePath of names.sort(compareText)) {
    if (!shouldIncludePath(relativePath)) {
      continue;
    }
    if (files.size >= limits.maxFiles) {
      diagnostics.add({ code: "FILE_BUDGET_EXCEEDED", message: `Stopped reading files after ${limits.maxFiles} files`, severity: "warning" });
      break;
    }
    const absolutePath = join(root, ...relativePath.split("/"));
    try {
      const stat = statSync(absolutePath);
      if (!stat.isFile()) {
        continue;
      }
      const real = realpathSync(absolutePath);
      const relativeReal = relative(root, real);
      const outside = relativeReal === ".." || relativeReal.startsWith(`..${sep}`) || isAbsolute(relativeReal);
      if (outside) {
        diagnostics.add({ code: "PATH_OUTSIDE_ROOT", message: `Skipped symlink outside root: ${relativePath}`, file: relativePath, severity: "warning" });
        continue;
      }
      if (stat.size > limits.maxFileBytes || totalBytes + stat.size > limits.maxTotalFileBytes) {
        diagnostics.add({ code: "FILE_BUDGET_EXCEEDED", message: `Skipped oversized file: ${relativePath}`, file: relativePath, severity: "warning" });
        continue;
      }
      const remainingBytes = limits.maxTotalFileBytes - totalBytes;
      if (remainingBytes <= 0) {
        diagnostics.add({ code: "FILE_BUDGET_EXCEEDED", message: `Skipped file after reaching total byte budget: ${relativePath}`, file: relativePath, severity: "warning" });
        continue;
      }
      const bounded = readTextFileBounded(real, Math.min(limits.maxFileBytes, remainingBytes));
      if (bounded.exceeded) {
        diagnostics.add({ code: "FILE_BUDGET_EXCEEDED", message: `Skipped file after content-size check: ${relativePath}`, file: relativePath, severity: "warning" });
        continue;
      }
      files.set(relativePath, bounded.content);
      totalBytes += bounded.bytes;
    } catch (error) {
      diagnostics.add({ code: "FILE_READ_FAILED", message: `Skipped unreadable file: ${relativePath}`, file: relativePath, severity: "warning" });
    }
  }
  return { files, diagnostics: diagnostics.toArray() };
}

export function loadWorkingTree(rootInput?: string, limits: Limits = DEFAULT_LIMITS): SnapshotLoadResult {
  const root = repositoryRoot(rootInput);
  const loaded = loadWorkingTreeFiles(root, limits);
  return {
    snapshot: new SourceSnapshot(root, "working-tree", loaded.files, undefined, true),
    diagnostics: loaded.diagnostics,
  };
}

export function loadWorkingTreeStable(rootInput?: string, limits: Limits = DEFAULT_LIMITS): SnapshotLoadResult {
  const root = repositoryRoot(rootInput);
  const first = loadWorkingTreeFiles(root, limits);
  const firstSnapshot = new SourceSnapshot(root, "working-tree", first.files, undefined, true);
  const second = loadWorkingTreeFiles(root, limits);
  const secondSnapshot = new SourceSnapshot(root, "working-tree", second.files, undefined, true);
  const diagnostics = createDiagnosticCollector(limits.maxDiagnostics);
  for (const entry of [...first.diagnostics, ...second.diagnostics]) {
    diagnostics.add(entry);
  }
  if (firstSnapshot.ref.id !== secondSnapshot.ref.id) {
    diagnostics.add({
      code: "WORKTREE_CHANGED_DURING_CAPTURE",
      message: "Working-tree contents changed between stable snapshot reads; results are partial",
      severity: "warning",
    });
  }
  return { snapshot: secondSnapshot, diagnostics: diagnostics.toArray() };
}

export function resolveRevision(root: string, revision: string): string {
  const normalized = revision.trim();
  if (!normalized || normalized.startsWith("-") || normalized.includes("\0")) {
    throw new ImpactError("INVALID_ARGUMENT", "Git revision must be a non-empty revision name");
  }
  return runGit(root, ["rev-parse", "--verify", `${normalized}^{commit}`]).trim();
}

export function loadRevision(rootInput: string | undefined, revisionInput: string, limits: Limits = DEFAULT_LIMITS): SnapshotLoadResult {
  const root = repositoryRoot(rootInput);
  const revision = resolveRevision(root, revisionInput);
  const names = parseNullList(runGit(root, ["ls-tree", "-r", "--name-only", "-z", revision]));
  const files = new Map<string, string>();
  const diagnostics = createDiagnosticCollector(limits.maxDiagnostics);
  let totalBytes = 0;
  for (const relativePath of names.sort(compareText)) {
    if (!shouldIncludePath(relativePath)) {
      continue;
    }
    if (files.size >= limits.maxFiles) {
      diagnostics.add({ code: "FILE_BUDGET_EXCEEDED", message: `Stopped reading revision after ${limits.maxFiles} files`, severity: "warning" });
      break;
    }
    try {
      const content = runGit(root, ["show", `${revision}:${relativePath}`], "utf8", Math.min(64 * 1024 * 1024, limits.maxFileBytes + 1));
      const bytes = Buffer.byteLength(content, "utf8");
      if (bytes > limits.maxFileBytes || totalBytes + bytes > limits.maxTotalFileBytes) {
        diagnostics.add({ code: "FILE_BUDGET_EXCEEDED", message: `Skipped oversized revision file: ${relativePath}`, file: relativePath, severity: "warning" });
        continue;
      }
      files.set(relativePath, content);
      totalBytes += bytes;
    } catch {
      diagnostics.add({ code: "FILE_READ_FAILED", message: `Skipped unreadable revision file: ${relativePath}`, file: relativePath, severity: "warning" });
    }
  }
  return {
    snapshot: new SourceSnapshot(root, "revision", files, revision, true),
    diagnostics: diagnostics.toArray(),
  };
}

export function readGitText(root: string, revision: string, relativePath: string): string {
  return runGit(root, ["show", `${resolveRevision(root, revision)}:${normalizeRepoPath(relativePath)}`]);
}

export function gitOutput(root: string, args: string[]): string {
  return runGit(root, args);
}

export function fileHash(content: string): string {
  return sha256(content);
}

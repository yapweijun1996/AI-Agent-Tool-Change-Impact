import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { ImpactError } from "./errors";
import type { Diagnostic, SnapshotRef } from "./types";
import { DEFAULT_LIMITS, type Limits, type SnapshotKind } from "./types";
import { compareText, normalizeRepoPath, relativeRepoPath, sha256, snapshotId } from "./util";

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

function runGit(root: string, args: string[], encoding: BufferEncoding = "utf8"): string {
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
      maxBuffer: 64 * 1024 * 1024,
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

function parseNullList(output: string): string[] {
  return output.split("\0").filter(Boolean).map(normalizeRepoPath);
}

function loadWorkingTreeFiles(root: string, limits: Limits): { files: Map<string, string>; diagnostics: Diagnostic[] } {
  const names = parseNullList(runGit(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]));
  const files = new Map<string, string>();
  const diagnostics: Diagnostic[] = [];
  let totalBytes = 0;
  for (const relativePath of names.sort(compareText)) {
    if (!shouldIncludePath(relativePath)) {
      continue;
    }
    if (files.size >= limits.maxFiles) {
      diagnostics.push({ code: "FILE_BUDGET_EXCEEDED", message: `Stopped reading files after ${limits.maxFiles} files`, severity: "warning" });
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
        diagnostics.push({ code: "PATH_OUTSIDE_ROOT", message: `Skipped symlink outside root: ${relativePath}`, file: relativePath, severity: "warning" });
        continue;
      }
      if (stat.size > limits.maxFileBytes || totalBytes + stat.size > limits.maxTotalFileBytes) {
        diagnostics.push({ code: "FILE_BUDGET_EXCEEDED", message: `Skipped oversized file: ${relativePath}`, file: relativePath, severity: "warning" });
        continue;
      }
      const content = readFileSync(absolutePath, "utf8");
      files.set(relativePath, content);
      totalBytes += Buffer.byteLength(content);
    } catch (error) {
      diagnostics.push({ code: "FILE_READ_FAILED", message: `Skipped unreadable file: ${relativePath}`, file: relativePath, severity: "warning" });
    }
  }
  return { files, diagnostics };
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
  const diagnostics = [...first.diagnostics, ...second.diagnostics];
  if (firstSnapshot.ref.id !== secondSnapshot.ref.id) {
    diagnostics.push({
      code: "WORKTREE_CHANGED_DURING_CAPTURE",
      message: "Working-tree contents changed between stable snapshot reads; results are partial",
      severity: "warning",
    });
  }
  return { snapshot: secondSnapshot, diagnostics };
}

export function resolveRevision(root: string, revision: string): string {
  if (!revision || revision.startsWith("-")) {
    throw new ImpactError("INVALID_ARGUMENT", "Git revision must be a non-empty revision name");
  }
  return runGit(root, ["rev-parse", "--verify", `${revision}^{commit}`]).trim();
}

export function loadRevision(rootInput: string | undefined, revisionInput: string, limits: Limits = DEFAULT_LIMITS): SnapshotLoadResult {
  const root = repositoryRoot(rootInput);
  const revision = resolveRevision(root, revisionInput);
  const names = parseNullList(runGit(root, ["ls-tree", "-r", "--name-only", "-z", revision]));
  const files = new Map<string, string>();
  const diagnostics: Diagnostic[] = [];
  let totalBytes = 0;
  for (const relativePath of names.sort(compareText)) {
    if (!shouldIncludePath(relativePath)) {
      continue;
    }
    if (files.size >= limits.maxFiles) {
      diagnostics.push({ code: "FILE_BUDGET_EXCEEDED", message: `Stopped reading revision after ${limits.maxFiles} files`, severity: "warning" });
      break;
    }
    try {
      const content = runGit(root, ["show", `${revision}:${relativePath}`]);
      const bytes = Buffer.byteLength(content);
      if (bytes > limits.maxFileBytes || totalBytes + bytes > limits.maxTotalFileBytes) {
        diagnostics.push({ code: "FILE_BUDGET_EXCEEDED", message: `Skipped oversized revision file: ${relativePath}`, file: relativePath, severity: "warning" });
        continue;
      }
      files.set(relativePath, content);
      totalBytes += bytes;
    } catch {
      diagnostics.push({ code: "FILE_READ_FAILED", message: `Skipped unreadable revision file: ${relativePath}`, file: relativePath, severity: "warning" });
    }
  }
  return {
    snapshot: new SourceSnapshot(root, "revision", files, revision, true),
    diagnostics,
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

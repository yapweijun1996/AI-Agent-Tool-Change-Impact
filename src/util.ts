import { createHash } from "node:crypto";
import { relative, resolve, sep } from "node:path";
import type { Diagnostic, Limits, Position, TextRange } from "./types";
import { DEFAULT_LIMITS } from "./types";
import { ImpactError } from "./errors";

export function normalizeRepoPath(input: string): string {
  const normalized = input.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new ImpactError("FILE_OUTSIDE_ROOT", `Path is not a repository-relative file: ${input}`);
  }
  return normalized;
}

export function relativeRepoPath(root: string, fileName: string): string {
  const resolvedRoot = resolve(root);
  const resolvedFile = resolve(fileName);
  const value = relative(resolvedRoot, resolvedFile).split(sep).join("/");
  if (!value || value === ".." || value.startsWith("../")) {
    throw new ImpactError("FILE_OUTSIDE_ROOT", `File is outside repository root: ${fileName}`);
  }
  return normalizeRepoPath(value);
}

export function toPosition(text: string, offset: number): Position {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, safeOffset);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  return { line, column: safeOffset - lastNewline };
}

export function toRange(text: string, start: number, length: number): TextRange {
  return {
    start: toPosition(text, start),
    end: toPosition(text, start + Math.max(0, length)),
  };
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function snapshotId(kind: "working-tree" | "revision", revision: string | undefined, files: ReadonlyMap<string, string>): string {
  const hash = createHash("sha256");
  for (const [file, content] of [...files.entries()].sort(([a], [b]) => compareText(a, b))) {
    hash.update(file).update("\0").update(content).update("\0");
  }
  const suffix = hash.digest("hex").slice(0, 16);
  return kind === "revision" ? `git:${revision ?? "unknown"}:${suffix}` : `worktree:${suffix}`;
}

export function mergeLimits(input: Partial<Limits> | undefined): Limits {
  const merged: Limits = { ...DEFAULT_LIMITS, ...(input ?? {}) };
  const integerNames: Array<keyof Limits> = [
    "depth",
    "maxNodes",
    "maxEdges",
    "maxPathsPerTarget",
    "maxOutputBytes",
    "maxFiles",
    "maxFileBytes",
    "maxTotalFileBytes",
  ];
  for (const name of integerNames) {
    const value = merged[name];
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new ImpactError("INVALID_ARGUMENT", `Limit ${name} must be a positive integer`);
    }
  }
  if (merged.depth > 5 || merged.maxNodes > 5000 || merged.maxEdges > 15000) {
    throw new ImpactError("INVALID_ARGUMENT", "Requested graph limit exceeds the supported hard cap");
  }
  if (merged.maxOutputBytes < 256) {
    throw new ImpactError("INVALID_ARGUMENT", "maxOutputBytes must be at least 256 bytes");
  }
  return merged;
}

export function stableSort<T>(values: readonly T[], key: (value: T) => string): T[] {
  return [...values].sort((a, b) => compareText(key(a), key(b)));
}

export function compareText(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function diagnostic(code: string, message: string, extra: Partial<Diagnostic> = {}): Diagnostic {
  return { code, message, severity: "warning", ...extra };
}

export function jsonByteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value));
}

export function boundedJson(value: unknown, maxBytes: number): string {
  const output = JSON.stringify(value);
  if (Buffer.byteLength(output) > maxBytes) {
    throw new ImpactError("OUTPUT_LIMIT_EXCEEDED", `JSON output exceeds ${maxBytes} bytes`, {
      maxOutputBytes: maxBytes,
      actualBytes: Buffer.byteLength(output),
    });
  }
  return output;
}

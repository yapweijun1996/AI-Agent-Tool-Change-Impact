import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import * as ts from "typescript";
import { ImpactError } from "./errors";
import { SourceSnapshot } from "./snapshot";
import type { Diagnostic, ProjectRef } from "./types";
import { compareText, normalizeRepoPath } from "./util";

export interface ProjectContext {
  readonly snapshot: SourceSnapshot;
  readonly configPath: string;
  readonly project: ProjectRef;
  readonly compilerOptions: ts.CompilerOptions;
  readonly fileNames: string[];
  readonly languageService: ts.LanguageService;
  readonly program: ts.Program;
  readonly diagnostics: Diagnostic[];
  readonly externalFallback: boolean;
  absolutePath(file: string): string;
  repoPath(file: string): string;
  readFile(file: string): string | undefined;
  sourceFile(file: string): ts.SourceFile | undefined;
  isProjectFile(file: string): boolean;
}

function isInside(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value === "" || (value !== ".." && !value.startsWith("../") && !value.startsWith("..\\") && !isAbsolute(value));
}

function toAbsolute(root: string, value: string): string {
  return resolve(isAbsolute(value) ? value : join(root, ...value.replaceAll("\\", "/").split("/")));
}

function externalFileAllowed(root: string, fileName: string): boolean {
  const absolute = resolve(fileName);
  const typescriptRoot = resolve(root, "node_modules", "typescript");
  if (absolute.startsWith(`${typescriptRoot}${sep}`)) {
    return true;
  }
  const nodeModules = `${resolve(root, "node_modules")}${sep}`;
  return absolute.startsWith(nodeModules);
}

function readPermittedFile(root: string, fileName: string, snapshot: SourceSnapshot): string | undefined {
  if (snapshot.fileExists(fileName)) {
    return snapshot.readFile(fileName);
  }
  const absolute = toAbsolute(root, fileName);
  if (!externalFileAllowed(root, absolute)) {
    return undefined;
  }
  try {
    return readFileSync(absolute, "utf8");
  } catch {
    return undefined;
  }
}

function fileExists(root: string, fileName: string, snapshot: SourceSnapshot): boolean {
  return snapshot.fileExists(fileName) || (externalFileAllowed(root, toAbsolute(root, fileName)) && ts.sys.fileExists(toAbsolute(root, fileName)));
}

function virtualReadDirectory(snapshot: SourceSnapshot, root: string, directory: string, extensions?: readonly string[]): string[] {
  const directoryAbsolute = resolve(directory);
  const results: string[] = [];
  for (const relativePath of snapshot.projectFiles()) {
    const absolutePath = join(root, ...relativePath.split("/"));
    if (!isInside(directoryAbsolute, absolutePath)) {
      continue;
    }
    if (extensions && extensions.length > 0 && !extensions.some((extension) => absolutePath.endsWith(extension))) {
      continue;
    }
    results.push(absolutePath);
  }
  return results;
}

function makeParseHost(snapshot: SourceSnapshot): ts.ParseConfigHost {
  const root = snapshot.root;
  return {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    fileExists: (fileName) => fileExists(root, fileName, snapshot),
    readFile: (fileName) => readPermittedFile(root, fileName, snapshot),
    readDirectory: (directory, extensions) => virtualReadDirectory(snapshot, root, directory, extensions),
  };
}

function makeLanguageServiceHost(snapshot: SourceSnapshot, compilerOptions: ts.CompilerOptions, fileNames: string[]): ts.LanguageServiceHost {
  const root = snapshot.root;
  const versions = new Map(fileNames.map((fileName) => [fileName, String(snapshot.readFile(fileName)?.length ?? 0)]));
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => fileNames,
    getScriptVersion: (fileName) => versions.get(fileName) ?? "0",
    getCurrentDirectory: () => root,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) => fileExists(root, fileName, snapshot),
    readFile: (fileName) => readPermittedFile(root, fileName, snapshot),
    readDirectory: (directory, extensions) => virtualReadDirectory(snapshot, root, directory, extensions),
    getScriptSnapshot: (fileName) => {
      const content = readPermittedFile(root, fileName, snapshot);
      return content === undefined ? undefined : ts.ScriptSnapshot.fromString(content);
    },
    getProjectVersion: () => snapshot.ref.id,
  };
  return host;
}

function discoverConfig(snapshot: SourceSnapshot, requested?: string): string {
  if (requested) {
    const configPath = normalizeRepoPath(requested);
    if (!snapshot.fileExists(configPath)) {
      throw new ImpactError("PROJECT_CONFIG_NOT_FOUND", `Project configuration does not exist in snapshot: ${configPath}`);
    }
    if (!/\/(?:tsconfig|jsconfig)\.json$|^(?:tsconfig|jsconfig)\.json$/i.test(configPath)) {
      throw new ImpactError("PROJECT_CONFIG_INVALID", `Project configuration must be tsconfig.json or jsconfig.json: ${configPath}`);
    }
    return configPath;
  }
  const candidates = snapshot.projectFiles().filter((file) => /(?:^|\/)(?:tsconfig|jsconfig)\.json$/i.test(file));
  if (candidates.length === 0) {
    throw new ImpactError("PROJECT_CONFIG_NOT_FOUND", "No tsconfig.json or jsconfig.json was found in the snapshot");
  }
  if (candidates.length > 1) {
    throw new ImpactError("PROJECT_CONFIG_INVALID", "Multiple project configurations were found; pass --project explicitly", { candidates });
  }
  return candidates[0];
}

function toRepoFile(root: string, fileName: string): string | undefined {
  const absolute = resolve(fileName);
  if (!isInside(root, absolute)) {
    return undefined;
  }
  const value = relative(root, absolute).replaceAll("\\", "/");
  return value ? normalizeRepoPath(value) : undefined;
}

export function createProjectContext(snapshot: SourceSnapshot, requestedProject?: string): ProjectContext {
  const configPath = discoverConfig(snapshot, requestedProject);
  const configAbsolute = snapshot.absolutePath(configPath);
  const configText = snapshot.readFile(configPath);
  if (configText === undefined) {
    throw new ImpactError("PROJECT_CONFIG_NOT_FOUND", `Project configuration is unavailable: ${configPath}`);
  }
  const parsed = ts.parseConfigFileTextToJson(configAbsolute, configText);
  if (parsed.error) {
    throw new ImpactError("PROJECT_CONFIG_INVALID", formatDiagnostic(parsed.error));
  }
  const parseHost = makeParseHost(snapshot);
  const parsedCommandLine = ts.parseJsonConfigFileContent(parsed.config, parseHost, snapshot.root, undefined, configAbsolute);
  if (parsedCommandLine.errors.length > 0) {
    const fatal = parsedCommandLine.errors.find((entry) => entry.category === ts.DiagnosticCategory.Error);
    if (fatal) {
      throw new ImpactError("PROJECT_CONFIG_INVALID", formatDiagnostic(fatal));
    }
  }
  const projectFiles = parsedCommandLine.fileNames
    .map((fileName) => toRepoFile(snapshot.root, fileName))
    .filter((fileName): fileName is string => fileName !== undefined && snapshot.fileExists(fileName))
    .sort(compareText);
  if (projectFiles.length === 0) {
    throw new ImpactError("PROJECT_CONFIG_INVALID", `Project configuration contains no readable source files: ${configPath}`);
  }
  const absoluteFiles = projectFiles.map((fileName) => snapshot.absolutePath(fileName));
  const compilerOptions = {
    ...parsedCommandLine.options,
    ...(configPath.toLowerCase().endsWith("jsconfig.json") && parsedCommandLine.options.allowJs === undefined ? { allowJs: true } : {}),
  };
  const host = makeLanguageServiceHost(snapshot, compilerOptions, absoluteFiles);
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  const program = languageService.getProgram();
  if (!program) {
    throw new ImpactError("PROJECT_CONFIG_INVALID", `TypeScript could not create a program for ${configPath}`);
  }
  const diagnostics: Diagnostic[] = parsedCommandLine.errors.map((entry) => ({
    code: "PROJECT_CONFIG_DIAGNOSTIC",
    message: formatDiagnostic(entry),
    severity: "warning",
  }));
  const project: ProjectRef = { configPath, files: projectFiles };
  return {
    snapshot,
    configPath,
    project,
    compilerOptions,
    fileNames: absoluteFiles,
    languageService,
    program,
    diagnostics,
    externalFallback: snapshot.externalFallback,
    absolutePath: (file) => snapshot.absolutePath(file),
    repoPath: (file) => snapshot.toRepoPath(file),
    readFile: (file) => snapshot.readFile(file),
    sourceFile: (file) => program.getSourceFile(snapshot.absolutePath(file)),
    isProjectFile: (file) => projectFiles.includes(snapshot.toRepoPath(file)),
  };
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
}

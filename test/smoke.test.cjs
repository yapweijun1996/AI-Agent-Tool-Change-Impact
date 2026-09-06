const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { delimiter, join } = require("node:path");
const test = require("node:test");

const api = require("../dist/index.js");
const Ajv = require("ajv/dist/2020");
const schema = require("../schemas/result-v0.1-draft.schema.json");
const fixtureRoot = join(__dirname, "fixtures", "basic");

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function createRepo(options = {}) {
  const root = mkdtempSync(join(require("node:os").tmpdir(), "agent-impact-test-"));
  cpSync(fixtureRoot, root, { recursive: true });
  if (!options.includeDynamic) {
    rmSync(join(root, "src", "dynamic.ts"));
  }
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Agent Impact Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "fixture"]);
  return root;
}

function withGitMutation(root, target, callback) {
  const bin = mkdtempSync(join(require("node:os").tmpdir(), "agent-impact-git-wrapper-"));
  const marker = join(bin, "mutation-complete");
  const realGit = execFileSync(process.platform === "win32" ? "where.exe" : "which", ["git"], { encoding: "utf8" }).split(/\r?\n/).find(Boolean).trim();
  if (process.platform === "win32") {
    writeFileSync(join(bin, "git.cmd"), [
      "@echo off",
      "\"%IMPACT_REAL_GIT%\" %*",
      "set \"code=%ERRORLEVEL%\"",
      "if \"%~1\"==\"diff\" if \"%~2\"==\"--raw\" if not exist \"%IMPACT_CAPTURE_MARKER%\" (",
      "  >>\"%IMPACT_CAPTURE_TARGET%\" echo // concurrent edit",
      "  type nul > \"%IMPACT_CAPTURE_MARKER%\"",
      ")",
      "if \"%~1\"==\"-c\" if \"%~2\"==\"core.fsmonitor=false\" if \"%~3\"==\"diff\" if \"%~4\"==\"--raw\" if not exist \"%IMPACT_CAPTURE_MARKER%\" (",
      "  >>\"%IMPACT_CAPTURE_TARGET%\" echo // concurrent edit",
      "  type nul > \"%IMPACT_CAPTURE_MARKER%\"",
      ")",
      "exit /b %code%",
      "",
    ].join("\r\n"));
  } else {
    const wrapper = [
      "#!/bin/sh",
      "\"$IMPACT_REAL_GIT\" \"$@\"",
      "code=$?",
      "if [ \"$1\" = \"-c\" ] && [ \"$2\" = \"core.fsmonitor=false\" ]; then shift 2; fi",
      "if [ \"$1\" = \"diff\" ] && [ \"$2\" = \"--raw\" ] && [ ! -e \"$IMPACT_CAPTURE_MARKER\" ]; then",
      "  printf '\\n// concurrent edit\\n' >> \"$IMPACT_CAPTURE_TARGET\"",
      "  : > \"$IMPACT_CAPTURE_MARKER\"",
      "fi",
      "exit \"$code\"",
      "",
    ].join("\n");
    const executable = join(bin, "git");
    writeFileSync(executable, wrapper);
    chmodSync(executable, 0o755);
  }
  const previous = {
    path: process.env.PATH,
    realGit: process.env.IMPACT_REAL_GIT,
    target: process.env.IMPACT_CAPTURE_TARGET,
    marker: process.env.IMPACT_CAPTURE_MARKER,
  };
  process.env.PATH = `${bin}${delimiter}${previous.path ?? ""}`;
  process.env.IMPACT_REAL_GIT = realGit;
  process.env.IMPACT_CAPTURE_TARGET = target;
  process.env.IMPACT_CAPTURE_MARKER = marker;
  try {
    return callback();
  } finally {
    if (previous.path === undefined) delete process.env.PATH;
    else process.env.PATH = previous.path;
    if (previous.realGit === undefined) delete process.env.IMPACT_REAL_GIT;
    else process.env.IMPACT_REAL_GIT = previous.realGit;
    if (previous.target === undefined) delete process.env.IMPACT_CAPTURE_TARGET;
    else process.env.IMPACT_CAPTURE_TARGET = previous.target;
    if (previous.marker === undefined) delete process.env.IMPACT_CAPTURE_MARKER;
    else process.env.IMPACT_CAPTURE_MARKER = previous.marker;
    rmSync(bin, { recursive: true, force: true });
  }
}

test("capabilities are explicit and read-only", () => {
  const result = api.capabilities();
  assert.equal(result.ok, true);
  assert.deepEqual(result.capabilities.languages, ["javascript", "typescript", "tsx"]);
  assert.equal(result.capabilities.readOnly, true);
  assert.equal(result.capabilities.network, "disabled");
  assert.equal(result.capabilities.heuristics, false);
});

test("file impact returns reverse dependency paths and candidate tests", () => {
  const root = createRepo();
  const before = git(root, ["rev-parse", "HEAD"]);
  const result = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts" });
  assert.equal(result.ok, true);
  assert.equal(result.operation, "file-impact");
  assert.equal(result.analysis.status, "complete");
  const files = result.impact.direct.map((item) => result.graph.nodes.find((node) => node.id === item.node).file);
  assert.deepEqual(files, ["src/reexport.ts", "src/service.ts", "src/view.tsx", "test/math.test.ts"]);
  assert.ok(result.impact.transitive.some((item) => result.graph.nodes.find((node) => node.id === item.node).file === "src/api.ts"));
  assert.ok(result.tests.some((candidate) => candidate.file === "test/math.test.ts"));
  assert.ok(result.graph.edges.every((edge) => edge.evidence.location && edge.evidence.level === "resolved"));
  assert.equal(git(root, ["rev-parse", "HEAD"]), before);
});

test("symbol impact classifies calls, imports, reexports, and remains deterministic", () => {
  const root = createRepo();
  const request = { root, project: "tsconfig.json", file: "src/math.ts", name: "calculateTotal" };
  const first = api.analyzeSymbol(request);
  const second = api.analyzeSymbol(request);
  assert.equal(first.ok, true);
  assert.equal(first.analysis.status, "complete");
  assert.deepEqual(first, second);
  const relations = new Set(first.graph.edges.map((edge) => edge.relation));
  assert.ok(relations.has("calls"));
  assert.ok(relations.has("imports"));
  assert.ok(relations.has("reexports"));
  assert.ok(first.impact.transitive.some((item) => item.distance === 2));
});

test("file traversal terminates on cycles and retains a deterministic diamond path", () => {
  const root = createRepo();
  writeFileSync(join(root, "src", "cycle-a.ts"), "import { cycleB } from './cycle-b';\nexport const cycleA = cycleB + 1;\n");
  writeFileSync(join(root, "src", "cycle-b.ts"), "import { cycleC } from './cycle-c';\nexport const cycleB = cycleC + 1;\n");
  writeFileSync(join(root, "src", "cycle-c.ts"), "import { cycleA } from './cycle-a';\nexport const cycleC = cycleA + 1;\n");
  writeFileSync(join(root, "src", "diamond-b.ts"), "import { value } from './math';\nexport const diamondB = value;\n");
  writeFileSync(join(root, "src", "diamond-c.ts"), "import { value } from './math';\nexport const diamondC = value;\n");
  writeFileSync(join(root, "src", "diamond-a.ts"), "import { diamondB } from './diamond-b';\nimport { diamondC } from './diamond-c';\nexport const diamondA = diamondB + diamondC;\n");
  const cycle = api.analyzeFile({ root, project: "tsconfig.json", file: "src/cycle-a.ts" });
  assert.equal(cycle.ok, true);
  assert.equal(cycle.analysis.status, "complete");
  const cycleFiles = cycle.graph.nodes.map((node) => node.file);
  assert.equal(new Set(cycleFiles).size, cycleFiles.length);
  assert.ok(cycleFiles.includes("src/cycle-b.ts"));
  assert.ok(cycleFiles.includes("src/cycle-c.ts"));
  const first = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts" });
  const second = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts" });
  assert.equal(first.ok, true);
  assert.deepEqual(first, second);
  assert.ok(first.impact.transitive.some((item) => first.graph.nodes.find((node) => node.id === item.node).file === "src/diamond-a.ts"));
  const shallow = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts", limits: { depth: 1 } });
  assert.equal(shallow.ok, true);
  assert.equal(shallow.analysis.status, "partial");
  assert.ok(shallow.analysis.stopReasons.includes("DEPTH_LIMIT"));
});

test("analyzeFile returns a complete empty impact for an isolated target", () => {
  const root = createRepo();
  writeFileSync(join(root, "src", "isolated.ts"), "export const isolated = 1;\n");
  const result = api.analyzeFile({ root, project: "tsconfig.json", file: "src/isolated.ts" });
  assert.equal(result.ok, true);
  assert.equal(result.analysis.status, "complete");
  assert.deepEqual(result.impact.direct, []);
  assert.deepEqual(result.impact.transitive, []);
  assert.deepEqual(result.unresolved, []);
});

test("JavaScript and TypeScript JSX project files are analyzed", () => {
  const root = createRepo();
  const result = api.analyzeSymbol({ root, project: "tsconfig.json", file: "src/legacy.js", name: "legacyTotal" });
  assert.equal(result.ok, true);
  assert.ok(result.graph.edges.some((edge) => edge.relation === "calls"));
  assert.ok(result.graph.nodes.some((node) => node.file === "src/js-caller.ts"));
  const jsx = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts" });
  assert.equal(jsx.ok, true);
  assert.ok(jsx.graph.nodes.some((node) => node.file === "src/view.tsx"));
});

test("interface implementation evidence is classified separately from calls", () => {
  const root = createRepo();
  const result = api.analyzeSymbol({ root, project: "tsconfig.json", file: "src/contracts.ts", name: "InvoiceContract" });
  assert.equal(result.ok, true);
  assert.ok(result.graph.edges.some((edge) => edge.relation === "implements"));
});

test("dynamic dependencies are reported as unresolved observations", () => {
  const root = createRepo({ includeDynamic: true });
  const result = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts" });
  assert.equal(result.ok, true);
  assert.ok(result.unresolved.some((entry) => entry.file === "src/dynamic.ts"));
  assert.equal(result.analysis.status, "partial");
});

test("unresolved literal modules are visible instead of becoming an empty edge set", () => {
  const root = createRepo();
  writeFileSync(join(root, "src", "missing-import.ts"), "import { absent } from './does-not-exist';\nexport const value = absent;\n");
  const result = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts" });
  assert.equal(result.ok, true);
  assert.ok(result.unresolved.some((entry) => entry.code === "MODULE_RESOLUTION_UNRESOLVED" && entry.file === "src/missing-import.ts"));
  assert.equal(result.analysis.status, "partial");
});

test("ambiguous symbols fail closed and support location disambiguation", () => {
  const root = createRepo();
  const path = join(root, "src", "ambiguous.ts");
  writeFileSync(path, "export function same(value: number) { return value; }\nexport namespace Nested { export function same(value: number) { return value + 1; } }\n");
  const ambiguous = api.analyzeSymbol({ root, project: "tsconfig.json", file: "src/ambiguous.ts", name: "same" });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.error.code, "TARGET_AMBIGUOUS");
  const selected = api.analyzeSymbol({ root, project: "tsconfig.json", file: "src/ambiguous.ts", name: "same", line: 1, column: 17 });
  assert.equal(selected.ok, true);
});

test("changed analysis retains base and head snapshots for modifications", () => {
  const root = createRepo();
  const base = git(root, ["rev-parse", "HEAD"]);
  const mathPath = join(root, "src", "math.ts");
  writeFileSync(mathPath, readFileSync(mathPath, "utf8").replace("value * 2", "value * 3"));
  git(root, ["add", "src/math.ts"]);
  git(root, ["commit", "-qm", "change"]);
  const head = git(root, ["rev-parse", "HEAD"]);
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, head });
  assert.equal(result.ok, true);
  assert.equal(result.operation, "changed-impact");
  assert.equal(result.context.snapshots.length, 2);
  assert.equal(result.changed[0].path, "src/math.ts");
  assert.deepEqual(result.changed[0].oldSymbols, ["calculateTotal"]);
  assert.deepEqual(result.changed[0].newSymbols, ["calculateTotal"]);
  assert.ok(result.graph.nodes.some((node) => node.snapshot.revision === base));
  assert.ok(result.graph.nodes.some((node) => node.snapshot.revision === head));
  assert.ok(result.impact.direct.length > 0);
});

test("changed analysis handles deleted symbols using the base snapshot", () => {
  const root = createRepo();
  const base = git(root, ["rev-parse", "HEAD"]);
  const mathPath = join(root, "src", "math.ts");
  writeFileSync(mathPath, readFileSync(mathPath, "utf8").replace(/export function calculateTotal[\s\S]*?\n\nexport class/, "export class"));
  git(root, ["add", "src/math.ts"]);
  git(root, ["commit", "-qm", "delete-symbol"]);
  const head = git(root, ["rev-parse", "HEAD"]);
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, head });
  assert.equal(result.ok, true);
  assert.equal(result.changed[0].path, "src/math.ts");
  assert.deepEqual(result.changed[0].oldSymbols, ["calculateTotal"]);
  assert.ok(result.graph.nodes.some((node) => node.snapshot.revision === base && node.symbol === "calculateTotal"));
});

test("changed analysis records renames with old and new paths", () => {
  const root = createRepo();
  const base = git(root, ["rev-parse", "HEAD"]);
  git(root, ["mv", "src/math.ts", "src/calculation.ts"]);
  git(root, ["commit", "-qm", "rename"]);
  const head = git(root, ["rev-parse", "HEAD"]);
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, head });
  assert.equal(result.ok, true);
  const rename = result.changed.find((entry) => entry.path === "src/calculation.ts");
  assert.ok(rename);
  assert.equal(rename.status, "renamed");
  assert.equal(rename.oldPath, "src/math.ts");
  assert.deepEqual(rename.oldSymbols, ["Calculator", "calculateTotal", "total"]);
  assert.deepEqual(rename.newSymbols, ["Calculator", "calculateTotal", "total"]);
  assert.ok(result.graph.nodes.some((node) => node.snapshot.revision === base && node.file === "src/math.ts"));
  assert.ok(result.graph.nodes.some((node) => node.snapshot.revision === head && node.file === "src/calculation.ts"));
});

test("configuration changes remain visible and produce a partial analysis", () => {
  const root = createRepo();
  const base = git(root, ["rev-parse", "HEAD"]);
  const configPath = join(root, "tsconfig.json");
  writeFileSync(configPath, readFileSync(configPath, "utf8").replace('"test/**/*.ts"', '"src/**/*.ts"'));
  git(root, ["add", "tsconfig.json"]);
  git(root, ["commit", "-qm", "config-change"]);
  const head = git(root, ["rev-parse", "HEAD"]);
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, head });
  assert.equal(result.ok, true);
  assert.equal(result.changed.some((entry) => entry.status === "configuration" && entry.path === "tsconfig.json"), true);
  assert.equal(result.analysis.status, "partial");
  assert.ok(result.warnings.some((warning) => warning.code === "CONFIGURATION_CHANGE"));
});

test("package metadata changes remain visible as configuration seeds", () => {
  const root = createRepo();
  const packagePath = join(root, "package.json");
  writeFileSync(packagePath, '{"name":"fixture","version":"1.0.0"}\n');
  git(root, ["add", "package.json"]);
  git(root, ["commit", "-qm", "package-setup"]);
  const base = git(root, ["rev-parse", "HEAD"]);
  writeFileSync(packagePath, '{"name":"fixture","version":"1.0.1"}\n');
  git(root, ["add", "package.json"]);
  git(root, ["commit", "-qm", "package-change"]);
  const head = git(root, ["rev-parse", "HEAD"]);
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, head });
  assert.equal(result.ok, true);
  assert.ok(result.changed.some((entry) => entry.status === "configuration" && entry.path === "package.json"));
  assert.ok(result.warnings.some((warning) => warning.code === "CONFIGURATION_CHANGE"));
  assert.equal(result.analysis.status, "partial");
});

test("worktree includes non-ignored untracked source and does not mutate Git", () => {
  const root = createRepo();
  writeFileSync(join(root, ".gitignore"), "ignored.ts\n");
  git(root, ["add", ".gitignore"]);
  git(root, ["commit", "-qm", "ignore-setup"]);
  const base = git(root, ["rev-parse", "HEAD"]);
  mkdirSync(join(root, "src", "new"));
  writeFileSync(join(root, "src", "new", "feature.ts"), "export function feature() { return 1; }\n");
  writeFileSync(join(root, "ignored.ts"), "export const ignored = 1;\n");
  const before = git(root, ["status", "--porcelain"]);
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, worktree: true });
  assert.equal(result.ok, true);
  assert.equal(result.analysis.status, "complete");
  assert.ok(result.changed.some((entry) => entry.path === "src/new/feature.ts"));
  assert.ok(!result.changed.some((entry) => entry.path === "ignored.ts"));
  assert.equal(git(root, ["status", "--porcelain"]), before);
});

test("worktree skips symlink escapes outside the repository", () => {
  const root = createRepo();
  const outsideRoot = mkdtempSync(join(require("node:os").tmpdir(), "agent-impact-outside-"));
  const outsideFile = join(outsideRoot, "escape.ts");
  const link = join(root, "src", "escape.ts");
  writeFileSync(outsideFile, "export const escape = 1;\n");
  try {
    symlinkSync(outsideFile, link);
  } catch {
    rmSync(outsideRoot, { recursive: true, force: true });
    return;
  }
  try {
    const result = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts" });
    assert.equal(result.ok, true);
    assert.equal(result.analysis.status, "partial");
    assert.ok(result.warnings.some((warning) => warning.code === "PATH_OUTSIDE_ROOT"));
    assert.ok(!result.graph.nodes.some((node) => node.file === "src/escape.ts"));
  } finally {
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("worktree combines staged and unstaged tracked changes", () => {
  const root = createRepo();
  const base = git(root, ["rev-parse", "HEAD"]);
  const mathPath = join(root, "src", "math.ts");
  const servicePath = join(root, "src", "service.ts");
  writeFileSync(mathPath, readFileSync(mathPath, "utf8").replace("value * 2", "value * 4"));
  git(root, ["add", "src/math.ts"]);
  writeFileSync(servicePath, readFileSync(servicePath, "utf8").replace("calculateTotal(value)", "calculateTotal(value) + 1"));
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, worktree: true });
  assert.equal(result.ok, true);
  assert.ok(result.changed.some((entry) => entry.path === "src/math.ts"));
  assert.ok(result.changed.some((entry) => entry.path === "src/service.ts"));
  assert.equal(result.analysis.status, "complete");
});

test("conflicted worktrees are reported as partial", () => {
  const root = createRepo();
  const base = git(root, ["rev-parse", "HEAD"]);
  const defaultBranch = git(root, ["branch", "--show-current"]);
  git(root, ["checkout", "-qb", "impact-conflict-side"]);
  const mathPath = join(root, "src", "math.ts");
  writeFileSync(mathPath, readFileSync(mathPath, "utf8").replace("value * 2", "value * 5"));
  git(root, ["add", "src/math.ts"]);
  git(root, ["commit", "-qm", "conflict-side"]);
  git(root, ["checkout", defaultBranch]);
  writeFileSync(mathPath, readFileSync(mathPath, "utf8").replace("value * 2", "value * 7"));
  git(root, ["add", "src/math.ts"]);
  git(root, ["commit", "-qm", "conflict-main"]);
  const merge = spawnSync("git", ["merge", "--no-edit", "impact-conflict-side"], { cwd: root, encoding: "utf8" });
  assert.notEqual(merge.status, 0);
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, worktree: true });
  assert.equal(result.ok, true);
  assert.equal(result.analysis.status, "partial");
  assert.ok(result.warnings.some((warning) => warning.code === "GIT_CONFLICT_STATE"));
});

test("worktree content changes during capture are reported as partial", () => {
  const root = createRepo();
  const base = git(root, ["rev-parse", "HEAD"]);
  const target = join(root, "src", "math.ts");
  const result = withGitMutation(root, target, () => api.analyzeChanged({ root, project: "tsconfig.json", base, worktree: true }));
  assert.equal(result.ok, true);
  assert.equal(result.analysis.status, "partial");
  assert.ok(result.warnings.some((warning) => warning.code === "WORKTREE_CHANGED_DURING_CAPTURE"));
});

test("changed analysis disables configured external diff, textconv, and fsmonitor helpers", () => {
  const root = createRepo();
  const marker = join(root, "helper-ran");
  const helper = join(root, "diff-helper.sh");
  writeFileSync(helper, `#!/bin/sh\nprintf 'executed\\n' > '${marker}'\nexit 0\n`);
  chmodSync(helper, 0o755);
  writeFileSync(join(root, ".gitattributes"), "*.ts diff=fixture\n");
  git(root, ["add", ".gitattributes"]);
  git(root, ["commit", "-qm", "configure-diff-driver"]);
  git(root, ["config", "diff.external", helper]);
  git(root, ["config", "diff.fixture.textconv", helper]);
  git(root, ["config", "core.fsmonitor", helper]);
  const base = git(root, ["rev-parse", "HEAD"]);
  const mathPath = join(root, "src", "math.ts");
  writeFileSync(mathPath, readFileSync(mathPath, "utf8").replace("value * 2", "value * 6"));
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, worktree: true });
  assert.equal(result.ok, true);
  assert.ok(result.changed.some((entry) => entry.path === "src/math.ts"));
  assert.equal(existsSync(marker), false);
});

test("output and argument limits fail with machine-readable errors", () => {
  const root = createRepo();
  const output = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts", limits: { maxOutputBytes: 256 } });
  assert.equal(output.ok, false);
  assert.equal(output.error.code, "OUTPUT_LIMIT_EXCEEDED");
  const invalidLimit = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts", limits: { maxFiles: 100001 } });
  assert.equal(invalidLimit.ok, false);
  assert.equal(invalidLimit.error.code, "INVALID_ARGUMENT");
  const cli = spawnSync(process.execPath, [join(__dirname, "..", "dist", "cli.js"), "file", "src/math.ts", "--root", root, "--project", "tsconfig.json", "--json"], { encoding: "utf8" });
  assert.equal(cli.status, 0);
  assert.equal(cli.stderr, "");
  assert.equal(cli.stdout.trim().split("\n").length, 1);
  assert.doesNotThrow(() => JSON.parse(cli.stdout));
});

test("invalid invocations return exit code 2 and one JSON document", () => {
  const cli = spawnSync(process.execPath, [join(__dirname, "..", "dist", "cli.js"), "symbol", "missing.ts", "missing", "--line", "0", "--json"], { encoding: "utf8" });
  assert.equal(cli.status, 2);
  assert.equal(cli.stderr, "");
  const payload = JSON.parse(cli.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_ARGUMENT");
  const extra = spawnSync(process.execPath, [join(__dirname, "..", "dist", "cli.js"), "file", "src/math.ts", "extra", "--json"], { encoding: "utf8" });
  assert.equal(extra.status, 2);
  assert.equal(JSON.parse(extra.stdout).error.code, "INVALID_ARGUMENT");
});

test("changed analysis rejects missing comparison endpoints and missing roots", () => {
  const root = createRepo();
  const missingHead = api.analyzeChanged({ root, base: "HEAD" });
  assert.equal(missingHead.ok, false);
  assert.equal(missingHead.error.code, "INVALID_ARGUMENT");
  const missingRoot = api.analyzeFile({ root: join(root, "does-not-exist"), project: "tsconfig.json", file: "src/math.ts" });
  assert.equal(missingRoot.ok, false);
  assert.equal(missingRoot.error.code, "ROOT_NOT_FOUND");
});

test("draft JSON schema validates success and error envelopes", () => {
  const validator = new Ajv({ strict: false }).compile(schema);
  const root = createRepo();
  assert.equal(validator(api.capabilities()), true);
  const success = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts" });
  const partial = api.analyzeFile({ root: createRepo({ includeDynamic: true }), project: "tsconfig.json", file: "src/math.ts" });
  const error = api.analyzeSymbol({ root, project: "tsconfig.json", file: "src/math.ts", name: "missing" });
  assert.equal(validator(success), true);
  assert.equal(partial.ok, true);
  assert.equal(partial.analysis.status, "partial");
  assert.equal(validator(partial), true);
  assert.equal(validator(error), true);
  assert.deepEqual(validator.errors, null);
});

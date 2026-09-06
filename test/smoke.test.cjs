const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
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

test("worktree includes non-ignored untracked source and does not mutate Git", () => {
  const root = createRepo();
  const base = git(root, ["rev-parse", "HEAD"]);
  mkdirSync(join(root, "src", "new"));
  writeFileSync(join(root, "src", "new", "feature.ts"), "export function feature() { return 1; }\n");
  writeFileSync(join(root, ".gitignore"), "ignored.ts\n");
  writeFileSync(join(root, "ignored.ts"), "export const ignored = 1;\n");
  const before = git(root, ["status", "--porcelain"]);
  const result = api.analyzeChanged({ root, project: "tsconfig.json", base, worktree: true });
  assert.equal(result.ok, true);
  assert.ok(result.changed.some((entry) => entry.path === "src/new/feature.ts"));
  assert.ok(!result.changed.some((entry) => entry.path === "ignored.ts"));
  assert.equal(git(root, ["status", "--porcelain"]), before);
});

test("output and argument limits fail with machine-readable errors", () => {
  const root = createRepo();
  const output = api.analyzeFile({ root, project: "tsconfig.json", file: "src/math.ts", limits: { maxOutputBytes: 256 } });
  assert.equal(output.ok, false);
  assert.equal(output.error.code, "OUTPUT_LIMIT_EXCEEDED");
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
  const error = api.analyzeSymbol({ root, project: "tsconfig.json", file: "src/math.ts", name: "missing" });
  assert.equal(validator(success), true);
  assert.equal(validator(error), true);
  assert.deepEqual(validator.errors, null);
});

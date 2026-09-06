# Agent Change Impact

Agent Change Impact is a local, read-only utility that gives AI coding agents a
bounded, evidence-backed view of what may depend on a file, symbol, or Git
change. It returns repository-relative locations and directed relationships so a
downstream reader such as [Agent Code Slice](https://github.com/yapweijun1996/AI-Agent-Tool-Code-Slice)
can inspect the relevant code.

## Current state

The implementation was introduced in `b57321d`; provider-boundary, Git endpoint,
conflict-coverage/package/CLI/boundary fixes, and graph traversal hardening are in
`0cdd08f`, `13e9f14`, `6b43c58`, `ca5453e`, `0169580`, `5d29c4c`, `954f6dc`,
`bbfeb58`, `940effd`, `1753c22`, `e55647f`, `e51113d`, `89f5286`, `db809f4`, `143e9f7`, `d385ff5`, `798594c`, `83f398d`, `661cb4d`, and `8bb3651`.
CI token permissions were restricted in `0644fda` and the workflow now fetches
full history for reproducible documentation validation in `343750a`.
The installed artifact API/CLI smoke is automated by `npm run pack:smoke` from
`0902d49`.
Its Windows `.cmd` invocation path is hardened in `2a68521`; the smoke uses a
temporary path containing spaces to exercise that quoting boundary (`1c195af`)
and disables install scripts during the temporary install (`b248f10`), pending
hosted Windows execution. Cache-preferred package dependency resolution is
recorded in `48f102e`, packaged API/CLI analysis smoke is in `273a344`, and
release metadata/schema validation is in `4d770e0` (with optional tag checking
added in `13990ce`).
Unknown JavaScript API limit fields fail closed in `74563b1`; the latest local
Node 22/24 release evidence is recorded in `17020ad`.
CLI inline values and Git revision inputs are hardened in `ab27679`.
Documentation and clean-install evidence are reconciled in `079acbd` and
`1a57175`.
Required JavaScript API fields are validated before work begins in `b1f6477`.
TypeScript unused locals and parameters are rejected by the compiler in
`473b4da`.
Provider unresolved observations are bounded by the effective edge budget and
reported with an explicit truncation marker in `32fd01a`.
Diagnostic collection and post-read file-size checks are bounded in `a0f148b`;
large skipped-file inventories report `DIAGNOSTIC_LIMIT` instead of accumulating
unbounded warnings.
It is a working draft,
not a published release: the public schema is still `0.1-draft`, local macOS
and Linux container verification passes, the hosted cross-platform CI matrix
has not run here, and no npm publication has been performed.

| Surface | Current state |
| --- | --- |
| npm package name | `agent-change-impact` (`0.1.0`, local package only) |
| CLI | `agent-impact` via `dist/cli.js` |
| JavaScript API | `dist/index.js` exports `capabilities`, `analyzeFile`, `analyzeSymbol`, and `analyzeChanged` |
| Supported source | JavaScript, TypeScript, and TSX in one selected `tsconfig.json` or `jsconfig.json` project |
| Provider | TypeScript `5.9.3` Language Service plus AST inspection |
| Runtime floor | Node.js `22` or newer according to `package.json`; Node.js `23.10.0` on macOS and Node.js 22/24 Linux containers have been run locally |
| Release state | Draft schema; not published |

## Install and verify from a checkout

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run pack:check
npm run release:check
npm run pack:smoke
npm run docs:check
```

The test suite creates temporary Git repositories from
[`test/fixtures/basic`](test/fixtures/basic), then exercises the CLI and API
without modifying the checkout. `npm test` builds TypeScript before running the
31 smoke/integration cases, including cycle-safe traversal, deterministic
diamond paths, an empty-impact result, malformed JavaScript API request and
out-of-range coordinate handling, snapshot-aware diagnostics, and bounded
high-fan-out unresolved-module and diagnostic observations.
The same 31-case suite and package checks pass in current Node.js 22 and 24
Linux container copies using fresh lockfile installs.
The packaged tarball was also installed in temporary directories and its API and
CLI were loaded successfully on the local macOS runtime and Node 22/24 Linux
containers; the smoke prefers the npm cache, permits registry fallback for
missing dependency metadata, and disables install scripts.
`npm run release:check` verifies package/lockfile versions, the unreleased
changelog heading, draft schema version, required entry points, and the actual
dry-run tarball file set. Set `AGENT_IMPACT_RELEASE_TAG=v<package.version>` when
validating a release tag. It does not publish or create a release.
The bounded fan-out benchmark in
[`spike/PERFORMANCE_FINDINGS.md`](spike/PERFORMANCE_FINDINGS.md) records local
API/CLI cold-start and limit behavior without making a performance guarantee.
The diagnostic stress command is `node spike/diagnostic-limit.cjs`.

## CLI

After `npm run build`, the executable can be invoked directly:

```sh
node dist/cli.js capabilities --json
node dist/cli.js file src/invoice.ts --root /path/to/repo --project tsconfig.json --json
node dist/cli.js symbol src/invoice.ts calculateTotal --root /path/to/repo --project tsconfig.json --at 20:1 --json
node dist/cli.js changed --root /path/to/repo --base origin/main --head HEAD --project tsconfig.json --json
node dist/cli.js changed --root /path/to/repo --base HEAD --worktree --project tsconfig.json --json
```

`--project` is repository-relative. If it is omitted, exactly one
`tsconfig.json` or `jsconfig.json` must be discoverable. `changed` requires a
base revision and exactly one of `--head` or `--worktree`. JSON mode writes one
JSON document to stdout; exit code `0` means a usable complete or partial result,
`2` means invalid invocation, and `1` means an operation failure. Limit flags
include `--depth`, `--max-nodes`, `--max-edges`, `--max-paths`,
`--max-output-bytes`, `--max-files`, `--max-file-bytes`,
`--max-total-file-bytes`, and `--max-diagnostics`.

The graph stores edges from consumer to dependency and reports reverse impact
paths. `resolved` evidence means a static binding in the selected project;
dynamic or missing module targets are retained as unresolved observations.
`analysis.status` describes completeness of the bounded static analysis and is
separate from the top-level `ok` flag. Candidate tests are filename-based
classifications with their actual graph edges; they do not prove coverage or
test execution.

The default limits are depth 2, 100 nodes, 300 edges, one path per impact item,
1 MiB serialized output, 10,000 files, 2 MiB per file, 64 MiB total source, and
1,000 diagnostics. Hard graph caps are depth 5, 5,000 nodes, and 15,000 edges;
hard input/output/diagnostic caps are 8 paths, 16 MiB output, 100,000 files,
16 MiB per file, 512 MiB total source, and 10,000 diagnostics. Provider
unresolved observations are capped at the effective `maxEdges` value before
projection; truncation is visible as `PROVIDER_OBSERVATION_LIMIT`. File and
project diagnostic collection is capped at the effective `maxDiagnostics` value;
truncation is visible as `DIAGNOSTIC_LIMIT`. Both markers make the analysis
partial. Limits and partial stop reasons are included in the result.

## Boundary and limitations

Analysis reads Git objects and the current working tree; changed worktree mode
compares two bounded content-hashed reads and reports a mismatch as partial. It
never checks out,
resets, writes source, installs dependencies, runs repository code, runs tests,
loads executable configuration, invokes external diff/textconv/fsmonitor
helpers, or uses a network service. Historical snapshots may use the current local
`node_modules` and TypeScript standard library for resolution, so historical
dependency fidelity is reported as a limitation. Project references, multiple
workspace projects, full data-flow/runtime dispatch, heuristic matching, Python,
CFML, SCIP, and a dedicated `why` command are outside this draft.

## Documentation

Start with [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for document
ownership and reading order.

- [SPEC.md](SPEC.md): implemented draft behavior, requirements, CLI/API, and result semantics.
- [DESIGN.md](DESIGN.md): implemented architecture, decisions, and known boundaries.
- [EPIC.md](EPIC.md): work-package outcomes and release gate status.
- [ROADMAP.md](ROADMAP.md): milestone order and future priorities.
- [TASK.md](TASK.md): authoritative task ledger, evidence, blockers, and next steps.
- [VALIDATION.md](VALIDATION.md): fixture status and exact verification evidence.
- [CHANGELOG.md](CHANGELOG.md): unreleased `0.1.0` change record prepared for publication.
- [`spike/PROJECT_HOST_FINDINGS.md`](spike/PROJECT_HOST_FINDINGS.md): local project-host feasibility findings.
- [`spike/PERFORMANCE_FINDINGS.md`](spike/PERFORMANCE_FINDINGS.md): bounded local resource observations.

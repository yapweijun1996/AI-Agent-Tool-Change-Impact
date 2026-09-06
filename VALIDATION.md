# Validation Plan and Evidence

Last updated: 2026-09-07. This document owns verification evidence and release
gates; implementation status is authoritative in [TASK.md](TASK.md).

## Current evidence

Core implementation revisions: `b57321d`, `0cdd08f`, `13e9f14`, `6b43c58`, `ca5453e`, `0169580`, `5d29c4c`, `954f6dc`, `bbfeb58`, `940effd`, `1753c22`, `e55647f`, `e51113d`, `89f5286`, `db809f4`, `143e9f7`, `d385ff5`, `798594c`, `83f398d`, and `8bb3651`; path normalization is in `661cb4d`, its NUL-byte regression is in `1e61baf`, installed API/CLI artifact smoke is in `0902d49`, Windows `.cmd` invocation hardening is in `2a68521`, the space-containing path fixture is in `1c195af`, install scripts are disabled in `b248f10`, cache-preferred dependency resolution is in `48f102e`, packaged API/CLI analysis is in `273a344`, stable two-read worktree capture is in `c4dca94`, unknown API limit fields are rejected in `74563b1`, release metadata validation is in `2262658`, optional tag validation is in `13990ce`, schema metadata validation is in `4d770e0`, repeated resource observations are recorded in `aeef862`, Linux release checks are recorded in `17020ad`, the CI dependency audit is in `850f106`, the limit evidence reconciliation is in `beb003e`, lifecycle-safe CI installs are in `f64fbb6`, CLI/revision input hardening is in `ab27679`, required API field validation is in `b1f6477`, TypeScript unused-code checks are in `473b4da`, provider unresolved-observation bounding is in `32fd01a`, and diagnostic collection bounding is in `a0f148b`.
Bounded source/Git/external reads are in `149e0fa`.
Validated real-path reads are in `dd212e4`.
Bounded revision-blob buffers and oversized-blob diagnostics are in `2f3c482`.

Final local gate run on 2026-09-07 at code revision `2f3c482` used Node.js
`v23.10.0` on macOS `Darwin 25.6.0 arm64`. After a fresh
`npm ci --ignore-scripts --no-audit --no-fund`, `npm test` (32/32), `npm run typecheck`,
`npm run pack:check` (38 files), `npm run release:check` with and without the
matching tag, `npm run pack:smoke`, `npm audit --audit-level=low --json` (zero
vulnerabilities), `npm run docs:check`, workflow YAML parsing, and
`git diff --check` all passed. The test count is now 32/32 after provider-,
diagnostic-, and revision-blob-bound regression coverage. This is local evidence; it does not substitute
for the unrun hosted matrix or registry gates below.

After the bounded source-read change in `149e0fa`, fresh Node.js `22.23.2` and
`24.20.0` Alpine containers reran the same lockfile install and passed the 31-case
suite, type check, dependency audit, package check, release check, installed
API/CLI smoke, documentation check, and `git diff --check`. These are local
containers, not hosted runner evidence.

After the revision-blob bound in `2f3c482`, the same fresh Node.js `22.23.2` and
`24.20.0` Alpine containers passed the 32-case suite, type check, dependency
audit, package check, both release checks, installed API/CLI smoke, documentation
check, and `git diff --check`. The new oversized Git-blob fixture passed in both
runtimes. These are local containers, not hosted runner evidence.

After the real-path read change in `dd212e4`, targeted `npm test`,
`npm run typecheck`, `npm run docs:check`, and `git diff --check` also passed on
the macOS runtime. The full package gate above is the current `2f3c482` run; no
hosted or registry evidence is inferred from either local run.

| Area | Evidence | Result |
| --- | --- | --- |
| Build and type safety | `npm run typecheck`; `npm test` builds with strict `tsc -p tsconfig.json`, including unused locals/parameters checks | Pass |
| Runtime smoke/integration | `npm test` on Node.js `v23.10.0`, macOS `Darwin 25.6.0 arm64`, plus fresh clean copies at `2f3c482` using Node.js `v22.23.2` and `v24.20.0` Alpine runtimes | Pass: 32 tests on macOS and 32 tests on each current Linux runtime, with installed API/CLI smoke; Linux copies use the committed lockfile with fresh `npm ci` installs, followed by typecheck, dependency audit, pack, release, package-smoke, and docs checks |
| Draft contract | Ajv `8.20.0` validates capabilities, success, partial, and error envelopes, including effective `analysis.limits` | Pass |
| Dependency audit | `npm audit --json` (production and development dependency graph) | Pass: 0 vulnerabilities |
| Package contents | `npm pack --dry-run --ignore-scripts`; `npm run release:check`; `npm run pack:smoke` temporary tarball `--prefer-offline` install with `--ignore-scripts`, API/CLI smoke, and a space-containing temporary path; fsmonitor-isolation smoke; Node 22/24 Linux container tarball install/API checks | Pass locally: release metadata and 38-file tarball set agree; packaged files include the unreleased changelog; development tests/sources are excluded; packaged API and CLI loaded and configured fsmonitor helper was not executed; clean Node 22.23.2 and Node 24.20.0 Linux package-only checkouts also pass `npm ci --ignore-scripts` and `release:check`; Windows `.cmd` path handling is exercised through the quoted path fixture but hosted execution remains unrun |
| Bounded resource observation | `node spike/performance-benchmark.cjs` on temporary 21-, 121-, 241-, and 501-file fan-out/depth repositories on macOS, plus the 241-file fixture on Node 22/24 Linux containers; three repeated 241-file cold starts on macOS; 12,000-missing-import and 20,000-oversized-file reproductions under default limits; direct pre-decode bounded-reader assertion in the diagnostic-limit test | Pass locally: default node cap stops at 100 nodes for larger fixtures; hard caps complete; semantic counts and stop reasons remain stable across three repeated runs; the high-fan-out provider reproduction returns 299 unresolved observations with `PROVIDER_OBSERVATION_LIMIT` in a 163,378-byte envelope, `node spike/diagnostic-limit.cjs` returns 1,000 warnings with `DIAGNOSTIC_LIMIT` in a 154,605-byte envelope, and the bounded reader rejects a 4 KiB file after 513 bytes under a 512-byte budget; API/CLI child-process timings and RSS across macOS/Linux are recorded in [`spike/PERFORMANCE_FINDINGS.md`](spike/PERFORMANCE_FINDINGS.md) |
| Git/read-only behavior | Temporary repositories, revision/worktree cases, unchanged Git assertions, and an oversized revision blob under a tight `maxFileBytes` limit | Pass for tested cases; oversized Git output is rejected before UTF-8 decoding and reported as `FILE_BUDGET_EXCEEDED` |
| Cross-platform workflow | `.github/workflows/ci.yml` configured for Node 22/24 × Ubuntu/macOS/Windows, full Git history, read-only contents permission, and low-severity dependency audit | Configured; remote execution not yet recorded |
| Registry release | No publish or registry install was requested or authorized | Not run |

The local suite covers the core vertical slice on macOS and Linux container
runtimes. It does not establish Windows or hosted-matrix behavior, cross-platform
determinism, release performance thresholds, cancellation latency, memory
isolation, project-reference support, or registry provenance.

An initial fresh Node 22 cache-only artifact-smoke attempt failed with npm
`ENOTCACHED` because the temporary install could not reuse the container's
registry metadata. That attempt is not counted as a package failure; the smoke
was changed in `48f102e` to prefer the cache and allow normal registry fallback,
then packaged API/CLI analysis was added in `273a344`; both passed after clean
Node 22 and Node 24 lockfile installs.

## Documentation checks

`npm run docs:check` runs a dependency-free Node validator for:

- Required-document presence and all relative links/anchors.
- Consistent requirement (`R-*`), fixture (`V-*`), task (`CI-*`/`DOC-*`),
  decision (`D-*`), and epic (`E-*`) definitions/references.
- Acyclic task prerequisites, balanced fenced blocks, final newlines, and no
  whitespace errors.
- Consistent scope, graph direction, snapshot semantics, evidence/completeness
  separation, candidate-test terminology, dependencies, and release status.
- Byte-identical preservation of `.gitattributes`; CI uses a full-history checkout
  because the validator verifies historical commit references.

Result: **Pass** on 2026-09-07. It checked all 11 Markdown files, relative
links/anchors, identifier definitions/references, an acyclic CI dependency graph,
balanced fences, final newlines, whitespace, and byte-identical `.gitattributes`.
A depth-1 clone reproducibly fails the historical commit check, while a full
history clone passes; this confirms the workflow `fetch-depth: 0` requirement.

## Fixture status

The executable cases live in [`test/smoke.test.cjs`](test/smoke.test.cjs) and use
temporary Git repositories copied from [`test/fixtures/basic`](test/fixtures/basic).
“Pass” below means the scoped behavior was exercised locally. “Partial” means
some behavior is implemented or covered but the full fixture scenario remains
open. “Not run” means no evidence is available.

| ID | Scenario | Status | Current evidence/limitation |
| --- | --- | --- | --- |
| V-01 | Repository root, nested invocation, tracked/untracked/ignored inventory | Partial | Worktree test covers untracked/ignored and canonical dot/repeated-separator paths; parent/NUL paths fail closed; nested invocation and large inventory are untested |
| V-02 | Configured TS, JS/allowJs, TSX; production/test split; project references | Partial | JS/TS/TSX and test split pass; project references remain deferred |
| V-03 | Missing/invalid configuration, absent declarations, parse failures, unsupported arrangement | Partial | Structured missing-root/target/endpoint errors pass; config parse/reference matrix is untested |
| V-04 | Same-named methods, aliases, overloads, merged declarations, anonymous export | Partial | Ambiguous name and `--at` disambiguation pass; overload/merge cases remain open |
| V-05 | Missing target, invalid/mismatched selector, unsupported language, invalid flags | Pass for tested cases | Invalid CLI invocation, missing target, selector, and root/endpoint validation pass |
| V-06 | Named/default/namespace imports, re-export chains, literal require, calls, JSX, type-only edges, extends/implements | Partial | Imports/re-exports/calls/JSX/implements pass; full construct matrix remains open |
| V-07 | Dynamic import, computed property, callback forwarding, dispatch ambiguity, unrelated same-named symbol | Partial | Dynamic and missing literal modules become unresolved; data-flow/dispatch cases are not implemented |
| V-08 | Direct/transitive dependencies, widening, multiple changed seeds | Pass for tested cases | File/symbol direct/transitive paths and changed seeds pass; widening policy is intentionally conservative |
| V-09 | Cycles, diamond paths, duplicate aliases, tied sort keys, repeated requests | Pass for tested cases | Cycle and diamond fixtures terminate with unique nodes and deterministic payloads; duplicate-alias and tied-key matrices remain |
| V-10 | Two commits, non-current head, deleted symbol/file, removed export, rename/move | Pass for tested cases | Modification, deleted symbol, and rename old/new snapshot tests pass; removed-file/export matrix remains |
| V-11 | Staged/unstaged edits, untracked files, missing ref, conflict, concurrent edit | Pass for tested cases | Worktree/untracked/read-only, two-read content-hashed capture, staged plus unstaged edits, missing endpoint, conflict, and concurrent-content-change checks pass; broader repository-state combinations remain |
| V-12 | Top-level side effects, tsconfig/package changes, unsupported asset | Partial | `tsconfig.json` and `package.json` configuration changes plus unsupported-file projection pass; side-effect and broader package matrix remain |
| V-13 | Empty complete, partial, unresolved observations elsewhere in scope | Pass for tested cases | Complete empty isolated-target, dynamic partial, unresolved-module observations, and dual-snapshot diagnostic identity pass; broader irrelevant-observation combinations remain |
| V-14 | Test imports/type-only/unused/mock/skipped/unrelated/external test project | Partial | Filename candidate and dependency separation pass; negative test matrix remains |
| V-15 | Large files/projects, fan-out/deep graph, cancellation, repeated sessions | Partial | Four fan-out/depth sizes (21–501 files) on macOS plus current 32-case Node 22/24 Linux checks confirm default versus hard-cap behavior; bounded source/external reads stop before decoding beyond the per-file budget and Git revision blobs classify oversized output as `FILE_BUDGET_EXCEEDED`; 12,000-missing-import and 20,000-oversized-file reproductions stay within the 300-observation and 1,000-diagnostic default budgets and emit explicit truncation markers; three repeated macOS cold starts preserve counts/stop reasons; cancellation and memory-isolation evidence remain |
| V-16 | Long paths, many diagnostics, tight byte budget, invalid budget, oversized graph | Pass for tested cases | Output/argument limits, explicit diagnostic-cap behavior, high-diagnostic stress, and valid JSON error behavior pass; long-path stress remains |
| V-17 | Identical snapshots/config/dependencies/provider; changed provider/resolution input | Partial | Repeated identical API payloads compare equal; cross-provider/input invalidation is untested |
| V-18 | External diff/textconv/fsmonitor, executable plugin/config, automatic type acquisition | Pass for tested cases | Marker-based external diff/textconv/fsmonitor helper fixture confirms configured helpers are not executed on macOS and Node 22/24 Linux; broader executable-config and automatic-type-acquisition matrix remains |
| V-19 | Symlink escape, workspace symlink, external declarations, source/Git snapshots | Pass for tested cases | Symlink escapes are skipped and reported on macOS and Node 22/24 Linux; snapshot IDs, old/new evidence, and read boundaries pass; workspace symlink and broader external-input matrix remain |
| V-20 | CLI/API success, partial, validation/operation errors, malformed requests, coordinate handoff | Pass for tested cases | CLI JSON/exit behavior, API parity, malformed JavaScript API requests including missing required fields and unknown limits, line-bounded `--at`, inline values containing `=`, trimmed/NUL-rejected revisions, partials, and coordinate handoff pass; UTF-16/old-coordinate cases remain |
| V-21 | Packaged artifact outside checkout on Node 22/24 and Linux/macOS/Windows | Partial | Node 23/macOS and Node 22/24 Linux pass tests, typecheck, pack checks, and installed API/CLI end-to-end analysis smoke; Windows and hosted matrix remain unrun |
| V-22 | Authorized publication and clean registry installation | Not run | Publication requires explicit release authorization and registry credentials |

Fixtures for callbacks and dynamic dispatch should continue to verify honest
limitations. Unsupported features must remain absent from capability claims and
visible in scope/diagnostics rather than counted as complete coverage.

## Measurement and regression policy

Measure CLI cold start separately from any reused Language Service session. Record
repository size, project configuration, dependency state, provider/Node versions,
hardware, and limits with each benchmark. Select practical release thresholds
only after CI-01/CI-08 measurements; no latency or memory guarantee exists yet.

Graph, diagnostic, and output-byte checks include diagnostics and errors. Test
where selection stops, not only the final JSON size. Deterministic work caps provide
reproducible cutoffs; process deadlines and worker cancellation are separate
resource-failure behavior.

Before expanding languages or project modes, compare manually reviewed expected
relationships with representative real changes and record missed and extraneous
candidates. Smaller context alone does not prove safer impact decisions.

## Release evidence

Store concise evidence tied to the implementation revision and package artifact:
commands/workflow IDs, fixture versions, environment, pass/partial outcomes, and
known limitations. Do not retain secrets or large raw logs. Local package
installation, remote CI, registry installation, and publication are separate
gates.

The schema remains draft until result fixtures, scope/uncertainty cases,
output-limit behavior, and platform/artifact checks pass. Any unsupported
requirement must be resolved or explicitly removed from the release scope before
claiming release readiness.

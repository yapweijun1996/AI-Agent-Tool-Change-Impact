# Validation Plan and Evidence

Last updated: 2026-09-06. This document owns verification evidence and release
gates; implementation status is authoritative in [TASK.md](TASK.md).

## Current evidence

Implementation revisions: `b57321d`, `0cdd08f`, `13e9f14`, `6b43c58`, `ca5453e`, `0169580`, `5d29c4c`, `954f6dc`, `bbfeb58`, `940effd`, `1753c22`, `e55647f`, `e51113d`, `89f5286`, `db809f4`, `143e9f7`, `d385ff5`, `798594c`, and `83f398d`; path normalization is in `661cb4d` and its NUL-byte regression is in `1e61baf`, plus the documentation
reconciliation that follows this implementation revision.

| Area | Evidence | Result |
| --- | --- | --- |
| Build and type safety | `npm run typecheck`; `npm test` builds with `tsc -p tsconfig.json` | Pass |
| Runtime smoke/integration | `npm test` on Node.js `v23.10.0`, macOS `Darwin 25.6.0 arm64`, plus temporary clean Linux Git-archive checkouts using Node.js `v22.23.2` and `v24.20.0` Alpine runtimes | Pass: 28 tests on macOS and each Linux runtime; Linux uses fresh `npm ci --offline` installs from the locked npm cache, with `NODE_OPTIONS=--max-old-space-size=1024` |
| Draft contract | Ajv `8.20.0` validates capabilities, success, partial, and error envelopes | Pass |
| Production dependency audit | `npm audit --omit=dev` | Pass: 0 vulnerabilities |
| Package contents | `npm pack --dry-run --ignore-scripts`; temporary tarball offline install/API and fsmonitor-isolation smoke; Node 22/24 Linux container tarball install/API checks | Pass locally: 37 files; development tests/sources excluded; packaged API loaded and configured fsmonitor helper was not executed |
| Bounded resource observation | `node spike/performance-benchmark.cjs` on temporary 21-, 121-, 241-, and 501-file fan-out/depth repositories on macOS, plus the 241-file fixture on Node 22/24 Linux containers | Pass locally: default node cap stops at 100 nodes for larger fixtures; hard caps complete; API/CLI child-process timings and RSS across macOS/Linux are recorded in [`spike/PERFORMANCE_FINDINGS.md`](spike/PERFORMANCE_FINDINGS.md) |
| Git/read-only behavior | Temporary repositories, revision/worktree cases, unchanged Git assertions | Pass for tested cases |
| Cross-platform workflow | `.github/workflows/ci.yml` configured for Node 22/24 × Ubuntu/macOS/Windows | Configured; remote execution not yet recorded |
| Registry release | No publish or registry install was requested or authorized | Not run |

The local suite covers the core vertical slice on macOS and Linux container
runtimes. It does not establish Windows or hosted-matrix behavior, cross-platform
determinism, release performance thresholds, cancellation latency, memory
isolation, project-reference support, or registry provenance.

## Documentation checks

`npm run docs:check` runs a dependency-free Node validator for:

- Required-document presence and all relative links/anchors.
- Consistent requirement (`R-*`), fixture (`V-*`), task (`CI-*`/`DOC-*`),
  decision (`D-*`), and epic (`E-*`) definitions/references.
- Acyclic task prerequisites, balanced fenced blocks, final newlines, and no
  whitespace errors.
- Consistent scope, graph direction, snapshot semantics, evidence/completeness
  separation, candidate-test terminology, dependencies, and release status.
- Byte-identical preservation of `.gitattributes`.

Result: **Pass** on 2026-09-06. It checked all 10 Markdown files, relative
links/anchors, identifier definitions/references, an acyclic CI dependency graph,
balanced fences, final newlines, whitespace, and byte-identical `.gitattributes`.

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
| V-11 | Staged/unstaged edits, untracked files, missing ref, conflict, concurrent edit | Pass for tested cases | Worktree/untracked/read-only, staged plus unstaged edits, missing endpoint, conflict, and concurrent-content-change checks pass; broader repository-state combinations remain |
| V-12 | Top-level side effects, tsconfig/package changes, unsupported asset | Partial | `tsconfig.json` and `package.json` configuration changes plus unsupported-file projection pass; side-effect and broader package matrix remain |
| V-13 | Empty complete, partial, unresolved observations elsewhere in scope | Pass for tested cases | Complete empty isolated-target, dynamic partial, unresolved-module observations, and dual-snapshot diagnostic identity pass; broader irrelevant-observation combinations remain |
| V-14 | Test imports/type-only/unused/mock/skipped/unrelated/external test project | Partial | Filename candidate and dependency separation pass; negative test matrix remains |
| V-15 | Large files/projects, fan-out/deep graph, cancellation, repeated sessions | Partial | Four fan-out/depth sizes (21–501 files) on macOS plus the 241-file fixture on Node 22/24 Linux confirm default versus hard-cap behavior and record API/CLI observations; cancellation and memory-isolation evidence remain |
| V-16 | Long paths, many diagnostics, tight byte budget, invalid budget, oversized graph | Pass for tested cases | Output/argument limits and valid JSON error behavior pass; long-path/diagnostic stress remains |
| V-17 | Identical snapshots/config/dependencies/provider; changed provider/resolution input | Partial | Repeated identical API payloads compare equal; cross-provider/input invalidation is untested |
| V-18 | External diff/textconv/fsmonitor, executable plugin/config, automatic type acquisition | Pass for tested cases | Marker-based external diff/textconv/fsmonitor helper fixture confirms configured helpers are not executed on macOS and Node 22/24 Linux; broader executable-config and automatic-type-acquisition matrix remains |
| V-19 | Symlink escape, workspace symlink, external declarations, source/Git snapshots | Pass for tested cases | Symlink escapes are skipped and reported on macOS and Node 22/24 Linux; snapshot IDs, old/new evidence, and read boundaries pass; workspace symlink and broader external-input matrix remain |
| V-20 | CLI/API success, partial, validation/operation errors, malformed requests, coordinate handoff | Pass for tested cases | CLI JSON/exit behavior, API parity, malformed JavaScript API requests, line-bounded `--at`, partials, and coordinate handoff pass; UTF-16/old-coordinate cases remain |
| V-21 | Packaged artifact outside checkout on Node 22/24 and Linux/macOS/Windows | Partial | Node 23/macOS and Node 22/24 Linux pass tests, typecheck, and pack checks; the earlier clean Linux runs also pass tarball install/API smoke; Windows and hosted matrix remain unrun |
| V-22 | Authorized publication and clean registry installation | Not run | Publication requires explicit release authorization and registry credentials |

Fixtures for callbacks and dynamic dispatch should continue to verify honest
limitations. Unsupported features must remain absent from capability claims and
visible in scope/diagnostics rather than counted as complete coverage.

## Measurement and regression policy

Measure CLI cold start separately from any reused Language Service session. Record
repository size, project configuration, dependency state, provider/Node versions,
hardware, and limits with each benchmark. Select practical release thresholds
only after CI-01/CI-08 measurements; no latency or memory guarantee exists yet.

Graph limits and output-byte checks include diagnostics and errors. Test where
selection stops, not only the final JSON size. Deterministic work caps provide
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

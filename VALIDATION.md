# Validation Plan and Evidence

Last updated: 2026-09-06. This document owns verification evidence and release
gates; implementation status is authoritative in [TASK.md](TASK.md).

## Current evidence

Implementation revisions: `b57321d`, `0cdd08f`, `13e9f14`, `6b43c58`, `ca5453e`, `0169580`, `5d29c4c`, `954f6dc`, `bbfeb58`, `940effd`, `1753c22`, `e55647f`, `e51113d`, and `89f5286`, plus the documentation
reconciliation that follows this implementation revision.

| Area | Evidence | Result |
| --- | --- | --- |
| Build and type safety | `npm run typecheck`; `npm test` builds with `tsc -p tsconfig.json` | Pass |
| Runtime smoke/integration | `npm test` on Node.js `v23.10.0`, macOS `Darwin 25.6.0 arm64`, plus temporary `node:22-alpine` and `node:24-alpine` Linux checkouts | Pass: 24 tests on macOS; 23-case baseline on each Linux runtime |
| Draft contract | Ajv `8.20.0` validates capabilities, success, partial, and error envelopes | Pass |
| Production dependency audit | `npm audit --omit=dev` | Pass: 0 vulnerabilities |
| Package contents | `npm pack --dry-run --ignore-scripts`; temporary tarball offline install/API smoke; Node 22/24 Linux container tarball install/API checks | Pass locally: 37 files; development tests/sources excluded; packaged API loaded |
| Bounded resource observation | `node spike/performance-benchmark.cjs` on temporary 21-, 121-, 241-, and 501-file fan-out/depth repositories | Pass locally: default node cap stops at 100 nodes for larger fixtures; hard caps complete; API/CLI child-process timings and RSS are recorded in [`spike/PERFORMANCE_FINDINGS.md`](spike/PERFORMANCE_FINDINGS.md) |
| Git/read-only behavior | Temporary repositories, revision/worktree cases, unchanged Git assertions | Pass for tested cases |
| Cross-platform workflow | `.github/workflows/ci.yml` configured for Node 22/24 × Ubuntu/macOS/Windows | Configured; remote execution not yet recorded |
| Registry release | No publish or registry install was requested or authorized | Not run |

The local suite covers the core vertical slice on macOS and Linux container
runtimes. It does not establish Windows or hosted-matrix behavior, cross-platform
determinism, release performance thresholds, cancellation latency, memory
isolation, project-reference support, or registry provenance.

## Documentation checks

An inline Python validator was run after this reconciliation for:

- Required-document presence and all relative links/anchors.
- Consistent requirement (`R-*`), fixture (`V-*`), task (`CI-*`/`DOC-*`),
  decision (`D-*`), and epic (`E-*`) definitions/references.
- Acyclic task prerequisites, balanced fenced blocks, final newlines, and no
  whitespace errors.
- Consistent scope, graph direction, snapshot semantics, evidence/completeness
  separation, candidate-test terminology, dependencies, and release status.
- Byte-identical preservation of `.gitattributes`.

Result: **Pass** on 2026-09-06. It checked 10 Markdown files, 90 link/anchor
references, all identifier definitions/references, an acyclic CI dependency graph,
balanced fences, final newlines, whitespace, and byte-identical `.gitattributes`.
The previous eight-file baseline had 37 links; the increase reflects the
implementation, feasibility, and performance references added during the
reconciliation.

## Fixture status

The executable cases live in [`test/smoke.test.cjs`](test/smoke.test.cjs) and use
temporary Git repositories copied from [`test/fixtures/basic`](test/fixtures/basic).
“Pass” below means the scoped behavior was exercised locally. “Partial” means
some behavior is implemented or covered but the full fixture scenario remains
open. “Not run” means no evidence is available.

| ID | Scenario | Status | Current evidence/limitation |
| --- | --- | --- | --- |
| V-01 | Repository root, nested invocation, tracked/untracked/ignored inventory | Partial | Worktree test covers untracked/ignored; nested invocation and large inventory are untested |
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
| V-13 | Empty complete, partial, unresolved observations elsewhere in scope | Pass for tested cases | Complete empty isolated-target, dynamic partial, and unresolved-module observations pass; broader irrelevant-observation combinations remain |
| V-14 | Test imports/type-only/unused/mock/skipped/unrelated/external test project | Partial | Filename candidate and dependency separation pass; negative test matrix remains |
| V-15 | Large files/projects, fan-out/deep graph, cancellation, repeated sessions | Partial | Four fan-out/depth sizes (21–501 files) confirm default versus hard-cap behavior and record API/CLI child-process observations; cancellation and memory-isolation evidence remain |
| V-16 | Long paths, many diagnostics, tight byte budget, invalid budget, oversized graph | Pass for tested cases | Output/argument limits and valid JSON error behavior pass; long-path/diagnostic stress remains |
| V-17 | Identical snapshots/config/dependencies/provider; changed provider/resolution input | Partial | Repeated identical API payloads compare equal; cross-provider/input invalidation is untested |
| V-18 | External diff/textconv, executable plugin/config, automatic type acquisition | Pass for tested cases | Marker-based external diff/textconv helper fixture confirms configured helpers are not executed; broader executable-config and automatic-type-acquisition matrix remains |
| V-19 | Symlink escape, workspace symlink, external declarations, source/Git snapshots | Partial | Snapshot IDs, old/new evidence, and read boundaries are implemented; symlink/external-input fixture remains |
| V-20 | CLI/API success, partial, validation/operation errors, coordinate handoff | Pass for tested cases | CLI JSON/exit behavior, API parity, partials, and `--at` pass; UTF-16/old-coordinate cases remain |
| V-21 | Packaged artifact outside checkout on Node 22/24 and Linux/macOS/Windows | Partial | Temporary Node 22/24 Linux checkouts and Node 23/macOS pass tests, typecheck, pack checks, and packaged API smoke; Windows and hosted matrix remain unrun |
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

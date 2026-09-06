# Implementation Epic

## Outcome

Deliver a local, read-only Agent Change Impact CLI and JavaScript API for
explicitly configured JavaScript/TypeScript/TSX projects, with evidence-backed
file/symbol analysis and a two-snapshot Git change mode.

Status: the implementation vertical slice was delivered by
[`b57321d`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/b57321d)
and bounded provider resolution was fixed in
[`0cdd08f`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/0cdd08f).
Git endpoint validation was added in
[`13e9f14`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/13e9f14).
Conflict-state regression coverage was added in
[`6b43c58`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/6b43c58).
Package checks now build compiled entry points in
[`ca5453e`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/ca5453e).
CLI positional-argument validation was added in
[`0169580`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/0169580).
Cross-platform resolution-path hardening was added in
[`954f6dc`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/954f6dc).
Concurrent worktree-content detection was added in
[`bbfeb58`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/bbfeb58).
Git change-state fixture coverage was expanded in
[`940effd`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/940effd).
Cycle-safe graph traversal and empty-impact regression coverage were added in
[`1753c22`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/1753c22).
The depth-frontier regression assertion was added in
[`e55647f`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/e55647f).
Partial-result schema coverage was added in
[`e51113d`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/e51113d).
Git external-helper isolation coverage was added in
[`89f5286`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/89f5286).
Git fsmonitor helper isolation was added in
[`db809f4`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/db809f4).
Symlink-escape regression coverage was added in
[`143e9f7`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/143e9f7).
JavaScript API runtime request validation was added in
[`d385ff5`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/d385ff5).
Snapshot-aware diagnostic deduplication was added in
[`798594c`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/798594c).
Out-of-range location selectors now fail closed in
[`83f398d`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/83f398d).
Repository-relative paths are canonicalized and traversal segments rejected in
[`661cb4d`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/661cb4d).
Effective analysis limits are exposed and schema-validated in
[`8bb3651`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/8bb3651).
NUL-byte path rejection is covered by a regression assertion in
[`1e61baf`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/1e61baf).
CI token permissions were restricted in
[`0644fda`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/0644fda),
and full-history checkout for documentation validation was added in
[`343750a`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/343750a).
Installed API/CLI artifact smoke was automated in
[`0902d49`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/0902d49).
Windows `.cmd` invocation handling was hardened in
[`2a68521`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/2a68521);
the package-smoke fixture now uses a space-containing temporary path to exercise
quoting (`1c195af`) and disables install scripts during the temporary install
(`b248f10`); cache-preferred dependency resolution is in
[`48f102e`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/48f102e); hosted Windows execution remains open.
Packaged API/CLI end-to-end analysis smoke was added in
[`273a344`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/273a344).
Release metadata and tarball-set validation was added in
[`2262658`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/2262658).
Schema metadata and optional versioned-tag validation were added in
[`4d770e0`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/4d770e0)
and [`13990ce`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/13990ce).
The draft schema and local verification pass; Windows/hosted cross-platform
execution, cancellation/isolation evidence, schema freeze, and publication
remain open.
Provider unresolved observations are now bounded before result projection, with
an explicit partial-result marker and regression coverage in
[`32fd01a`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/32fd01a).
Diagnostic collection is now bounded before projection, with an explicit
`DIAGNOSTIC_LIMIT` marker, a post-read file-size check, and regression coverage
in [`a0f148b`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/a0f148b).
Bounded descriptor reads now stop at the per-file budget plus one byte before
decoding, while Git blobs and permitted external declarations receive bounded
input handling in
[`149e0fa`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/149e0fa).
Validated real-path reads close the symlink replacement window for working-tree
and permitted external declaration reads in
[`dd212e4`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/dd212e4).
Git revision blobs now use a bounded binary buffer and classify output-limit
overflow as `FILE_BUDGET_EXCEEDED` before decoding in
[`2f3c482`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/2f3c482).
Snapshot-loader and project-configuration diagnostics now retain their producing
snapshot before changed-result deduplication in
[`0c8a130`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/0c8a130).
[TASK.md](TASK.md) is the authoritative status ledger.

## Work packages

| Work package | Task | Status | Deliverable/evidence |
| --- | --- | --- | --- |
| E-01: Project-host feasibility | CI-01 | Done locally | Config-bound virtual host and [`spike/PROJECT_HOST_FINDINGS.md`](spike/PROJECT_HOST_FINDINGS.md) |
| E-02: Executable draft contracts | CI-02 | Done as draft | TypeScript contracts with unused-code compiler checks, draft JSON Schema, CLI/API runtime validation including required-field and unknown-limit rejection, and error fixtures |
| E-03: Snapshot and Git boundary | CI-03 | Done for tested cases | Revision/worktree snapshots, two-read content-hashed worktree capture, canonical repository paths, validated real-path reads, endpoint diff, read-only flags, conflict, concurrent-content, and external diff/textconv/fsmonitor helper fixtures |
| E-04: TypeScript semantic provider | CI-04 | Done for scope | JS/TS/TSX targets, imports/re-exports, calls/references, extends/implements |
| E-05: Evidence graph and impact | CI-05 | Done for scope | Reverse traversal, stable IDs, retained paths, cycle-safe depth/node/edge caps |
| E-06: Candidate-test projection | CI-06 | Done for scope | Filename candidates linked to retained dependency edges |
| E-07: Changed-target orchestration | CI-07 | Done for tested cases | Modification, deletion, rename, configuration, unsupported-file, worktree projections |
| E-08: Resource and correctness hardening | CI-08 | In progress | Deterministic file/graph/provider/diagnostic/output limits, bounded descriptor/Git/external reads, three repeated cold starts, high-fan-out regressions, and bounded fan-out measurements across four sizes are present; cancellation, isolation, and platform runs remain |
| E-09: Package and release gates | CI-09 | In progress | Local pack dry-run includes the unreleased changelog, `npm run release:check` validates package metadata and the tarball file set, dependency audit and installed API/CLI smoke are configured, and CI uses full-history checkout, lifecycle-disabled dependency installation, and `contents: read`; schema freeze, cross-platform artifact checks, and registry evidence remain |

## Acceptance by work package

### E-01: Establish the real analysis boundary

The host parses one explicit or unambiguous config, limits source inventory to
the selected project, and records the local feasibility findings. Project
references, cancellation latency, and performance thresholds are still open
investigations.

### E-02: Make claims executable

`src/types.ts` and `schemas/result-v0.1-draft.schema.json` define the draft
envelope, graph direction, coordinates, snapshots, diagnostics, limits, and
stable errors. The test suite validates success, partial, ambiguous, and error
payloads with Ajv. The schema is intentionally not frozen.

### E-03: Preserve the requested code states

`src/snapshot.ts` reads Git trees and bounded working-tree files without
checkout/reset; reads use a real path that passed the root-boundary check, and
changed worktree analysis uses two content-hashed reads to
detect mutations while files are being captured. `src/git.ts` implements endpoint comparison, untracked files,
old/new ranges, rename status, conflict detection, and worktree capture-change
diagnostics. The capture signature combines status and raw tracked diffs, and
the smoke suite exercises conflict, concurrent-content, and configured external
helper isolation in temporary repositories.

### E-04: Resolve semantics without hiding scope gaps

The TypeScript provider resolves configured JS/TS/TSX declarations, aliases,
imports/re-exports, literal `require`/dynamic imports, calls, JSX references,
and `extends`/`implements`. Dynamic or missing module targets are observations;
unsupported project arrangements are not advertised.

### E-05: Explain every returned impact

The graph stores consumer-to-dependency edges and performs bounded reverse BFS.
Every retained impact includes a seed, distance, relation/evidence summary, and
node path. Cycles terminate through per-seed visitation; a depth stop is emitted
only when an unvisited frontier remains; one path per target is the current
projection.

### E-06: Avoid coverage claims

Test-like paths are classified by filename pattern and include the actual edge
IDs/evidence levels. No test runner, coverage engine, or executable test
configuration is loaded.

### E-07: Handle changes that remove or alter the graph

The changed operation creates base/head providers, resolves old and new changed
ranges separately, retains deleted declarations and rename paths, and exposes
configuration/unsupported changes. A missing selected configuration fails
explicitly rather than returning a false empty result.

### E-08: Verify actual work and output bounds

File, graph, retained provider-observation, diagnostic, and serialized-output
limits are enforced before projection; source descriptors stop at their
effective per-file byte budget plus one byte before decoding, while Git revision
blobs use a bounded binary subprocess buffer and classify overflow as
`FILE_BUDGET_EXCEEDED`. Permitted external declarations use the descriptor
reader after a real-path recheck. Deterministic ordering and unchanged-Git
assertions are covered locally. Unresolved module observations are capped at the
effective edge budget, diagnostic collection is capped at `maxDiagnostics`, and
the 32-case suite includes high-fan-out regressions for both truncation markers,
the bounded reader, oversized revision blobs, and distinct base/head diagnostic
snapshot identities.
A bounded fan-out benchmark records default versus hard-cap behavior
across four sizes on macOS and the 241-file fixture on Node 22/24 Linux, with
separate API/CLI cold-start observations. A 20,000-oversized-file stress script
confirms the default diagnostic cap returns 1,000 warnings and a 154,605-byte
partial result. Broader repeated runs,
cancellation/resource-abort behavior, memory isolation, Windows, and hosted
matrix execution still require evidence.

### E-09: Release only what the artifact proves

`package.json`, the lockfile, `LICENSE`, schema, compiled entry points, and a
Node 22/24 × Linux/macOS/Windows workflow are present. `npm pack --dry-run`,
`npm run release:check`, `npm run pack:smoke`, and a cache-preferred install/API
plus fsmonitor-isolation smoke
check pass locally. The current 32-case macOS suite passes, and current Node
22/24 Linux container copies also pass the 32-case suite, clean lockfile `npm ci`,
cache-preferred package install, type checks, and package checks pass. Earlier
clean Linux runs also pass tarball install/API smoke. The latest full run includes the
external-helper, symlink-escape, malformed API request, out-of-range coordinate,
snapshot-aware, provider-observation, diagnostic-limit, oversized revision-blob,
and distinct base/head diagnostic-snapshot fixtures. Package-only Node 22.23.2 and 24.20.0
Linux checkouts also pass clean `npm ci` and `release:check`.
No Windows/hosted workflow result, registry publication, clean registry
install, or provenance is claimed.

The current workflow uses full-history checkout, read-only contents permission,
and `npm ci --ignore-scripts`; this policy is recorded in [`f64fbb6`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/f64fbb6).
The CLI preserves inline values containing `=` and normalizes/rejects unsafe
Git revision inputs; regression coverage is in [`ab27679`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/ab27679).

## Completion gate

The epic is not release-complete until every in-scope requirement in
[SPEC.md](SPEC.md#requirements) has the appropriate evidence in
[VALIDATION.md](VALIDATION.md), the schema is reviewed/frozen, and platform and
artifact gates pass. Local implementation work is complete for the advertised
draft scope; release work remains partial by design because remote execution and
publication were not authorized or available in this checkout.

## Dependencies and external prerequisites

The implementation depends on local Git, Node.js `>=22`, and TypeScript
`5.9.3`. Ajv is development-only. The optional Code Slice repository is not an
installed dependency. CI runners, npm ownership, release credentials,
provenance, and a clean registry install are external release prerequisites.

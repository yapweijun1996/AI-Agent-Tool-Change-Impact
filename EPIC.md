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
Boundary hardening was added in
[`954f6dc`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/954f6dc).
The draft schema and local verification pass; cross-platform execution,
stress/cancellation evidence, schema freeze, and publication remain open.
[TASK.md](TASK.md) is the authoritative status ledger.

## Work packages

| Work package | Task | Status | Deliverable/evidence |
| --- | --- | --- | --- |
| E-01: Project-host feasibility | CI-01 | Done locally | Config-bound virtual host and [`spike/PROJECT_HOST_FINDINGS.md`](spike/PROJECT_HOST_FINDINGS.md) |
| E-02: Executable draft contracts | CI-02 | Done as draft | TypeScript contracts, draft JSON Schema, CLI/API/error fixtures |
| E-03: Snapshot and Git boundary | CI-03 | In progress | Revision/worktree snapshots, endpoint diff, read-only flags; conflict/concurrency fixtures remain |
| E-04: TypeScript semantic provider | CI-04 | Done for scope | JS/TS/TSX targets, imports/re-exports, calls/references, extends/implements |
| E-05: Evidence graph and impact | CI-05 | Done for scope | Reverse traversal, stable IDs, retained paths, depth/node/edge caps |
| E-06: Candidate-test projection | CI-06 | Done for scope | Filename candidates linked to retained dependency edges |
| E-07: Changed-target orchestration | CI-07 | Done for tested cases | Modification, deletion, rename, configuration, unsupported-file, worktree projections |
| E-08: Resource and correctness hardening | CI-08 | In progress | Deterministic limits/read-only checks are present; stress, cancellation, memory, and platform runs remain |
| E-09: Package and release gates | CI-09 | In progress | Local pack dry-run and CI workflow are present; schema freeze, cross-platform artifact checks, and registry evidence remain |

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
checkout/reset. `src/git.ts` implements endpoint comparison, untracked files,
old/new ranges, rename status, conflict detection, and worktree capture-change
diagnostics. Conflict and concurrent-change behavior is implemented but lacks a
dedicated smoke fixture.

### E-04: Resolve semantics without hiding scope gaps

The TypeScript provider resolves configured JS/TS/TSX declarations, aliases,
imports/re-exports, literal `require`/dynamic imports, calls, JSX references,
and `extends`/`implements`. Dynamic or missing module targets are observations;
unsupported project arrangements are not advertised.

### E-05: Explain every returned impact

The graph stores consumer-to-dependency edges and performs bounded reverse BFS.
Every retained impact includes a seed, distance, relation/evidence summary, and
node path. Cycles terminate through per-seed visitation; one path per target is
the current projection.

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

File, graph, provider-observation, and serialized-output limits are enforced;
deterministic ordering and unchanged-Git assertions are covered locally. Large
repository benchmarks, cancellation/resource-abort behavior, and all target
platforms still require execution evidence.

### E-09: Release only what the artifact proves

`package.json`, the lockfile, `LICENSE`, schema, compiled entry points, and a
Node 22/24 × Linux/macOS/Windows workflow are present. `npm pack --dry-run` and
an offline install/API smoke check pass locally. No registry publication, clean
registry install, or remote workflow result is claimed.

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

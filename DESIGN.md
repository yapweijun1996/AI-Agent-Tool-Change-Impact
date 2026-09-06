# Design

Status: implemented v0.1 draft; release gates remain open.
Implementation revision: [`89f5286`](https://github.com/yapweijun1996/AI-Agent-Tool-Change-Impact/commit/89f5286)
Last reconciled: 2026-09-06

This document owns architecture and design decisions. [SPEC.md](SPEC.md) owns
observable behavior, [TASK.md](TASK.md) owns execution status, and
[VALIDATION.md](VALIDATION.md) owns verification evidence. The implementation
and tests are the source of truth for what is currently supported.

## Implemented architecture

```text
CLI / JavaScript API (src/cli.ts, src/index.ts)
        |
Request parsing and validation (src/util.ts, src/errors.ts)
        |
Impact orchestration (src/analysis.ts)
        +-- Immutable snapshots / Git comparison (src/snapshot.ts, src/git.ts)
        +-- Project context and Language Service host (src/project.ts)
        +-- Target/reference/module provider (src/provider.ts)
        +-- Reverse evidence graph (src/graph.ts)
        +-- Candidate-test projection and bounded result envelope
                     |
            TypeScript 5.9.3 Language Service + AST
```

The API builds a working-tree snapshot for `file` and `symbol`, or a base and
head snapshot for `changed`. `project.ts` parses one explicit or unambiguous
`tsconfig.json`/`jsconfig.json` and exposes only its readable source files.
`provider.ts` resolves bindings and module edges. `graph.ts` stores edges from
consumer to dependency and traverses them in reverse. `analysis.ts` combines
the graph, candidate tests, unresolved observations, diagnostics, scope, and
byte limits into the draft schema.

| Component | Owns | Does not own |
| --- | --- | --- |
| CLI/API | Input adaptation, JSON/exit-code behavior, public exports | Language semantics, Git mutation |
| Snapshot/Git | Versioned contents, working-tree inventory, endpoint diff, read boundaries | Symbol meaning or impact conclusions |
| Project context | Config selection/parsing, project membership, permitted local resolution | Runtime execution, dependency installation, test discovery |
| TypeScript provider | Target declarations, aliases, module resolution, references, supported relation classes | CLI formatting, Git comparison, coverage claims |
| Graph engine | Stable node IDs, edge direction, reverse traversal, paths, graph budgets | TypeScript AST or binding decisions |
| Result projection | Direct/transitive summaries, candidate roles, completeness metadata, output bounds | A second dependency model |

## Decisions

### D-01: Keep impact analysis and code extraction separate

The result contains repository-relative locations and relationships, without
source snippets. Code Slice remains an optional downstream reader; integration
is not installed or tested by this repository.

### D-02: Start with one configured project

The provider accepts one selected `tsconfig.json` or `jsconfig.json`, or exactly
one discovered configuration. JavaScript membership follows the config and its
`allowJs` setting. Multiple projects, project references, and configuration-free
workspace inference remain outside the advertised scope. Missing or invalid
configuration is an actionable error.

### D-03: Analyze changes against versioned contexts

`changed` reads Git objects for the base and head, or combines a base revision
with a captured working tree. Deletions use base declarations; additions use
head declarations; modifications and renames retain both source identities.
No checkout or reset occurs. Current local packages may be used to resolve an
old snapshot, so historical dependency fidelity is a reported limitation.

### D-04: Make the evidence graph authoritative

Edges point from consumer to dependency. Reverse traversal produces impact items
with seed attribution, distance, relation classes, evidence levels, and a
retained node path. File requests use module edges; symbol requests use bound
references. Candidate-test lists and direct/transitive lists are projections of
the same retained graph. Visited nodes are tracked per seed, so cycles terminate
without duplicate nodes; depth is partial only when an unvisited frontier still
exists beyond the configured boundary.

### D-05: Separate relationship evidence from completeness

`resolved` means a static binding under the selected project context;
`syntactic` and `heuristic` are schema vocabulary for future providers, while
the current capability advertises only `resolved` and `syntactic`. Dynamic and
missing module targets are unresolved observations, never fabricated edges.
Graph limits, skipped files, config diagnostics, and unresolved observations
make a usable result `partial` while keeping top-level `ok: true`.

### D-06: Treat related tests as candidates

Files named `*.test.*`, `*.spec.*`, or under `__tests__` receive a
`name-pattern-candidate` role when they are reached by retained graph paths.
The result includes the dependency edge IDs and evidence levels. It does not
claim coverage, assertion reachability, or test execution.

### D-07: Separate discovery, resolution, and execution boundaries

Git supplies tracked files and non-ignored untracked files; project membership
then narrows the analysis set. `.git`, `node_modules`, `dist`, and `coverage`
are excluded from source inventory. Symlink escapes are skipped. TypeScript
standard-library files and local `node_modules` may be read for static
resolution, but repository modules, config code, plugins, test runners,
automatic type acquisition, external diff drivers, and textconv filters are
never executed. Git commands disable external diff/textconv and optional locks.

### D-08: Bound work before serialization

File count/bytes, graph nodes/edges/depth, reference collection, dynamic
observations, and serialized output have deterministic caps. Defaults are depth
2, 100 nodes, 300 edges, one retained path per impact item, 1 MiB output, 10,000
files, 2 MiB per file, and 64 MiB total source. Hard graph caps are depth 5,
5,000 nodes, and 15,000 edges; hard input/output caps are 8 paths, 16 MiB
output, 100,000 files, 16 MiB per file, and 512 MiB total source. A stopped
frontier is partial; an output that cannot fit is a structured
`OUTPUT_LIMIT_EXCEEDED` error.

### D-09: Keep reproducibility conditional and measurable

Snapshot IDs hash sorted repository-relative contents and revision identity.
Paths, one-based positions, edge ordering, path selection, and tie breakers are
stable for identical snapshots, configuration, provider version, and limits.
Timing, absolute paths, and random IDs are omitted from semantic output. The
smoke suite repeats requests and compares complete payloads byte-for-byte at the
object level; cross-platform determinism is still unverified.

### D-10: Gate expansion on evidence

SCIP, CFML, Python, runtime tracing, full data-flow, workspace-wide indexing,
heuristic matching, and a dedicated `why` command remain deferred. A second
provider must establish its own project, coordinate, completeness, and budget
evidence before the public provider contract is broadened.

## Review disposition

The original design review concerns are now covered by implementation and tests
as follows:

| Concern | Decision | Current evidence |
| --- | --- | --- |
| Deleted/renamed targets lose old evidence | D-03 | Changed modification, deletion, and rename cases in `test/smoke.test.cjs` |
| Module/configuration changes disappear | D-03, D-04 | Configuration and unsupported-file projections; unresolved module observations |
| Language Service ownership is overstated | D-02 | Config-bound host and feasibility note in [`spike/PROJECT_HOST_FINDINGS.md`](spike/PROJECT_HOST_FINDINGS.md) |
| Graph loses direction or paths | D-04 | Reverse file/symbol impact assertions, cycle/diamond traversal fixtures, and draft schema validation |
| Evidence strength is confused with completeness | D-05 | Dynamic/missing module cases produce `partial` with observations |
| Imports are presented as test coverage | D-06 | Candidate role and dependency edge IDs are separate fields |
| Output caps do not bound work | D-08 | File/graph/provider/output limits are enforced; bounded fan-out observations exist, while stress/cancellation measurements remain open |
| Scan/read/execution boundaries conflict | D-07 | Git flags, symlink checks, unchanged-Git assertions, and offline/read-only API |

## Open design questions

These are remaining investigations, not hidden implementation claims:

- Which project-reference and declaration-redirect arrangements can be supported faithfully?
- How should historical external declarations be supplied when the current local environment differs?
- Should a worker boundary be added for cancellation and memory isolation?
- Which additional module-widening rules are useful without inventing symbol callers?
- What cold-start and memory thresholds should become release gates?

The current release status and evidence are maintained in [TASK.md](TASK.md) and
[VALIDATION.md](VALIDATION.md). The bounded local resource observation is
preserved in [`spike/PERFORMANCE_FINDINGS.md`](spike/PERFORMANCE_FINDINGS.md).

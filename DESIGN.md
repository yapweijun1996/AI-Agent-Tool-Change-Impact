# Design

Status: reviewed planning baseline; no architecture below is implemented.
Last reconciled with the local checkout: 2026-09-06, baseline `081cb63`.

This document owns architectural decisions and their rationale. [SPEC.md](SPEC.md)
owns observable behavior; [TASK.md](TASK.md) owns execution status. Recording a
decision here does not claim runtime verification or release approval.

## Observed architecture

The implementation baseline contains only `.gitattributes`. There are no modules,
services, application dependencies, tests, or runtime entry points to trace.
The following is the intended architecture derived from the proposal and review.

## Intended responsibilities

```text
CLI / JavaScript API
        |
Request validation
        |
Impact orchestration
        +-- Snapshot access / Git comparison
        +-- Project context / provider selection
        +-- Target and change classification
        +-- Evidence graph / reverse traversal
        +-- Candidate-test classification
        +-- Result projection / limits / serialization
                     |
            Language provider session
                     |
       TypeScript Language Service + AST
```

| Component | Owns | Must not own |
| --- | --- | --- |
| Entry points | CLI/API input and output adaptation | Language semantics |
| Snapshot access | Versioned file contents, Git endpoints, bounded reads | Symbol meaning or impact conclusions |
| Project context | Configuration discovery/selection, project membership, permitted resolution inputs | Runtime execution or dependency installation |
| Language provider | Binding, module resolution, reference classification, language diagnostics | CLI formatting, Git mutations, release policy |
| Change classifier | Mapping old/new changes to symbol, module, or configuration seeds using provider evidence | Guessing that unsupported changes have no impact |
| Graph engine | Node identity, deduplication, reverse traversal, evidence paths, traversal budgets | TypeScript-specific AST decisions |
| Test classifier | Test-file role and its classification basis | Coverage or test-pass claims |
| Result projection | Summaries derived from the graph, completeness metadata, byte limits | A second independent dependency model |

The core consumes provider capabilities and normalized observations. Language
selection belongs in provider registration; language-specific semantic branches
do not belong in the graph engine. Initially, one TypeScript provider is enough.

## Design decisions

### D-01: Keep impact analysis and code extraction separate

Return evidence locations and relationships without source snippets. Code Slice
is an optional downstream consumer, not a required parser or semantic engine.
Locations must retain their snapshot identity so old evidence is never read as
if it referred to the current working tree.

### D-02: Start with explicit configured projects

The initial target is one explicitly selected `tsconfig.json` or `jsconfig.json`
project per request. JavaScript membership must follow its configuration,
including `allowJs` where applicable. Automatic inference for configuration-free
repositories and a complete workspace-wide project service are deferred.

The host must discover/select configuration, supply files and snapshots, and
report scope. A Language Service instance is not an automatic repository-wide
reference index. Files outside the selected project, including separate test
projects, must not disappear behind a claim of repository-wide completeness.
Project references and declaration/source redirects require a feasibility
fixture before support can be advertised.

This deliberately narrows v0.1 coverage. Missing dependencies, inaccessible
referenced projects, and unsupported project arrangements produce explicit
scope limitations or an actionable error, depending on whether useful analysis
can still be performed.

### D-03: Analyze changes against versioned contexts

`changed` compares two declared source snapshots. Deleted or removed declarations
are resolved in the base context; additions are resolved in the comparison
context; modifications may require both. Keep evidence from both sides without
claiming that an old dependent necessarily still exists in the new snapshot.

Revision contents and configuration should be read from Git objects without
checkout/reset operations. Working-tree inputs need a captured identity and
change detection so one answer does not silently combine different edits.

Installed external declarations are not necessarily the dependencies that
existed at a historical commit. Record the external resolution inputs used;
if historical dependency fidelity is unavailable, expose that limitation.
Do not install or fetch a historical environment to hide this gap.

### D-04: Make the evidence graph authoritative

Stored dependency edges run from **consumer to dependency**. Impact discovery
walks those edges in reverse. Display arrows may show that reverse traversal,
but must retain the stored relation's meaning.

File requests traverse a module dependency graph. Symbol requests start from
resolved declarations and their references. Widening a symbol result to module
dependents must be explicit, carry a reason, and not invent symbol-level callers.
Containment is structural information, not a runtime dependency by itself.

Each returned impact must retain an evidence path to a seed. Node identity must
include project context, snapshot, canonical repository path, node kind, and a
declaration discriminator where needed. Identity is stable for identical inputs;
cross-version rename identity is a separate mapping, not inferred from a name.

`direct`, `transitive`, and candidate-test lists are projections of this graph.
They must not become independent sources of truth. A dedicated `why` command
can be deferred while the initial result still includes the necessary paths.

### D-05: Separate relationship evidence from completeness

Use `resolved`, `syntactic`, and, only for an explicitly future heuristic mode,
`heuristic`. Remove the overlapping `exact` tier from the initial proposal.
Resolved means binding under the reported static context, not confirmed runtime
dispatch. Unknown targets belong in unresolved observations, not fabricated edges.

Project coverage, unsupported constructs, missing inputs, and resource cutoffs
belong to analysis-level metadata. A correctly resolved edge does not establish
that all other edges have been found. Dynamic observations without a resolved
target must not be attached to every query target; report the observed scope and
the uncertainty about relevance.

### D-06: Treat related tests as candidates

Record test-file classification independently from dependency evidence. A filename
pattern or user configuration may identify a candidate test file; it does not
prove that the file covers the target. Keep its actual `imports` or `references`
edge. Do not emit `tested_by` as proof of execution or assertion coverage.

### D-07: Separate discovery, resolution, and execution boundaries

Git supplies the candidate source inventory. A revision uses its tree; the
worktree uses present tracked files plus non-ignored untracked files. Project
membership and explicit exclusions then determine the analysis scope.

Do not recursively discover application targets inside `.git`, third-party
dependencies, or excluded build output. Controlled Git metadata access is still
needed, and semantic resolution may read permitted local package metadata,
declarations, standard libraries, and configuration dependencies.

Resolve symlinks to enforce actual read boundaries. A workspace link to a source
file inside the root should retain that source identity. Out-of-root resolution
inputs require an explicit policy and must not become implicit scan roots.
Missing or denied inputs must be visible.

Do not execute repository modules, language-service plugins, test/build config
code, automatic type acquisition, external diff drivers, or textconv filters.
Git invocations must disable external helpers and avoid implicit network access
or repository mutations. No source writes, installs, builds, or test runs belong
to an analysis operation.

### D-08: Bound work before serialization

Budget source discovery/reads, project loading, reference collection, graph
traversal, diagnostics, and final output separately. A provider returning an
unbounded array before graph truncation does not satisfy this requirement.

A provider session must expose its project/snapshot context, limitations,
capabilities, bounded query behavior, cancellation, and disposal. The exact
TypeScript API contract remains draft until the feasibility spike establishes
what can be interrupted or requires a worker boundary.

Deterministic work limits and stable traversal order govern retained results.
Wall-clock cancellation must be an explicit failure/limitation, not a promise of
byte-identical partial results. Output truncation must preserve valid JSON and
evidence paths. Unknown totals remain unknown.

### D-09: Keep reproducibility conditional and measurable

Semantic determinism requires identical source snapshots, configuration,
resolution inputs, provider versions, request options, and limits. Normalize
paths, coordinate conventions, ordering, and tie breakers. Exclude timing and
random IDs from semantic output. Record reproducible input identity, not an
unqualified promise that a Git commit alone determines every result.

### D-10: Gate expansion on evidence

Keep SCIP as a future provider boundary, not a v0.1 dependency. An imported index
would need provenance, freshness, source-coordinate, and capability validation.
CFML is the next domain priority; its analysis guarantees must be established
separately. Python is a later candidate, not a simultaneous v0.2 commitment.
Do not freeze a public provider API solely to anticipate these implementations.

## Review disposition

All rows below are addressed in the **written design only**. Implementation and
runtime verification remain pending.

| Review concern | Design decision | Implementation work |
| --- | --- | --- |
| Deleted/renamed targets lose old evidence | D-03 | CI-03, CI-07 |
| Non-symbol/configuration changes are missed | D-03, D-04 | CI-07 |
| Language Service project ownership is overstated | D-02 | CI-01, CI-04 |
| JSON loses edges, paths, and direction | D-04 | CI-02, CI-05 |
| Evidence strength is confused with completeness | D-05 | CI-02, CI-04, CI-05 |
| Imports are presented as tested coverage | D-06 | CI-06 |
| Output caps do not bound analysis cost | D-08, D-09 | CI-01, CI-08 |
| Scan/read/execution boundaries conflict | D-07 | CI-03, CI-04, CI-08 |

Task IDs and status are maintained in [TASK.md](TASK.md). Acceptance evidence is
defined in [VALIDATION.md](VALIDATION.md).

## Open design questions

These are engineering investigations, not current external blockers:

- Which project-reference arrangements can v0.1 analyze faithfully without builds?
- How should unavailable historical dependency declarations downgrade results?
- What provider query/cancellation interface bounds Language Service work in practice?
- Which module-widening rules provide useful transitive results without false precision?
- What cold-start and memory budgets are appropriate for measured repository sizes?

CI-01, CI-02, CI-04, and CI-08 must resolve these questions before the relevant
contract or support claim is frozen. Supporting official references are indexed
in [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md#technical-references).

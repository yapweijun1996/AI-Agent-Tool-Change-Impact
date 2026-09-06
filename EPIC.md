# Implementation Epic

## Outcome

Deliver the first verified local, read-only Agent Change Impact CLI and JavaScript
API for explicitly configured JavaScript/TypeScript/TSX projects, including
evidence-backed file/symbol analysis and a correct two-snapshot Git change mode.

Status: implementation not started. The checkout currently contains documentation
and `.gitattributes`, not a working product. [TASK.md](TASK.md) is the authoritative
status ledger. This epic owns work-package scope and dependencies, not duplicate
completion claims.

## Work packages

| Work package | Tasks | Prerequisites | Deliverable |
| --- | --- | --- | --- |
| E-01: Project-host feasibility | CI-01 | None | Evidence about configured-project membership, references, cold start, cancellation, and declaration resolution |
| E-02: Executable draft contracts | CI-02 | CI-01 | Initial schema/API types and representative contract fixtures; not yet frozen |
| E-03: Snapshot and Git boundary | CI-03 | CI-02 | Immutable revision/worktree access, endpoint semantics, safe local Git operations |
| E-04: TypeScript semantic provider | CI-04 | CI-01, CI-02, CI-03 | Context-bound target resolution and supported static relationship queries |
| E-05: Evidence graph and impact | CI-05 | CI-02, CI-04 | Reverse traversal, path preservation, stable identity, partial-result semantics |
| E-06: Candidate-test projection | CI-06 | CI-04, CI-05 | Test-role classification separated from dependency evidence |
| E-07: Changed-target orchestration | CI-07 | CI-03, CI-04, CI-05 | Old/new change seeds, deletion/rename handling, module/configuration fallback |
| E-08: Resource and correctness hardening | CI-08 | CI-05, CI-06, CI-07 | End-to-end budgets, deterministic cutoffs, platform fixtures, measured limits |
| E-09: Package and release gates | CI-09 | CI-08 | Verified artifact, compatible CLI/API/schema, clean-install and release evidence |

Independent implementation may be organized later, but this epic does not require
parallel agents or overlapping writers. Finish correctness prerequisites before
advertising support.

## Acceptance by work package

### E-01: Establish the real analysis boundary

Demonstrate configured JS/TS/TSX membership, a production/test split, absent
dependencies, and at least one project-reference fixture. Determine whether the
Language Service can satisfy bounded reference queries directly or needs an
isolation strategy. Record cold-start/memory observations without inventing a
performance guarantee. Resolve the relevant open questions in [DESIGN.md](DESIGN.md).

### E-02: Make claims executable

Cover resolved, partial, empty, ambiguous, deleted-target, and output-limit results.
Define graph direction, node identity, ranges, snapshot attribution, warning/error
policy, and CLI/API parity. Reject dangling edges and summary items without paths.
Keep the schema explicitly draft until integration and resource gates pass.

### E-03: Preserve the requested code states

Read revisions without changing the checkout. Define endpoint comparison and
working-tree capture, explicitly account for untracked files, and preserve old/new
coordinates. Detect unavailable refs, conflict states, and changing inputs. Prove
that external diff/textconv helpers cannot execute. Do not fetch missing objects.

### E-04: Resolve semantics without hiding scope gaps

Resolve aliases, imports/re-exports, supported call sites, type relationships, and
JSX references according to declared provider capabilities. Same-named declarations
must not be confused. Unknown runtime targets and unsupported project arrangements
produce honest limitations. Enforce discovery versus resolution-read boundaries.

### E-05: Explain every returned impact

Handle cycles, diamond paths, multiple seeds, and module widening. Retain enough
evidence to explain every result without a separate `why` command. Stable selection
must precede truncation; complete, partial, and unknown counts remain distinct.

### E-06: Avoid coverage claims

Identify candidate tests using declared rules and retain actual dependency paths.
Fixtures must include mocks, unused/type-only imports, similarly named unrelated
files, and tests outside the selected project. No test runner is executed.

### E-07: Handle changes that remove or alter the graph

Use both snapshots for removed declarations, exports, renamed/moved files, and
modified bodies/signatures. Keep top-level and configuration-only changes visible.
Disclose historical external-dependency limitations and unsupported changed files.
Never convert a failed seed resolution into a successful empty impact result.

### E-08: Verify actual work and output bounds

Exercise oversized files, high fan-out, deep graphs, long paths, excessive
diagnostics, cancellation, and output limits. Fix measured input/provider/output
budgets, including coherent error-envelope behavior. Prove read-only/offline
operation, resource disposal, deterministic completed results, and cross-platform
path/coordinate behavior.

### E-09: Release only what the artifact proves

Verify the packaged CLI/API outside the development checkout. Freeze the public
schema after E-02 through E-08 pass. Validate the maintained Node/platform matrix,
publish only through an authorized release workflow, and verify a registry clean
install afterward. Record consistent package/tag/release/changelog identity and
provenance. A local test or dry run is not registry-release evidence.

## Completion gate

All in-scope [SPEC.md](SPEC.md#requirements) requirements must have evidence from
[VALIDATION.md](VALIDATION.md). Unsupported arrangements must be documented and
observable. Required fixes, artifact checks, release evidence, and documentation
updates remain part of the epic; documentation completion alone closes none of
the implementation work packages.

## Dependencies and external prerequisites

Intended implementation dependencies are local Git, Node.js, and a selected
TypeScript package. Exact versions and package choices are pending; none is
declared in this checkout. Code Slice remains optional.

CI runners, npm ownership/access, release credentials, and provenance setup are
future release prerequisites whose availability has not been assessed. They are
not reported as current blockers because implementation has not reached those
steps. No external service or approval prevents the completed design/documentation
work.

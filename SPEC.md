# Product Specification

Status: draft requirements for an unimplemented product. No command, flag, result
field, or capability in this document is an available or frozen public interface.
Last updated: 2026-09-06. Current implementation evidence: [TASK.md](TASK.md).

## Goal and scope

Give an AI coding agent a bounded, evidence-backed set of potentially related
files, symbols, references, dependencies, and candidate tests for a change target.
The result must explain its evidence and the boundaries of the analysis.

Initial delivery targets JavaScript, TypeScript, and TSX in explicitly configured
projects using a TypeScript provider. Python, CFML, SCIP ingestion, full data-flow
analysis, runtime tracing, heuristic target matching, and workspace-wide coverage
are outside the initial implementation scope. Roadmap priorities are not support
claims. Source extraction, editing, test execution/command selection, LLM reasoning,
and automatic dependency installation are outside the product boundary.

## Requirements

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| R-01 | Discover a repository root and report the selected project and actual source scope | V-01, V-02 |
| R-02 | Use declared configuration and permitted resolution inputs; report missing/unsupported context | V-02, V-03 |
| R-03 | Resolve file/symbol targets without silently choosing an ambiguous declaration | V-04, V-05 |
| R-04 | Return static dependency/reference evidence with precise source locations | V-06, V-07 |
| R-05 | Compute direct/transitive reverse impact with stable identity, paths, cycle handling, and explicit granularity | V-08, V-09 |
| R-06 | Analyze Git changes against both declared snapshots, including deletions and renames | V-10, V-11 |
| R-07 | Preserve module/configuration/unsupported changes that cannot map to symbols | V-12 |
| R-08 | Distinguish edge resolution from analysis completeness | V-03, V-07, V-13 |
| R-09 | Return candidate tests with separate classification and dependency evidence | V-14 |
| R-10 | Bound discovery, provider work, traversal, diagnostics, and serialized bytes | V-15, V-16 |
| R-11 | Produce deterministic semantic results for identical declared inputs | V-09, V-17 |
| R-12 | Keep analysis read-only, offline, and free of repository-code execution | V-18, V-19 |
| R-13 | Provide one consistent CLI/API contract with machine-readable errors | V-05, V-16, V-20 |
| R-14 | Verify packaging/platform support before advertising a release | V-21, V-22 |

Fixture IDs refer to [VALIDATION.md](VALIDATION.md). None has runtime pass evidence
yet.

## Draft CLI

The intended executable name is `agent-impact`. These examples describe a future
interface and cannot be run from the current repository.

```sh
agent-impact capabilities --json
agent-impact file src/invoice.ts --project tsconfig.json --json
agent-impact symbol src/invoice.ts calculateTotal --project tsconfig.json --json
agent-impact symbol src/invoice.ts calculateTotal --at 20:1 --project tsconfig.json --json
agent-impact changed --base origin/main --head HEAD --project tsconfig.json --json
agent-impact changed --base HEAD --worktree --project tsconfig.json --json
```

| Operation | Planned meaning |
| --- | --- |
| `capabilities` | Describe implemented provider features and limitations; does not certify that a user's project has been analyzed |
| `file` | Find reverse module dependents in the declared project scope |
| `symbol` | Find statically bound references and supported relationship classifications for a declaration |
| `changed` | Map two source states to changed seeds and evidence-backed reverse impact |

Project configuration may be discovered when unambiguous; `--project` selects it
explicitly. Missing configuration produces an actionable error, not a silently
inferred project. Additional configurations do not imply that they were analyzed.
References crossing unsupported project boundaries must be disclosed.

`--at` is the draft disambiguation mechanism. A name plus location must identify
the same declaration; inconsistent selectors fail. Ambiguous results return
bounded candidates that can be submitted again. Overload families, merged
declarations, anonymous exports, and same-named methods need canonical selection
fixtures before this contract is frozen.

### Git comparison rules

- `changed` requires `--base` and exactly one of `--head` or `--worktree`.
- The draft default is endpoint comparison, not implicit merge-base comparison.
  An explicit merge-base mode may be added only with a documented flag and fixtures.
- `--worktree` means net differences between the base and present tracked-file
  contents, including final staged/unstaged edits, plus non-ignored untracked files.
  It does not independently analyze a staged state that differs from current contents.
- Untracked contents must be enumerated explicitly; ordinary tracked-file diff
  output alone is insufficient. Ignored untracked files are excluded and scope is reported.
- Read base and head contents/configuration at their revisions, not from whichever
  checkout is currently present. Analyze deleted declarations in the base state.
- Keep old/new paths and locations for rename/move changes. Rename detection is a
  documented comparison policy, not guaranteed symbol identity.
- Modified ranges must be interpreted against their respective old/new contents.
  Changes outside resolvable symbols fall back to module analysis with a reason.
- Configuration and package-resolution changes trigger context reassessment or an
  explicit unsupported-change limitation. Unrecognized changed files remain visible.
- Missing local refs, unavailable Git objects, unresolved index conflicts, or inputs
  changing during capture cannot silently yield an ordinary complete result.
- No checkout, reset, fetch, build, or install is performed. Historical external
  dependencies that cannot be reconstructed locally are disclosed as a limitation.

## Draft result model

No executable JSON schema exists yet. CI-02 must validate representative success,
partial, ambiguous, and error payloads before naming a stable schema version.
The planned envelope separates operation success from analysis completeness.

| Area | Required meaning |
| --- | --- |
| Envelope | Schema identifier/version, operation, request identity, `ok`, structured result or error |
| Context | Provider/version, project/configuration identity, source snapshots, resolution inputs and assumptions |
| Seeds | Requested targets or changed targets with their source-side provenance |
| Graph | Nodes and directed edges with relation, evidence locations, and resolution basis |
| Impact | Derived direct/transitive summaries linking seeds to retained graph paths |
| Candidate tests | Graph-linked files plus the reason each file was classified as a test candidate |
| Analysis | Scope, completion/partial state, exclusions, unresolved observations, limits, and stop reasons |
| Diagnostics | Bounded structured warnings/errors; no reliance on free-text parsing |

`ok: true` means the operation produced a usable result. It does not mean complete
coverage or a safe change. A separate analysis status distinguishes completion
within the declared supported static scope from a partial result. Unsupported
constructs, missing inputs, skipped required scope, and budget cutoffs are explicit.
An empty list must retain this metadata. No result asserts completeness over
unknown runtime behavior or external consumers.

### Graph semantics and coordinates

- Stored relations point from consumer to dependency. Reverse traversal discovers
  potentially affected consumers. Distance counts declared dependency hops from a
  seed, not display arrows or containment alone.
- Initial semantic relations are `imports`, `reexports`, `references`, `calls`,
  `extends`, and `implements`, each only where the provider supports it. Do not
  advertise a relation solely because its enum value exists.
- `depends_on` may be a derived impact summary, not unsupported direct evidence.
  `tested_by` is excluded from the initial semantic edge set.
- Preserve type-only versus value/module dependency information. An `implements`
  edge or type reference is not a runtime call. JSX uses are references unless a
  supported analysis separately justifies another relation.
- Dynamic imports with unknown targets and unresolved references are observations,
  not edges to invented targets. Their observed scope is explicit.
- A call-site classification means a statically resolved reference in an invocation
  position; it is not a guarantee of concrete runtime dispatch.
- Every impact item retains at least one evidence path. Path alternatives may be
  bounded, with omission disclosed. Multiple seeds must retain attribution.
- Symbol-to-module widening must be identified as a conservative expansion, with
  its reason; do not pretend that every export in a dependent module calls the target.
- Paths are repository-relative and normalized. Draft positions use one-based lines
  and UTF-16 columns, inclusive start and exclusive end, with the convention declared.
- Nodes/evidence include snapshot identity; declaration locations and usage locations
  are distinct. A downstream reader must verify the snapshot before reading code.

### Evidence and test semantics

`resolved` indicates static binding under the reported context. `syntactic` means
the construct is observed without sufficient semantic binding. The overlapping
`exact` class is removed. Heuristics are disabled in the initial scope; a future
mode must label them explicitly. Do not turn unresolved observations into a false
confidence percentage or upgrade a transitive path beyond its supporting edges.

Candidate-test classification can use declared file patterns or explicit user
configuration. Its dependency relationship requires separate static evidence.
Imports, unused references, type imports, mocks, and skipped tests do not prove
coverage. Tests outside the selected project are a scope limitation. No executable
test-runner configuration is loaded to discover tests.

### Limits and determinism

Initial graph-budget proposals are depth 2, 100 nodes, 300 edges, and one retained
path per impact target. Proposed hard caps are depth 5 and 5,000 nodes. These
numbers are not measured or implemented defaults. Edge hard caps, input-byte/file
budgets, maximum output bytes, and provider time/memory budgets must be settled
by CI-08 before release.

Stable traversal and tie breakers must be applied before budget-based selection.
All returned edges must reference retained nodes; every included impact must have
a retained path. A nonempty frontier stopped by depth/node/edge limits is reported
as limited/partial, even when the depth was requested. Distinguish observed and
returned counts; omit or mark unknown totals when discovery did not finish.

The final payload, including diagnostics and error envelopes, must fit its byte
budget without slicing JSON text. Invalid/impossibly small limits fail validation.
If a usable evidence-preserving result cannot fit, return an output-limit error.
Time/resource aborts are visible and do not carry byte-stability guarantees.

For completed analysis with identical declared inputs, use stable ordering with
total tie breakers: seed, distance, relation, path, declaration/usage span, and
snapshot/project identity as needed. Timing, timestamps, random IDs, locale, and
absolute machine paths must not affect semantic results.

### Errors and process behavior

Proposed error categories include `INVALID_ARGUMENT`, `ROOT_NOT_FOUND`,
`FILE_NOT_FOUND`, `FILE_OUTSIDE_ROOT`, `LANGUAGE_UNSUPPORTED`,
`PROJECT_CONFIG_NOT_FOUND`, `PROJECT_CONFIG_INVALID`, `TARGET_NOT_FOUND`,
`TARGET_AMBIGUOUS`, `GIT_ERROR`, `OUTPUT_LIMIT_EXCEEDED`, and `INTERNAL_ERROR`.
Exact enums for input changes, cancellation, denied resolution, and resource
limits remain pending CI-02/CI-08.

Unresolved relationships usually produce a partial result/diagnostic rather than
failing otherwise useful analysis. Graph truncation is distinct from a failure
to construct any usable result. Error/warning policy must be consistent across
CLI and JavaScript API.

In JSON mode stdout contains exactly one JSON document on handled success or
failure; diagnostics never contaminate it. The draft exit policy is 0 for a usable
complete or explicitly partial result, 2 for invalid invocation, and 1 for an
operation failure. Consumers must inspect analysis status, not just exit code.
An externally killed process is outside the handled-output guarantee. Exact
mapping will be frozen with CLI/API fixtures, not by this prose alone.

## Dependencies and release prerequisites

No runtime/development dependencies are installed or declared in this repository.
Intended dependencies are Node.js, the TypeScript compiler/Language Service, and
local Git for repository operations. Package versions, Node minimum minor version,
module format, packaging, and schema-validation tooling await implementation.

The planned maintained-Node matrix is Node 22 and 24, subject to the selected
TypeScript version's requirements; Windows, macOS, and Linux are target platforms,
not verified support. Node 18/20 are not baseline targets because they are EOL
as of this document's date. Code Slice is optional; no LLM service, database,
SCIP indexer, Python runtime, or CFML runtime is a v0.1 dependency.

Before release, all in-scope requirements need the evidence in
[VALIDATION.md](VALIDATION.md), a reviewed/frozen executable schema, a verified
package artifact, and recorded registry/release provenance. Publishing is separate
from this documentation task and is not claimed as completed.

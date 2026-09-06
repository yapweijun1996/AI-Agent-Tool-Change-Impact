# Validation Plan and Evidence

Last updated: 2026-09-06. Runtime evidence status: **not run; no implementation or
test harness exists**. This document owns verification requirements and evidence
state, not implementation status (see [TASK.md](TASK.md)).

## Current evidence

The initial local checkout was clean on `main`; commit `081cb63` contained only
`.gitattributes`. Root inventory and tracked-file inspection found no source,
package manifest, lockfile, schema, test, or CI workflow. The present changes
establish documentation only.

No lint, typecheck, application build, unit/integration test, benchmark, package
installation, runtime-network check, or release check has been executed for this
product. No passing runtime result can be inferred from the documentation checks.

## Documentation checks

The eight Markdown files were checked for:

- Required-document presence and internal relative links/anchors.
- Balanced fenced blocks and consistent requirement, decision, task, epic, and
  fixture references.
- Clear separation of observed implementation, planned behavior, and completed
  documentation work.
- Consistent initial project scope, Git snapshot semantics, graph direction,
  evidence/completeness separation, candidate-test terminology, and roadmap.
- Final whitespace/diff review and preservation of `.gitattributes`.

Status: passed for this documentation update on 2026-09-06.

| Check | Recorded result |
| --- | --- |
| Required files and relative links/anchors | Eight Markdown documents present; 37 local links/anchors resolve |
| Identifier definitions and references | 14 requirements, 22 fixture definitions, 9 implementation tasks, 4 documentation tasks, 10 decisions, and 9 epic work packages are internally consistent |
| Task prerequisites | Nine implementation tasks checked; no missing prerequisite or dependency cycle |
| Markdown structure | Fenced blocks balanced; final newlines present; technical artifacts reviewed in English |
| Added-file diff checks | No whitespace diagnostics from per-file `git diff --no-index --check` |
| Baseline preservation | `.gitattributes` is byte-identical to `HEAD:.gitattributes`; only eight new Markdown files are in the task scope |
| Manual consistency review | Planning/runtime status, project scope, snapshots, evidence direction, partial results, test candidates, dependencies, and roadmap reconciled |

These checks used a temporary, inline Python validator and Git inspection; no
permanent checker or runtime test suite was added. For a new file, a no-index diff
exit code of 1 without diagnostics denotes content differences, not a whitespace
failure. This interpretation was checked against clean and trailing-space samples.
External references were consulted during the design review; the link validation
here checks local documentation destinations, not continuing remote availability.

## Planned runtime fixtures

Every row below is **Planned / not run**. These are acceptance scenarios, not files
or tests that already exist. SPEC requirement IDs map to these fixture IDs.

| ID | Scenario | Required observation |
| --- | --- | --- |
| V-01 | Repository root, nested invocation, tracked/untracked/ignored inventory | Correct candidate scope; no accidental discovery in metadata or third-party directories |
| V-02 | Configured TS, JS/allowJs, TSX; production/test split; project references | Declared project membership; separate/out-of-scope projects disclosed; no fabricated workspace completeness |
| V-03 | Missing/invalid configuration, absent declarations, parse failures, unsupported project arrangement | Actionable error or explicitly partial scope, never an ordinary empty complete result |
| V-04 | Same-named methods, aliases, overloads, merged declarations, anonymous export | Deterministic selection or bounded ambiguity candidates; retry selector identifies the intended declaration |
| V-05 | Missing target, invalid/mismatched selector, unsupported language, invalid flags | Stable structured errors and no silent first-match selection |
| V-06 | Named/default/namespace imports, re-export chains, literal require, call sites, JSX, type-only edges, extends/implements | Exact expected static edges for each declared supported construct; locations and relation classes match source |
| V-07 | Dynamic import, computed property, callback forwarding, dispatch ambiguity, unrelated same-named symbol | Unknown targets remain unknown; syntactic evidence is not promoted to confirmed runtime calls; unrelated bindings excluded |
| V-08 | Direct and transitive dependencies, symbol-to-module widening, multiple changed seeds | Every impact has a correctly directed supporting path and seed attribution; widened results retain their coarser meaning |
| V-09 | Cycles, diamond paths, duplicate aliases, tied sort keys, repeated requests | Termination, stable IDs/order/path selection, no duplicate or dangling evidence, no unsupported distance shortcuts |
| V-10 | Two commits, non-current head, deleted symbol/file, removed export, rename/move | Base evidence survives; old/new coordinates and source identities stay separate; checkout remains unchanged |
| V-11 | Staged plus unstaged edits, untracked files, missing ref, unresolved conflict, concurrent edit | Declared net worktree semantics; explicit untracked inclusion; conflict/input-change/missing-ref handling without fetch |
| V-12 | Top-level side effects, tsconfig path change, package export change, unsupported changed asset | Module/configuration fallback or explicit limitation; no silent loss of non-symbol changes |
| V-13 | Empty complete result, partial result, unresolved observations elsewhere in scope | Empty is distinguishable from incomplete; unrelated dynamic observations do not become invented target edges |
| V-14 | Test imports, type-only/unused import, mock, skipped test, unrelated matching filename, external test project | Candidate role and dependency basis remain separate; no asserted test coverage or runtime execution |
| V-15 | Large files/projects, high fan-out, deep graph, cancellation, repeated sessions | Input/provider/traversal budgets and disposal verified; measured cold-start/memory behavior with declared conditions |
| V-16 | Long paths, many diagnostics, tight byte budget, invalid budget, oversized graph | Valid bounded JSON or bounded structured error; retained impacts keep paths; unknown totals stay unknown |
| V-17 | Identical declared snapshots/config/dependencies/provider; changed provider or resolution input | Byte-stable completed semantic output under controlled inputs; changed context invalidates any reused result |
| V-18 | External diff/textconv configuration, executable project plugin/config, automatic type acquisition | No external helper/repository-code execution or automatic installation/network; ordinary analysis still works within scope |
| V-19 | Symlink escape, workspace symlink, external declaration input, source/Git-state snapshots | Read policy enforced on actual paths; workspace identity preserved; no source/checkout/index mutation |
| V-20 | Real CLI/API success, partial result, validation error, operation failure, coordinate handoff | Exactly one JSON document for handled JSON-mode operations; exit/error parity; UTF-16 and old-snapshot locations interpreted correctly |
| V-21 | Packaged artifact outside checkout on Windows/macOS/Linux and selected Node 22/24 versions | Entrypoints, declared engines, package contents, and offline runtime behavior pass without development-only files |
| V-22 | Authorized publication and subsequent clean registry installation | Actual registry artifact, package/tag/release/changelog identity, and provenance verified; dry run is not publication proof |

Keep each fixture's expected files, declarations, relations, paths, and limitations
explicit. Include unrelated consumers as negative cases. A stable result can still
be consistently wrong; deterministic snapshots must be checked against independent
expected relationships, not only compared with themselves.

Fixtures for callbacks/dynamic dispatch should verify honest limitations, not force
v0.1 to implement full data-flow analysis. Unsupported features must be excluded
from capability claims and handled visibly rather than silently counted as passes.

## Measurement and regression policy

Measure CLI cold start separately from reused Language Service sessions. Record
repository size, project configuration, dependency state, provider/Node versions,
hardware, and budget options with each benchmark. Select practical release
thresholds after CI-01/CI-08 measurements; no latency/memory guarantee exists yet.

Graph limits and output-byte checks must include diagnostics and errors. Test
where selection stops, not merely the size of the final JSON. Use deterministic
work budgets for reproducible cutoffs and separate process deadlines as resource
failure handling.

Before expanding languages or project modes, evaluate representative real changes
against manually reviewed expected static relationships. Record missed and
extraneous candidates within the declared scope. Reduced context size alone does
not prove that an agent missed fewer dependencies or made a safer edit.

## Release evidence

Store concise evidence tied to the exact implementation revision and package
artifact: commands/workflow IDs, fixture versions, environment, pass/fail/partial
outcomes, and unresolved limitations. Do not retain secrets or large raw logs in
documentation. Artifact installation and registry installation are separate gates.

The public schema cannot be frozen until result fixtures, scope/uncertainty cases,
and output-limit behavior pass. Any unsupported requirement must be resolved or
explicitly removed from the release scope before a release-ready claim.

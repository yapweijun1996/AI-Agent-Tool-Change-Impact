# Roadmap

Status date: 2026-09-06. Current phase: documentation/design baseline; no runtime
implementation or release is verified. This document owns delivery order, while
[TASK.md](TASK.md) owns detailed task status. Version labels below are targets,
not published versions or delivery dates.

## Before v0.1

| Milestone | Required outcome | Gate |
| --- | --- | --- |
| M-00: Documentation baseline | Consistent design, requirements, task ledger, and verification plan reflecting an empty implementation | Documentation checks in VALIDATION.md |
| M-01: Feasibility and contract draft | Explicit project-host boundary and representative executable result fixtures | CI-01, CI-02 |
| M-02: Static target analysis | Snapshot access plus file/symbol relationships and evidence paths | CI-03, CI-04, CI-05 |
| M-03: Change analysis and candidate tests | Two-snapshot changes, configuration/module fallback, honest related-test projection | CI-06, CI-07 |
| M-04: Verified release candidate | Bounded work/output, stable results, platform tests, validated packaged artifact | CI-08 and pre-publication CI-09 gates |

M-00's documentation gate is complete; its evidence is recorded in
[VALIDATION.md](VALIDATION.md). Milestones M-01 through M-04 are pending.
File/symbol analysis is an internal vertical slice; it does not satisfy the
complete v0.1 target without `changed`.

## Release targets

| Target | Intended scope | Entry condition |
| --- | --- | --- |
| v0.1 | Configured JS/TS/TSX file, symbol, and Git-change impact; candidate tests; CLI/JS API; evidence paths; explicit limitations | All in-scope validation and release gates pass |
| v0.2 | Dedicated `why` presentation; CFML provider feasibility is the next domain investigation | Verified v0.1 and evidence that the next capability is useful and implementable |
| Later, unscheduled | CFML implementation, Python evaluation, SCIP ingestion, broader project coverage, public-surface analysis, optional Test Scope composition | Separate provider/scope contracts and validation evidence |
| v1.0 | Mature compatibility policy and sufficient provider/runtime evidence for a stable product | Demonstrated compatibility and operational quality, not a fixed feature count |

The dedicated `why` command is consistently targeted at v0.2. Evidence paths are
required in v0.1; they are not postponed with the convenience command. CFML remains
the next domain priority, but CFML and Python are not promised together in v0.2.

The v0.1 result schema should freeze only after implementation fixtures pass.
A package version below 1.0 is not permission to silently break that frozen schema.
A broader stable provider API can wait until there is more than a speculative
second provider.

## Decisions that constrain sequencing

- Solve project/snapshot ownership before building an impact graph on top of it.
- Keep old-version evidence before attempting deletion/rename support.
- Establish graph, completeness, and position contracts before downstream composition.
- Measure source/provider work; a small JSON response alone is not a performance gate.
- Verify language constructs and project arrangements individually before labeling
  an entire language or workspace mode supported.
- Expand providers only after the initial capability proves useful on real changes.

## Release evidence policy

CI success, local package installation, registry installation, and a published
release are different evidence stages. Record them separately in
[TASK.md](TASK.md) and [VALIDATION.md](VALIDATION.md). None has runtime evidence yet.
No release credentials, package ownership, or CI availability are assumed from
the existence of this repository.

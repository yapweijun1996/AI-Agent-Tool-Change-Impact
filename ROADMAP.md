# Roadmap

Status date: 2026-09-06. Current phase: **v0.1 implementation and release-candidate
hardening**. Version labels are targets, not published releases or delivery
dates. Detailed status belongs in [TASK.md](TASK.md).

## Before v0.1

| Milestone | Required outcome | Status | Gate |
| --- | --- | --- | --- |
| M-00: Documentation baseline | Consistent design, requirements, task ledger, and validation plan | Done | Documentation checks in [VALIDATION.md](VALIDATION.md) |
| M-01: Feasibility and contract draft | Config-bound project host and executable draft result fixtures | Done locally | CI-01, CI-02; local Node test evidence |
| M-02: Static target analysis | Snapshot access, file/symbol relationships, and evidence paths | Done for supported scope | CI-03, CI-04, CI-05; local smoke tests |
| M-03: Change analysis and candidate tests | Two snapshots, deletion/rename/configuration handling, candidate tests | Done for tested cases | CI-06, CI-07; local smoke tests |
| M-04: Verified release candidate | Bounded work/output, stable results, platform checks, packaged artifact | In progress | CI-08 and pre-publication CI-09 |

M-00 through M-03 are implemented in commits `b57321d`, `0cdd08f`, `13e9f14`, `6b43c58`, `ca5453e`, `0169580`, `5d29c4c`, `954f6dc`, `bbfeb58`, `940effd`, `1753c22`, `e55647f`, `e51113d`, `89f5286`, `db809f4`, `143e9f7`, `d385ff5`, `798594c`, `83f398d`, and `661cb4d`. M-04 is
intentionally open while the configured workflow, cancellation/isolation measurements, schema
freeze, and artifact/platform evidence are outstanding.

## Release targets

| Target | Intended scope | Entry condition |
| --- | --- | --- |
| v0.1 | Configured JS/TS/TSX file, symbol, and Git-change impact; candidate tests; CLI/JS API; evidence paths; explicit limitations | All in-scope validation and release gates pass |
| v0.2 | Dedicated `why` presentation and CFML provider feasibility | Verified v0.1 plus evidence that the next capability is useful and implementable |
| Later, unscheduled | CFML implementation, Python evaluation, SCIP ingestion, broader project coverage, public-surface analysis, optional Test Scope composition | Separate provider/scope contracts and validation evidence |
| v1.0 | Mature compatibility policy and stable provider/runtime evidence | Demonstrated compatibility and operational quality |

The current package is `0.1.0` but the result contract remains
`0.1-draft`; package numbering alone does not signal release readiness. The
dedicated `why` command stays targeted at v0.2 because v0.1 already retains
evidence paths needed by downstream agents.

## Sequencing constraints

- Keep project and snapshot ownership ahead of graph conclusions.
- Preserve old-version evidence before claiming deletion or rename support.
- Establish graph direction, completeness, and coordinate contracts before integrations.
- Measure provider work, not only serialized response size.
- Verify language constructs and project arrangements separately before widening capabilities.
- Expand providers only after the initial capability proves useful on real changes.

## Release evidence policy

Local tests, a local package dry-run, remote CI, registry installation, and a
published release are separate evidence stages. Record each separately in
[TASK.md](TASK.md) and [VALIDATION.md](VALIDATION.md). Publishing or pushing is
not part of the current authorized work. Cross-platform workflow execution and
registry provenance remain the next external release actions.

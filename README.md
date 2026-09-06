# Agent Change Impact

Planned: a local, read-only utility that gives AI coding agents a bounded,
evidence-backed view of what may depend on a proposed or actual code change.

## Current state

As of 2026-09-06, this repository is at the documentation and design stage.
The implementation baseline is commit `081cb63` (`Initial commit`), which
contains only `.gitattributes`. The documentation baseline was added after
reviewing the initial product proposal.

There is no application source, package manifest, dependency lockfile, CLI,
JavaScript API, executable JSON schema, test suite, or CI workflow in this
checkout. No runtime capability, performance result, or release is verified
by this repository. The npm registry and remote release state have not been
audited as part of this documentation work.

| Identity | Intended value | Status |
| --- | --- | --- |
| Repository | `AI-Agent-Tool-Change-Impact` | Current repository |
| npm package | `agent-change-impact` | Proposed; availability/publication unverified |
| CLI | `agent-impact` | Planned; not implemented |
| Initial language scope | JavaScript, TypeScript, TSX | Planned; not verified |

## Product boundary

Change Impact is intended to answer: **What else may depend on this target,
and what evidence connects it?**

[Agent Code Slice](https://github.com/yapweijun1996/AI-Agent-Tool-Code-Slice)
extracts the code at a known location. Change Impact is intended to return
locations and relationships that an agent can inspect with Code Slice or
another reader. This composition is a design goal, not a tested integration
or an installed dependency.

Planned inputs are a file, a symbol, or a Git comparison. Planned outputs
include static dependency/reference edges, evidence locations, candidate
related tests, and explicit analysis limitations. A dependency is not proof
of a behavioral regression, and an empty result is not a safety guarantee.

The tool will not edit code, run tests, select test commands, install
dependencies, execute repository code, perform runtime tracing, or use an LLM.
No UI, persistent database, server, or MCP adapter is required for the initial
design.

## Documentation

Start with [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for document
ownership and reading order.

- [SPEC.md](SPEC.md): planned behavior, requirements, and draft contracts.
- [DESIGN.md](DESIGN.md): architecture, decisions, and review dispositions.
- [EPIC.md](EPIC.md): implementation work packages and dependencies.
- [ROADMAP.md](ROADMAP.md): delivery order and release gates.
- [TASK.md](TASK.md): authoritative current task status and next steps.
- [VALIDATION.md](VALIDATION.md): required evidence and planned fixtures.

There are deliberately no installation instructions yet. Commands in
[SPEC.md](SPEC.md#draft-cli) are proposed interfaces, not runnable examples.

## Next step

The first implementation task is a bounded TypeScript project-host feasibility
spike, followed by executable contract fixtures. Git snapshot analysis and
the public JSON schema must pass their correctness gates before a v0.1 release.
See [TASK.md](TASK.md#next-steps) for the ordered work.

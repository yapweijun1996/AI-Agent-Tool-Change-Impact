# Agent Change Impact

Agent Change Impact is a local, read-only utility that gives AI coding agents a
bounded, evidence-backed view of what may depend on a file, symbol, or Git
change. It returns repository-relative locations and directed relationships so a
downstream reader such as [Agent Code Slice](https://github.com/yapweijun1996/AI-Agent-Tool-Code-Slice)
can inspect the relevant code.

## Current state

The implementation was introduced in `b57321d`; provider-boundary, Git endpoint,
conflict-coverage/package/CLI/boundary fixes, and graph traversal hardening are in
`0cdd08f`, `13e9f14`, `6b43c58`, `ca5453e`, `0169580`, `5d29c4c`, `954f6dc`,
`bbfeb58`, `940effd`, `1753c22`, `e55647f`, and `e51113d`. It is a working draft,
not a published release: the public schema is still `0.1-draft`, local macOS
and Linux container verification passes, the hosted cross-platform CI matrix
has not run here, and no npm publication has been performed.

| Surface | Current state |
| --- | --- |
| npm package name | `agent-change-impact` (`0.1.0`, local package only) |
| CLI | `agent-impact` via `dist/cli.js` |
| JavaScript API | `dist/index.js` exports `capabilities`, `analyzeFile`, `analyzeSymbol`, and `analyzeChanged` |
| Supported source | JavaScript, TypeScript, and TSX in one selected `tsconfig.json` or `jsconfig.json` project |
| Provider | TypeScript `5.9.3` Language Service plus AST inspection |
| Runtime floor | Node.js `22` or newer according to `package.json`; Node.js `23.10.0` on macOS and Node.js 22/24 Linux containers have been run locally |
| Release state | Draft schema; not published |

## Install and verify from a checkout

```sh
npm ci
npm test
npm run typecheck
npm run pack:check
```

The test suite creates temporary Git repositories from
[`test/fixtures/basic`](test/fixtures/basic), then exercises the CLI and API
without modifying the checkout. `npm test` builds TypeScript before running the
23 smoke/integration cases, including cycle-safe traversal, deterministic
diamond paths, and an empty-impact result.
The packaged tarball was also installed in temporary directories and loaded
successfully on the local macOS runtime and Node 22/24 Linux containers; the
macOS install used the offline npm cache.
The bounded fan-out benchmark in
[`spike/PERFORMANCE_FINDINGS.md`](spike/PERFORMANCE_FINDINGS.md) records local
API/CLI cold-start and limit behavior without making a performance guarantee.

## CLI

After `npm run build`, the executable can be invoked directly:

```sh
node dist/cli.js capabilities --json
node dist/cli.js file src/invoice.ts --root /path/to/repo --project tsconfig.json --json
node dist/cli.js symbol src/invoice.ts calculateTotal --root /path/to/repo --project tsconfig.json --at 20:1 --json
node dist/cli.js changed --root /path/to/repo --base origin/main --head HEAD --project tsconfig.json --json
node dist/cli.js changed --root /path/to/repo --base HEAD --worktree --project tsconfig.json --json
```

`--project` is repository-relative. If it is omitted, exactly one
`tsconfig.json` or `jsconfig.json` must be discoverable. `changed` requires a
base revision and exactly one of `--head` or `--worktree`. JSON mode writes one
JSON document to stdout; exit code `0` means a usable complete or partial result,
`2` means invalid invocation, and `1` means an operation failure.

The graph stores edges from consumer to dependency and reports reverse impact
paths. `resolved` evidence means a static binding in the selected project;
dynamic or missing module targets are retained as unresolved observations.
`analysis.status` describes completeness of the bounded static analysis and is
separate from the top-level `ok` flag. Candidate tests are filename-based
classifications with their actual graph edges; they do not prove coverage or
test execution.

The default limits are depth 2, 100 nodes, 300 edges, one path per impact item,
1 MiB serialized output, 10,000 files, 2 MiB per file, and 64 MiB total source.
Hard graph caps are depth 5, 5,000 nodes, and 15,000 edges; hard input/output
caps are 8 paths, 16 MiB output, 100,000 files, 16 MiB per file, and 512 MiB
total source. Limits and partial stop reasons are included in the result.

## Boundary and limitations

Analysis reads Git objects and the current working tree; it never checks out,
resets, writes source, installs dependencies, runs repository code, runs tests,
loads executable configuration, invokes external diff/textconv helpers, or
uses a network service. Historical snapshots may use the current local
`node_modules` and TypeScript standard library for resolution, so historical
dependency fidelity is reported as a limitation. Project references, multiple
workspace projects, full data-flow/runtime dispatch, heuristic matching, Python,
CFML, SCIP, and a dedicated `why` command are outside this draft.

## Documentation

Start with [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for document
ownership and reading order.

- [SPEC.md](SPEC.md): implemented draft behavior, requirements, CLI/API, and result semantics.
- [DESIGN.md](DESIGN.md): implemented architecture, decisions, and known boundaries.
- [EPIC.md](EPIC.md): work-package outcomes and release gate status.
- [ROADMAP.md](ROADMAP.md): milestone order and future priorities.
- [TASK.md](TASK.md): authoritative task ledger, evidence, blockers, and next steps.
- [VALIDATION.md](VALIDATION.md): fixture status and exact verification evidence.
- [`spike/PROJECT_HOST_FINDINGS.md`](spike/PROJECT_HOST_FINDINGS.md): local project-host feasibility findings.
- [`spike/PERFORMANCE_FINDINGS.md`](spike/PERFORMANCE_FINDINGS.md): bounded local resource observations.

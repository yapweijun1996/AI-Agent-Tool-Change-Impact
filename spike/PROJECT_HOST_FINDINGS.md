# Project-host feasibility findings

Date: 2026-09-06
Implementation revision: `e55647f`

This note records the bounded feasibility check that informed the first provider.
It is evidence for project-host behavior, not a performance guarantee.

## Setup

- Runtime: Node.js `v23.10.0`, npm `10.9.2`, TypeScript `5.9.3`.
- Host: macOS `Darwin 25.6.0 arm64`.
- Fixture: `test/fixtures/basic/tsconfig.json` with JavaScript, TypeScript, TSX,
  and a separate test directory.
- Command: `npm test` (the test script builds first and then runs Node's test
  runner against temporary Git repositories made from the fixture).

## Findings

1. A virtual Language Service host can bind a selected `tsconfig.json` to a
   bounded in-memory snapshot. Project membership follows the parsed config;
   files outside that project are not returned as ordinary source nodes.
2. The provider resolves local imports, re-exports, JavaScript calls, TSX
   references, interface `implements`, and reverse symbol references without
   executing repository code or changing Git state.
3. A missing or ambiguous configuration/target fails with a structured error.
   A dynamic or missing literal module is retained as an unresolved observation
   and downgrades an otherwise usable result to `partial`.
4. Revision snapshots can be analyzed concurrently with a working-tree snapshot.
   Deleted declarations remain addressable in the base context, and rename
   results retain old and new paths.
5. The implementation enforces file, graph, observation, and output limits. The
   current 23-case smoke suite verifies behavior at the API/CLI boundary; it does not
   establish cross-platform performance, cancellation latency, or memory limits.

## Decisions and remaining questions

The v0.1 host is intentionally one explicit or unambiguous `tsconfig.json` or
`jsconfig.json` project. Project references, historical dependency installation,
full workspace inference, and a worker-based cancellation boundary remain
unsupported or unmeasured. Those cases must stay visible in capabilities and
documentation until a separate fixture proves them.

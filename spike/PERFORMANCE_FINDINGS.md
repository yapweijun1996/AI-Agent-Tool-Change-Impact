# Local performance findings

Date: 2026-09-06
Implementation revision: `940effd`

This note records one bounded local resource experiment. It is evidence that
the configured limits stop work predictably; it is not a latency, throughput,
or memory guarantee.

## Reproduction

Run from the repository after `npm run build`:

```sh
node spike/performance-benchmark.cjs
```

The script creates and removes a temporary Git repository containing one
`base.ts`, 120 direct consumers, and 120 second-level consumers. It runs the
API and CLI in separate Node child processes with package defaults and the
declared hard limits. No repository files or Git state are changed.

## Observed run

Environment: Node.js `v23.10.0`, macOS `Darwin 25.6.0 arm64`; 241 project files;
provider TypeScript `5.9.3`.

| Mode | Process | Wall time | API work time | RSS delta | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Defaults | API child | 787.3 ms | 574.2 ms | 82.9 MiB | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Hard caps | API child | 910.9 ms | 702.7 ms | 83.9 MiB | `complete`, 241 nodes/240 edges |
| Defaults | CLI child | 1,273.3 ms | — | — | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Hard caps | CLI child | 1,152.8 ms | — | — | `complete`, 241 nodes/240 edges |

The result confirms bounded fan-out behavior and separate CLI cold-start
measurement for this machine and fixture. One run is insufficient to establish
release thresholds, sustained-memory behavior, cancellation latency, or
cross-platform performance; those remain open CI-08 evidence.

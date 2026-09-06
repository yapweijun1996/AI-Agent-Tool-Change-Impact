# Local performance findings

Date: 2026-09-06
Implementation revision: `1753c22`

This note records one bounded local resource experiment. It is evidence that
the configured limits stop work predictably; it is not a latency, throughput,
or memory guarantee.

## Reproduction

Run from the repository after `npm run build`:

```sh
node spike/performance-benchmark.cjs
```

The script creates and removes a temporary Git repository containing one
`base.ts`, direct consumers, and second-level consumers. By default it uses 120
of each; `AGENT_IMPACT_BENCH_DIRECT` and `AGENT_IMPACT_BENCH_TRANSITIVE` can
select bounded values from 1 through 250. It runs the API and CLI in separate
Node child processes with package defaults and the declared hard limits. No
repository files or Git state are changed.

## Observed run

Environment: Node.js `v23.10.0`, macOS `Darwin 25.6.0 arm64`; 241 project files
for the default run; provider TypeScript `5.9.3`.

| Mode | Process | Wall time | API work time | RSS delta | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Defaults | API child | 1,320.4 ms | 1,024.3 ms | 84.6 MiB | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Hard caps | API child | 1,402.9 ms | 1,070.5 ms | 83.0 MiB | `complete`, 241 nodes/240 edges |
| Defaults | CLI child | 3,109.4 ms | — | — | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Hard caps | CLI child | 2,968.7 ms | — | — | `complete`, 241 nodes/240 edges |

The same run shape was repeated with bounded sizes. Returned counts are stable
even though timing and RSS vary by process state.

| Source files | Default result | Hard-cap result |
| ---: | --- | --- |
| 21 (10 + 10 + base) | `complete`, 21 nodes/20 edges | `complete`, 21 nodes/20 edges |
| 121 (60 + 60 + base) | `partial`, 100 nodes/99 edges, `NODE_LIMIT` | `complete`, 121 nodes/120 edges |
| 241 (120 + 120 + base) | `partial`, 100 nodes/99 edges, `NODE_LIMIT` | `complete`, 241 nodes/240 edges |
| 501 (250 + 250 + base) | `partial`, 100 nodes/99 edges, `NODE_LIMIT` plus unresolved-observation diagnostic | `complete`, 501 nodes/500 edges |

The result confirms bounded fan-out behavior across four fixture sizes and
separate CLI cold-start measurement for this machine and fixture. These runs are
insufficient to establish release thresholds, sustained-memory behavior,
cancellation latency, or cross-platform performance; those remain open CI-08
evidence.

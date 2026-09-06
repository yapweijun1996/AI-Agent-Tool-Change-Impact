# Local performance findings

Date: 2026-09-06
Implementation revision: `db809f4`

This note records bounded local resource experiments on macOS and Linux
containers. It is evidence that the configured limits stop work predictably;
it is not a latency, throughput, or memory guarantee.

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
| Defaults | API child | 386.2 ms | 276.8 ms | 78.3 MiB | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Hard caps | API child | 384.1 ms | 280.4 ms | 83.1 MiB | `complete`, 241 nodes/240 edges |
| Defaults | CLI child | 393.9 ms | — | — | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Hard caps | CLI child | 385.3 ms | — | — | `complete`, 241 nodes/240 edges |

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
cancellation latency, or Windows/hosted performance; those remain open CI-08
evidence.

## Linux container observations

The same default 241-file fixture was run in clean Git archive checkouts on
`node:22-alpine` (`v22.23.2`) and `node:24-alpine` (`v24.20.0`). Each checkout
used `npm ci --offline` from the locked npm cache, `NODE_OPTIONS=--max-old-space-size=1024`,
and `npm run build` before the benchmark. Git was installed in the container;
the cache was mounted read-only, so this validates the Linux runtime and locked
dependency graph without claiming registry availability.

| Runtime | Mode | Wall time | API work time | RSS delta | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Node 22 / Linux | API default | 585.5 ms | 436.6 ms | 81.5 MiB | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Node 22 / Linux | API hard caps | 607.4 ms | 461.2 ms | 79.0 MiB | `complete`, 241 nodes/240 edges |
| Node 22 / Linux | CLI default | 544.7 ms | — | — | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Node 22 / Linux | CLI hard caps | 570.7 ms | — | — | `complete`, 241 nodes/240 edges |
| Node 24 / Linux | API default | 901.6 ms | 606.4 ms | 102.9 MiB | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Node 24 / Linux | API hard caps | 692.1 ms | 494.5 ms | 100.9 MiB | `complete`, 241 nodes/240 edges |
| Node 24 / Linux | CLI default | 709.7 ms | — | — | `partial`, 100 nodes/99 edges, `NODE_LIMIT` |
| Node 24 / Linux | CLI hard caps | 697.2 ms | — | — | `complete`, 241 nodes/240 edges |

Returned counts and stop reasons match the macOS fixture behavior. These Linux
observations improve cross-runtime evidence but do not establish Windows or
hosted CI behavior, sustained-memory limits, cancellation latency, or release
performance thresholds.

# Changelog

All notable changes to this project are documented here. The `0.1.0` entry
records the reviewed release contents; registry publication status is tracked in
[README.md](README.md) and [VALIDATION.md](VALIDATION.md).

## [0.1.0] - 2026-09-07

- Add bounded, read-only file, symbol, and two-snapshot Git change impact analysis for JavaScript, TypeScript, and TSX projects.
- Add deterministic reverse evidence graphs with direct/transitive impact paths, candidate-test classification, unresolved observations, diagnostics, and explicit limits.
- Add the `agent-impact` CLI and CommonJS/TypeScript API with machine-readable draft envelopes and structured errors.
- Add Git/worktree snapshot safety checks for conflicts, concurrent content changes, symlink escapes, and configured external helper isolation.
- Add package, documentation, Linux container, and installed API/CLI smoke verification.
- Run CI and release-check dependency installs with lifecycle scripts disabled to keep verification read-only and reproducible.
- Harden CLI inline-value parsing and Git revision validation, with regression coverage for embedded `=` values, whitespace, and NUL input.
- Reject missing required JavaScript API fields as `INVALID_ARGUMENT` before project or Git work begins.
- Enable compiler checks that reject unused TypeScript locals and parameters.
- Bound unresolved provider observations by the effective edge budget and report `PROVIDER_OBSERVATION_LIMIT` when high-fan-out inputs are truncated.
- Bound snapshot/project diagnostic collection with the `maxDiagnostics` limit and report `DIAGNOSTIC_LIMIT` when oversized-file or configuration diagnostics are truncated; re-check bytes after working-tree reads.
- Bound working-tree and permitted external declaration reads before UTF-8 decoding, and add an initial bound for Git revision input.
- Re-open validated real paths for bounded reads and re-check permitted external declaration paths to reduce symlink-replacement races.
- Route provider module-resolution metadata and declaration reads through the same bounded, real-path-validated reader, with oversized package-metadata regression coverage.
- Read Git revision blobs through bounded binary buffers, classify output-limit overflow as `FILE_BUDGET_EXCEEDED`, and cover the behavior with an oversized-blob regression.
- Preserve the producing snapshot ID on loader and project-configuration diagnostics so duplicate base/head warnings remain distinguishable.
- Cover repository-internal symlinked source files and repository-root symlink aliases while continuing to reject symlink escapes outside the repository boundary.
- Enforce `maxOutputBytes` after CLI pretty formatting as well as compact JSON serialization, with a regression for over-budget formatted output.
- Extend installed tarball smoke to exercise the packaged CLI's formatted-output byte limit.
- Preserve in-root symlinked repository paths across Windows case-insensitive lookups and keep the deletion fixture valid with CRLF checkouts.
- Record the Windows `execFile`/`.cmd` test-harness limitation for concurrent capture mutation instead of treating the unexecuted shim as product evidence.
- Keep worktree Git comparison read-only when repositories configure clean filters by hashing raw files and deriving unstaged ranges with content-only diffs outside repository attributes.
- Discover visible in-root symlink aliases on Windows and handle short-path versus long-path identity during repository-boundary checks.
- Freeze the reviewed `0.1-draft` schema/API contract for package `0.1.0` after capabilities, file, symbol, changed, and error envelope validation with Ajv.

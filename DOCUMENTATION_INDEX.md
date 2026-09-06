# Documentation Index

Last reconciled: 2026-09-06. Implementation baseline: `081cb63`.

## Reading order and ownership

| Document | Owns | Does not establish |
| --- | --- | --- |
| [README.md](README.md) | Product identity, current availability, entry points | Runtime support without evidence |
| [TASK.md](TASK.md) | Current status, completed/pending work, blockers, next steps | A planned task as implemented behavior |
| [SPEC.md](SPEC.md) | Planned observable requirements and draft CLI/result contracts | A frozen or executable schema |
| [DESIGN.md](DESIGN.md) | Intended architecture, ownership, decisions, review disposition | An implemented architecture |
| [EPIC.md](EPIC.md) | Work-package deliverables, dependencies, acceptance scope | Independent duplicate task status |
| [ROADMAP.md](ROADMAP.md) | Milestone/release order and future priorities | Published releases or delivery dates |
| [VALIDATION.md](VALIDATION.md) | Fixture plan, evidence rules, verification state | A pass for an unexecuted test |

For implementation work, read TASK, SPEC, DESIGN, then the relevant epic and
validation rows. For product orientation, begin with README.

## Source-of-truth rules

Verified local code, executable contracts, and scoped runtime evidence establish
what is implemented. Git history/tree/status establish the local repository state.
The supplied proposal and review establish planning context, not runtime truth.
External documentation supports technical decisions, not proof that this tool
implements those decisions.

Currently there is no application code to reconcile against beyond the initial
`.gitattributes` baseline. Therefore all runtime architecture, commands, dependency
choices, and acceptance fixtures are explicitly planned/draft.

When implementation appears, reconcile requirements and observed behavior rather
than silently treating a mismatch as either intended behavior or stale prose.
Keep TASK authoritative for status, SPEC for requirements, DESIGN for architecture,
and VALIDATION for evidence. Link between them instead of copying raw logs or
maintaining competing status tables.

Do not write `Verified`, `PASS`, installed, released, or published without the
corresponding scoped evidence. Documentation completion alone proves none of those
runtime claims. Do not put credentials or raw secret-bearing logs into any document.

## Technical references

These official sources were consulted during the design review. They do not
establish dependency versions or compatibility for this unimplemented tool.

| Source | Relevant decision |
| --- | --- |
| [TypeScript Language Service API](https://github.com/microsoft/TypeScript-wiki/blob/main/Using-the-Language-Service-API.md) | Host owns input context; service state is project-specific; on-demand processing is not a repository coverage guarantee |
| [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html) | Referenced projects, declaration outputs, and source redirects need explicit handling |
| [TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html) | Configuration, package metadata, declarations, and workspace links affect resolution |
| [Git diff](https://git-scm.com/docs/git-diff) | Endpoint versus merge-base semantics; external diff/textconv behavior |
| [CodeQL JavaScript call graph](https://codeql.github.com/docs/codeql-language-guides/codeql-library-for-javascript/#call-graph) | Static call analysis can be incomplete or imprecise |
| [Node.js releases](https://nodejs.org/en/about/previous-releases) | Node 18/20 are EOL as of 2026-09-06; planned maintained targets are 22/24 |
| [SCIP repository](https://github.com/scip-code/scip) | Future index-provider direction only; no adapter or indexer is included |
| [Agent Code Slice](https://github.com/yapweijun1996/AI-Agent-Tool-Code-Slice) | Complementary location-to-code workflow; integration remains unverified |

The original proposal is summarized and corrected in this documentation set.
Local attachment paths are deliberately not repository dependencies; the documents
must remain understandable when cloned onto another machine.

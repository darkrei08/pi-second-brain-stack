# 01: Add a provider-neutral citation resolver

Type: implementation
Status: open
Blocked by: None

## Question

Can retrieved segments be validated and mapped into answer-ready evidence blocks without introducing a database query, external provider, private corpus path, or live LLM?

## Acceptance criteria

- [x] `resolveCitations(results, options)` is a public pure function.
- [x] Exact text and source/segment hashes are validated before output.
- [x] Owner, active retention, document/segment IDs, citation ref, and character span are validated.
- [x] Citation labels, lineage, location, and confidence are validated and preserved.
- [x] Low-confidence results are rejected using `min_confidence`.
- [x] Tombstone, purged, cross-owner, malformed, and mismatched results fail closed.
- [x] A batch never returns partial output after one invalid result.
- [x] Synthetic public tests cover valid evidence and every named rejection case.
- [x] Existing repository tests remain green.
- [x] No database, network, LLM, dependency, schema, private data, or credential is added.

Verification: implementation is on the current branch; focused and full suites, pgvector integration, Debian/Alpine container checks, package dry-runs, syntax, privacy, Compose, and diff checks pass.

## Non-goals

Fresh database reads, URL resolution, document rendering, model lifecycle, graph extraction, parser benchmarking, ANN indexing, gateway routes, authentication, and live answer generation.

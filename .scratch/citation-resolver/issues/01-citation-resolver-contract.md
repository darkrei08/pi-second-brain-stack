# 01: Add a provider-neutral citation resolver

Type: implementation
Status: open
Blocked by: None

## Question

Can retrieved segments be validated and mapped into answer-ready evidence blocks without introducing a database query, external provider, private corpus path, or live LLM?

## Acceptance criteria

- [ ] `resolveCitations(results, options)` is a public pure function.
- [ ] Exact text and source/segment hashes are validated before output.
- [ ] Owner, active retention, document/segment IDs, citation ref, and character span are validated.
- [ ] Citation labels, lineage, location, and confidence are validated and preserved.
- [ ] Low-confidence results are rejected using `min_confidence`.
- [ ] Tombstone, purged, cross-owner, malformed, and mismatched results fail closed.
- [ ] A batch never returns partial output after one invalid result.
- [ ] Synthetic public tests cover valid evidence and every named rejection case.
- [ ] Existing repository tests remain green.
- [ ] No database, network, LLM, dependency, schema, private data, or credential is added.

## Non-goals

Fresh database reads, URL resolution, document rendering, model lifecycle, graph extraction, parser benchmarking, ANN indexing, gateway routes, authentication, and live answer generation.

# 01: Revalidate citation freshness against PostgreSQL

Type: implementation
Status: open
Blocked by: None

## Question

Can the storage adapter confirm that prompt-ready citation evidence still belongs to the requested owner, remains active, and has unchanged source/segment hashes immediately before answer consumption?

## Acceptance criteria

- [ ] `storage.revalidateCitations(citations, { owner_id })` is public and returns `{ valid, stale_ids }`.
- [ ] Valid citations pass in one bounded parameterized query.
- [ ] Malformed, duplicate, oversized, wrong-owner, and invalid-hash input fails before database contact.
- [ ] Tombstone, purged, missing, deleted, re-ingested, and hash-mutated citations are stale rather than exceptions.
- [ ] Stale IDs preserve input order.
- [ ] Lexical search enforces opaque owner IDs and limit `1..100`.
- [ ] Existing segmentation, parser, persistence, lexical, semantic, hybrid, and citation tests remain green.
- [ ] No schema, dependency, provider, LLM, private corpus, credential, or model cache is added.

## Non-goals

Model lifecycle, graph schema/extraction, parser benchmarking, ANN/sidecars, URL generation, gateway/authentication, and live answer generation.

# 01: Revalidate citation freshness against PostgreSQL

Type: implementation
Status: resolved
Blocked by: None

## Question

Can the storage adapter confirm that prompt-ready citation evidence still belongs to the requested owner, remains active, and has unchanged source/segment hashes immediately before answer consumption?

## Acceptance criteria

- [x] `storage.revalidateCitations(citations, { owner_id })` is public and returns `{ valid, stale_ids }`.
- [x] Valid citations pass in one bounded parameterized query.
- [x] Malformed, duplicate, oversized, wrong-owner, and invalid-hash input fails before database contact.
- [x] Tombstone, purged, missing, deleted, re-ingested, and hash-mutated citations are stale rather than exceptions.
- [x] Stale IDs preserve input order.
- [x] Lexical search enforces opaque owner IDs and limit `1..100`.
- [x] Existing segmentation, parser, persistence, lexical, semantic, hybrid, and citation tests remain green.
- [x] No schema, dependency, provider, LLM, private corpus, credential, or model cache is added.

## Answer

Implemented citation revalidation and lexical validation, then addressed review findings by deduplicating stale SQL results, joining documents by requested identity with explicit missing-segment handling, documenting the public seam, and adding mixed-order and lexical limit-boundary coverage.

Verification: `npm test` passed 17/17 with 8 expected integration skips; live pgvector/pg17 PostgreSQL integration passed 10/10 in a `node:22.23.3-bookworm` container with `TEST_DATABASE_URL`; Debian and Alpine Node 22 unit/package checks passed; syntax, Compose config, package dry-run, privacy, and `git diff --check` passed.

## Non-goals

Model lifecycle, graph schema/extraction, parser benchmarking, ANN/sidecars, URL generation, gateway/authentication, and live answer generation.

# Research: database freshness and citation revalidation

## Decision

Implement `storage.revalidateCitations(citations, { owner_id })` as a bounded, parameterized PostgreSQL revalidation over the existing `documents` and `segments` tables. Harden lexical search input parity in the same work unit.

## Repository evidence

- `src/citation-resolver.js` returns evidence blocks containing `document_id`, `segment_id`, `citation.source_hash`, and `citation.segment_hash`.
- `src/postgres-store.js` already has `requireOpaqueId`, document owner/retention predicates, and parameterized SQL for search and persistence.
- `docker/postgres/init/002-schema.sql` stores `documents.owner_id`, `documents.retention_state`, `documents.source_hash`, `segments.document_id`, `segments.id`, and `segments.text_sha256`.
- `docs/private-runtime.md` requires retention-aware deletion and provenance preservation across derived records.
- `docs/retrieval-and-graph.md` requires citation validation before an answer is returned.

## Revalidation query contract

The implementation should serialize only validated citation identity/hash fields into one JSONB parameter or equivalent bounded parameter set. The query joins requested `(document_id, segment_id, source_hash, segment_hash)` values to `segments` and `documents`, scopes by the requested owner, and marks a citation stale when any required row or predicate is absent.

The `sha256:` prefix is part of the public evidence contract; PostgreSQL stores the raw segment hash in `segments.text_sha256`, so comparison must remove only that validated prefix. No string interpolation or dynamic SQL is needed.

## Result semantics

- `valid: true, stale_ids: []` means every citation is still backed by the requested owner's active document and unchanged hashes.
- `valid: false, stale_ids: [...]` means callers must discard the stale evidence and retrieve again.
- Retention transitions, missing rows, owner mismatch, document re-ingestion, and segment replacement are stale outcomes rather than exceptions.
- Malformed inputs are programmer/user boundary errors and must reject before database contact.

## Lexical parity hardening

`searchSegmentsSemantic` already enforces an opaque owner ID and limit `1..100` through `validateQueryEmbedding`. `searchSegmentsLexical` currently accepts any non-empty owner text and any positive limit; the next slice should make it use `requireOpaqueId` and the same upper bound. Existing valid lexical behavior must remain unchanged.

## Rejected alternatives

- **Re-querying the full document:** returns more data than needed and expands the trust boundary.
- **Per-citation queries:** creates an avoidable N+1 race and latency surface.
- **Database triggers or new freshness columns:** schema changes are unnecessary because existing hashes and retention state suffice.
- **LLM or external citation judge:** non-deterministic and outside the storage integrity boundary.
- **Model registry/graph/ANN:** independent larger Wayfinders with unresolved lifecycle or workload dependencies.

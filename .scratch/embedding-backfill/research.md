# Research: embedding backfill planning

## Decision

Add one read-only storage seam that lists the documents still missing correct embeddings for a registered model, together with the complete segment set each document needs. Do not add a job table, a claim protocol, a worker runtime, a provider client, or vector/text exposure.

## Repository evidence

- `docker/postgres/init/003-segment-embeddings.sql`: `segment_embeddings` is keyed by `(segment_id, model_id)` with `ON DELETE CASCADE` from `segments`, so rows cannot outlive their segment.
- `src/postgres-store.js` `saveSegmentEmbeddings` is document-scoped: it verifies ownership and activity, requires every supplied segment to belong to the document, deletes rows of that document and model that are not in the supplied set, then upserts. A worker that wrote only the missing subset would delete still-valid rows.
- `src/postgres-store.js` `inspectEmbeddingCoverage` already classifies active segments as embedded, missing, or dimension-mismatched for one owner and model, but returns aggregate counts only.
- `src/postgres-store.js` `registerEmbeddingModel` makes dimensions immutable per model, so the plan can carry the authoritative dimension for vector construction.
- `.scratch/model-registry-lifecycle/spec.md` defers provider integration, workers, routing, stale-worker generations, pruning, and ANN. This slice keeps all of them deferred.
- `docs/retrieval-and-graph.md` states that partial coverage with lexical fallback is the selected policy; the policy is only usable if the missing coverage is enumerable.

## Rejected alternatives

- Job/claim table with lease and generation fencing: the work list is derivable from existing rows, so a second source of truth would add stale-lease handling, retry bookkeeping, and a schema migration for no additional correctness.
- Per-segment cursor pagination: segment rows disappear or change on re-ingestion, and `saveSegmentEmbeddings` needs the whole document anyway, so document-level derived planning is both simpler and safer.
- Returning segment text or vectors to the worker: unnecessary for embedding calls and a privacy regression.
- Reusing `searchSegmentsSemantic` or hybrid paths to infer coverage: they are query-shaped, capped, and would confuse retrieval ranking with maintenance work.

## Compatibility notes

- No schema migration: the plan reads `documents`, `segments`, `segment_embeddings`, and `embedding_models`.
- No new dependency, provider, credential, or container.
- Existing storage seams and their contracts are unchanged; the new method is additive.

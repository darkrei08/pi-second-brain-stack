# Wayfinder: embedding backfill planning

## Destination

Turn the completed model registry and coverage inspection into an executable loop: an external, provider-neutral embedding worker must be able to discover which documents still need embeddings for a registered model, and which segment IDs it has to write, without reading vectors or source text.

## Dependency position

Completed prerequisites:

1. deterministic segmentation and hashes;
2. parser-neutral page/layout provenance;
3. owner-scoped transactional PostgreSQL persistence;
4. exact model-aware semantic retrieval;
5. deterministic hybrid retrieval;
6. pure citation resolution;
7. storage-backed citation freshness revalidation;
8. global embedding-model registry and owner-scoped coverage inspection.

This slice sits between coverage inspection and any provider or worker runtime: it makes partial coverage actionable while keeping the provider boundary, scheduling, active-model routing, and pruning out of the public contract.

## Public seam

```js
storage.listEmbeddingBackfill({ model_id, owner_id, limit = 20 })
```

The exact contract is defined in `spec.md`. The result is a read-only, owner-scoped, deterministic plan of documents that are not fully embedded for the requested model, with the complete segment set each document needs.

## Decisions so far

- D1: The plan is derived state, not a queue. There is no job table, no claim protocol, and no worker generation counter, because the missing work is already computable from segment and embedding rows. After a worker writes embeddings, those documents leave the next plan by themselves.
- D2: The unit of work is a document, not a segment, because `saveSegmentEmbeddings` replaces the whole `(document, model)` embedding set: a partial per-segment write would delete embeddings that are still valid.
- D3: The plan exposes only registry metadata and opaque identifiers. No text, no vectors, no paths, no provider metadata.
- D4: A complete rewrite of a registered model's document set with the registered dimensions is the repair path for legacy rows that carry a stale dimension, so the queue cannot block on a mismatch. Partial writes and unregistered models keep the previous fail-closed guard.

## Safety boundary

- Read-only; no mutation of documents, segments, embeddings, or registry rows.
- Owner-scoped and limited to active retention, consistent with coverage inspection and retrieval.
- Unregistered models fail closed, so a worker never embeds against undeclared dimensions.
- Provider calls, scheduling, retries, stale-worker protection, active-model routing, rollback/decommission TTL, pruning, and ANN indexing remain out of scope.

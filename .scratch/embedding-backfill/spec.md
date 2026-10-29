# Spec: embedding backfill planning

## Problem statement

Coverage inspection reports counts, so an external embedding worker cannot tell which documents to process next, and `saveSegmentEmbeddings` replaces the whole `(document, model)` set, so a partial per-segment write would delete still-valid embeddings. The missing piece is a read-only, owner-scoped plan of documents that need embedding work and of the exact segment set each document must supply.

## Public seam

Add one method to the object returned by `createStorage`:

```js
storage.listEmbeddingBackfill({ model_id, owner_id, limit = 20 })
```

Returns:

```js
{
  model_id,
  owner_id,
  status,
  dimensions,
  documents: [
    {
      document_id,
      segment_ids,
      missing_segment_ids,
      dimension_mismatch_segment_ids
    }
  ]
}
```

## Invariants

- `model_id` and `owner_id` are opaque IDs; `limit` is an integer from 1 through 100 and defaults to 20.
- The model must be registered. An unknown model fails closed with `embedding model is not registered`, before returning any document.
- Registry metadata is reported as stored: `status` and `dimensions` come from the registry row, never from embedding rows.
- Only segments belonging to active documents owned by the requested owner are considered.
- A document is listed only when at least one of its segments has no row for the requested model, or has a row whose stored `dimensions` differ from the registry `dimensions`.
- `segment_ids` is the complete segment set of that document ordered by `segment_index` then segment ID ascending.
- `missing_segment_ids` and `dimension_mismatch_segment_ids` are ordered subsets of `segment_ids`; together they are non-empty for every listed document.
- Documents are ordered by `document_id` ascending and capped by `limit`.
- The plan is read-only: it never inserts, updates, or deletes documents, segments, embeddings, or registry rows.
- The plan is a snapshot. If a document is re-ingested between the plan and the write, the write either fails closed or the unembedded segment reappears in the next plan.
- The plan is derived state, not a queue: after a worker writes correct embeddings, the affected documents no longer appear on the next call. There is no cursor, lease, job table, or generation counter.
- Writing the complete segment set of a document for a registered model with the registered dimensions replaces stale rows, so a `dimension_mismatch_segment_ids` entry is repairable and rows belonging to other owners never block the write. A partial write, or any write whose dimensions differ from a row it does not replace, still fails closed with `model dimensions are inconsistent with existing embeddings`; unregistered models keep that legacy guard.
- The result contains no segment text, no vectors, no file paths, and no provider metadata.
- Existing segmentation, parser, persistence, lexical, semantic, hybrid, citation, freshness, registry, and coverage behavior remains unchanged.
- No provider, worker runtime, scheduler, credential, ANN index, schema migration, or model cache is added.

## Acceptance criteria

- [ ] malformed or out-of-range inputs fail before database access, and an unregistered model fails closed at the registry lookup;
- [ ] documents with missing embeddings are listed with the complete ordered segment set;
- [ ] documents with dimension-mismatched embeddings are listed and classified as mismatched, not missing;
- [ ] documents owned by another owner or outside active retention are never listed;
- [ ] documents whose embeddings are correct for the requested model are not listed;
- [ ] after `saveSegmentEmbeddings` writes the complete set, the document disappears from the next plan;
- [ ] a dimension-mismatched document is repairable by a complete rewrite with the registered dimensions, even while another owner keeps stale rows for the same model;
- [ ] a partial write whose dimensions conflict with an existing row of the same model still fails closed;
- [ ] plans are deterministic across repeated calls and respect `limit` with `document_id` ordering;
- [ ] deprecated models remain plannable and report their registered status;
- [ ] the plan never mutates storage and returns no text or vectors;
- [ ] existing public and integration tests remain green.

## Deferred

Provider clients, embedding generation, worker runtime and scheduling, retries, leases, stale-worker generations, active-model routing, lexical fallback orchestration, rollback/decommission TTL, vector pruning, and ANN indexes.

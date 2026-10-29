# Spec: provider-neutral embedding backfill execution

## Problem statement

`listEmbeddingBackfill` describes the work but nothing executes it. A caller that wants to fill coverage today has to re-implement the same loop: read a plan page, fetch the document text, call an embedder, and write the complete segment set while handling stale plans. That loop is small but easy to get wrong in exactly the place where wrong means silent data loss.

## Public seam

```js
runEmbeddingBackfill({ storage, embed, model_id, owner_id, limit = 20 })
```

`storage` must expose `listEmbeddingBackfill`, `getDocumentWithSegments`, and `saveSegmentEmbeddings`. `embed` is a caller-supplied function:

```js
await embed({ model_id, dimensions, inputs }) // -> array of vectors, one per input
```

Returns:

```js
{
  model_id,
  owner_id,
  dimensions,
  processed_documents,
  embedded_segments,
  skipped_documents: [{ document_id, reason }]
}
```

## Invariants

- Exactly one plan page is processed per call: `storage.listEmbeddingBackfill({ model_id, owner_id, limit })`. The caller repeats the call; an empty plan returns zeros.
- `model_id` and `owner_id` are passed through unchanged; this module adds no scoping of its own.
- For each planned document, `storage.getDocumentWithSegments(document_id, owner_id)` supplies text, `created_at`, and the current segment list. A document that is no longer readable is skipped with reason `document is not readable`.
- A document whose current ordered segment IDs differ from the plan's `segment_ids` is skipped with reason `document changed since the plan`; a document no longer in active retention is skipped with reason `document is not active`. Neither is ever partially written, and the next call plans them from fresh state.
- `embed` is called once per processed document with the ordered segment texts as `inputs`, plus the registry `model_id` and `dimensions` from the plan.
- `embed` must return one vector per input; any other shape fails closed with `embed must return one vector per input segment` before that document is written.
- Writes go through `storage.saveSegmentEmbeddings` with the complete segment set and the document's stored `created_at`. Dimension, membership, and ownership validation stay in the storage adapter.
- A failure from `embed` or from the storage write propagates to the caller. Documents completed earlier stay committed; the next call resumes from fresh derived state.
- The module reads no clock, performs no network access, logs nothing, and returns no segment text.
- The returned counters are exact: `processed_documents` counts successful writes, `embedded_segments` counts written embeddings, and `skipped_documents` preserves plan order.
- No provider, credential, scheduler, daemon, schema migration, dependency, or ANN index is added.

## Acceptance criteria

- [ ] malformed inputs and a storage object missing a required seam fail closed before any database access;
- [ ] a planned document is embedded and written with its complete segment set and the stored `created_at`;
- [ ] an empty plan returns zero counters and never calls `embed`;
- [ ] a document that changed since the plan, or left active retention, is skipped with a reason and never written;
- [ ] an embedder that returns the wrong number of vectors fails closed and writes nothing;
- [ ] an embedder failure propagates while earlier documents stay committed;
- [ ] skipped documents are reported in plan order;
- [ ] after a full run, coverage inspection reports no missing or mismatched segments for that owner and model, and a second run processes nothing;
- [ ] existing segmentation, parser, persistence, lexical, semantic, hybrid, citation, freshness, registry, coverage, and planning tests remain green.

## Deferred

Provider clients and credentials, scheduling and retries, leases and stale-worker generations, active-model routing, lexical fallback orchestration, rollback/decommission TTL, vector pruning, ANN indexing, metrics and tracing.

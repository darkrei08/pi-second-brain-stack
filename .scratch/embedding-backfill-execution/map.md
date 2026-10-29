# Wayfinder: provider-neutral embedding backfill execution

## Destination

Make the backfill plan executable without choosing an embedding provider, a scheduler, or a credential path: one bounded function that takes the storage adapter plus an injected embedding function, and turns planned documents into stored embeddings.

## Dependency position

Completed prerequisites:

1. deterministic segmentation and hashes;
2. parser-neutral page/layout provenance;
3. owner-scoped transactional PostgreSQL persistence;
4. exact model-aware semantic retrieval;
5. deterministic hybrid retrieval;
6. pure citation resolution;
7. storage-backed citation freshness revalidation;
8. global embedding-model registry and owner-scoped coverage inspection;
9. owner-scoped backfill planning with a repair path for stale dimension rows.

This slice is the caller side of step 9: it executes the plan, still without a provider client, network access, credentials, scheduling, or background runtime.

## Public seam

```js
runEmbeddingBackfill({ storage, embed, model_id, owner_id, limit = 20 })
```

The exact contract is defined in `spec.md`. `embed` is supplied by the caller, so provider selection stays outside the repository boundary.

## Decisions so far

- D1: The embedder is injected as `embed({ model_id, dimensions, inputs })`, so this slice adds no provider, endpoint, credential, or HTTP dependency.
- D2: One call processes at most one plan page (`limit` documents) and returns counters. The caller repeats the call; the plan is derived state, so there is no scheduler, lease, retry queue, or generation counter here.
- D3: A planned document whose current segment set differs from the plan is skipped and reported, never partially written; the next call plans it again from fresh state.
- D4: Segment text is read through the existing owner-scoped `getDocumentWithSegments` seam and passed only to the injected embedder; nothing is logged and no text is added to the returned counters.

## Safety boundary

- No network, provider SDK, credential, scheduler, daemon, or schema change.
- Owner scoping and active retention come from the storage seams, not from this module.
- Validation stays in the storage adapter: dimension, segment membership, and ownership checks are unchanged.
- Rollback/decommission TTL, pruning, active-model routing, lexical fallback orchestration, and ANN indexing remain out of scope.

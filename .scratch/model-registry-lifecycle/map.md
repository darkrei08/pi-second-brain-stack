# Wayfinder: model registry and partial-cutover lifecycle

## Destination

Define the provider-neutral model registry and coverage inspection boundary needed to manage multiple embedding models without selecting a provider, worker runtime, or production dimension. The selected policy is global models with partial cutover and lexical fallback.

## Dependency position

Completed prerequisites:

1. deterministic segmentation and hashes;
2. parser-neutral page/layout provenance;
3. owner-scoped transactional PostgreSQL persistence;
4. exact model-aware semantic retrieval;
5. deterministic hybrid retrieval;
6. pure citation resolution;
7. storage-backed citation freshness revalidation.

This Wayfinder is the smallest next model-lifecycle slice. It must establish metadata and drift inspection before re-embedding execution, active-model cutover, ANN indexing, or provider integration.

## Public seams

Add provider-neutral storage seams for:

```js
storage.registerEmbeddingModel(model)
storage.getEmbeddingModel(model_id)
storage.listEmbeddingModels()
storage.inspectEmbeddingCoverage({ model_id, owner_id })
```

The exact input and output contracts are defined in `spec.md`. Coverage inspection is read-only and reports missing, stale, and dimension-incompatible embeddings without mutating documents or vectors.

## Policy decision

The user selected: "Modelli globali, fallback parziale".

- Model metadata is global and shared across owners.
- A model may be active while coverage is incomplete.
- Retrieval callers can fall back to lexical search when semantic coverage is incomplete.
- This slice does not choose an embedding provider, run a worker, or change active retrieval routing.

## Safety boundary

- Registry rows are metadata only; no provider credentials, model weights, corpus, or generated embeddings are added.
- Model dimensions are immutable after registration.
- Coverage inspection is owner-scoped and read-only.
- Deleting or re-ingesting documents remains governed by existing retention and cascade behavior.
- Re-embedding, stale-worker protection, rollback/deprecation, pruning, and active-model routing remain separate follow-up slices unless the spec proves they are required for the read-only contract.

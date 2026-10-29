# Spec: model registry and embedding coverage inspection

## Problem statement

The storage adapter accepts opaque `model_id` and vector dimensions, but it has no registry for shared model metadata and no owner-scoped way to inspect partial embedding coverage before a future semantic cutover. The selected policy is global models with partial coverage and lexical fallback.

## Public seams

Add methods to the object returned by `createStorage`:

```js
storage.registerEmbeddingModel({ model_id, dimensions, status = 'active' })
storage.getEmbeddingModel(model_id)
storage.listEmbeddingModels()
storage.inspectEmbeddingCoverage({ model_id, owner_id })
```

`registerEmbeddingModel` returns the stored registry record. `getEmbeddingModel` returns one record or `null`. `listEmbeddingModels` returns deterministic records ordered by `model_id`. `inspectEmbeddingCoverage` returns:

```js
{
  model_id,
  owner_id,
  status,
  dimensions,
  total_segments,
  embedded_segments,
  missing_segments,
  dimension_mismatch_segments
}
```

## Invariants

- `model_id` and `owner_id` are opaque IDs.
- `dimensions` is an integer from 1 through 16000.
- Registry status is exactly `active` or `deprecated`.
- A model ID can be registered once. Re-registering identical metadata is idempotent; dimensions are immutable, and status may transition only from `active` to `deprecated`. Deprecated models cannot be reactivated.
- Registry metadata is global and contains no owner, vector, source text, credential, or provider endpoint.
- Coverage counts only segments belonging to active documents owned by the requested owner.
- `embedded_segments` counts rows for the requested model with the registered dimension; `missing_segments` counts active segments without a matching embedding; `dimension_mismatch_segments` counts rows whose stored dimension differs from the registry dimension.
- Coverage inspection is read-only, deterministic, and does not return vectors or text.
- Malformed inputs fail before database access where the existing adapter can validate them locally.
- Existing semantic, hybrid, citation, freshness, persistence, and lexical behavior remains unchanged.
- No embedding provider, worker runtime, active routing, ANN index, schema migration beyond the registry table, private corpus, credentials, or model cache is added.

## Acceptance criteria

- [x] registry metadata table is created without altering existing vector rows;
- [x] valid model registration persists globally and identical re-registration is idempotent;
- [x] malformed model IDs, owner IDs, dimensions, statuses, and conflicting re-registration fail closed;
- [x] `getEmbeddingModel` and deterministic `listEmbeddingModels` expose metadata only;
- [x] coverage inspection is owner-scoped and reports total, embedded, missing, and dimension-mismatch counts;
- [x] partial coverage is represented without rejecting the model or mutating vectors;
- [x] deprecated models remain inspectable but are not silently reactivated;
- [x] no vectors or source text are returned by registry/coverage seams;
- [x] existing public and integration tests remain green;
- [x] no provider, credential, private corpus, worker, ANN index, or model cache is introduced.

## Deferred

Provider integration, embedding generation jobs, stale-worker generations, active-model routing, lexical fallback orchestration, rollback/decommission TTL, vector pruning, ANN indexes, and production dimension selection.

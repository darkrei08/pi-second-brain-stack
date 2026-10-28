# Spec: provider-neutral hybrid retrieval

## Problem statement

The repository can retrieve lexical matches and semantic matches independently, but it cannot yet return one deterministic ranked result set that covers both exact legal identifiers and semantic paraphrases.

## Public seam

Add `searchSegmentsHybrid({ query, query_embedding, model_id, owner_id, limit = 20, rrf_k = 60 })` to the object returned by `createStorage`.

The method returns the existing segment fields and provenance fields, plus:

```js
{
  hybrid_score: number,
  lexical_rank: number | null,
  semantic_rank: number | null
}
```

`createStorage` remains exported from `src/index.js`; no new standalone export is required.

## Invariants

- `query` is non-empty text.
- `owner_id` and `model_id` are opaque IDs.
- `query_embedding` is finite, non-zero, and has a valid dimension.
- `limit` is an integer from 1 through 100.
- `rrf_k` is a positive integer bounded to a safe finite range.
- Both candidate searches are owner-scoped and active-retention scoped.
- Semantic candidates are restricted to the requested model and query dimension.
- No candidate outside the requested owner or active retention state can enter the fused result.
- A result's provenance, source hash, citation reference, text, and segment identity come from the stored segment result.
- The result is deterministic for identical stored state and inputs.
- At most `limit` candidates are fetched from each list and at most `limit` fused results are returned.
- No schema, dependency, provider, credential, model cache, or ANN index is added.

## Acceptance criteria

- [x] lexical-only candidates are returned with `semantic_rank: null`;
- [x] semantic-only candidates are returned with `lexical_rank: null`;
- [x] overlapping candidates receive both RRF contributions;
- [x] the RRF score and ranks are deterministic across repeated calls;
- [x] equal fused scores use document ID, segment index, and segment ID tie-breaks;
- [x] owner isolation excludes another owner's lexical and semantic candidates;
- [x] tombstone and purged documents are excluded;
- [x] model ID and query dimension isolate semantic candidates;
- [x] malformed inputs fail before database contact;
- [x] provenance citation references and source hashes are preserved;
- [x] existing segmentation, parser-normalization, persistence, lexical, and semantic tests remain green;
- [x] the implementation uses the existing storage seam and does not add a standalone public export.

## Deferred

Production embedding/provider selection, model registry, re-embedding jobs, ANN indexes, learned ranking, graph expansion, citation resolution, parser benchmarking, and external RAG sidecars.

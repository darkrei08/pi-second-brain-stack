# Wayfinder: provider-neutral hybrid retrieval

## Destination

Combine the existing owner-scoped PostgreSQL lexical search and exact pgvector semantic search into one deterministic retrieval seam without selecting a production embedding provider, changing the database schema, or adding a second search service.

## Dependency position

Completed prerequisites:

1. deterministic text segmentation;
2. parser-neutral page/layout provenance normalization;
3. transactional PostgreSQL document/segment persistence;
4. owner-safe lexical search and retention filtering;
5. exact model-aware pgvector semantic search;
6. market comparison of prebuilt RAG platforms.

This Wayfinder is the next smallest slice because both retrieval primitives already exist and are integration-tested.

## Public seam

The public storage client gains:

```js
storage.searchSegmentsHybrid({
  query,
  query_embedding,
  model_id,
  owner_id,
  limit,
  rrf_k
})
```

`createStorage` remains the public export. No standalone function is exported from `src/index.js` because the existing public seam is the storage object returned by `createStorage`.

## Decisions

- Use Reciprocal Rank Fusion (RRF), with `1 / (rrf_k + 1-based rank)` per contributing list.
- Retrieve at most `limit` candidates from each existing search path and return at most `limit` fused results.
- Preserve the existing owner, active-retention, model, and vector-dimension filters by delegating to the existing validated search paths.
- Break equal fused scores by `document_id`, `segment_index`, then segment ID.
- Return the existing segment/provenance fields plus `hybrid_score`, `lexical_rank`, and `semantic_rank`.
- Reject malformed input before either database query.
- Keep the implementation provider-neutral and schema-free.

## Deferred

- production model/provider selection;
- model registry and re-embedding lifecycle;
- ANN indexes and query tuning;
- learned rankers, cross-encoders, or external rerankers;
- graph expansion and citation resolver APIs;
- Qdrant, OpenSearch, R2R, RAGFlow, or other sidecar adoption.

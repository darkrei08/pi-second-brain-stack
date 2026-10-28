# Research: provider-neutral hybrid retrieval

## Decision

Implement hybrid lexical/vector retrieval next using Reciprocal Rank Fusion over the two existing PostgreSQL-backed search methods. Do not add a provider, model registry, ANN index, graph query, or new database service in this slice.

## Repository evidence

- `docs/retrieval-and-graph.md` already defines lexical retrieval for exact identifiers and legal wording, vector retrieval for paraphrases, metadata filters, bounded graph expansion, and citation validation as separate retrieval responsibilities.
- `src/postgres-store.js` already exposes owner-scoped active-document lexical search and model/dimension-scoped exact cosine search.
- `docker/postgres/init/002-schema.sql` stores a generated `tsvector` and owner/retention index.
- `docker/postgres/init/003-segment-embeddings.sql` stores model-aware unbounded `VECTOR` values with cascading segment ownership.
- Existing integration fixtures cover lexical owner/retention isolation, semantic owner/retention/model isolation, deterministic semantic ordering, provenance, and cascade deletion.

## RRF contract

For each candidate list, ranks are one-based. A segment receives:

```text
rrf(segment) = sum(1 / (rrf_k + rank_i))
```

where each `rank_i` comes from the lexical or semantic result list. A segment present in both lists receives both contributions. A segment present in one list receives one contribution.

The final ordering is:

1. `hybrid_score DESC`;
2. `document_id ASC`;
3. `segment_index ASC`;
4. segment ID ASC.

This avoids dependence on floating-point equality or database row order.

## Why hybrid retrieval precedes the other candidates

- It composes already-verified capabilities and needs no schema migration.
- It immediately improves exact identifier retrieval and paraphrase retrieval together.
- It can preserve the current owner/retention/model safety predicates.
- It gives the citation and gateway Wayfinders a stable ranked-result shape.
- It does not require choosing a production embedding model or importing private data.

## Rejected for this slice

- **Model registry:** necessary later for provider lifecycle and re-embedding, but exact semantic search already records model and dimensions and can be used safely first.
- **Citation resolver:** the segment result already carries provenance citation data; stabilize the fused result before adding a separate resolver.
- **Parser benchmark:** useful for RAGFlow/DeepDOC and Docling comparison, but independent of retrieval ranking and should use a separate synthetic benchmark fixture.
- **Sidecar evaluation:** creates deployment and data-mapping complexity before the core retrieval contract is complete.
- **ANN index:** corpus size and query workload remain unmeasured; exact search is the documented baseline.

## Safety constraints

- Both sub-searches must use the requested `owner_id` and active retention state.
- Semantic search must use the requested `model_id` and query dimension.
- A malformed query, owner, model, vector, limit, or `rrf_k` must fail before database contact.
- The returned provenance and citation reference must come from the underlying segment result, never from user input.
- The public repository remains free of P.IVA data, embeddings, credentials, and model caches.

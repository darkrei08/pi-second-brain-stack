# Retrieval and semantic graph

## Baseline: PostgreSQL first

The first private deployment uses PostgreSQL as the system of record:

- `tsvector` and PostgreSQL full-text search for lexical retrieval;
- `pgvector` for embeddings and approximate nearest-neighbor search;
- relational tables for documents, chunks, entities, relationships, citations, jobs, and audit;
- recursive SQL for bounded graph traversal;
- one transaction boundary for metadata, provenance, access policy, and deletion.

This is enough for a single-user P.IVA corpus when the main workflows are document search, entity lookup, source citation, and shallow relationship exploration.

## Hybrid retrieval

The retrieval adapter should combine:

1. lexical ranking for exact names, identifiers, dates, CIGs, invoice numbers and legal wording;
2. vector similarity for semantic matches and paraphrases;
3. metadata filters for document class, year, client, source and retention state;
4. bounded graph expansion for related entities and documents;
5. citation validation before an answer is returned.

The application should keep this behind a retrieval interface. It must be possible to replace pgvector with Qdrant without changing clients or the gateway contract.

The current PostgreSQL storage seam exposes `searchSegmentsHybrid({ query, query_embedding, model_id, owner_id, limit, rrf_k })`. It retrieves at most `limit` candidates from each existing lexical and semantic search path, then applies Reciprocal Rank Fusion using one-based ranks:

```text
rrf(segment) = sum(1 / (rrf_k + rank_i))
```

The fused result is capped at `limit` and ordered by fused score descending, then `document_id`, `segment_index`, and segment ID ascending. The method preserves stored segment provenance and citation references, scopes both searches to the requested owner and active retention state, and scopes semantic candidates to the requested model and vector dimension. Invalid input is rejected before database access. This is a provider-neutral exact baseline; learned reranking, ANN tuning, and external vector services remain deferred until measured workload evidence justifies them.

### Model registry and coverage inspection

The PostgreSQL storage seam exposes `registerEmbeddingModel`, `getEmbeddingModel`, `listEmbeddingModels`, and `inspectEmbeddingCoverage` for provider-neutral model metadata and drift inspection. Registry records are global across owners and contain only an opaque `model_id`, immutable `dimensions`, and explicit `active` or `deprecated` status. Registration is idempotent only for matching metadata; dimensions cannot change, deprecation is one-way, and deprecated models are never silently reactivated.

Coverage is read-only and owner-scoped. It considers only segments in active documents owned by the requested owner: `total_segments` is the active segment count, `embedded_segments` counts requested-model rows whose stored dimension matches the registry, `missing_segments` counts active segments without a requested-model row, and `dimension_mismatch_segments` counts requested-model rows with a different stored dimension. These methods return metadata and counts only, never vectors or source text. Partial coverage is allowed; lexical fallback is the selected policy, but fallback orchestration remains deferred.

Before an answer consumes retrieved text, `resolveCitations(results, { owner_id, min_confidence })` validates each result's active owner, exact text hash, source/segment hashes, opaque IDs, citation reference, normalized location, parser/model lineage, and confidence. It returns only the segment text and a citation envelope; any invalid, stale, cross-owner, tombstone, purged, low-confidence, or mismatched result rejects the complete batch. The resolver is pure and does not query the database, call an LLM, expose filesystem paths, or generate unverified external URLs. Before answer consumption, `storage.revalidateCitations(citations, { owner_id })` checks the evidence against current PostgreSQL state and returns `{ valid, stale_ids }`. Stale IDs preserve input order; missing, deleted, cross-owner, inactive, re-ingested, or hash-mutated records are stale results rather than exceptions.

## Relational graph model

Use explicit provenance and ownership on every derived record:

```text
documents(id, sha256, source_uri, media_type, created_at, retention_state)
chunks(id, document_id, page, region, text, search_vector, embedding)
graph_nodes(id, kind, canonical_key, label, provenance_chunk_id)
graph_edges(id, source_node_id, relation, target_node_id, provenance_chunk_id, confidence)
```

The exact schema is implementation work. The non-negotiable properties are stable identifiers, source links, confidence, timestamps, deletion ownership, and indexes for source/target/relation. A graph edge without provenance is not trusted evidence.

## GraphRAG is a query strategy, not automatically a second database

A GraphRAG pipeline can extract entities and relationships from chunks, build communities, summarize them, embed the results, and use local or global search. Microsoft GraphRAG documents this as a multi-stage indexing and query process.

For this project:

- start with entity/relationship extraction plus bounded local graph expansion;
- add community summaries only when broad cross-document questions justify their indexing cost;
- use global search cautiously because it is resource-intensive and depends on community hierarchy;
- never enable external general knowledge by default for private-document answers;
- retain the original chunk and page citation for every derived entity, edge, and summary.

GraphRAG indexing can be expensive. Start with a synthetic fixture and a small sample of the real corpus before indexing everything.

## When to add Apache AGE

Apache AGE adds openCypher and graph capabilities inside PostgreSQL. It is an evaluation option, not part of the minimum stack.

Adopt AGE only when measured workloads show that relational tables and recursive SQL are materially insufficient, for example:

- deep or highly variable-length traversals are a primary user workflow;
- graph pattern queries become difficult to maintain;
- graph algorithms or graph-native indexing are required;
- graph query latency or resource usage dominates after normal PostgreSQL tuning;
- an independent graph lifecycle is justified.

Before adopting it, record query shapes, graph size, traversal depth, p50/p95 latency, resource use, backup/restore behavior, authorization, and deletion completeness.

## When to add Qdrant

Add Qdrant when the corpus needs independently scaled vector retrieval, image/page multivectors, named vectors, late interaction, or advanced hybrid search that is not worth keeping in PostgreSQL. Until then, PostgreSQL plus pgvector reduces operational boundaries.

## Evidence

- [PostgreSQL full-text search](https://www.postgresql.org/docs/current/textsearch.html)
- [PostgreSQL recursive queries](https://www.postgresql.org/docs/current/queries-with.html)
- [pgvector](https://github.com/pgvector/pgvector)
- [Apache AGE overview](https://age.apache.org/overview/)
- [Microsoft GraphRAG indexing overview](https://github.com/microsoft/graphrag/blob/main/docs/index/overview.md)
- [Microsoft GraphRAG local search](https://github.com/microsoft/graphrag/blob/main/docs/query/local_search.md)
- [Microsoft GraphRAG global search](https://github.com/microsoft/graphrag/blob/main/docs/query/global_search.md)
- [Qdrant vectors](https://qdrant.tech/documentation/manage-data/vectors/)

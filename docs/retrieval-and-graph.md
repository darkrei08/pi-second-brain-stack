# Retrieval and semantic graph

## Baseline: PostgreSQL first

The first private deployment uses PostgreSQL as the system of record:

- `tsvector` and PostgreSQL full-text search for lexical retrieval;
- `pgvector` for embeddings with an exact, model- and dimension-scoped nearest-neighbor scan (ANN indexes are deferred until measured workload evidence justifies them);
- relational tables for documents, segments, entities, relationships, citations, jobs, and audit;
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

### Embedding backfill planning

The storage seam exposes `listEmbeddingBackfill({ model_id, owner_id, limit })` so an external, provider-neutral worker can fill partial coverage. It reports the requested registry metadata plus one entry per active document that is not correctly embedded for that model: the complete ordered `segment_ids` of the document, together with `missing_segment_ids` and `dimension_mismatch_segment_ids` explaining why it was listed. Documents are ordered by `document_id`, capped by `limit` (1-100, default 20), scoped to the owner and to active retention, and an unregistered model fails closed.

The unit of work is a document because `saveSegmentEmbeddings` replaces the whole `(document, model)` embedding set: writing only the missing subset would delete still-valid rows. A complete rewrite of a registered model's document set is also the repair path: when the supplied dimensions match the registry and every segment of the document is supplied, stored rows are replaced even if legacy rows still carry a stale dimension, and rows belonging to other owners cannot block that write. Partial writes keep failing closed against any existing row of the same model with a different dimension. The plan is derived state, not a queue, so there is no job table, lease, cursor, or generation counter; once a worker writes the complete set, those documents leave the next plan. The seam is read-only and never returns text, vectors, paths, or provider metadata. Provider calls, scheduling, retries, stale-worker protection, active-model routing, fallback orchestration, rollback, and pruning remain deferred.

### Backfill execution

`runEmbeddingBackfill({ storage, embed, model_id, owner_id, limit })` executes one plan page and is the caller side of the planning seam. `embed` is supplied by the caller as `({ model_id, dimensions, inputs }) => vectors`, so no provider, endpoint, or credential enters the repository.

It reads each planned document through `getDocumentWithSegments`, embeds the ordered segment texts once, and writes the complete set through `saveSegmentEmbeddings` with the document's stored `created_at`. A document that is no longer readable, outside active retention, or whose current segment set differs from the plan is skipped and reported instead of being partially written, and the next call plans it again from fresh state. A wrong-length embedder result fails closed before that document is written; an embedder or storage failure propagates while earlier documents stay committed. The returned counters are exact and the module reads no clock, logs nothing, and returns no segment text. One call handles one page, so scheduling, retries, and leases stay outside.

### Embedding provider adapter

`createOpenAICompatibleEmbedder({ fetch, base_url, api_key, timeout_ms })` fills that injection point with an OpenAI-compatible `POST <base_url>/embeddings` call, matching the customer-owned endpoint contract in the implementation brief. The transport is injected and defaults to the runtime `fetch`, so no vendor SDK or HTTP dependency is added, and the registry `model_id` is sent verbatim as the provider model name.

Safeguards: a non-loopback `http` base URL is rejected at construction, with or without a key, so corpus text and any credential stay off cleartext links; credential-bearing URLs are refused and query or fragment parts never reach the endpoint; redirects are refused so the request body cannot be forwarded; the bearer header is sent only when a key is configured, and the key must be printable ASCII without spaces or control characters; the request is bounded by `AbortSignal.timeout`, and a transport error code is echoed only when it looks like a code rather than a payload; the response must contain one vector per input, each with exactly the registry dimensions and finite values, and indexed responses must be a permutation of the input order; and every error names the failure without the key, the request, the response body, or document text. Retries, rate limits, request batching, and cost control stay with the caller.

### Retrieval mode and lexical fallback

`describeRetrievalMode(matches, { model_id })` turns the ranks a caller already holds into a named mode. `searchSegmentsHybrid` sets `lexical_rank` and `semantic_rank` per match and `null` for the side that produced no candidate, so the mode is derived from data the query already paid for: `hybrid` when at least one returned match carries semantic evidence, `lexical` otherwise, and `empty` when there are no matches.

The result describes evidence, not coverage. Hybrid fusion caps the output at `limit`, so a semantic candidate can lose the cut to lexical ones; `mode: lexical` therefore means that no semantic evidence survived in these matches, not that the model lacks embeddings. Coverage questions belong to `inspectEmbeddingCoverage`.

Coverage counts stay out of the retrieval path: the coverage aggregate costs roughly 332 ms at 60k segments against 67 ms for one plan page, so a caller that wants to label an answer with coverage numbers calls `inspectEmbeddingCoverage` out of band. A `semantic_rank` that is present but not a positive integer fails closed instead of producing a misleading label.

Before an answer consumes retrieved text, `resolveCitations(results, { owner_id, min_confidence })` validates each result's active owner, exact text hash, source/segment hashes, opaque IDs, citation reference, normalized location, parser/model lineage, and confidence. It returns only the segment text and a citation envelope; any invalid, stale, cross-owner, tombstone, purged, low-confidence, or mismatched result rejects the complete batch. The resolver is pure and does not query the database, call an LLM, expose filesystem paths, or generate unverified external URLs. Before answer consumption, `storage.revalidateCitations(citations, { owner_id })` checks the evidence against current PostgreSQL state and returns `{ valid, stale_ids }`. Stale IDs preserve input order; missing, deleted, cross-owner, inactive, re-ingested, or hash-mutated records are stale results rather than exceptions.

## Relational graph model

Use explicit provenance and ownership on every derived record. The first four tables exist today; the graph tables are the target shape and are not implemented:

```text
documents(document_id, source_hash, source_label, text, lineage, created_at, owner_id, retention_state)
segments(id, document_id, segment_index, text, start_offset, end_offset, text_sha256, metadata, provenance, search_vector)
segment_embeddings(segment_id, model_id, dimensions, embedding, created_at)
embedding_models(model_id, dimensions, status)
graph_nodes(id, kind, canonical_key, label, provenance_segment_id)
graph_edges(id, source_node_id, relation, target_node_id, provenance_segment_id, confidence)
```

The exact graph schema is implementation work. The non-negotiable properties are stable identifiers, source links, confidence, timestamps, deletion ownership, and indexes for source/target/relation. A graph edge without provenance is not trusted evidence.

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

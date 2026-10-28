# Wayfinder: provider-neutral exact semantic search

## Destination

A tested semantic retrieval seam that stores synthetic embeddings per segment/model and performs exact cosine search through PostgreSQL/pgvector without locking the repository to a production model or ANN index.

## Decisions so far

- Use a dedicated `segment_embeddings` table rather than a fixed-dimension column on `segments`.
- Store unbounded `VECTOR` plus explicit `dimensions` and `model_id`.
- Use exact flat cosine search with owner, active-retention, and model pre-filters.
- Validate vectors at the Node trust boundary and use parameterized `$N::vector` SQL.
- Cascade embeddings from document deletion through segments.

## Not yet specified

- Production embedding provider/model and dimension.
- ANN index type, model-specific partial indexes, and query tuning.
- Hybrid lexical/vector ranking and reciprocal-rank fusion.
- Real corpus embedding generation and gateway integration.

## Out of scope

- External provider calls, API keys, model downloads, or real P.IVA embeddings.
- HNSW/IVFFlat, Qdrant, GraphRAG, parser runtimes, HTTP routes, and UI clients.

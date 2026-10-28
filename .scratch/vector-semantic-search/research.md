# Research: provider-neutral exact semantic search

## Decision

The next slice is exact provider-neutral semantic search backed by a dedicated PostgreSQL/pgvector satellite table. Store an unconstrained `vector` with an explicit `model_id` and `dimensions`; do not add HNSW/IVFFlat yet and do not select a live embedding provider.

## Primary evidence

- pgvector documents the unconstrained `vector` type for mixed dimensions and the cosine-distance operator `<=>`: <https://github.com/pgvector/pgvector/blob/master/README.md>.
- pgvector documents exact nearest-neighbor search by ordering on the distance operator before adding approximate indexes: <https://github.com/pgvector/pgvector/blob/master/README.md>.
- pgvector documents that HNSW and IVFFlat indexes require fixed dimensions, while unbounded columns can be indexed later with model-specific expression/partial indexes: <https://github.com/pgvector/pgvector/blob/master/README.md>.
- PostgreSQL partial indexes and relational predicates remain available for later model-specific tuning: <https://www.postgresql.org/docs/current/indexes-partial.html>.

## Finalized contract decisions

- Use `segment_embeddings(segment_id, model_id, dimensions, embedding, created_at)` with a foreign key to `segments(id)` and `ON DELETE CASCADE`.
- `embedding` is unbounded `VECTOR`; `dimensions` is validated and stored explicitly.
- First search is exact cosine distance with `$N::vector` parameter binding and no ANN index.
- Search always joins `segments` to `documents` and filters `owner_id`, `retention_state = 'active'`, and `model_id` before ordering.
- Reject non-finite values, dimension mismatches, zero-norm vectors, invalid model IDs, and excessive limits before database contact.
- The store accepts vectors only; model/provider integration is a later adapter.

## Provisional or deferred

- Production embedding model, provider, dimension, and distance metric beyond cosine.
- HNSW/IVFFlat indexes and tuning, because corpus size and query workload are not measured.
- Qdrant, hybrid lexical/vector fusion, HTTP gateway, real corpus embeddings, and provider credentials.
- Operational vacuum/reindex procedures after large deletion batches.

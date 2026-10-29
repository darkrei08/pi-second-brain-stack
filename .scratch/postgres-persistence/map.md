# Wayfinder: PostgreSQL persistence slice

## Destination

A tested, transaction-safe PostgreSQL adapter that stores the existing deterministic document/segment contract and supports owner-scoped lexical retrieval without exposing the private P.IVA corpus or introducing a second backend.

## Decisions so far

- PostgreSQL is the initial system of record for document metadata, segments, provenance, retention state, and lexical search.
- The adapter consumes `segmentDocument(document, policy)` output and does not modify the pure segmenter.
- Documents and segments are inserted atomically; document deletion cascades to segments and is owner-scoped.
- PostgreSQL full-text search is the first retrieval capability. Embeddings, pgvector columns/indexes, GraphRAG extraction, Qdrant, Apache AGE, parser workers, and HTTP clients remain separate future slices.
- Tests use synthetic fixtures and a loopback PostgreSQL container only.

## Not yet specified

- Parser normalization adapters for PDF, Office, email, image, and signed containers.
- Embedding provider contract, vector dimensions, and ANN index choice.
- Graph entity extraction, relationship confidence, community summaries, and graph query API.
- Gateway authentication, HTTP routes, LibreChat integration, and remote access.
- Backup/restore automation and production deployment topology.

## Out of scope

- Real P.IVA corpus ingestion or repository fixtures.
- Credentials, external model calls, public hosting, or network-exposed services.
- Qdrant, Apache AGE, SeaweedFS, Valkey, native clients, and mobile packaging.

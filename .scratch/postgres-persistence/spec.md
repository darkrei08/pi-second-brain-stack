# Spec: PostgreSQL document and segment persistence

## Problem Statement

The completed deterministic segmenter returns an in-memory, provenance-rich result but there is no durable system-of-record adapter. The next slice must prove storage and lexical retrieval while preserving the public/private boundary and leaving vector and graph concerns behind explicit adapters.

## Solution

Add a dependency-light PostgreSQL adapter that accepts the existing `segmentDocument` result, persists one document header and its ordered segments in a single transaction, supports owner-scoped lexical search, returns provenance needed for citations, and deletes a document with a verified cascade. Use the loopback-only Compose database and synthetic fixtures.

## Public seam

`createStorage({ pool })` returns:

- `saveDocumentAndSegments(document, result)`
- `searchSegmentsLexical({ query, owner_id, limit })`
- `getDocumentWithSegments(document_id, owner_id)`
- `deleteDocument(document_id, owner_id)`

The adapter must use parameterized SQL and must not access the filesystem corpus, network models, or the pure segmenter's internals.

## Invariants

- The document row and every segment row commit together or none commit.
- Segment identity, order, offsets, text hashes, provenance, and retention values are stored exactly as emitted.
- A document can be read or deleted only for its owner.
- Deletion cascades to all child segments.
- Lexical search returns only the requested owner's active document data and includes citation/provenance fields.
- Re-saving the same document is deterministic and does not create duplicate segment rows.
- No real P.IVA data, credentials, raw paths, embeddings, or private artifacts enter the repository.

## Intentionally deferred

- Embedding generation and vector search.
- Graph nodes, edges, extraction, community summaries, and Apache AGE.
- Parser/OCR workers and source-object storage.
- HTTP gateway, authentication, UI clients, queues, and production deployment.

## Verification

- Focused integration tests run against the loopback PostgreSQL service when configured.
- Existing pure unit tests pass without PostgreSQL.
- Compose configuration and repository privacy guard pass.
- Containerized checks are run for the changed runtime/package boundary where available.

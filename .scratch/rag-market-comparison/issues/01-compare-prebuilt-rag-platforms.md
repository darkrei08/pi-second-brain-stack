# 01: Compare prebuilt open-source RAG platforms

Type: research
Status: resolved
Blocked by: None

## Question

Can an existing open-source/self-hosted RAG product replace or materially reduce the custom local-first P.IVA stack without losing parser-neutral provenance, PostgreSQL ownership isolation, model-aware vectors, and a future relational graph projection?

## Acceptance criteria

- [x] At least five candidates are compared using official repository or documentation sources.
- [x] The comparison covers parsing, storage, retrieval, graph support, citations, APIs, access control, and deployment complexity.
- [x] PostgreSQL/pgvector compatibility is distinguished from generic vector-store support.
- [x] Reuse candidates and replacement candidates are separated.
- [x] The current exact semantic search slice is explicitly accepted, rejected, or revised.
- [x] Follow-up Wayfinders are listed with dependency order.
- [x] No private corpus, credentials, embeddings, model cache, or external service state is introduced.

## Outcome

Keep the repository core and exact pgvector seam. Reuse ideas and, if warranted later, run RAGFlow or R2R as synthetic-fixture sidecars. Do not replace the storage and provenance contracts with a whole prebuilt product before benchmark evidence exists.

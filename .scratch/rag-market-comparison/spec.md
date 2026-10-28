# Spec: market comparison of prebuilt open-source RAG platforms

## Problem statement

The repository is implementing a small provider-neutral RAG core, but mature self-hosted products may already provide ingestion, parsing, search, citations, APIs, access control, or an end-user interface. We need evidence before duplicating those capabilities or replacing the current PostgreSQL/pgvector direction.

## Comparison rubric

Each candidate is evaluated against:

- local or air-gapped operation;
- PDF, scan, table, and layout handling;
- lexical, vector, and hybrid retrieval;
- PostgreSQL/pgvector compatibility;
- graph or GraphRAG capability;
- citations and provenance;
- API/SDK and integration surface;
- access control and multi-tenancy;
- deployment and resource cost;
- fit with a custom Node.js + PostgreSQL + relational graph stack.

## Decisions

1. **Do not replace the repository core with a whole product yet.** None of the reviewed products simultaneously preserves the repository's parser-neutral segment contract, opaque provenance/citation contract, owner/retention isolation, PostgreSQL system-of-record policy, and relational graph direction.
2. **Keep the exact semantic PostgreSQL slice.** It is a useful provider-neutral seam and remains compatible with a later model-specific index or a product sidecar.
3. **Treat RAGFlow as the strongest parser/layout reference.** Its DeepDOC pipeline covers OCR, layout, and tables, but its multi-service product boundary is too large to adopt as the storage core without a corpus benchmark and deployment decision.
4. **Treat R2R as the strongest retrieval/API reference.** Its documented hybrid search, citations, GraphRAG, and REST-oriented workflow should inform later retrieval and gateway Wayfinders, not replace the current contracts.
5. **Treat AnythingLLM as the quickest packaged UI benchmark.** Its official pgvector setup proves a possible integration path, but its expected vector-table schema and fixed embedding dimension are not a substitute for the repository's model-aware satellite table.
6. **Treat Onyx as a permissions/connectors benchmark.** Its permission-aware hybrid retrieval is useful for future ACL design, but its standard index is OpenSearch-oriented and its full deployment is materially heavier than the private single-user target.
7. **Treat Dify and Khoj as optional application shells.** They are useful for workflow/UI experiments, but neither is the authoritative storage/provenance layer for this repository.

## Required next Wayfinders

- parser benchmark: compare normalized output against RAGFlow/DeepDOC, Docling, and current synthetic fixtures;
- hybrid retrieval: lexical + vector score fusion with owner/retention/model filters;
- citation contract: compare R2R/RAGFlow citation shapes with the repository's opaque source/segment IDs;
- model registry: embedding model, dimensions, lineage, re-embedding, and index lifecycle;
- optional sidecar evaluation: run one candidate against synthetic fixtures only and compare outputs without importing the P.IVA corpus.

## Non-goals

- No provider credentials, model weights, corpus, embeddings, or database dumps.
- No dependency or deployment change in this comparison ticket.
- No claim that the reviewed products are equivalent in license scope, performance, security posture, or maintenance quality.

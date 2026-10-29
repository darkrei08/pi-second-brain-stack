# Wayfinder: market comparison of prebuilt open-source RAG platforms

## Destination

Compare mature self-hosted/open-source RAG products against the repository's private, local-first Italian P.IVA architecture before replacing any in-progress PostgreSQL/pgvector slice.

## Scope

- AnythingLLM
- Dify
- RAGFlow
- R2R
- Onyx
- Khoj

The comparison is limited to official repositories and official documentation fetched through the reusable-data-search stack. It is an architecture checkpoint, not a benchmark or a production recommendation.

## Current repository baseline

- Public repository: documentation and reference configuration only.
- Private runtime: local-first, loopback-only, single human operator, P.IVA corpus outside Git.
- Current data path: parser-normalized segments -> PostgreSQL system of record -> lexical search -> provider-neutral pgvector satellite table -> relational graph projection.
- Current unfinished slice: exact owner-scoped cosine search with model and dimension metadata, without choosing a production embedding provider or ANN index.

## Decision destination

Decide which products are:

1. candidates for direct reuse as a packaged application,
2. candidates for component-level inspiration or sidecar workers,
3. poor fits for replacing the repository's storage/provenance contracts.

## Out of scope

- Importing a private corpus into any third-party service.
- Installing or running any candidate against P.IVA data.
- Measuring latency, recall, memory, licensing compatibility of transitive dependencies, or parser accuracy.
- Selecting an embedding model, provider, ANN index, or production deployment topology.

## Decisions so far

- Ticket 01 is resolved; the comparison outcome is recorded in `issues/01-compare-prebuilt-rag-platforms.md`.

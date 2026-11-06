# Wayfinder: ANN indexes and external vector sidecars

## Destination

Define when exact model-scoped pgvector search is insufficient, how an ANN candidate is evaluated and accepted, and when an external vector sidecar is justified, without enabling an index or changing current retrieval semantics.

## Dependency position

Completed prerequisites:

1. owner-scoped PostgreSQL persistence and lexical retrieval;
2. exact model- and dimension-scoped pgvector semantic retrieval;
3. deterministic hybrid RRF retrieval;
4. embedding model registry and coverage inspection;
5. provider-neutral embedding backfill and citation freshness checks.

The repository still lacks a representative corpus/workload, target hardware, and owner-approved performance and recall objectives.

## Decision tickets

| Ticket | Question | Status |
|---|---|---|
| [01-exact-trigger](issues/01-exact-trigger.md) | When does exact pgvector search become insufficient? | resolved |
| [02-index-and-recall](issues/02-index-and-recall.md) | Which ANN index and recall target should be accepted? | open |
| [03-sidecar-gate](issues/03-sidecar-gate.md) | When is an external vector sidecar justified over in-database pgvector? | resolved |

## Decisions-so-far

- Exact pgvector remains the default and correctness baseline. ANN evaluation starts only after a representative exact workload misses an owner-approved latency or resource objective after ordinary PostgreSQL tuning. There is no fixed row-count trigger.
- The evaluation must use the same owner, model, dimensions, collection/filter shape, query set, and top-k for exact and ANN paths. Exact results are the ground truth. Record scoped recall@k, p50/p95 latency, resource use, index build/storage cost, and `EXPLAIN (ANALYZE, BUFFERS)` evidence that the intended index is actually used.
- ANN must be an explicit owner- and model-scoped opt-in with exact fallback and a documented rollback. It must not silently replace exact semantic search or change the embedding model/dimension contract.
- The current hybrid seam consumes semantic candidate ranks, so ANN adoption can change hybrid RRF results. This consequence must be included in the acceptance comparison and user-visible mode/observability contract.
- A sidecar is considered only after PostgreSQL exact/ANN tuning and only for measured independent scaling pressure or capabilities such as multivectors, named vectors, late interaction, or advanced hybrid retrieval that the in-database path cannot provide at acceptable operational cost. PostgreSQL remains the source of truth for ownership, provenance, metadata, deletion, and rollback.

## Open decisions

- The owner-approved latency/resource budget and recall floor are not specified.
- The representative query mix, corpus scale, target hardware, concurrency, and filter selectivity are not specified.
- HNSW versus IVFFlat cannot be selected before those measurements. Upstream documentation gives tradeoffs but does not choose for this workload.

## Out of scope

- Enabling HNSW or IVFFlat by default.
- Choosing an embedding model or changing vector dimensions.
- Installing Qdrant or another sidecar.
- Benchmarking against the private P.IVA corpus.
- Changing `src/**`, `test/**`, schema files, Compose files, or shared documentation in this effort.

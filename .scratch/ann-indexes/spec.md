# Spec: measured ANN evaluation without changing the exact baseline

## Problem statement

The repository has exact owner-, model-, dimension-, retention-, and collection-scoped pgvector search plus deterministic hybrid RRF. It does not have the corpus, workload, hardware, or owner-approved objectives needed to enable approximate search safely.

## Ratified policy

- Exact pgvector is the default and the correctness ground truth.
- Evaluate ANN only after a representative exact workload misses an owner-approved latency or resource objective following ordinary PostgreSQL tuning. No fixed row-count trigger is allowed.
- Compare exact and ANN with identical owner, model, dimensions, collection/filter predicates, query set, and top-k. Record recall@k against exact, p50/p95 latency, CPU/memory, index build time, index size, and `EXPLAIN (ANALYZE, BUFFERS)` planner evidence.
- ANN is an explicit owner- and model-scoped opt-in. Exact search remains the rollback path. The embedding model and dimension contract do not change.
- Because hybrid retrieval fuses semantic ranks, the benchmark must compare hybrid output as well as semantic candidates.
- Consider a sidecar only after measured PostgreSQL exact/ANN limits or for measured specialized requirements such as independently scaled retrieval, multivectors, named vectors, late interaction, or advanced hybrid search. Keep PostgreSQL authoritative for ownership, provenance, metadata, deletion, and rollback.

## Unresolved input required before enablement

The implementation cannot choose HNSW versus IVFFlat or a numeric recall target until these are supplied:

- representative versioned synthetic corpus and query mix;
- target hardware and concurrency;
- owner-approved latency/resource budget;
- owner-approved recall@k floor;
- filter selectivity and model/dimension scope.

Upstream pgvector tradeoffs are evidence for the benchmark design, not a project-specific choice.

## Future acceptance criteria

- [ ] Exact baseline results are reproducible for the scoped evaluation set.
- [ ] Candidate planner use is proven, not inferred from index creation.
- [ ] The selected index meets the owner recall floor and performance/resource objective for every required scope.
- [ ] The semantic and hybrid result differences are reviewed and accepted explicitly.
- [ ] Rollback to exact is documented and tested.
- [ ] The index is disabled by default unless the owner-scoped opt-in is configured.
- [ ] A sidecar, if later selected, has a corpus-specific benefit measurement and preserves PostgreSQL authority and rollback.

## Non-goals

Choosing HNSW or IVFFlat now, inventing a recall threshold or row-count trigger, creating an ANN index, changing embedding dimensions/models, installing Qdrant, or modifying runtime code/tests/shared docs.

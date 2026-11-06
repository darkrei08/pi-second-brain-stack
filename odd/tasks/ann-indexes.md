# ANN indexes and external vector sidecars

Ratifies the trigger and decision procedure for issue #19 without enabling an index or sidecar.

## Specs

- S1: "Exact pgvector remains the default and correctness baseline; ANN evaluation starts only after a representative exact workload misses an owner-approved latency or resource objective after ordinary PostgreSQL tuning, with no fixed row-count trigger."
- S2: "ANN candidates are compared with exact results under identical owner, model, dimension, collection/filter, query, and top-k scope using recall@k, p50/p95 latency, resource use, index build/storage cost, and planner evidence."
- S3: "ANN is an explicit owner- and model-scoped opt-in with exact rollback; it must not silently change the embedding model or dimension contract."
- S4: "The benchmark compares hybrid RRF output as well as semantic candidates because approximate semantic ranks can change hybrid results."
- S5: "An external vector sidecar is considered only for measured independent scaling pressure or required vector capabilities that PostgreSQL cannot provide at acceptable operational cost; PostgreSQL remains authoritative for ownership, provenance, metadata, deletion, and rollback."
- S6: "No ANN index, sidecar, model change, dimension change, or runtime code change is made until the missing workload, hardware, budget, and recall evidence is supplied."

## Tasks

| ID | Spec | Route | Status |
|---|---|---|---|
| T1 | S1-S5 | `.scratch/ann-indexes/map.md`, `issues/01-exact-trigger.md`, `issues/02-index-and-recall.md`, `issues/03-sidecar-gate.md` | decision closure |
| T2 | S1-S6 | `.scratch/ann-indexes/spec.md` | deferred implementation contract |

## Log

- L1: Re-verified the existing exact semantic SQL and hybrid RRF seam. Exact search filters owner, active retention, model, dimension, and collection before cosine ordering; hybrid consumes semantic candidate ranks.
- L2: Re-verified repository policy: ANN is deferred until measured workload evidence, and Qdrant is only for demonstrated scaling or specialized vector requirements.
- L3: Ratified the trigger and evaluation procedure without inventing a row-count or recall threshold. HNSW versus IVFFlat remains open because the repository lacks representative workload, target hardware, concurrency, owner-approved latency/resource budget, and recall floor.
- L4: No runtime implementation is authorized in this effort. Parent consolidation must add the pending traceability row to `odd/traceability.md` if desired.

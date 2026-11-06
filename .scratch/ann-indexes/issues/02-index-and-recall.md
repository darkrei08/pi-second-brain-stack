# 02: Choose the ANN index and recall target

Type: decision
Status: open
Blocked by: 01

## Question

Which pgvector ANN index type and project-specific recall target should be accepted for this workload?

## Acceptance criteria

- [ ] A representative, versioned synthetic evaluation corpus and query set exist.
- [ ] Target hardware, concurrency, owner/model/filter shapes, and top-k are recorded.
- [ ] Exact results are captured as the ground truth for each scoped query.
- [ ] HNSW and IVFFlat are compared where both are technically applicable, including planner use, p50/p95 latency, CPU/memory, build time, index size, and filtered-query behavior.
- [ ] The owner supplies a recall@k floor for the affected retrieval mode; no vendor benchmark number substitutes for it.
- [ ] The chosen candidate meets the recall floor and the owner-approved latency/resource objective, with the exact path retained as rollback.
- [ ] Hybrid RRF output is compared because a changed semantic candidate set can change hybrid ranks.

## Missing evidence

The repository does not contain the representative workload, target hardware/concurrency, owner-approved latency/resource budget, or acceptable recall@k floor needed to choose HNSW versus IVFFlat or to accept a numeric recall target. The upstream tradeoffs alone are insufficient.

## Traceability row (pending parent consolidation)

| ANN indexes and external vector sidecars | `.scratch/ann-indexes/map.md`; `.scratch/ann-indexes/spec.md`; `.scratch/ann-indexes/issues/02-index-and-recall.md` | Not implemented | None | Missing representative workload, target hardware, owner-approved budgets, and recall floor | Deferred |

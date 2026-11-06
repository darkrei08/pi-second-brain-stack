# 01: Define the exact-search trigger for ANN evaluation

Type: decision
Status: resolved
Blocked by: None

## Question

When does exact pgvector search become insufficient for this repository?

## Evidence

- `docs/retrieval-and-graph.md` makes exact, model- and dimension-scoped pgvector search the first-deployment baseline and defers ANN until measured workload evidence justifies it.
- `docs/implementation-brief.md` requires corpus-specific measurements and says not to copy vendor benchmark numbers into acceptance criteria.
- The current semantic SQL applies owner, active-retention, model, dimension, and collection predicates before exact cosine ordering.

## Acceptance criteria

- [x] Exact search remains the default and correctness baseline.
- [x] ANN evaluation requires a representative exact workload to miss an owner-approved latency or resource objective.
- [x] Ordinary PostgreSQL tuning is attempted before ANN evaluation.
- [x] No fixed row-count trigger is invented.
- [x] The trigger is evaluated against the actual owner/model/filter workload, not an unscoped global average.

## Answer

Keep exact pgvector as the default. Start ANN evaluation only when a representative exact workload misses an owner-approved latency or resource budget after ordinary PostgreSQL tuning. Do not use a fixed row-count threshold: the repository has no measured corpus scale, hardware profile, concurrency target, or service objective from which to derive one.

The trigger starts an evaluation; it does not authorize enablement. The evaluation must compare exact results with an ANN candidate under the same owner, model, dimension, collection/filter shape, and top-k, and must preserve exact rollback.

## Traceability row (pending parent consolidation)

| ANN indexes and external vector sidecars | `.scratch/ann-indexes/map.md`; `.scratch/ann-indexes/spec.md`; `.scratch/ann-indexes/issues/01-exact-trigger.md` | Not implemented | None | Blocked until representative corpus/workload and owner-approved latency/resource and recall objectives exist | Deferred |

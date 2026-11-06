# 06: Bounded graph retrieval seam

Type: decision
Status: open
Blocked by: Missing graph workload and size evidence

## Question

Which traversal depth, result cap, deduplication, and resource limits should the provider-neutral graph retrieval seam enforce?

## Ratified shape

Expose graph expansion behind the retrieval adapter, use recursive PostgreSQL SQL, scope every query by owner and active retention, and return graph claims with their original segment citations. The seam must fail closed on stale graph assertions and must not return graph-only evidence without a valid citation chain.

## Missing evidence

No graph size, traversal-depth distribution, query mix, p50/p95 latency, or resource profile exists in this repository. The exact numeric bounds and whether a future workload needs AGE cannot be ratified. Do not invent thresholds or add a graph dependency in this effort.

## Traceability row (pending parent consolidation)

| Issue | Decision | Status |
|---|---|---|
| #17 | Recursive SQL and cited graph expansion are the initial shape; numeric bounds remain open pending measured workload evidence | open |

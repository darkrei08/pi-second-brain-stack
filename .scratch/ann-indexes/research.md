# Research: ANN indexes and external vector sidecars

## Re-verified conclusion

The prior read-only lead is supported by the current repository, with one explicit limitation: the repository does not contain enough workload evidence to choose HNSW versus IVFFlat or to invent a recall floor.

- Exact pgvector search remains the correctness baseline and ground truth.
- Evaluate ANN only when a representative exact workload misses an owner-approved latency or resource objective after ordinary PostgreSQL tuning.
- Compare every candidate against exact results for the same owner, model, dimension, collection/filter shape, and top-k. Record scoped recall@k, p50/p95 latency, resource use, index build/storage cost, and the actual planner path. Creating an index without proving that the planner uses it is not evidence.
- ANN changes the semantic candidate set and therefore can change semantic ranks and the existing hybrid RRF result. The switch must be explicit, model- and owner-scoped, and reversible to exact search.
- A sidecar is not justified by an unmeasured row count. It is justified only by measured independent scaling pressure or vector capabilities that the PostgreSQL path cannot provide without disproportionate operational cost.

## Repository evidence

- `docs/retrieval-and-graph.md:5-13` defines PostgreSQL plus exact, model- and dimension-scoped pgvector search as the first-deployment baseline and explicitly defers ANN until measured workload evidence justifies it.
- `docs/retrieval-and-graph.md:25-33` requires the retrieval adapter to keep the client contract provider-neutral and documents the existing hybrid seam.
- `docs/retrieval-and-graph.md:122-135` allows Qdrant for independently scaled vector retrieval, multivectors, named vectors, late interaction, or advanced hybrid search, while keeping PostgreSQL preferred until that need is demonstrated.
- `docs/implementation-brief.md:80-97` says PostgreSQL plus pgvector is sufficient for the first private text/document implementation, requires an adapter, and forbids claiming pgvector/Qdrant performance equivalence without a corpus-specific benchmark.
- `docs/implementation-brief.md:214-221` requires a versioned synthetic evaluation corpus, target-hardware measurements of recall/precision and p50/p95 latency, and no vendor benchmark numbers in acceptance criteria. It also records that corpus size, document mix, hardware, and concurrency are not specified.
- `src/postgres-store.js:770-808` performs exact cosine ordering after owner, active-retention, model, dimension, and collection predicates.
- `src/postgres-store.js:870-929` delegates hybrid retrieval to lexical and semantic candidate lists and fuses their one-based ranks. A changed semantic candidate set can therefore change the hybrid ranking even when lexical data is unchanged.
- `docker/postgres/init/003-segment-embeddings.sql:1-10` has no ANN index; it stores model and dimension metadata needed for model-scoped comparison.
- GitHub issue #19 is open with `ready-for-human`; its missing evidence is exact-scan recall/p50/p95/memory at corpus scale and the choice between pgvector HNSW/IVFFlat and a sidecar.

## Primary upstream evidence

The official pgvector README at <https://github.com/pgvector/pgvector> (retrieved 2026-11-06) states:

- exact nearest-neighbor search provides perfect recall;
- approximate indexes trade some recall for speed and can return different results;
- HNSW generally has a better speed/recall trade-off but slower builds and higher memory use, and needs no training step;
- IVFFlat builds faster and uses less memory but has a lower speed/recall trade-off, requires data before index creation, and depends on lists/probes;
- increasing HNSW `ef_search` or IVFFlat probes improves recall at a speed cost.

Those facts identify the candidate measurements, not a project-specific winner or threshold.

## Decision boundary

Ratify the trigger and evaluation procedure now. Keep the actual index type, owner recall target, and enablement decision open until the owner supplies a representative workload, target hardware, latency/resource objective, and acceptable recall floor. Do not add an index, change embedding dimensions, or install a sidecar in this effort.

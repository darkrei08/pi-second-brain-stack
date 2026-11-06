# 03: Define the external vector sidecar gate

Type: decision
Status: resolved
Blocked by: None

## Question

When is an external vector sidecar justified over in-database pgvector?

## Evidence

- `docs/retrieval-and-graph.md` prefers PostgreSQL plus pgvector until independent scaling or specialized vector capabilities are demonstrated.
- The same document names independently scaled vector retrieval, image/page multivectors, named vectors, late interaction, and advanced hybrid search as possible Qdrant drivers.
- `docs/implementation-brief.md` requires a corpus-specific benchmark before claiming a Qdrant benefit and keeps PostgreSQL as the initial system of record.

## Acceptance criteria

- [x] A sidecar is not introduced merely because a corpus has a guessed row count.
- [x] PostgreSQL exact/ANN tuning is evaluated first for ordinary text-vector retrieval.
- [x] Adoption requires measured independent scaling pressure or a required capability that pgvector cannot provide at acceptable operational cost.
- [x] PostgreSQL remains authoritative for ownership, provenance, metadata, deletion, and recovery.
- [x] Any sidecar path is behind the retrieval adapter, explicitly scoped, and has an exact PostgreSQL rollback.
- [x] No sidecar is installed or enabled by this effort.

## Answer

A sidecar is justified only by measured evidence that PostgreSQL cannot meet the approved workload objective after normal exact/ANN tuning, or by a required vector capability that the in-database path cannot provide without disproportionate operational complexity. Examples supported by the repository contract are independently scaled vector retrieval, image/page multivectors, named vectors, late interaction, and advanced hybrid retrieval.

The sidecar must remain an adapter behind the existing retrieval contract. PostgreSQL remains the source of truth for owner policy, provenance, metadata, deletion, and rollback. No sidecar is justified or enabled by the current repository evidence.

## Traceability row (pending parent consolidation)

| ANN indexes and external vector sidecars | `.scratch/ann-indexes/map.md`; `.scratch/ann-indexes/spec.md`; `.scratch/ann-indexes/issues/03-sidecar-gate.md` | Not implemented | None | Blocked until representative corpus/workload and measured sidecar benefit exist | Deferred |

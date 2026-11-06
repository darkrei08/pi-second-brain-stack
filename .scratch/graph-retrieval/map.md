# Wayfinder: graph retrieval with entity and relationship provenance

## Destination

Design the PostgreSQL-only graph retrieval slice for GitHub issue #17. An entity or relationship may be used as answer evidence only when its derived assertion, owner, source segments, and extraction lineage still validate with fail-closed behavior at least as strong as segment citations.

## Dependency position

Completed prerequisites: deterministic segmentation, parser provenance normalization, owner-scoped transactional PostgreSQL persistence, lexical/semantic/hybrid retrieval, citation resolution, freshness revalidation, model registry and embedding backfill, retrieval mode, loopback gateway, and grounded answers.

The graph tables and graph-specific resolver do not exist. This Wayfinder defines their contract but stops before implementation when the extractor and corpus evidence are unavailable.

## Evidence checked

- `docs/retrieval-and-graph.md` selects PostgreSQL relational tables and bounded recursive SQL as the baseline, keeps Apache AGE optional, and requires provenance on every derived graph record.
- `src/citation-resolver.js` validates segment identity, source/segment hashes, ownership, retention, citation reference, location, lineage, and confidence before prompt use.
- `src/postgres-store.js:348-432` replaces a document's segments inside the same transaction after an owner check; segment deletion cascades only through declared database foreign keys.
- `src/postgres-store.js:805-842` revalidates only document/segment identity, owner, retention, source hash, and segment hash. It cannot validate an entity label, predicate, endpoints, or extraction revision.
- `docker/postgres/init/002-schema.sql` and `003-segment-embeddings.sql` contain no graph tables or graph lineage constraints.
- `src/answer-question.js:168-186` sends raw retrieval matches to `chat` before citation resolution and freshness revalidation; this is a confirmed live-answers defect and is not changed here.
- `src/answer-question.js:1` imports `./index.js`, while `src/index.js:8` re-exports `answerQuestion`; the cycle loads successfully but is a verified circular dependency and is not changed here.
- GitHub issue #17 is open with `ready-for-human`; it explicitly identifies the missing graph schema, extraction contract, and bounded traversal.

## Decisions so far

- G1: Keep graph storage in PostgreSQL relational tables and use bounded recursive SQL behind the retrieval adapter. Do not add Apache AGE, Qdrant, or another graph dependency in this slice.
- G2: Treat graph data as a derived projection of committed documents and segments, not as part of the document write transaction. Pin every projection to an owner, a source snapshot, and an extraction revision.
- G3: Give every node and edge a provenance envelope containing one or more source-segment citations, a deterministic assertion hash, and extraction lineage. A segment hash alone is insufficient evidence for a derived claim.
- G4: Revalidate graph evidence by checking owner/retention, current source and segment hashes, node or edge identity, assertion fields, assertion hash, and extraction revision before an answer consumes it. Any failed member invalidates the complete graph evidence item; no repair or guessed citation is allowed.
- G5: Invalidate graph projections transactionally when a document is replaced or deleted. A graph write may commit only when the source snapshot still matches the extraction input; otherwise it is discarded and must be recomputed.
- G6: Keep graph expansion bounded and provider-neutral. The first implementation should return original segment citations with graph nodes/edges, and must not expose an uncited graph-only answer.

## Open decisions

- G7: The extractor contract and identity-resolution policy remain open. The repository has no installed extraction model, no provider endpoint, no model contract, and no private or representative corpus. Those are required to select extraction input/output behavior and to test that labels, predicates, and endpoints are not invented.
- G8: Traversal depth, result caps, deduplication, and performance budgets remain open. No measured graph size or workload exists from which to ratify numeric limits. The implementation may not invent thresholds.

## Decision tickets

- `issues/01-evidence-reverification.md` — resolved; confirms prior findings and scope boundaries.
- `issues/02-graph-schema-and-isolation.md` — resolved; defines relational graph storage and replacement/deletion invariants.
- `issues/03-graph-provenance-envelope.md` — resolved; defines assertion provenance and fail-closed freshness checks.
- `issues/04-derived-extraction-pipeline.md` — resolved; defines separate derived projection and commit-time freshness.
- `issues/05-extractor-and-identity-contract.md` — open; blocked by missing extractor/corpus evidence.
- `issues/06-bounded-graph-retrieval.md` — open; blocked by missing workload evidence for numeric bounds.

## Answer

The repository supports a ratified PostgreSQL-only graph contract and a separate derived-projection lifecycle, but not an honest implementation yet. The extractor/identity contract needs an installed external model or a supplied synthetic/representative corpus, and traversal limits need measured workload evidence. The spec records the implementable boundary and the exact blockers; no graph runtime code or dependency is added in this effort.

## Traceability row (pending parent consolidation)

| Issue | Wayfinder | Decision | Status | Evidence | Commit |
|---|---|---|---|---|---|
| #17 | graph-retrieval | PostgreSQL derived graph projection with fail-closed entity/relationship provenance; extractor and traversal limits remain blocked on missing evidence | ready-for-human | `.scratch/graph-retrieval/map.md`, `.scratch/graph-retrieval/spec.md` | pending |

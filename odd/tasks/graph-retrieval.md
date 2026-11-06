# Graph retrieval with entity and relationship provenance

Design the graph-retrieval slice for GitHub issue #17 without changing shared runtime or documentation files. This effort owns only `.scratch/graph-retrieval/**` and this task file.

## Specs

- S1: "Destination: graph retrieval with entity and relationship provenance (GitHub issue #17) - the provenance model that lets an entity or a relationship be cited as evidence with the same fail-closed guarantees segment citations already have."
- S2: "Scope: this is a schema decision, a provenance decision and an extraction-pipeline decision."
- S3: "Do not add a graph database dependency; PostgreSQL-only storage remains the default until a ratified decision says otherwise."
- S4: "If entity extraction needs an external model or a corpus you do not have, stop at /to-spec and name the missing evidence."

## Tasks

- T1 | Verify P1/P2 and graph prerequisites from `src/answer-question.js`, `src/index.js`, `src/postgres-store.js`, and the PostgreSQL init SQL.
- T2 | Ratify the PostgreSQL graph schema, ownership, replacement, and deletion invariants.
- T3 | Ratify a graph assertion/provenance envelope and graph-specific freshness boundary.
- T4 | Ratify the separate derived extraction lifecycle and identify evidence blockers for the extractor and traversal limits.
- T5 | Produce `.scratch/graph-retrieval/spec.md`; do not implement runtime code because the extractor and corpus evidence are unavailable.

## Log

- L1: Read repository instructions, tracker rules, domain guidance, handoff, retrieval/graph documentation, and prior citation/freshness/persistence trackers before editing.
- L2: Verified GitHub issue #17 is open with `ready-for-human`; its body names the graph schema, extraction contract, and bounded traversal as missing.
- L3: Confirmed P1 independently with a runtime probe: invalid foreign-owner evidence reached the fake chat provider before citation resolution; confirmed P2 from the import cycle and successful module load.
- L4: Confirmed the storage freshness seam validates only segment-level fields and that document replacement deletes/recreates segments without graph invalidation support.
- L5: Created the Wayfinder map and six decision tickets. Ratified the PostgreSQL schema boundary, graph provenance envelope, and separate derived-projection lifecycle; left extractor/identity and numeric traversal limits open.
- L6: Created the spec and stopped before implementation as required by S4; no runtime files, dependency, private corpus, or external model were added.

## Traceability row (pending parent consolidation)

| Issue | Wayfinder | Decision | Status | Evidence | Commit |
|---|---|---|---|---|---|
| #17 | graph-retrieval | PostgreSQL derived graph projection with fail-closed entity/relationship provenance; extractor and traversal limits remain blocked on missing evidence | ready-for-human | `.scratch/graph-retrieval/map.md`, `.scratch/graph-retrieval/spec.md` | pending |

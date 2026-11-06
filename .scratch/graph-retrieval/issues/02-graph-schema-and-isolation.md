# 02: Relational graph schema and owner isolation

Type: decision
Status: resolved
Blocked by: None

## Question

What storage shape satisfies PostgreSQL-first graph retrieval without storing an extracted claim without ownership and provenance?

## Answer

Use PostgreSQL relational tables for graph nodes and edges, with explicit owner and source-snapshot lineage on every derived row. The initial shape is:

```text
graph_nodes(
  id, owner_id, kind, canonical_key, label,
  source_document_id, source_snapshot_hash,
  provenance, derivation, created_at
)
graph_edges(
  id, owner_id, source_node_id, relation, target_node_id,
  source_document_id, source_snapshot_hash,
  provenance, derivation, confidence, created_at
)
```

Required invariants:

- `id`, node kind, canonical key, relation, and endpoint IDs are opaque validated values; `confidence` is finite and within `0..1`.
- Node and edge ownership must equal the owner of every referenced document, segment, and endpoint. Cross-owner joins fail closed.
- Node endpoints and source documents use foreign keys with owner included in the key where PostgreSQL permits it; deletion/replacement must not leave edges pointing at a missing node or source snapshot.
- `provenance` and `derivation` are mandatory JSONB envelopes, not nullable metadata. A graph row without them is not trusted evidence.
- Index source/target/relation and owner/source-snapshot lookups. Use recursive SQL for bounded traversal; do not add a graph database dependency.
- The projection is replaceable per document/source snapshot. The schema must allow a transaction to remove the old projection and install the new one atomically after freshness checks.

The exact DDL and foreign-key layout belong to the implementation ticket after the extractor/identity contract is supplied. No table is created in this effort.

## Traceability row (pending parent consolidation)

| Issue | Decision | Status |
|---|---|---|
| #17 | PostgreSQL relational graph projection with owner-scoped nodes/edges, mandatory provenance/derivation envelopes, and transactional replacement | resolved |

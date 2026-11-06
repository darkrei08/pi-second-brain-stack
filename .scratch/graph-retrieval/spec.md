# Graph retrieval with entity and relationship provenance

## Status

Ready for human decision, not `ready-for-agent`: the storage and provenance contract is ratified, but implementation is blocked by missing extractor/corpus evidence and measured graph workload evidence.

## Problem statement

The repository can validate retrieved segment citations, but it has no safe contract for citing a derived entity or relationship. A backing segment hash does not prove that an entity label, relation predicate, endpoint pair, or extraction revision is unchanged. GitHub issue #17 is therefore blocked on a graph-specific provenance model and extraction lifecycle.

## Ratified contract

### Storage

Keep PostgreSQL as the system of record. Add graph nodes and edges as owner-scoped derived projection tables; use recursive SQL behind the retrieval adapter. Do not add Apache AGE, Qdrant, or another graph dependency in this slice.

Each graph row must include stable opaque identity, owner, source document/snapshot identity, mandatory provenance and derivation envelopes, and creation time. Edges must include source node, relation, target node, and finite confidence. Owner-inclusive foreign keys or equivalent transactional checks must prevent cross-owner endpoints and orphaned evidence. Source/target/relation and owner/source-snapshot lookups need indexes.

Document replacement/deletion must remove the old graph projection atomically with the source lifecycle. A graph projection is replaceable by source document and pinned extraction revision; it is never merged with a newer segment set.

### Provenance

A node or edge is trusted evidence only when its provenance envelope contains:

- owner ID;
- a non-empty list of complete source-segment citation references (`document_id`, `segment_id`, `segment_index`, `source_hash`, `segment_hash`, `citation_ref`);
- the canonical assertion fields for that record;
- an assertion hash recomputable from those canonical fields;
- extractor identity, extraction revision, and creation time.

For nodes the assertion includes kind, canonical key, and label. For edges it includes relation and both endpoint IDs. Before prompt use, a graph resolver and storage revalidation seam must compare current owner/retention, source and segment hashes, graph identity, endpoint identity, assertion fields/hash, and extraction revision. It returns the graph claim with original segment citations. Any mismatch makes the graph evidence unusable; no repair, endpoint substitution, or uncited graph-only output is allowed.

### Extraction lifecycle

Graph extraction runs as a separate derived-projection step after source ingestion commits. The worker reads an owner-scoped source snapshot, including ordered segment IDs and hashes, then calls an injected extractor outside the database transaction. It writes only if the current active document still matches that exact snapshot. The projection replacement and its graph nodes/edges commit together; a changed snapshot is discarded and recomputed.

This avoids holding the document transaction across an external model call and provides a commit-time freshness check after the extraction await. Scheduling, retries, and provider credentials remain outside the repository contract.

### Retrieval

The retrieval seam may seed from segment/entity matches and expand through recursive PostgreSQL SQL, but every returned node/edge must carry a valid provenance chain to original segment citations. The first implementation must not answer from an uncited graph claim. Traversal is bounded and owner-scoped, but exact depth/result/resource thresholds are not ratified until a real graph workload is measured.

## Open blockers

1. **Extractor and entity identity:** no installed extraction model, provider endpoint, caller implementation, or synthetic/representative corpus exists. Missing evidence includes the extractor I/O contract, duplicate mention/alias fixtures, cross-document identity cases, conflict policy, and measured extraction behavior.
2. **Traversal bounds:** no graph size, query mix, depth distribution, p50/p95 latency, or resource profile exists. Numeric depth/result/resource limits and any AGE adoption decision must wait for measured workload evidence.

## Out of scope

- Fixing the confirmed live-answers ordering defect in `src/answer-question.js`.
- Removing the confirmed `answer-question.js`/`index.js` circular dependency.
- Adding graph runtime code, SQL migrations, tests, model adapters, providers, private corpus fixtures, or dependencies.
- Community summaries, global GraphRAG search, reranking, ANN indexes, or external general knowledge.

## Acceptance criteria for the next implementation ticket

- Add graph schema and migrations with owner isolation, source-snapshot lineage, transactional replacement, and deletion completeness.
- Add a pure graph resolver plus storage-backed revalidation that validates the complete assertion/provenance envelope and returns original segment citations.
- Add a provider-neutral derived-projection worker with an injected extractor; reject stale writes after the extraction await.
- Add synthetic tests for foreign owner, tombstone/purged source, source/segment hash mutation, changed label/predicate/endpoints, changed extraction revision, duplicate IDs, partial projection replacement, and stale-worker discard.
- Add a synthetic entity/relationship fixture and a measured traversal workload before ratifying numeric bounds.
- Run the repository's focused and full test commands without introducing corpus, credentials, model caches, or network services.

# 04: Separate derived extraction and commit-time freshness

Type: decision
Status: resolved
Blocked by: None

## Question

Should entity and relationship extraction run inline with document ingestion or as a separate derived projection?

## Answer

Run extraction as a separate derived-projection step after `saveDocumentAndSegments` commits. The ingestion transaction must not hold database locks across an external model call or an expensive graph build. The projection worker reads an owner-scoped document snapshot, including the ordered segment IDs, source hash, segment hashes, and a pinned `extraction_revision`, then invokes an injected extractor outside the database transaction.

The worker writes the projection in a new transaction only if the current document is still active, owned by the caller, and has the exact same source snapshot and ordered segment/hash set as the extraction input. The transaction replaces the document's old graph projection and commits the new nodes/edges together. If the snapshot changed, the worker discards the result and reports a stale extraction for recomputation; it never mixes old and new graph records.

Document replacement and deletion must invalidate graph records transactionally through owner-scoped foreign keys/cascades or an equivalent delete-before-insert projection transaction. A graph record is never considered fresh merely because its backing segment still exists.

This lifecycle is ratified from the existing transactional segment replacement and the repository's explicit warning that graph extraction can be expensive. The extractor implementation, retry policy, and scheduling remain separate decisions.

## Traceability row (pending parent consolidation)

| Issue | Decision | Status |
|---|---|---|
| #17 | Extract graph data as a separate derived projection and commit only against an unchanged source snapshot | resolved |

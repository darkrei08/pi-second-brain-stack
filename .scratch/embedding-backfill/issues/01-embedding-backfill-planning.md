# 01: Plan owner-scoped embedding backfill per registered model

Type: implementation
Status: resolved
Blocked by: None

## Question

Can an external, provider-neutral embedding worker discover which active documents of one owner still need embeddings for a registered model, and which segment IDs it must write for each of them, without reading vectors or source text and without any job table or worker runtime?

## Acceptance criteria

- [x] `storage.listEmbeddingBackfill({ model_id, owner_id, limit })` returns registry metadata plus a deterministic document plan.
- [x] Each listed document carries its complete ordered `segment_ids` together with `missing_segment_ids` and `dimension_mismatch_segment_ids`.
- [x] Documents are listed only when at least one segment is missing an embedding or carries a dimension-mismatched one.
- [x] Owner isolation and active retention are enforced; tombstoned, purged, and foreign documents never appear.
- [x] Unregistered models fail closed, and malformed IDs or limits fail before database access.
- [x] Processing the plan through `saveSegmentEmbeddings` removes the documents from the next plan, including mismatched documents whose complete set is rewritten with the registered dimensions.
- [x] The seam is read-only and returns no text, vectors, paths, or provider metadata.
- [x] No schema migration, provider, worker, scheduler, credential, ANN index, or model cache is added.
- [x] Existing segmentation, parser, persistence, lexical, semantic, hybrid, citation, freshness, registry, and coverage tests remain green.

## Answer

Implemented `storage.listEmbeddingBackfill` in `src/postgres-store.js` with pre-database validation, a registry lookup that fails closed, and one aggregate query that reports, per active document of the owner, the complete ordered segment set plus the missing and dimension-mismatched subsets. Documents are ordered by `document_id` and capped by `limit` (1-100, default 20).

The slice also closed the write-path gap that made the plan untrustworthy: `saveSegmentEmbeddings` now skips the model-wide dimension guard only for a complete rewrite of one document for a registered model using the registered dimensions, so legacy mismatched rows are repairable and another owner's stale rows cannot block the repair. Partial writes and unregistered models keep the previous fail-closed guard. See decisions D1-D4 in `../map.md`.

Verification: host `npm test` 18 pass / 10 expected skips; live pgvector/pg17 integration 13/13 twice on a fresh schema; Debian and Alpine Node 22 matrix 18 pass / 10 skips with byte-identical CLI output; independent review of the write path found no defects after the repair change; syntax and privacy checks clean. Implementation commit: `d7d92d3`.

# 01: Plan owner-scoped embedding backfill per registered model

Type: implementation
Status: claimed
Blocked by: None

## Question

Can an external, provider-neutral embedding worker discover which active documents of one owner still need embeddings for a registered model, and which segment IDs it must write for each of them, without reading vectors or source text and without any job table or worker runtime?

## Acceptance criteria

- [ ] `storage.listEmbeddingBackfill({ model_id, owner_id, limit })` returns registry metadata plus a deterministic document plan.
- [ ] Each listed document carries its complete ordered `segment_ids` together with `missing_segment_ids` and `dimension_mismatch_segment_ids`.
- [ ] Documents are listed only when at least one segment is missing an embedding or carries a dimension-mismatched one.
- [ ] Owner isolation and active retention are enforced; tombstoned, purged, and foreign documents never appear.
- [ ] Unregistered models fail closed, and malformed IDs or limits fail before database access.
- [ ] Processing the plan through `saveSegmentEmbeddings` removes the documents from the next plan.
- [ ] The seam is read-only and returns no text, vectors, paths, or provider metadata.
- [ ] No schema migration, provider, worker, scheduler, credential, ANN index, or model cache is added.
- [ ] Existing segmentation, parser, persistence, lexical, semantic, hybrid, citation, freshness, registry, and coverage tests remain green.

## Answer

_Pending implementation._

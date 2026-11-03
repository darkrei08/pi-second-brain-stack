# Spec: provider-neutral exact semantic search

## Problem Statement

The repository now stores deterministic segments and supports lexical search, but it has no provider-neutral semantic retrieval seam. Fixing a production embedding dimension or ANN index before choosing a model would couple the schema to an unverified deployment decision.

## Solution

Add a satellite `segment_embeddings` table with unbounded pgvector storage and model identity. Extend the existing storage adapter with transactional embedding upsert and exact cosine search. Use only synthetic vectors and loopback PostgreSQL integration tests.

## Public seams

- `saveSegmentEmbeddings({ document_id, owner_id, model_id, dimensions, embeddings, created_at })`
- `searchSegmentsSemantic({ query_embedding, model_id, owner_id, limit })`

`embeddings` contains `{ segment_id, embedding }` entries. The adapter remains independent of embedding providers.

## Invariants

- Every embedding is written only for an existing segment of an active, owner-scoped document; a later retention change leaves the rows in place and search and coverage exclude them through the join on `documents`.
- A model ID identifies the vector space of its registry row and search never compares different models; stored embeddings carry their own `dimensions`, a write is rejected only when it conflicts with an existing row of the same model, and divergence from the registry is reported as `dimension_mismatch_segments` instead of being rejected.
- Every vector written by the adapter has the declared positive dimension, finite numeric values, and non-zero norm; the database stores the declared dimension independently of the vector and search filters on that column, so a drifted row stays out of results until a backfill repairs it.
- All SQL vector values are parameterized and cast with `$N::vector`.
- Search returns only active documents owned by the requested owner and the requested model.
- Document deletion cascades through segments to embeddings.
- The first search is exact and deterministic; no ANN index is added.
- Invalid input fails before database contact.

## Acceptance

- Synthetic 3D and 4D models coexist for the same segments.
- Exact cosine ordering returns the expected nearest segment and score/distance.
- Owner, retention, and model isolation are enforced.
- Duplicate model writes replace deterministically.
- Invalid vectors, dimensions, model IDs, zero norm, and excessive limits are rejected.
- Cascade deletion removes all corresponding embeddings.
- Existing lexical and segmentation behavior remains green.

## Deferred

Production model/provider integration, HNSW/IVFFlat, vector dimension selection, Qdrant, hybrid ranking, real corpus, gateway, and operational vacuum/reindex policy.

## Market comparison decision

The market comparison does not change the acceptance criteria. It adds these architectural constraints:

- Do not import a prebuilt product's vector table schema into the core.
- Keep the model and dimension metadata needed to compare or migrate between embedding providers.
- Preserve the segment and provenance identifiers required to map citations from RAGFlow, R2R, Onyx, or AnythingLLM later.
- Add hybrid retrieval only in a separate Wayfinder after exact vector behavior is verified.

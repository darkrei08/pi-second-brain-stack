# 01: Add provider-neutral exact semantic search

Type: implementation
Status: resolved
Blocked by: None

## Question

Can the existing PostgreSQL store add deterministic semantic retrieval without choosing a production embedding model, fixed dimension, external provider, or ANN index?

## Acceptance criteria

- [x] A dedicated `segment_embeddings` table stores unbounded pgvector values with model and dimension metadata.
- [x] Embeddings are saved transactionally and owner-scoped.
- [x] Exact cosine search filters owner, active retention, and model before ordering.
- [x] Non-finite, zero-norm, malformed, wrong-dimension, and excessive-limit inputs fail before database contact.
- [x] Synthetic models with different dimensions coexist without cross-comparison.
- [x] Document deletion cascades to embeddings.
- [x] Existing lexical, segmentation, and parser-normalization tests remain green.
- [x] No provider, credential, real corpus, model cache, ANN index, or new client dependency is added.

## Market comparison checkpoint

The comparison ticket `.scratch/rag-market-comparison/issues/01-compare-prebuilt-rag-platforms.md` is resolved without replacing this implementation. The exact semantic seam remains the baseline adapter boundary; product-specific hybrid, parser, citation, ACL, and GraphRAG capabilities are deferred to separate Wayfinders.

## Verification

Implementation commit: `bb614ef`. `npm test` passed 13 tests with 6 expected database skips. Fresh `pgvector/pgvector:pg17` integration passed 8/8 tests on loopback port 55433. The pre-existing Compose volume was not reset after a credential mismatch.

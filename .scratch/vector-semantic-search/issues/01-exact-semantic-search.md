# 01: Add provider-neutral exact semantic search

Type: implementation
Status: claimed
Blocked by: None

## Question

Can the existing PostgreSQL store add deterministic semantic retrieval without choosing a production embedding model, fixed dimension, external provider, or ANN index?

## Acceptance criteria

- [ ] A dedicated `segment_embeddings` table stores unbounded pgvector values with model and dimension metadata.
- [ ] Embeddings are saved transactionally and owner-scoped.
- [ ] Exact cosine search filters owner, active retention, and model before ordering.
- [ ] Non-finite, zero-norm, malformed, wrong-dimension, and excessive-limit inputs fail before database contact.
- [ ] Synthetic models with different dimensions coexist without cross-comparison.
- [ ] Document deletion cascades to embeddings.
- [ ] Existing lexical, segmentation, and parser-normalization tests remain green.
- [ ] No provider, credential, real corpus, model cache, ANN index, or new client dependency is added.

# 01: Add provider-neutral hybrid retrieval

Type: implementation
Status: closed
Blocked by: None

## Question

Can the existing owner-scoped lexical and exact semantic searches be fused into one deterministic, provenance-preserving retrieval method without selecting a production embedding provider or adding a new storage service?

## Acceptance criteria

- [ ] A public `storage.searchSegmentsHybrid` method combines lexical and semantic candidates.
- [ ] Reciprocal Rank Fusion uses one-based ranks and a validated positive `rrf_k`.
- [ ] The method returns at most the requested limit and fetches bounded candidate lists.
- [ ] Lexical-only, semantic-only, and overlapping candidates are covered by integration tests.
- [ ] Owner, active retention, model ID, and vector dimension isolation are preserved.
- [ ] Equal fused scores have deterministic document/segment/ID tie-breaking.
- [ ] Stored provenance and citation fields are returned unchanged.
- [ ] Invalid input fails before database contact.
- [ ] Existing public behavior remains green.
- [ ] No new dependency, provider, model, schema, ANN index, or private data is added.

## Non-goals

Model lifecycle management, learned reranking, graph traversal, parser benchmarking, external sidecars, gateway routes, and UI changes.

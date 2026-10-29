# 01: Add provider-neutral hybrid retrieval

Type: implementation
Status: resolved
Blocked by: None

## Question

Can the existing owner-scoped lexical and exact semantic searches be fused into one deterministic, provenance-preserving retrieval method without selecting a production embedding provider or adding a new storage service?

## Acceptance criteria

- [x] A public `storage.searchSegmentsHybrid` method combines lexical and semantic candidates.
- [x] Reciprocal Rank Fusion uses one-based ranks and a validated positive `rrf_k`.
- [x] The method returns at most the requested limit and fetches bounded candidate lists.
- [x] Lexical-only, semantic-only, and overlapping candidates are covered by integration tests.
- [x] Owner, active retention, model ID, and vector dimension isolation are preserved.
- [x] Equal fused scores have deterministic document/segment/ID tie-breaking.
- [x] Stored provenance and citation fields are returned unchanged.
- [x] Invalid input fails before database contact.
- [x] Existing public behavior remains green.
- [x] No new dependency, provider, model, schema, ANN index, or private data is added.

Verification: commits `8b466dd` and `c906b16`; pure suite 13 pass with 7 expected integration skips; isolated pgvector/pg17 integration 9/9; package dry-run, Compose config, syntax, and diff checks pass.

## Non-goals

Model lifecycle management, learned reranking, graph traversal, parser benchmarking, external sidecars, gateway routes, and UI changes.

## Answer

Implemented `storage.searchSegmentsHybrid` in `src/postgres-store.js` with bounded one-based Reciprocal Rank Fusion, deterministic tie-breaks, and owner, active-retention, model, and dimension isolation (commit `8b466dd`, closure `c906b16`). Evidence: the hybrid integration case in `test/integration/postgres-store.test.js` and the matching row in `odd/traceability.md`.

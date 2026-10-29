# 01: Register global embedding models and inspect owner-scoped coverage

Type: implementation
Status: resolved
Blocked by: None

## Question

Can the storage adapter register provider-neutral global embedding-model metadata and report partial owner-scoped coverage without selecting a provider, executing a worker, exposing vectors, or changing existing retrieval behavior?

## Acceptance criteria

- [x] A registry table stores opaque model IDs, immutable dimensions, and constrained lifecycle status.
- [x] Identical registration is idempotent; conflicting metadata fails closed.
- [x] Registry reads are deterministic and metadata-only.
- [x] Coverage inspection reports total, embedded, missing, and dimension-mismatch active segments for one owner and model.
- [x] Partial coverage is allowed and does not mutate vectors or documents.
- [x] Deprecated models remain inspectable and are not silently reactivated.
- [x] Existing segmentation, parser, persistence, lexical, semantic, hybrid, citation, and freshness tests remain green.
- [x] No provider, worker, credential, private corpus, ANN index, or model cache is added.

## Answer

Implemented the global provider-neutral registry and owner-scoped coverage inspection. Registration is transactional and idempotent for matching metadata, dimensions are immutable, active models can be explicitly deprecated, and deprecated models cannot be reactivated. Coverage is read-only and reports partial and dimension-mismatch counts without returning vectors or source text.

Verification: host `npm test` passed 17/17 with 9 expected integration skips; live pgvector/pg17 integration passed 11/11; Debian and Alpine Node 22 unit/package checks passed; syntax, Compose, privacy, and diff checks passed.

## Non-goals

Provider calls, embedding workers, active-model routing, fallback orchestration, stale-worker generations, rollback/decommission TTL, destructive pruning, ANN indexes, and production model selection.

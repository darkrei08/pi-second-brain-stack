# 01: Register global embedding models and inspect owner-scoped coverage

Type: implementation
Status: open
Blocked by: None

## Question

Can the storage adapter register provider-neutral global embedding-model metadata and report partial owner-scoped coverage without selecting a provider, executing a worker, exposing vectors, or changing existing retrieval behavior?

## Acceptance criteria

- [ ] A registry table stores opaque model IDs, immutable dimensions, and constrained lifecycle status.
- [ ] Identical registration is idempotent; conflicting metadata fails closed.
- [ ] Registry reads are deterministic and metadata-only.
- [ ] Coverage inspection reports total, embedded, missing, and dimension-mismatch active segments for one owner and model.
- [ ] Partial coverage is allowed and does not mutate vectors or documents.
- [ ] Deprecated models remain inspectable and are not silently reactivated.
- [ ] Existing segmentation, parser, persistence, lexical, semantic, hybrid, citation, and freshness tests remain green.
- [ ] No provider, worker, credential, private corpus, ANN index, or model cache is added.

## Non-goals

Provider calls, embedding workers, active-model routing, fallback orchestration, stale-worker generations, rollback/decommission TTL, destructive pruning, ANN indexes, and production model selection.

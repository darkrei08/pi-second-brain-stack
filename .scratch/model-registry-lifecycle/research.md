# Research: model registry and partial-cutover lifecycle

## Decision

Implement a provider-neutral global embedding-model registry plus read-only owner-scoped coverage/drift inspection. Keep partial cutover and lexical fallback as the policy, but do not implement provider calls, workers, active routing, or destructive pruning in this slice.

## Repository evidence

- `docker/postgres/init/003-segment-embeddings.sql` stores `(segment_id, model_id)` vectors with a declared dimension but has no model registry.
- `src/postgres-store.js` validates model IDs and dimensions, checks dimensions across existing rows, and scopes semantic search by owner, active retention, model, and query dimension.
- Document replacement/deletion cascades to embeddings through the existing segment relationship; the public adapter does not yet expose model lifecycle metadata.
- `.scratch/vector-semantic-search/spec.md` explicitly defers production model/provider integration, vector dimension selection, ANN, and operational reindex policy.
- `.scratch/rag-market-comparison/spec.md` requires model and dimension metadata so providers can be compared or migrated later without importing a product schema.
- `odd/traceability.md` marks model registry/re-embedding as deferred pending a lifecycle and migration contract.

## Selected policy

The user selected global models with partial cutover and lexical fallback. This resolves tenancy and cutover policy for the next bounded slice, but intentionally does not select a provider or execution runtime.

## Minimum registry contract

- A model ID is globally unique and opaque.
- Dimensions are positive and immutable.
- Registry status is explicit and constrained to `active` or `deprecated` for this metadata slice.
- Registration is idempotent only when immutable metadata matches; conflicting dimensions or metadata fail closed.
- Coverage inspection accepts an owner and model ID, reads active documents and their segments, and reports counts for total segments, embedded segments, missing embeddings, and dimension mismatches.
- Inspection must not expose vectors or private source text and must not mutate storage.

## Rejected alternatives

- Provider-specific model tables: would select a runtime/provider before the public boundary is defined.
- Automatic active-model routing: requires product decisions about fallback ordering and answer consistency.
- Re-embedding worker: requires job ownership, retries, stale-worker generations, and operational scheduling.
- Destructive vector pruning: requires rollback and decommission retention policy.
- Corpus-wide coverage claims: violate owner isolation and make partial cutover unusable.

# Research: provider-neutral backfill execution

## Decision

Add one pure orchestration function, `runEmbeddingBackfill`, that composes the existing storage seams with a caller-supplied embedding function. No provider client, no scheduler, no schema change, no new dependency.

## Repository evidence

- `src/postgres-store.js` `listEmbeddingBackfill` already returns, per active document of one owner, the complete ordered `segment_ids` plus the missing and dimension-mismatch subsets. Nothing else is needed to decide what to embed.
- `src/postgres-store.js` `getDocumentWithSegments(document_id, owner_id)` returns the document and its segments, including `text` and `created_at`, scoped to the owner. This is the only text source the worker needs, and it never leaves the process unless the injected embedder sends it somewhere.
- `src/postgres-store.js` `saveSegmentEmbeddings` validates ownership, activity, segment membership, and dimensions, replaces the document's `(document, model)` set transactionally, and now allows a complete rewrite of a registered model at the registered dimensions. The worker can therefore stay thin.
- `.scratch/embedding-backfill/spec.md` defines the plan as a snapshot and states that a document re-ingested between plan and write either fails closed or reappears as missing.
- `.scratch/rag-market-comparison/spec.md` and `docs/implementation-brief.md` keep provider and endpoint choice outside the public repository boundary, so the embedder must be injected rather than imported.
- `odd/traceability.md` lists the provider/worker boundary as the next frontier and keeps scheduling, retries, stale-worker generations, routing, TTL, pruning, and ANN deferred.
- `src/cli.js` and `src/index.js` show the module style: small named functions, no classes, no configuration object beyond explicit arguments.

## Rejected alternatives

- Importing an OpenAI-compatible client now: selects a provider and a credential path before the operator decides, and would add a dependency for a boundary this slice does not need.
- A long-running worker or queue table: scheduling, retries, and leases need their own product decisions, and the plan is already derived state.
- Emitting per-document progress events or logs: no observability sink exists yet, and the counters are enough for a caller to report progress.
- Reading segment text inside the storage adapter and returning it in the plan: would widen the read-only plan's payload and weaken its privacy property.

## Compatibility notes

- Additive: one new module plus one export; no existing signature changes.
- The function depends on three storage methods that already exist and are covered by integration tests.
- Deterministic: no clock, randomness, or network inside the module; `created_at` comes from the stored document.

# 05: Owner-scoped export and an explicit physical purge

Type: task
Status: claimed
Blocked by: None
Source: R5 of [issue 01](01-risk-register.md), pre-deployment mitigation 3.

## Question

R5 records that `deleteDocument` cascades correctly, but that a `tombstone` or `purged` retention state does not delete anything, so an operator can mistake a non-searchable row for erasure, and that the repository has no owner-scoped export. What is the smallest pair of operations that makes "keep but hide" and "erase" distinguishable and makes an owner's data portable?

## Decision taken

The operator delegated the choice on 2026-10-31 ("prosegui con i task bloccanti risolvi tutto"). The repository therefore adopts, and documents, these distinct semantics:

- `active` — searchable.
- `tombstone` — retained, not searchable, reversible. Explicitly **not** erasure.
- purge — an operation, not a state: it physically deletes the document row and cascades segments, embeddings, and collection memberships. Irreversible.
- The `purged` retention state stays in the schema for rows recorded before a purge exists; a purge does not write it, because writing a state instead of deleting was the hazard R5 records.

## Acceptance criteria

- [ ] `setDocumentRetention(document_id, owner_id, state)` changes retention for `active` and `tombstone` only, is owner-scoped, and refuses `purged` with a message naming the purge operation.
- [ ] `purgeDocument(document_id, owner_id)` physically deletes the document and returns the deleted counts for documents, segments, and embeddings. It is owner-scoped: another owner's document is refused, and no row changes in that case.
- [ ] After a purge, no document, segment, embedding, or collection membership remains for that document.
- [ ] `exportOwner(owner_id)` returns one JSON-serialisable object with the owner id, its collections, and its documents each carrying their segments in order, including provenance, hashes, spans, retention and collection ids. It must not include embedding vectors; it must include the embedding model ids and dimensions present per segment. Another owner's data never appears.
- [ ] All three are exported from `src/index.js`, validated before any query, and bounded (export refuses without an explicit owner, and does not page silently).
- [ ] `docs/private-runtime.md` documents the four-way distinction, states that tombstone is not erasure, and states that purge is irreversible and therefore needs a backup first.
- [ ] Integration tests cover: tombstone retains rows but leaves retrieval empty; purge cascades and is idempotent-safe for a missing document; cross-owner purge refused with no mutation; export shape, ordering, embedding metadata, and cross-owner isolation.
- [ ] No new dependency. `pnpm test` green.

## Verification

- `node --test test/integration/postgres-store.test.js`
- `pnpm test`
- `TEST_DATABASE_URL=... pnpm run test:integration`

## Answer

Implemented in `src/postgres-store.js` as three storage methods, alongside the existing `deleteDocument`, with `docs/private-runtime.md` carrying the semantics:

- `setDocumentRetention(document_id, owner_id, state)` moves a document between `active` and `tombstone` and refuses `purged` with a message that names `purgeDocument`.
- `purgeDocument(document_id, owner_id)` locks the document row, refuses a foreign owner instead of hiding the violation as a missing-document no-op, counts the segments and embeddings it is about to cascade, deletes the document, and returns `{ documents, segments, embeddings }`. A missing document returns zero counts.
- `exportOwner(owner_id)` returns the owner's collections and documents with `collection_ids` and segments ordered by `segment_index`, each segment carrying `embedding_metadata` as `{ model_id, dimensions }` and never a vector.

No HTTP export or purge route was added: a destructive route needs its own confirmation design, and that is stated in the docs.

Evidence on a disposable `pgvector/pgvector:pg17` at `127.0.0.1:55437`, schema applied with `pnpm migrate` (5/5):

| Check | Result |
|---|---|
| `TEST_DATABASE_URL=… pnpm run test:integration` | 31 pass, 0 fail, exit 0, including tombstone-retains-rows, cascade on purge, missing-document no-op, cross-owner refusal, and export determinism |
| `pnpm test` | 144 tests, 118 pass, 26 expected skips, 0 fail, exit 0 |

Two defects were found in the tests during parent verification, not in the implementation: the cascade assertion queried `segment_embeddings.document_id`, a column that does not exist (it cascades through the segment foreign key), and the R8 migration case assumed an unmigrated database, so it failed once `pnpm migrate` had already been run. Both are fixed in this work unit.

Residual: the purge is a database operation only. Originals, OCR artifacts, caches, logs and backups outside PostgreSQL are not covered by it, and the docs say so.

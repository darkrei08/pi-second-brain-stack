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

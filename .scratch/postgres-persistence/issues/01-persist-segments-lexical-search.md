# 01: Persist segmented documents and support lexical search

Type: implementation
Status: resolved
Blocked by: None

## Question

How can the existing deterministic segment/provenance result become durable PostgreSQL data with atomic writes, owner isolation, lexical retrieval, and cascade deletion while keeping vector, graph, parser, and gateway work deferred?

## Acceptance criteria

- [x] The adapter writes a document and all segments in one transaction.
- [x] A failed segment write leaves no document or partial segments.
- [x] Lexical search returns matching synthetic segments and citation provenance for the requested owner.
- [x] Reads and deletion enforce owner scope.
- [x] Deleting a document removes its segments through a verified cascade.
- [x] Existing segmentation tests remain independent of PostgreSQL and pass.
- [x] No private corpus, credentials, or non-loopback service exposure is added.

## Answer

Implemented `createStorage({ pool })` in `src/postgres-store.js`, the PostgreSQL schema in `docker/postgres/init/002-schema.sql`, and opt-in integration tests in `test/integration/postgres-store.test.js`. The adapter stores the deterministic segment/provenance contract transactionally, performs owner-scoped lexical search, rejects cross-owner replacement, and verifies cascade deletion. The persistence boundary validates document, retention, hash, offset, and provenance invariants before connecting to PostgreSQL.

Verification: `npm test` passed with 6 passing and 4 expected integration skips without a database; `npm run test:integration` passed with 5/5 against the loopback PostgreSQL 17 container; Debian, Fedora, Arch, openSUSE, and Alpine container rows passed unit, syntax, packaging, and CLI smoke checks. Windows and macOS were not runnable from this Linux host.

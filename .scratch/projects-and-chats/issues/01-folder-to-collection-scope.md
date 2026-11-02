# 01: Turn a shell folder into a collection scope

Type: grilling
Status: resolved
Blocked by: none

## Question

The filter and the pipe forward the shell folder id as a collection reference, but no route creates a collection and `src/postgres-store.js` keeps collection writes behind the storage seam. Decide the bridge: does the gateway create the collection on first sight of a folder id, does the shell call an explicit route, or does ingest accept the folder id itself? For each option, say what happens when the folder does not exist yet, when a collection exists with no members, and when a stale collection outlives its folder in the shell. The decision must keep V8 true: one source of truth per record type, no mirrored folder names.

## Acceptance criteria

- A decision recorded in this ticket and a line added to the map's Decisions so far.
- The chosen path names the exact route, request shape and error code for an unknown folder.
- The alternative rejected with the reason it loses, not a ranking.

## Answer

Implemented the ingest bridge. `POST /v1/documents/ingest` accepts the optional `document.collections` array of opaque shell folder ids. For the authenticated owner, the storage write path idempotently creates each missing `collections` row, replaces the document's `document_collections` membership set, and commits both with the document and segments. A repeated ingest does not duplicate either row. A foreign collection id fails closed with HTTP `400` and `invalid_request`; an unknown id is not an error on ingest because it is created for that owner.

Retrieval keeps reads side-effect free. `POST /v1/retrieval/query` with an unknown collection id, a known collection with no members, or an explicit empty `collection_ids` array returns HTTP `200` with `matches: []`; no collection row is created by the read. There is therefore no unknown-folder retrieval error code. The collection id is stored as opaque text and `collections` has only `collection_id`, `owner_id`, and `created_at`; folder labels remain in Open WebUI.

Evidence: `src/gateway-server.js` validates the ingest collection list and retrieval scope; `src/postgres-store.js` creates collections and memberships inside the document transaction; `docker/postgres/init/005-collections.sql` already supplied the owner-scoped composite foreign keys and no migration was needed. The three integration tests in `test/integration/gateway.test.js` assert HTTP responses and `storage.exportOwner()` rows through public seams; the updated PostgreSQL scope tests cover the changed unknown-collection write contract.

Exact verification commands:

```bash
DATABASE_URL='postgres://rag:rag@127.0.0.1:32768/rag' pnpm migrate
TEST_DATABASE_URL='postgres://rag:rag@127.0.0.1:32768/rag' pnpm run verify
```

The disposable `pgvector/pgvector:pg17` container was removed after verification. The explicit-route alternative was rejected because it adds a shell round trip and a second write contract without improving ownership or atomicity; creating on ingest keeps the collection and membership write atomic with the document while preserving one source of truth. Commit: to be filled after commit.

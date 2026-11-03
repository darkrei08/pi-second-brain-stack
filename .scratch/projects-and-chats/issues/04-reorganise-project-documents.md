# 04: Reorganise the documents inside a project

Type: grilling
Status: resolved
Blocked by: none

## Question

The operator wants to reorganise documents inside a project: move one between projects, rename its display name, and order them. Decide which of these are ours at all: the corpus keeps documents bound to collections by membership, so moving is a membership change and is ours; a display name may belong to the shell or to us; ordering is presentation unless retrieval uses it. For each, name the route, the effect on citations already issued, and what a moved document does to a chat that cited it yesterday.

## Acceptance criteria

- One decision per operation: move, rename, order, each with an owner (shell or gateway).
- For move: the route, the transaction boundary, and the statement about existing citations.
- No ordering feature unless a retrieval consequence is named.

## Answer

Move belongs to the gateway because it changes persisted retrieval membership. `POST /v1/documents/collections/move` accepts one `document_id` and one existing owner-scoped `collection_id`; the storage seam locks the document and target collection, deletes the document's prior memberships, inserts the target membership, and commits as one transaction. It is idempotent for the same target and leaves exactly one membership.

Rename belongs to Open WebUI because project/document display names are presentation metadata owned by the shell; the gateway keeps collection ids opaque and adds no route. Order also belongs to the shell because no retrieval contract uses document order; no ordering route or schema was added.

Citations already issued are not invalidated by a move: they carry document/segment identity and source/segment hashes, not collection membership. A chat that cited the document yesterday remains revalidatable, while future retrieval includes it only in its new collection scope.

## Verification

The move route is covered by `test/gateway-server.test.js` and the live gateway integration; the PostgreSQL storage test proves replacement and one-row membership under the transaction seam.

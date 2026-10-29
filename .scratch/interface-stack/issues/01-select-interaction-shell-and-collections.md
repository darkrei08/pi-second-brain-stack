# 01: Select the interaction shell and the context-grouping model

Type: decision
Status: resolved
Blocked by: None

## Question

Which shell is the primary human surface, and where do conversations, pins, folders, attachments, and user identity live, so that a person can chat, attach documents, pin chats, and group chats into folders that actually scope retrieval instead of only labelling it?

## Context

All storage, retrieval, citation, freshness, registry, backfill, and provider seams are implemented and verified. The HTTP gateway is not implemented. Our storage has no conversation, collection, or folder dimension, and no reviewed shell treats its folders as a scope over an external corpus. Evidence and comparison: `../research.md`.

## Acceptance criteria

- [x] V1 shell is chosen with a two-line justification against MIT/Apache licences and the required UX.
- [x] V2 records who owns conversation, pin, and folder state: shell, gateway, or both with a defined source of truth.
- [x] V3 decides whether a folder is a retrieval scope and, if so, whether a collection dimension is added to documents and to the retrieval filters.
- [x] V4 records where an attachment is ingested, including the provenance and deletion consequences.
- [x] V5 defines the mapping between shell users and our owner-scoped `owner_id`.
- [x] The gateway contract in `docs/implementation-brief.md` is updated with the resulting endpoints.
- [x] No client is installed, vendored, or configured by this ticket.

## Non-goals

Installing or deploying a shell, licence procurement, UI implementation, branding decisions, and multi-tenant identity providers.

## Answer

- V1: Open WebUI is primary. It alone forwards `body.folder_id` and readable `body.files` through an `inlet` filter with verified caller identity to an external retrieval hook without shell patching; its branding clause is inert for a single-owner deployment under fifty end users.
- V2: The shell owns conversations, pins, and folders. The gateway owns documents, segments, collections, and citations. No record type is mirrored, and each has one source of truth.
- V3: A folder is a retrieval scope implemented by collection references on documents and retrieval-seam filters. Shell file ids are not the scope because the identities differ and the hook descriptors are not verified to carry our ids.
- V4: The shell `file_handler` sends attachments to `POST /v1/documents/ingest`, preserving page and box provenance; deletion follows the existing storage cascade.
- V5: One configured mapping row maps shell user id to `owner_id`; the owner is derived server-side from authenticated identity and never accepted from the body.
- V6: We own an ingest-and-query API with one Open WebUI retrieval filter and one Pipe for research mode; we do not implement the LibreChat RAG contract.
- V7: The shell alone stores conversations, pins, and folders. It is an accepted second store with separate backup and deletion boundaries: conversations in the shell, documents and citations in ours; nothing about the corpus leaves our store.

Clause 4 of the Open WebUI License permits branding removal at up to fifty end users in a rolling thirty-day period.

Research and evidence: `.scratch/interface-stack/research-ui-landscape.md` and `.scratch/interface-stack/media/`.

## Comments

Resolved on 2026-10-29. No client was installed, vendored, or configured.

# 01: Select the interaction shell and the context-grouping model

Type: decision
Status: open
Blocked by: None

## Question

Which shell is the primary human surface, and where do conversations, pins, folders, attachments, and user identity live, so that a person can chat, attach documents, pin chats, and group chats into folders that actually scope retrieval instead of only labelling it?

## Context

All storage, retrieval, citation, freshness, registry, backfill, and provider seams are implemented and verified. The HTTP gateway is not implemented. Our storage has no conversation, collection, or folder dimension, and no reviewed shell treats its folders as a scope over an external corpus. Evidence and comparison: `../research.md`.

## Acceptance criteria

- [ ] V1 shell is chosen with a two-line justification against MIT/Apache licences and the required UX.
- [ ] V2 records who owns conversation, pin, and folder state: shell, gateway, or both with a defined source of truth.
- [ ] V3 decides whether a folder is a retrieval scope and, if so, whether a collection dimension is added to documents and to the retrieval filters.
- [ ] V4 records where an attachment is ingested, including the provenance and deletion consequences.
- [ ] V5 defines the mapping between shell users and our owner-scoped `owner_id`.
- [ ] The gateway contract in `docs/implementation-brief.md` is updated with the resulting endpoints.
- [ ] No client is installed, vendored, or configured by this ticket.

## Non-goals

Installing or deploying a shell, licence procurement, UI implementation, branding decisions, and multi-tenant identity providers.

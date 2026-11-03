# Identity and work groups

Type: map
Status: open

## Destination

Several collaborators, organised in work groups. An administrator sets the environment up and approves registrations in the shell. A work group is the isolation boundary: documents loaded into the group, and into a project inside it, are retrievable by its members and by nobody else. The shell stays the single source of truth for users, credentials, roles and memberships; the backend keeps owning documents, segments, collections and citations, with retrieval scoped to the group.

## Notes

The gap analysis behind this map read the code and read Open WebUI 0.6.5 rather than assuming. Its evidence is quoted per ticket. Settled before this map: the repository is not TypeScript, the primary surface is Open WebUI, and the split into three repositories is charted in [repo split](../repo-split/map.md).

## Decisions so far

- **The shell owns identity.** Open WebUI already promotes the first signup to administrator, assigns `pending` to new registrations under `DEFAULT_USER_ROLE=pending`, keeps credentials and JWT sessions, and offers RBAC groups at `/api/v1/groups/`. Rebuilding any of that in the backend would create the second source of truth this project has refused twice already, for project instructions and for tags.
- **The group is the owner.** `owner_id` is already the security principal in PostgreSQL, with 1:1 owner uniqueness on `documents(document_id, owner_id)` and `collections(collection_id, owner_id)`. A work group owns documents as `urn:group:<group_id>`, which needs no ACL tables and no migration that rewrites stored rows.
- **A caller never names its own owner.** `rejectCallerOwner` in `src/gateway-server.js` refuses `owner_id` in a body with `400 invalid_request`, and that stays. The owner is derived server-side from the authenticated principal.
- **Attachments stay out of band.** Ticket 09 of the projects-and-chats map recorded that a filter receives only metadata references and that shell extraction is asynchronous with no ordering guarantee, so a chat attachment cannot be ingested synchronously before the filter runs. Loading a document into a group is an explicit ingest.
- **A shared token plus a bare user header is not identity.** The filter receives `id`, `email`, `name` and `role` in `__user__` but no group membership, so any holder of the shared bearer token could forge `x-shell-user-id`. The handoff has to be signed, and ticket 04 decides how.

## Why this supersedes the earlier drafts

The repo-split map carried tickets 05 to 11 for identity, groups, scoping, group chats and the end-to-end sweep. They duplicated this program with less evidence. They are dropped, and this map is the one plan: repo-split keeps the repository and contract work, this keeps the product work.

## Open questions

- Whether the gateway needs an administrative token of its own at all, given that `GATEWAY_PRINCIPALS` already maps a token to an owner.
- How a person who belongs to several work groups binds a new folder to one of them in the shell's own folder settings.
- Whether the handoff is a short-lived signed claim per request or a per-user token issued once, which ticket 04 decides with the cost of each written down.

## Ticket order

1. First-run administrator and the handoff to the gateway.
2. Registration the administrator controls.
3. Work groups and memberships, with the shell as authority.
4. How the gateway resolves the owner and verifies the shell's claim.
5. Documents scoped to a group and to a project inside it.
6. Chats started inside a group.
7. A document attached inside a chat: refuse it or ingest it.
8. The filter signs the claim, and the gateway refuses a secret equal to a token.
8. The end-to-end isolation proof, including every path the operator named.

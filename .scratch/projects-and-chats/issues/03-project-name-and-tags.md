# 03: Name a project and label it with tags

Type: grilling
Status: resolved
Blocked by: none

## Question

The operator wants to rename a project and label it with tags or hashtags. Verify what the shell already offers: whether folders carry a name the shell owns, whether tags attach to conversations only, and whether a folder can be renamed without touching our collection rows. Decide what remains for us: a tag dimension on collections, a search route over tags, or nothing at all because the shell already covers it.

## Acceptance criteria

- Verified inventory of the shell's own naming and tagging capability, with URLs.
- Either a decision to implement tags on collections with the exact schema and route, or a recorded "the shell owns it" with the reason.
- If a schema change is needed, it is a forward-only migration numbered after the last one in `docker/postgres/init`.

## Answer

Open WebUI owns both sides of this request. Its official organization documentation describes named folders/projects and conversation tags, and its history search documents searching tags with `tag:<name>`: <https://docs.openwebui.com/features/chat-conversations/chat-features/conversation-organization/> and <https://docs.openwebui.com/features/chat-conversations/chat-features/history-search/>. Folder/project renaming therefore stays in the shell and does not touch our collection rows.

Decision: do not add collection tags, a tag search route, validation, or migration `006`. The gateway's `collections` table remains an opaque retrieval-scope bridge, as settled by V8; adding labels would mirror shell-owned names or conversation metadata and create a second source of truth.

## Verification

The two official pages above were fetched successfully on 2026-11-03 (HTTP 200). This is a documentation/decision resolution, so no red/green behavior test or schema change was added.

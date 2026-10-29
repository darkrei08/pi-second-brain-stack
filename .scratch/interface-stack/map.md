# Wayfinder: interaction surface and context grouping

## Destination

Decide the human interaction surface for the private RAG and the model behind context grouping: a chat UI where a person can talk to the corpus, attach further documents in the conversation, pin chats, and group chats into folders that stand for a context or a theme.

## Dependency position

Already sealed: segmentation and provenance, PostgreSQL persistence, exact semantic and hybrid retrieval, citation resolution and freshness revalidation, embedding-model registry, backfill planning and execution, provider adapter, retrieval-mode description.

Not implemented: the HTTP gateway (open issue for gateway and authentication). This Wayfinder is the input that should shape that gateway contract, because chat identity, attachment routing, and folder scoping all cross the gateway boundary.

Current storage has no notion of a conversation, a collection, or a folder: `documents` is owner-scoped and flat, and retrieval filters on owner, retention, model, and dimension only.

## Candidate shells

| Candidate | Licence position | Organization primitives | Evidence |
|---|---|---|---|
| LibreChat | MIT | Projects (folder-like), pinned conversations, per-project instructions and files | `research.md` |
| Open WebUI | BSD-3 up to v0.6.5, then the Open WebUI licence with a branding restriction above 50 users | Nested folders, pinned chats, knowledge bases, per-folder prompts and files | `research.md` |
| AnythingLLM | MIT (self-hosted terms) | Workspaces with threads; folders inside a workspace were closed as not planned | `research.md` |
| LobeChat | Apache-2.0 with additional commercial conditions from 1.0 | Session groups and pinning | `research.md` |

## Decisions to take

- V1: which shell is the primary surface (the implementation brief currently recommends LibreChat).
- V2: whether conversations, pins, and folders live in the shell, in our gateway, or are mirrored in both.
- V3: whether a folder is only an organizational label or a retrieval scope that filters documents by collection.
- V4: where an attachment goes: the shell's own RAG, or our `/v1/documents/ingest` path.
- V5: identity and ownership mapping between shell users and our `owner_id`.

## Known gap

No reviewed shell treats its folders as a scope over an external corpus. Folder-scoped retrieval therefore needs a real model in our storage (a collection or folder dimension on documents) plus a filter in the retrieval seams; attaching it to a shell's own folder concept would only look integrated while retrieval stayed global.

## Safety boundary

- Research and specification only until V1-V5 are decided; no client is installed, configured, or vendored in this slice.
- No corpus, credential, provider endpoint, or licence-key material enters the repository.
- Any future shell integration keeps the gateway as the only application boundary and the private-by-default network policy intact.

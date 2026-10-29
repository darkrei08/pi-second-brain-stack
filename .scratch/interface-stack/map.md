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
- V3: whether a folder is only an organizational label or a retrieval scope that filters documents by collection. Verified inputs: Open WebUI can forward `folder_id` to us; LibreChat cannot forward a project id. If V3 is yes, `issues/02-collections-as-retrieval-scope.md` is the implementation.
- V4: where an attachment goes: the shell's own RAG, or our `/v1/documents/ingest` path.
- V5: identity and ownership mapping between shell users and our `owner_id`.
- V6: which retrieval contract we own, a LibreChat-compatible RAG subset or our own ingest-and-query API plus shell glue.
- V7: whether we accept the shell as a second store for conversations, pins, and folders, with its own backup and deletion boundary.

## Integration findings (verified from source)

The contract details now come from the upstream repositories, not from documentation summaries. LibreChat: 12 RAG routes, request models without an owner field, identity from a shared HS256 JWT (`user.id`), structural owner scoping in `app/scope.py`, and `entity_id` carrying the agent id rather than a project id, so projects cannot scope retrieval without patching the shell. Open WebUI: an `inlet` filter can read `folder_id` and `files` before the pipeline pops them, so a folder can be forwarded as a scope.

Implementation ticket `issues/02-collections-as-retrieval-scope.md` carries the storage and retrieval work that both paths need; it is blocked by this decision.

## Earlier integration notes

`research-integration.md` records what each shell demands from us. LibreChat routes chat through `endpoints.custom[].baseURL`, but for custom endpoints it forces attachments through its own RAG service (`RAG_API_URL`, routes `/query`, `/query_multiple`, `/text`, and document management), so keeping one provenance store means implementing that contract over our storage, including its authorization model. Open WebUI can delegate retrieval to an external service from a Filter function with `file_handler`, and a Pipe can expose the external RAG as a model, so it keeps our corpus as the only store at the cost of a licence that restricts branding above 50 users.

## Known gap

No reviewed shell treats its folders as a scope over an external corpus. Folder-scoped retrieval therefore needs a real model in our storage (a collection or folder dimension on documents) plus a filter in the retrieval seams; attaching it to a shell's own folder concept would only look integrated while retrieval stayed global.

## Safety boundary

- Research and specification only until V1-V5 are decided; no client is installed, configured, or vendored in this slice.
- No corpus, credential, provider endpoint, or licence-key material enters the repository.
- Any future shell integration keeps the gateway as the only application boundary and the private-by-default network policy intact.

# Wayfinder: interaction surface and context grouping

## Destination

Decide the human interaction surface for the private RAG and the model behind context grouping: a chat UI where a person can talk to the corpus, attach further documents in the conversation, pin chats, and group chats into folders that stand for a context or a theme.

## Dependency position

Already sealed: segmentation and provenance, PostgreSQL persistence, exact semantic and hybrid retrieval, citation resolution and freshness revalidation, embedding-model registry, backfill planning and execution, provider adapter, retrieval-mode description.

Not implemented: the HTTP gateway (open issue for gateway and authentication). This Wayfinder is the input that should shape that gateway contract, because chat identity, attachment routing, and folder scoping all cross the gateway boundary.

Current storage has no notion of a conversation, a collection, or a folder: `documents` is owner-scoped and flat, and retrieval filters on owner, retention, model, and dimension only.

## Candidate shells

The wider comparison and its evidence live in `research-ui-landscape.md`.

| Candidate | Licence position | Organization primitives | Evidence |
|---|---|---|---|
| LibreChat | MIT | Projects (folder-like), pinned conversations, per-project instructions and files | `research.md` |
| Open WebUI | BSD-3 up to v0.6.5, then the Open WebUI licence with a branding restriction above 50 users | Nested folders, pinned chats, knowledge bases, per-folder prompts and files | `research.md` |
| AnythingLLM | MIT (self-hosted terms) | Workspaces with threads; folders inside a workspace were closed as not planned | `research.md` |
| LobeChat | Apache-2.0 with additional commercial conditions from 1.0 | Session groups and pinning | `research.md` |

## Decisions

- V1: Primary surface: Open WebUI. It is the only evaluated shell that forwards a folder scope (`body.folder_id`, `body.files` readable in an `inlet` filter) and a verified caller identity into an external retrieval hook without patching the shell; its branding clause is inert for a single-owner deployment under fifty end users.
- V2: The shell owns conversation, pin, and folder state. Our gateway owns document, segment, collection, and citation state. No record type is mirrored between the two; each has exactly one source of truth.
- V3: A folder is a retrieval scope: a collection reference on documents plus a filter in the retrieval seams. Shell file ids are rejected as the scope because document and shell file identities differ and the hook's file descriptors are not verified to carry our ids.
- V4: An attachment is ingested into our store through the shell's `file_handler` hook into `POST /v1/documents/ingest`, preserving page and box provenance; deletion follows the existing cascade path in the storage seam.
- V5: One configured mapping row maps the shell user id to our `owner_id`. `owner_id` is always derived server-side from the authenticated identity and never accepted from a request body.
- V6: We own an ingest-and-query API plus shell glue: one Open WebUI filter for retrieval and one Pipe to expose research mode as a model. We do not implement the LibreChat RAG contract.
- V7: The shell is the only store for conversations, pins, and folders. It is an accepted second store, with separate backup and deletion boundaries: conversations in the shell, documents and citations in ours. Nothing about the corpus leaves our store.
- V8: A collection is the persisted retrieval scope: `collections` plus `document_collections` with composite owner foreign keys, written only by ingest, filtered by every retrieval seam through an optional `collection_ids` list. Memberships carry no label because the shell owns folder names, and a shell file ID is explicitly rejected as the scope. Implemented in `005-collections.sql` and `src/postgres-store.js`; resolved in `issues/02-collections-as-retrieval-scope.md` with commits `6e296cc` and `ebec794`.

UI captures are stored in `.scratch/interface-stack/media/`.

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

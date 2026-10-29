# Research: shell-to-gateway integration mechanics

Retrieved 2026-10-29 through the reusable-data-search routes: direct HTTP fetch via `bin/search.mjs` and Pi `web_search` for discovery. Freshness is recorded per record. Claims marked "not verified" were not confirmed from a primary source.

## Why this differs from the feature comparison

`research.md` compares what each shell offers to a user. This document compares what each shell requires from us: which endpoints our gateway must expose, where an attachment is ingested, and whether a folder can constrain retrieval.

## LibreChat

### Chat transport

- Custom endpoints are declared in `librechat.yaml` under `endpoints.custom[]` with `name`, `apiKey`, `baseURL`, `models.default[]`, and optional `titleConvo`, `titleModel`, `modelDisplayLabel`, `headers`, `fetch`, `addParams`, `dropParams`, `tenantId`. A custom endpoint therefore reaches our gateway by pointing `baseURL` at it.
- Evidence: <https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/custom_endpoint> (http, fresh, 2026-10-29).

### Attachments

- LibreChat runs a separate FastAPI RAG service backed by PostgreSQL and pgvector, wired through `RAG_API_URL`. Custom endpoints support files **through the RAG API**, not by uploading to the model provider; OpenAI, Azure, Google, Anthropic, and Bedrock are the ones that support direct provider upload.
- Evidence: <https://www.librechat.ai/docs/configuration/rag_api> and <https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/file_config> (http, fresh, 2026-10-29).
- Consequence: if we keep one provenance store, we must implement a LibreChat-compatible RAG service over our storage and point `RAG_API_URL` at it. The alternative, running the bundled RAG service, duplicates the corpus into a second vector store outside our retention, deletion, and citation guarantees.
- Contract shape: routes observed in the upstream repository material are `/query`, `/query_multiple`, `/text`, plus document management (`POST /documents`, `GET /documents`, `GET /documents/{id}/context`, `DELETE /documents`, `GET /ids`). Exact request and response schemas are **not verified** here; the upstream repository is authoritative.
- Security history worth carrying into any implementation: the upstream RAG API had authorization defects where a caller-supplied `file_id` decided access, `POST /query` authorized the whole result set from the first hit, `GET /ids` listed every file id, and `POST /query_multiple` performed no authorization. A compatible implementation must scope by authenticated owner and by segment/document ownership, never by a client-named file id.
- Evidence: <https://github.com/danny-avila/rag_api> (http, fresh, 2026-10-29; content as served includes the authorization notice).

### Organisation

- Projects are folder-like, with shared instructions and reference files; conversations can be pinned. Whether a project id is forwarded to a custom endpoint as request metadata is **not verified**.

## Open WebUI

### Chat transport

- Any OpenAI-compatible provider is configured under Admin → Connections: URL, API key, optional model IDs. `GET /v1/models` is recommended, `POST /v1/chat/completions` required, and `POST /v1/embeddings` only when the connection also supplies embeddings.
- Evidence: <https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible/> (search record, fresh, 2026-10-29).

### Retrieval

- A Filter Function with `file_handler` can skip the built-in RAG entirely and retrieve from an external service; `inlet()` runs before retrieval and `request()` after it. A Pipe Function makes an external RAG appear as a separate selectable model.
- Evidence: <https://docs.openwebui.com/features/extensibility/plugin/functions/filter/> and <https://docs.openwebui.com/features/extensibility/plugin/functions/pipe/> (search records, fresh, 2026-10-29). A direct fetch of the older `features/extensibility/pipelines` URL failed (provider error, 2026-10-29); the plugin-function pages are the current route.
- Consequence: Open WebUI is the lighter integration for an external corpus, because retrieval can be delegated without implementing a foreign RAG contract.

### Organisation

- Nested folders, pinned chats, knowledge bases, and per-folder prompts and files. Whether folder membership reaches a Filter function as a scope is **not verified**; the closest documented analogue is a knowledge base attached to a conversation or model.

## Integration matrix

| Question | LibreChat | Open WebUI |
|---|---|---|
| Chat reaches our gateway | `endpoints.custom[].baseURL` | Admin connection URL `/v1` |
| Endpoints our gateway must serve | `/v1/chat/completions`, `/v1/models`, plus a LibreChat-compatible RAG service | `/v1/chat/completions`, `/v1/models`, plus a retrieval endpoint called from a Filter/Pipe |
| Attachment ingestion | forced through `RAG_API_URL` for custom endpoints | delegated by `file_handler`, or by a Pipe |
| Duplicate corpus risk | high unless the RAG contract is implemented over our storage | low, retrieval can stay external |
| Folder as retrieval scope | not verified | not verified |
| Effort to keep provenance | implement a foreign contract including its authorization model | implement our own endpoint and a small plugin |
| Licence | MIT | BSD-3 to v0.6.5, then Open WebUI licence with branding restriction above 50 users |

## Impact on the open decisions

- V1 shell: the earlier recommendation of LibreChat stands on licence and UX, but it now carries an integration cost: a LibreChat-compatible RAG service is mandatory to avoid a second vector store. Open WebUI is cheaper to integrate and more expensive to brand at scale.
- V4 attachment routing: for LibreChat the attachment must travel the RAG API contract; for Open WebUI a Filter can call our ingest path.
- New V6: which retrieval contract do we own, a LibreChat-compatible subset (`/query`, `/query_multiple`, `/text`, document management) or our own ingest-and-query API plus shell glue?
- New V7: do we accept the shell as a second store for conversations, pins, and folders, given that its backup and deletion boundary is then outside ours?

## Not verified

- Exact LibreChat RAG API schemas (request and response bodies, auth headers).
- Whether LibreChat forwards a project/collection identifier to a custom endpoint or to the RAG service.
- Whether Open WebUI exposes folder membership to Filter functions.
- Any end-to-end run: no shell was installed, no gateway exists yet, and no container was started for this research.

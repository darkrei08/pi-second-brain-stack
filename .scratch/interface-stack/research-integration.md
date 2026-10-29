# Research: shell-to-gateway integration mechanics

Retrieved 2026-10-29 through the reusable-data-search routes (direct HTTP fetch via `bin/search.mjs`, Pi `web_search` for discovery) and verified against upstream source: `LibreChat-AI/rag-api` (shallow clone) and `danny-avila/LibreChat` (sparse clone of `api/`). Claims are marked verified or not verified; nothing below is inferred from a feature page.

## Why this differs from the feature comparison

`research.md` compares what each shell offers a user. This document compares what each shell requires from us: which endpoints our gateway must expose, where an attachment is ingested, and whether a folder can constrain retrieval.

## LibreChat

### Chat transport (verified)

Custom endpoints are declared in `librechat.yaml` under `endpoints.custom[]` with `name`, `apiKey`, `baseURL`, `models.default[]`, and optional `titleConvo`, `titleModel`, `modelDisplayLabel`, `headers`, `fetch`, `addParams`, `dropParams`, `tenantId`. Pointing `baseURL` at our gateway is the whole chat integration.

Evidence: <https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/custom_endpoint> (http, fresh, 2026-10-29).

### Attachments: the RAG API contract (verified from source)

LibreChat sends custom-endpoint attachments to its own FastAPI RAG service at `RAG_API_URL`, never to the model provider. The service is small enough to be implemented compatibly over our storage.

Routes, from the decorators in `app/routes/document_routes.py`:

```text
GET    /ids                          GET  /health
GET    /documents                    DELETE /documents
GET    /documents/{id}/context       POST /query
POST   /query_multiple               POST /text
POST   /embed                        POST /embed-upload
POST   /local/embed
```

Request models, from `app/models.py`:

```python
class QueryRequestBody(BaseModel):   # POST /query
    query: str; file_id: str; k: int = 4; entity_id: Optional[str] = None
class QueryMultipleBody(BaseModel):  # POST /query_multiple
    query: str; file_ids: List[str]; k: int = 4; entity_id: Optional[str] = None
class StoreDocument(BaseModel):      # ingest
    filepath: str; filename: str; file_content_type: str; file_id: str
```

No request body carries an owner. Authorization is structural, in `app/scope.py`: the caller identity comes from a verified JWT, the store predicate is always `(owner, file)` and is applied before ranking, and a chunk with no recorded owner is out of scope. An `entity_id` in the body *widens* the owner set rather than replacing it and is documented upstream as caller-asserted, so a deployment open to untrusted callers must authorize entity access upstream.

Authentication, from `app/middleware.py`: `Authorization: Bearer <JWT>`, HS256, signed with `JWT_SECRET`; `request.state.user` becomes the scope owner via `user.id` or `public`; if `JWT_SECRET` is absent the service runs unauthenticated in single-owner mode.

Historical note: earlier upstream material described authorization defects where a caller-supplied `file_id` decided access, `GET /ids` listed every file, `POST /query` authorized a whole result set from the first hit, and `POST /query_multiple` performed no authorization. The current source addresses them through `app/scope.py`; the defects remain a design warning for anyone implementing the contract.

Evidence: <https://github.com/LibreChat-AI/rag-api> (`app/models.py`, `app/scope.py`, `app/middleware.py`, `app/routes/document_routes.py`, 2026-10-29), <https://www.librechat.ai/docs/configuration/rag_api>.

### Project or folder propagation (verified negative)

- `entity_id` is the **agent** id, not a project id: `api/app/clients/tools/util/handleTools.js:388` (`entity_id: agent?.id`), with tests asserting `sends entity_id only for agent knowledge-base files` and `omits entity_id when fromAgent is not set (safe default)`.
- A project id exists server-side (`api/server/services/Threads/manage.js:87`, `req.chatProjectContext?.projectId`), but it is not sent to the RAG service.
- Consequence: a LibreChat project cannot scope retrieval through its RAG contract today. Making it do so means patching LibreChat or accepting a globally scoped corpus behind a folder-shaped UI.
- Ingest payload side: `api/server/services/Files/process.js` builds `{ filepath, file_id, ... }`, matching `StoreDocument` and confirming that ownership is derived from the JWT, not from the payload.

Evidence: `danny-avila/LibreChat` sparse clone of `api/`, 2026-10-29.

## Open WebUI

### Chat transport (verified)

Any OpenAI-compatible provider is configured under Admin → Connections with URL, API key, and optional model IDs; `GET /v1/models` is recommended, `POST /v1/chat/completions` required, `POST /v1/embeddings` only when the connection supplies embeddings.

Evidence: <https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible/>.

### Retrieval and folder scope (verified)

From the filter documentation: the pipeline pops `features`, `tool_ids`, `terminal_id`, `files`, `folder_id`, and `skill_ids` from the body **after `inlet` returns**, so an `inlet` filter is the only place that can read them. `file_handler` is the documented way to skip built-in RAG and retrieve externally, while `request` runs after retrieval and sees the `<source>` chunks. A Pipe function makes an external RAG appear as a selectable model.

Consequence: an inlet filter can forward `body.folder_id` and `body.files` to our retrieval endpoint, so "folder as retrieval scope" is reachable in Open WebUI without patching the shell, provided the shell's folder id is meaningful to us (see V3).

Evidence: <https://docs.openwebui.com/features/extensibility/plugin/functions/filter/>, <https://docs.openwebui.com/features/extensibility/plugin/functions/pipe/> (2026-10-29; the older `features/extensibility/pipelines` URL no longer resolves).

### Organisation (verified)

Nested folders, pinned chats, knowledge bases, and per-folder prompts, models, and files.

Evidence: <https://docs.openwebui.com/features/chat-conversations/chat-features/conversation-organization/>, <https://docs.openwebui.com/features/workspace/knowledge/>.

## Integration matrix

| Question | LibreChat | Open WebUI |
|---|---|---|
| Chat reaches our gateway | `endpoints.custom[].baseURL` | Admin connection URL `/v1` |
| Endpoints we must serve | `/v1/chat/completions`, `/v1/models`, plus a LibreChat-compatible RAG service (12 routes) | `/v1/chat/completions`, `/v1/models`, plus our own retrieval endpoint called from an inlet filter |
| Attachment ingestion | forced through `RAG_API_URL` | delegated by `file_handler`, or by a Pipe |
| Identity available to us | `user.id` from the shared HS256 JWT | whatever the filter forwards from `__user__` |
| Folder as retrieval scope | not possible without patching: project id is not forwarded | possible: `folder_id` is readable in an inlet filter |
| Duplicate corpus risk | high unless we implement the RAG contract over our storage | low |
| Licence | MIT | BSD-3 to v0.6.5, then Open WebUI licence with branding restriction above 50 users |

## Impact on the open decisions

- V1 shell: LibreChat stays the better product surface and licence, but folder scope requires patching it; Open WebUI buys folder scope through an inlet filter at the cost of its branding clause.
- V3 folder as retrieval scope: reachable in Open WebUI (`folder_id`), unreachable in LibreChat without patching.
- V4 attachment routing: a LibreChat-compatible RAG service (implementable, contract above) or an inlet-filter call to our ingest path.
- V5 identity: the LibreChat path maps `user.id` from a shared HS256 JWT to our `owner_id`, which places the RAG service inside a shared-secret trust boundary and makes `JWT_SECRET` a second root credential to manage.
- V6 retrieval contract: a LibreChat-compatible subset (`/query`, `/query_multiple`, `/text`, `/embed`, `/documents`, `/documents/{id}/context`, `/ids`, `/health`) or our own ingest-and-query API plus shell glue.
- V7 second store: unchanged; both shells would still own conversations, pins, and folders.

## Still not verified

- No end-to-end run: no shell installed, no gateway exists, no container started.
- Response bodies of `/query` and `/query_multiple` in the upstream service (request models are verified; `GET /documents` returns `list[DocumentResponse{page_content, metadata}]`).
- Whether a Pipe sees `folder_id` the way an inlet filter does.
- Runtime limits: chunk sizes, embedding batching, and timeout behaviour of the upstream RAG service.

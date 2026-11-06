# Spec: Open WebUI gateway glue

## Problem statement

Open WebUI is the ratified primary shell, but its folder id must become the gateway's collection scope and its research mode must use the gateway's existing grounded-answer contract. The shell is not installed here, so the implementation must be portable, self-contained, and contract-tested without claiming shell runtime proof.

## Public seams

Two Open WebUI Python Functions are copied into the shell by an administrator:

- `openwebui/filter.py`: `Filter.inlet(body, __user__) -> body`
- `openwebui/pipe.py`: `Pipe.pipes() -> list[dict]` and `Pipe.pipe(body, __user__) -> str`

The modules use only Python standard-library transport. Open WebUI's runtime may provide its normal Pydantic environment, but the modules must remain importable in the local test environment without Open WebUI installed.

## Contract

### Filter

- Read `body.folder_id` during `inlet`; this is the only filter phase that can see the folder id.
- If no non-empty string folder id is present, return the body unchanged and make no gateway call.
- Extract the latest non-empty user message, then call the configured gateway `POST /v1/retrieval/query` with JSON:

```json
{"query":"<latest user text>","collection_ids":["<folder_id>"],"limit":6}
```

- Send `Authorization: Bearer <configured token>` and `x-shell-user-id: <__user__.id>` when an id is available. Never send `owner_id`.
- Inject one idempotent system message containing only bounded retrieved matches, marked as untrusted document evidence. Do not log the query, response, or source text.
- A scoped gateway or decode failure raises an error; it must not return the unscoped original request.
- The injected evidence is bounded to 6 matches and 4000 characters per match. The gateway remains responsible for owner, collection, and citation validation.

### Pipe

- `pipes()` returns one model definition: `{"id":"research","name":"Research"}`.
- Extract the latest non-empty user message from `body.messages`; fail if no question exists.
- If `body.folder_id` is a non-empty string, call existing `POST /v1/answers` with `collection_ids: [folder_id]`; otherwise omit `collection_ids`. Include the configured `embedding_model_id` only when non-empty.
- Send the same bearer and optional shell-user headers as the filter. Never accept or send `owner_id`.
- Return the answer plus citation and uncertainty metadata as readable text. Do not invent or call `/v1/research`.
- A gateway or decode failure raises an error. No question, response body, or credential is logged.

## Invariants

- `folder_id` is forwarded as a one-element `collection_ids` list, never as a shell file id or owner id.
- The modules do not access PostgreSQL, Open WebUI internals, or any new service.
- Network calls use a configured loopback/HTTPS gateway URL and a finite timeout; response JSON must be an object.
- Existing gateway routes and authentication remain unchanged.
- No package dependency, corpus, credential, or model cache enters the repository.

## Acceptance criteria

- [ ] Filter with a folder calls `/v1/retrieval/query` with the exact collection scope and injects bounded evidence.
- [ ] Filter without a folder is a no-op; scoped transport failures fail closed.
- [ ] Pipe advertises exactly one Research model and calls `/v1/answers` with the optional collection scope and embedding model.
- [ ] Pipe renders answer, citations, and uncertainty without logging sensitive payloads.
- [ ] Malformed body/question/folder and malformed gateway JSON fail closed.
- [ ] Python unit/contract tests and syntax checks pass without Open WebUI installed.
- [ ] Existing `npm test` remains green.
- [ ] No Open WebUI end-to-end runtime claim is made.

## Deferred

Open WebUI installation and runtime verification, `POST /v1/chat/completions`, streaming, `POST /v1/research`, attachment `file_handler`, shell-side folder semantics beyond the documented `inlet` contract, and production deployment packaging.

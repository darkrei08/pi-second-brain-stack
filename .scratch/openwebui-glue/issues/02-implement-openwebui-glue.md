# 02: Implement Open WebUI gateway glue

Type: feature
Status: resolved
Blocked by: None

## Question

Can the two Open WebUI Functions implement the ratified filter and Pipe contract against the existing gateway, with unit-level proof and no shell installation?

## Acceptance criteria

- [x] `openwebui/filter.py` implements the inlet folder-to-collection retrieval contract.
- [x] `openwebui/pipe.py` implements the Research Pipe over `POST /v1/answers`.
- [x] Tests cover scoped and unscoped requests, headers, payloads, bounded evidence, errors, and malformed input without Open WebUI installed.
- [x] Sequential full Node suite remains green and no dependency is added.
- [x] ODD feature log, tracker answer, and traceability row record the missing Open WebUI end-to-end evidence.

## Spec

`.scratch/openwebui-glue/spec.md`

## Non-goals

Do not install Open WebUI, add a gateway route, implement chat completions/streaming, implement attachment ingestion, or claim runtime behaviour inside the shell.

## Answer

Implemented in `openwebui/filter.py` and `openwebui/pipe.py`.

- The filter reads `folder_id` in `inlet`, calls `/v1/retrieval/query` with `collection_ids: [folder_id]`, injects bounded untrusted evidence, and fails closed on scoped transport or payload errors.
- The Pipe exposes `Research`, calls `/v1/answers`, forwards the optional collection and embedding-model scope, and renders citations plus uncertainty.
- Standard-library-only transport, optional Pydantic compatibility, no owner body field, and no logging were retained.
- Contract tests run without Open WebUI. `node --test --test-concurrency=1` passes 90 tests with 22 expected integration skips. The default parallel `npm test` was not a valid proof in this worktree because unrelated pre-existing gateway tests race on one server and fail with `ERR_SERVER_ALREADY_LISTEN`.
- Open WebUI end-to-end import, folder propagation, and rendering remain unverified because no Open WebUI instance is installed.

Commit: `0ca115f`

## Comments

Published from resolved decision `.scratch/openwebui-glue/issues/01-glue-contract.md` on 2026-11-06. Implementation stayed within the ready-for-agent spec.

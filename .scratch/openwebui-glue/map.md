# Wayfinder: Open WebUI glue

## Destination

Deliver the two client-side glue modules ratified by interface decision V6: one Open WebUI inlet filter that makes a folder a gateway collection scope, and one Pipe that exposes research mode through the existing answer gateway.

## Dependency position

Already sealed: Open WebUI is the primary shell (V1), the shell owns conversation/folder state (V2), folders map to gateway collections (V3), attachments belong in the gateway (V4), shell identity maps to server-derived `owner_id` (V5), and the gateway already exposes `POST /v1/retrieval/query` and `POST /v1/answers`.

Known blocker: Open WebUI is not installed in this environment. The modules can be contract-tested without the shell, but shell runtime behaviour cannot be claimed.

## Decision tickets

| Ticket | Question | Status |
|---|---|---|
| [01-glue-contract](issues/01-glue-contract.md) | What exact payload and failure contract should the filter and Pipe use against the existing gateway? | resolved |

## Decisions-so-far

- V6 is inherited and not re-litigated: deliver one inlet filter and one Pipe, not a LibreChat RAG contract or a new gateway route.
- The filter calls `POST /v1/retrieval/query` from `inlet` when `folder_id` and a user question are present, forwarding the folder as `collection_ids: [folder_id]`, then injects the returned matches as bounded untrusted evidence.
- The Pipe calls the existing `POST /v1/answers` route and exposes one selectable `Research` model. It forwards an available folder as `collection_ids: [folder_id]`; it does not invent `/v1/research`.
- Both modules use only Python's standard library for transport and configuration; no package dependency or Open WebUI installation is added. Gateway authentication uses the configured bearer token and the shell user id from `__user__` when available.
- A scoped gateway failure stops the turn instead of silently falling back to global retrieval. No folder leaves the body unchanged in the filter, and no corpus/question/provider body is logged.

## Answer

The ratified contract is recorded in `issues/01-glue-contract.md` and synthesized into `.scratch/openwebui-glue/spec.md`. Implementation is limited to the two self-contained Python Functions and unit/contract tests that run without Open WebUI.

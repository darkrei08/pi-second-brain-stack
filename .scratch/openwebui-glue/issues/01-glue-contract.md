# 01: Define the Open WebUI glue contract

Type: decision
Status: resolved
Blocked by: None

## Question

How should the one inlet Filter and one Pipe call the existing gateway while preserving folder-to-collection scoping, server-derived ownership, bounded evidence, and a truthful no-shell verification boundary?

## Context

Decision V6 in `.scratch/interface-stack/map.md` ratifies one Open WebUI retrieval filter and one Pipe for research mode. The gateway currently exposes `POST /v1/retrieval/query` and `POST /v1/answers`; it does not expose `/v1/research` or an OpenAI-compatible chat-completions route. Open WebUI is not installed on this host.

## Acceptance criteria

- [x] The filter is an Open WebUI `inlet` Function that reads `body.folder_id` before the shell removes it.
- [x] A scoped filter request forwards exactly `collection_ids: [folder_id]` to `POST /v1/retrieval/query` and uses the authenticated shell identity headers.
- [x] The filter injects only bounded, explicitly untrusted retrieved evidence and fails closed on a scoped gateway error.
- [x] The Pipe exposes one selectable Research model and calls existing `POST /v1/answers` with the optional collection scope.
- [x] The modules do not accept or send `owner_id`, do not log corpus/question/provider data, and add no dependency.
- [x] Tests prove the module contracts without an Open WebUI installation and state the missing end-to-end evidence.

## Non-goals

Open WebUI installation or runtime verification, a new gateway route, OpenAI chat-completions streaming, attachment ingestion, a LibreChat compatibility layer, or a second retrieval store.

## Answer

- The filter's `inlet(body, __user__)` extracts the latest user message and `folder_id`. With a valid folder it calls `POST /v1/retrieval/query` using `{query, collection_ids: [folder_id], limit}` and injects the response matches into a marked untrusted system message. A missing folder passes the body through unchanged. Errors for a scoped request propagate so retrieval never silently widens to the whole corpus.
- The Pipe's `async pipe(body, __user__)` extracts the latest user message and an optional `folder_id`, calls `POST /v1/answers` with `{question, collection_ids: [folder_id]}` plus the configured embedding model when set, and returns the answer with citation/uncertainty metadata rendered as text. It exposes one model named `Research`.
- Both modules use standard-library JSON/URL transport with a bounded timeout, a configured bearer token, and `x-shell-user-id` from `__user__.id` when present. They never accept `owner_id` from shell data.
- Verification is limited to Python unit/contract tests and syntax checks; no Open WebUI end-to-end claim is permitted because no shell is installed.

## Comments

Resolved from the existing V6 decision and gateway source on 2026-11-06. No external product installation or new evidence was needed to choose the bounded contract.

# 01: OpenAI-compatible grounded chat completions

Type: implementation
Status: resolved
Blocked by: None

## Question

Can an OpenAI chat client call the gateway's grounded `answerQuestion` use case through `POST /v1/chat/completions`, first as a buffered response, without weakening authentication, retrieval scoping, citation validation, or uncertainty reporting?

## Acceptance criteria

- [x] Accept an OpenAI-compatible non-streaming request with `messages`, a required latest user message, optional supported `model`, `stream: false` (default), `collection_ids`, `embedding_model_id`, `limit`, and `max_tokens`.
- [x] The authenticated gateway identity determines the owner; reject caller-supplied `owner_id` and never let the request's model override configured `ANSWER_MODEL`.
- [x] Delegate answer generation to `answerQuestion` and return an OpenAI-compatible completion object with the answer and an `answer_metadata` extension containing citations, unresolved/stale citations, retrieval, and uncertainty.
- [x] Empty retrieval avoids a chat-model call and returns the existing insufficient-evidence answer with `unsupported` uncertainty.
- [x] Unsupported roles, tools, or request options fail before model execution with a stable JSON error.
- [x] Add focused public-interface tests and document the request, response, extension, and unsupported request surface.
- [x] No new dependency or logging of question, answer, corpus, provider body, credentials, or stack traces.
- [x] Streaming remains a separate conditional work unit: record the metadata decision in `.scratch/gateway-clients/map.md`; implement SSE only if the decision survives independent review.

## Non-goals

Tool calls, multiple choices, full multi-turn conversation handling, usage accounting, audit logging, quotas, shell installation, TLS termination, metrics, deployment packaging, and Open WebUI glue in this ticket.

## Answer

Implemented the buffered OpenAI-compatible response at `POST /v1/chat/completions`. It accepts exactly one non-empty user message, ignores the caller's model selection in favor of configured `ANSWER_MODEL`, rejects unsupported options and `stream: true`, and uses `answerQuestion` for retrieval, citation revalidation, and uncertainty. The response includes standard completion fields plus `answer_metadata`; empty evidence bypasses the model.

Verification: `npm test` passed 82 tests, skipped 22 expected database-dependent tests, failed 0, exit 0. The disposable pgvector/pg17 integration suite passed 26/26, exit 0, including a real HTTP/database chat-completions round trip with a fake chat adapter. No real provider round trip or installed-shell verification is claimed. Native review `review-08f4a41323737f7f` was approved and acknowledged for commit `f5a3ee6`; its only advisory was a suggestion about the test assertion message, with no blocking findings.

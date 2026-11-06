# Feature: streaming OpenAI-compatible chat completions

Implements `.scratch/streaming-chat-completions/issues/01-streaming-chat-completions.md` under decision A6-stream.

## Specs

Acceptance criteria and ratified behavior, quoted verbatim:

- S1. "`POST /v1/chat/completions` uses the existing gateway authentication and server-derived `owner_id`; a request body cannot provide `owner_id`."
- S2. "The JSON body requires a non-empty `model` and a non-empty `messages` array containing string `content` values with `system`, `user`, or `assistant` roles. The latest `user` message is the question passed to `answerQuestion`. The configured gateway answer model remains authoritative; the request model is validated for client compatibility but does not select a provider model. The route accepts `stream` (default `false`), `max_tokens`, `limit`, `collection_ids`, and `embedding_model_id` using the existing answer validation and retrieval seams."
- S3. "The route calls the existing `answerQuestion` use case without changing citation resolution, citation revalidation, fail-closed behavior, or the uncertainty ladder. No evidence produces the existing insufficient-evidence answer and `unsupported` uncertainty without a model call."
- S4. "For `stream: true`, the response is `text/event-stream`. It emits OpenAI-compatible `chat.completion.chunk` records: an assistant role delta, answer content deltas, and a finish chunk. The answer content is emitted in bounded text chunks after `answerQuestion` completes."
- S5. "After the final answer content and before the finish chunk and `[DONE]`, the route emits exactly one `event: grounding` SSE record containing the complete `citations`, `unresolved_citations`, `stale_citations`, `retrieval`, and `uncertainty` values returned by `answerQuestion`. It does not include this report in earlier content chunks. If the connection is gone before this record, the record is not written, so a disconnected client is never told that it received a grounded answer."
- S6. "For `stream: false`, the route returns a normal OpenAI-shaped JSON completion whose assistant message contains the grounded answer and whose top-level payload contains the same citation and uncertainty fields."
- S7. "No new dependency is added. TLS bootstrap, metrics, deployment packaging, tool-call semantics, audit logging, quotas, and shell integration are not changed."

## Tasks

| ID | Spec | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1-S3 | Request mapping and grounded answer composition | local |
| T2 | S4-S6 | SSE streaming adapter and non-streaming response | local |
| T3 | S7 | Tests, docs, tracker, traceability | local |

## Log

- L1: Wayfinder A6-stream ratified the trailing `event: grounding` record. Content is never presented as grounded metadata until the complete answer has streamed.
- L2: Focused route and adapter tests passed 5/5. The assigned pgvector container `sbs-test-pg-stream` ran the repository integration command at port `55442` with 26/26 passing. Full unit-suite execution remains blocked by an unrelated uncommitted metrics regex syntax error in `test/gateway-server.test.js`.

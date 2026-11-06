# Specification: streaming OpenAI-compatible chat completions

Ratified by `.scratch/streaming-chat-completions/map.md`, decision A6-stream.

## S1. Route and authentication

`POST /v1/chat/completions` uses the existing gateway authentication and server-derived `owner_id`; a request body cannot provide `owner_id`.

## S2. OpenAI request mapping

The JSON body requires a non-empty `model` and a non-empty `messages` array containing string `content` values with `system`, `user`, or `assistant` roles. The latest `user` message is the question passed to `answerQuestion`. The configured gateway answer model remains authoritative; the request model is validated for client compatibility but does not select a provider model. The route accepts `stream` (default `false`), `max_tokens`, `limit`, `collection_ids`, and `embedding_model_id` using the existing answer validation and retrieval seams.

## S3. Grounded answer preservation

The route calls the existing `answerQuestion` use case without changing citation resolution, citation revalidation, fail-closed behavior, or the uncertainty ladder. No evidence produces the existing insufficient-evidence answer and `unsupported` uncertainty without a model call.

## S4. Streaming contract

For `stream: true`, the response is `text/event-stream`. It emits OpenAI-compatible `chat.completion.chunk` records: an assistant role delta, answer content deltas, and a finish chunk. The answer content is emitted in bounded text chunks after `answerQuestion` completes.

## S5. Trailing citation and uncertainty report

After the final answer content and before the finish chunk and `[DONE]`, the route emits exactly one `event: grounding` SSE record containing the complete `citations`, `unresolved_citations`, `stale_citations`, `retrieval`, and `uncertainty` values returned by `answerQuestion`. It does not include this report in earlier content chunks. If the connection is gone before this record, the record is not written, so a disconnected client is never told that it received a grounded answer.

## S6. Non-streaming compatibility

For `stream: false`, the route returns a normal OpenAI-shaped JSON completion whose assistant message contains the grounded answer and whose top-level payload contains the same citation and uncertainty fields.

## S7. Boundary and scope

No new dependency is added. TLS bootstrap, metrics, deployment packaging, tool-call semantics, audit logging, quotas, and shell integration are not changed.

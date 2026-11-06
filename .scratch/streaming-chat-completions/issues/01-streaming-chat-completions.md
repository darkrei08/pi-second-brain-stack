# 01: Stream grounded OpenAI-compatible chat completions

Type: implementation
Status: resolved
Blocked by: None

## Question

Can the gateway expose `POST /v1/chat/completions` with an OpenAI-shaped request and SSE answer chunks while preserving the existing citation envelope and uncertainty report, including honest behavior when the client disconnects mid-stream?

## Context

The existing grounded answer use case is `src/answer-question.js`; it performs retrieval, citation resolution, freshness revalidation, and uncertainty calculation. The existing gateway authenticates requests and derives `owner_id`. Decision A6-stream in `../map.md` defines the stream contract.

## Acceptance criteria

- [ ] `POST /v1/chat/completions` requires gateway authentication and rejects caller-supplied `owner_id`.
- [ ] The route validates an OpenAI-shaped `model`, `messages`, and optional `stream`, `max_tokens`, `limit`, `collection_ids`, and `embedding_model_id`; the latest user message is mapped to `answerQuestion` and the configured gateway answer model remains authoritative.
- [ ] `stream: true` returns `text/event-stream` with OpenAI-compatible role/content chunks, followed only after all content by one `event: grounding` record containing the complete answer citation and uncertainty fields, then the finish chunk and `[DONE]`.
- [ ] A client disconnect before the trailing grounding event receives no grounding event; the implementation does not claim completion after the connection is gone.
- [ ] `stream: false` returns an OpenAI-shaped JSON completion with the same grounding fields at top level.
- [ ] No-evidence answers produce the existing insufficient-evidence answer and `unsupported` report without calling the model, in both response modes.
- [ ] Existing citation revalidation and fail-closed behavior remain unchanged.
- [ ] No dependency is added; TLS bootstrap, metrics, packaging, tool calls, audit logging, and quotas remain untouched.

## Verification

- `npm test`
- `TEST_DATABASE_URL='postgres://test@127.0.0.1:55442/test' npm run test:integration` with disposable container `sbs-test-pg-stream`

## Environment

Node 22 ESM, current worktree HEAD `17df64d`, assigned pgvector container `sbs-test-pg-stream` on host port `55442`.

## Answer

Yes. The gateway now validates the OpenAI request shape, maps the latest user message onto the existing grounded `answerQuestion` use case, and keeps the configured `ANSWER_MODEL` authoritative. Streaming emits OpenAI-compatible chunks, then a trailing `event: grounding` record with the complete citation and uncertainty report, then the finish chunk and `[DONE]`; a disconnected client cannot receive that report. Non-streaming requests return the same report in a normal completion. The implementation adds no dependency and leaves citation revalidation and fail-closed behavior unchanged.

Verification: `npm test` passed 90 tests with 22 expected skips; the focused route/adapter command passed 5/5; the assigned disposable pgvector integration command passed 26/26.

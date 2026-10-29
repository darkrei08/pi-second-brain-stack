# Wayfinder: gateway clients

## Destination

Expose the grounded gateway to chat clients, deliver Open WebUI retrieval glue, and decide which gateway operations work is in scope without installing or exposing the private corpus.

## Decisions

- C1: `POST /v1/chat/completions` reuses `answerQuestion`; the authenticated gateway identity owns retrieval, and the configured `ANSWER_MODEL` owns provider selection. The request's `model` does not select a provider model.
- C2: Implement the non-streaming OpenAI chat-completions response first. It accepts a single latest user message plus the gateway's documented retrieval controls; unsupported tools, roles, or options fail closed.
- C3: For `stream: true`, use OpenAI-compatible SSE content chunks and put citations, unresolved/stale citations, retrieval, and uncertainty in an `answer_metadata` extension on the terminal completion chunk before `[DONE]`. This is available to clients that understand the extension; strict clients may ignore it. Metadata follows citation revalidation. No separate trailing event is emitted.
- C4: Streaming proceeds only after an independent review of C3 accepts the extension/trailing metadata tradeoff. Empty retrieval still avoids a model call and returns the existing insufficient-evidence text and `unsupported` report in either response mode.
- C5: Open WebUI glue is delivered as a standalone inlet filter and Pipe with tests that do not require an installed Open WebUI shell. Runtime compatibility with an installed shell remains unverified until one is available.
- C6: TLS termination is deferred to an operator-controlled reverse proxy because the gateway is loopback-bound by default and termination needs deployment certificates and a deployment boundary not yet specified.
- C7: Metrics are deferred because no metric backend, privacy/label-cardinality policy, or operational SLO is specified; adding telemetry now could expose request-derived data or impose an unrequested runtime contract.
- C8: Deployment packaging is deferred because the target installation platform and distribution artifacts are unspecified; adding a container/installer would create a new delivery surface without an acceptance environment.

## Evidence and review

- The existing answer use case reports citations only after citation revalidation; streaming text cannot include that report at the start of the response.
- A read-only architecture challenge of the SSE contract recommended a final chunk extension, preserving OpenAI chunk fields and `[DONE]`, while noting strict clients may ignore `answer_metadata`. It recommended rejecting unsupported stream options and sending sanitized SSE errors after headers without `[DONE]`.
- The review gate for C3 is pending. Do not implement the streaming provider/route until that review records whether the decision survives.

## Work units

1. OpenAI-compatible non-streaming chat completions.
2. Review C3; if accepted, add streaming; otherwise record the reviewed alternative and do not stream.
3. Open WebUI inlet filter and research-mode Pipe.
4. Record TLS, metrics, and deployment packaging as deferred above unless repository evidence supplies their missing product/deployment constraints.

## Current status

The buffered `POST /v1/chat/completions` route is implemented in the working tree and maps a single user message to `answerQuestion`; it returns an OpenAI `chat.completion` envelope plus `answer_metadata`. The caller cannot select the configured provider model or owner. `stream: true` remains rejected until C3 survives independent review. The first implementation verification passed `npm test` (82 passed, 22 expected skips, 0 failed, exit 0) and the disposable pgvector/pg17 integration suite (26/26, exit 0) using a fake chat adapter. Native review/acknowledgement is pending.

## Validation boundary

Unit and integration tests use fake providers and synthetic records. Open WebUI filter and Pipe tests run without a shell. No user corpus, OCR output, credentials, database dumps, embeddings, or model caches belong in this repository. No push, PR, merge, branch deletion, or worktree deletion is part of this work.

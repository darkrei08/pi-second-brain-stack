# 02: Stream grounded chat completions

Type: implementation
Status: claimed
Blocked by: None

## Question

Can the approved C3 contract stream grounded answer text as OpenAI-compatible SSE while preserving the final citation and uncertainty report, failing closed on provider errors, and stopping work when the client disconnects?

## Context and decision gate

C3 in `.scratch/gateway-clients/map.md` survived independent workflow review `122645ae-74d7-40fc-8f2f-b13fae442fd0` (architect, security, and compatibility reviewers all approved). The report goes only in the final OpenAI-compatible chunk, after citation revalidation, before `[DONE]`; strict clients may ignore `answer_metadata`.

## Acceptance criteria

- [x] The existing non-streaming route remains unchanged; `stream: true` selects `text/event-stream` and emits OpenAI-compatible content deltas incrementally.
- [x] The chat adapter parses upstream SSE without reading provider error bodies, leaking provider error text, or accepting malformed/incomplete streams as successful answers.
- [x] The response emits a final completion chunk with `finish_reason: "stop"` and `answer_metadata` only after answer citation revalidation succeeds, then emits `data: [DONE]`.
- [x] Empty retrieval makes no model call and streams the existing insufficient-evidence answer with empty citations and `unsupported` uncertainty.
- [x] Errors before response headers retain the stable JSON gateway error; errors after SSE headers emit a sanitized SSE error and terminate without `[DONE]` or metadata.
- [x] A client disconnect cancels the upstream response reader; it does not continue consuming model output or write to a closed response.
- [x] Auth, derived owner, configured `ANSWER_MODEL`, collection scope, request validation, and body-size limits remain enforced.
- [x] Tests cover chunk framing, metadata ordering, citation freshness, empty evidence, malformed/incomplete upstream streams, provider failure, and client cancellation; docs describe the metadata extension and error behavior.
- [x] No dependency is added and no question, answer, evidence, provider body, token, or stack trace is logged.

## Non-goals

Tool calls, usage accounting, multiple choices, resumable streams, heartbeat events, request multiplexing, provider-specific streaming options, real provider integration, and shell UI behavior.

## Answer

Implementation and tests are complete. Verification: focused streaming suites passed 42/42 (exit 0); `npm test` passed 91, skipped 22 expected DB-dependent tests, failed 0 (exit 0); disposable `pgvector/pgvector:pg17` integration passed 26/26 (exit 0), including a real HTTP/database streaming round trip using a fake provider. A base-vs-change differential for authenticated `POST /v1/answers` produced byte-identical status and body. No real provider or installed Open WebUI shell was used. Commit and native review/acknowledgement are pending.

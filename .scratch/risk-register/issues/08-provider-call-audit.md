# 08: Record provider and model metadata for every model call

Type: task
Status: resolved
Blocked by: none

## Question

R2 was mitigated by a declared-host allowlist, so an undeclared host is refused. Its recorded residual is that nothing records the calls that are allowed: after the fact there is no evidence of which provider host, which model, for which owner, and with which outcome a question or a query embedding left the process.

Resolve it by deciding how the gateway records one audit event per model call, and by implementing it, without logging question text, evidence text, answer text, or any provider payload.

Constraints:

- The record must cover every path that sends caller text to a provider: the chat calls behind `/v1/answers`, `/v1/research` and `/v1/chat/completions`, and the query embedding call behind hybrid `/v1/retrieval/query`.
- A call refused by the concurrency or budget guard never reaches a provider and must not produce an event.
- A failed call must be recorded as failed, not silently dropped.
- The event must not become a second corpus: no document, segment, question, answer, or citation content.

## Acceptance criteria

- One audit event per model call, carrying the route, the call kind, the model id, the owner id, the outcome and the duration.
- No event field can carry caller text; a test asserts the recorded event contains none of the question or answer strings.
- A provider failure still emits exactly one event, marked failed.
- A request rejected with `429 model_busy` emits no event.
- The audit sink is optional; without it the server behaves exactly as before.

## Answer

Decided for a structured stdout record rather than a durable table. A table would need a migration, its own retention rule, and coverage by the owner-scoped export and the physical purge, which is a larger lifecycle than the gap justified; a stdout line is reversible and stays outside the PostgreSQL data path by construction. The trade-off accepted: the record is only as durable as the process log, and rotation is deployment policy.

`createGatewayServer` takes an optional `audit` sink and routes every call that reaches a provider through one seam, `recordModelCall`, which emits a frozen event with `kind`, `route`, `owner_id`, `model_id`, `outcome` and `duration_ms`. It covers the chat calls behind `/v1/answers`, `/v1/research`, `/v1/chat/completions` (buffered and streamed) and the query embedding behind hybrid `/v1/retrieval/query`. A call refused by the concurrency or budget guard never reaches the seam, so it emits nothing. A failed call is recorded with `outcome: "failed"` before the error propagates. A sink that throws cannot fail or mask the request, which is commented in the code.

`src/gateway-cli.js` supplies the sink: one JSON line per call on stdout, next to `gateway_listening`, with `provider_host` resolved from `ANSWER_BASE_URL` or `EMBEDDING_BASE_URL` for the call's kind. No payload, question, evidence, answer, or citation text enters the record, because the event has no field that could carry it.

Evidence: `test/gateway-server.test.js` "records one audit event per provider call without any caller text" asserts one event per call across the chat and embedding kinds, the owner, the failing outcome, no event for a `429 model_busy`, and that none of the question, answer or query strings appear in the serialized events. `pnpm run verify` is green: unit 145 tests, 119 pass, 26 expected skips; integration self-skips without a database. Runtime proof against a disposable pgvector/17 instance with the real gateway process and a fake OpenAI-compatible embedder: 11/11 assertions, including `provider_host`, the single line per call, and the absence of the query text in stdout.

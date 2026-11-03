# 02: Readiness reflects the answer path, not only PostgreSQL

Type: task
Status: resolved
Blocked by: none

## Question

`/readyz` asks PostgreSQL whether it is reachable and answers `ready` otherwise. An answer provider that is misconfigured, unreachable, or configured with a model the provider rejects still reports ready, so the shell sends requests into a path that cannot succeed. Decide what readiness must prove without spending money on every probe: provider reachability, model declaration, the allowlist decision, or a cached result of the last real call.

## Acceptance criteria

- A test that a gateway with an unreachable provider answers not ready, and one that a healthy configuration answers ready.
- The probe must not call a paid provider on every request: state the mechanism and bound its cost, with a test for the bound.
- The stricter verdict is documented, including what an operator sees when it flips.

## Answer

`/readyz` checks PostgreSQL and performs one credentialed answer-provider metadata probe on the first request or after a 30-second cache window. The probe uses `GET /models`, verifies that `ANSWER_MODEL` is declared, has a separate 3-second timeout, generates no completion, and emits no audit event. The cached verdict bounds provider requests to at most one probe per 30 seconds; missing, unreachable, or misconfigured answer configuration returns `503 not_ready`, while a successful probe returns `ready`. The provider error is not exposed. Verified by `test/chat-client.test.js` and `test/gateway-server.test.js`.

## Comments

2026-11-03 correction: the previous readiness implementation spent a real completion token and emitted a synthetic `model_call` with a null owner. It now uses the chat client's credentialed model-list capability, preserving the 30-second cache while avoiding paid completions and polluted audit records; the probe is independently capped at three seconds so provider stalls do not hold readiness indefinitely.

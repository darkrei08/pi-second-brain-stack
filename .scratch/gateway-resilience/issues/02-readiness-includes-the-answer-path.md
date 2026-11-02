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

`/readyz` checks PostgreSQL and performs one minimal answer-provider probe on the first request or after a 30-second cache window. The cached verdict bounds provider cost to at most one probe per 30 seconds; missing or unreachable answer configuration returns `503 not_ready`, while a successful probe returns `ready`. The provider error is not exposed. Verified by `test/gateway-server.test.js`.

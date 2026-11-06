# 02: Dependency-free metrics and redacted audit events

Type: decision
Status: resolved
Blocked by: None

## Question

What operational metrics and audit event contract can be added at the gateway boundary without exposing tokens, owner IDs, request bodies, document text, or provider response bodies?

## Evidence

The gateway already has one request lifecycle in `src/gateway-server.js`, a stable route table, compact error mapping, and no logging of corpus or provider data. The repository has no metrics dependency and `package.json` must not grow without a ratified decision.

## Acceptance criteria

- Decide the metrics exposure and bounded label set.
- Decide the audit sink and event fields, including failure behavior.
- Decide whether probes and metrics are authenticated.

## Answer

Expose authenticated `GET /metrics` using dependency-free Prometheus text. Labels are the fixed HTTP method, known route (or `unknown`), and status code; counters cover requests, active requests, and cumulative request duration. The endpoint is authenticated like other data routes so it does not become an unauthenticated route-discovery surface. The gateway accepts an optional audit callback; the CLI writes one-line JSON events to stderr. Events contain only a generated request id, method, fixed route label, status, duration, and outcome. Audit sink failure is best effort and never changes the response. No token, owner id, request body, document text, or provider body is serialized.

## Comments

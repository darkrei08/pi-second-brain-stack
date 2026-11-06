# Gateway hardening specification

## Scope

Harden the existing loopback-only gateway with optional TLS, operational metrics, redacted audit events, owner-scoped quotas, and a container/Compose deployment package. Do not add `/v1/chat/completions` or change retrieval, segmentation, citation, or answer semantics.

## S1
"When `GATEWAY_TLS_CERT_FILE` and `GATEWAY_TLS_KEY_FILE` are both configured, the gateway serves HTTPS using those files; when neither is configured, it serves HTTP as before; configuring only one fails closed at startup."

## S2
"The default gateway bind remains `127.0.0.1`, and the deployment package exposes the gateway host port only on loopback without adding a package dependency."

## S3
"Authenticated `GET /metrics` returns dependency-free Prometheus text with only fixed method, route, and status labels plus request, active-request, and duration aggregates; it never exposes tokens, owner IDs, request bodies, document text, or provider bodies."

## S4
"Each completed gateway request emits an optional redacted audit event containing only a generated request ID, method, fixed route label, status, duration, and outcome; audit sink failure never changes the HTTP response."

## S5
"Authenticated data routes enforce a process-local per-owner quota of at most 60 requests per 60-second window and 8 concurrent requests by default, with positive-integer environment overrides, returning `429 quota_exceeded` with `Retry-After: 60` before body parsing when exceeded."

## S6
"Quota state is released after every request, including handler, parsing, authentication, and error paths, and health/readiness probes do not consume owner quota."

## S7
"The gateway-hardening documentation describes TLS file mounting, metrics authentication, audit redaction, quota scope, and the single-process limit without claiming distributed enforcement or compliance certification."

## Verification

- Focused unit tests cover TLS configuration, metrics redaction, audit failure isolation, quota rejection-before-body, quota release, and probe exemptions.
- `npm test` passes.
- A disposable pgvector integration run uses only `sbs-test-pg-deploy` on host port `55441`, when Docker is available.
- Docker package structure and Compose configuration are validated without publishing or starting another effort's services.

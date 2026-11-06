# Wayfinder: gateway hardening

## Destination

Ship optional TLS, dependency-free operational metrics, deployment packaging, and bounded audit/quota controls on the existing loopback-only gateway without changing retrieval or answer semantics.

## Dependency position

The gateway and grounded answer route are sealed in `.scratch/http-gateway/map.md` and `.scratch/live-answers/map.md`. Decision A7 deferred audit logging, rate limiting, and concurrency caps. This effort owns only those operational seams plus TLS and packaging; `/v1/chat/completions` remains deferred to its own effort.

## Decisions

- H1: resolved in `issues/01-optional-tls-and-packaging.md`
- H2: resolved in `issues/02-metrics-and-audit-redaction.md`
- H3: resolved in `issues/03-owner-quota-policy.md`

## Boundary rules

- TLS is optional and disabled by default; the default bind remains loopback-only.
- Metrics and audit output must not contain bearer tokens, owner IDs, request bodies, document text, or provider response bodies.
- Quotas are gateway boundary controls and must fail closed before body parsing when exceeded.
- No new dependency; deployment packaging uses the existing Node 22 package and `pg` dependency.

## Decisions-so-far

- H1: Node terminates TLS only when a complete certificate/key file pair is configured; HTTP remains the default, and a Node 22 slim image plus a loopback-bound Compose gateway service is the deployment package. See `issues/01-optional-tls-and-packaging.md`.
- H2: Authenticated dependency-free Prometheus text at `GET /metrics` uses fixed method/route/status labels; an optional redacted JSON audit callback records request id, method, route, status, duration, and outcome. See `issues/02-metrics-and-audit-redaction.md`.
- H3: A process-local per-owner fixed window defaults to 60 requests per 60 seconds and 8 concurrent requests, configurable through environment variables; quota rejects before body parsing with `429 quota_exceeded` and releases in `finally`. See `issues/03-owner-quota-policy.md`.

## Exit condition

H1-H3 are resolved without external evidence. The spec was synthesized and marked ready-for-agent; implementation is complete and closes the tracker with tests, docs, and traceability evidence.

## Result

Implemented and verified in the gateway-hardening work unit. The base gateway remains HTTP on loopback; configured certificate/key files select HTTPS, metrics and audit metadata are redacted, quotas are process-local, and deployment packaging is opt-in through the gateway Compose files.

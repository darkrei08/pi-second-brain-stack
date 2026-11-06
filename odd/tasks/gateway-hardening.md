# Feature: gateway hardening

Implements `.scratch/gateway-hardening/issues/04-gateway-hardening.md` under H1-H3 in `.scratch/gateway-hardening/map.md`. Boundary only: optional TLS, metrics, redacted audit events, owner quotas, and deployment packaging.

## Specs

- S1. "When `GATEWAY_TLS_CERT_FILE` and `GATEWAY_TLS_KEY_FILE` are both configured, the gateway serves HTTPS using those files; when neither is configured, it serves HTTP as before; configuring only one fails closed at startup."
- S2. "The default gateway bind remains `127.0.0.1`, and the deployment package exposes the gateway host port only on loopback without adding a package dependency."
- S3. "Authenticated `GET /metrics` returns dependency-free Prometheus text with only fixed method, route, and status labels plus request, active-request, and duration aggregates; it never exposes tokens, owner IDs, request bodies, document text, or provider bodies."
- S4. "Each completed gateway request emits an optional redacted audit event containing only a generated request ID, method, fixed route label, status, duration, and outcome; audit sink failure never changes the HTTP response."
- S5. "Authenticated data routes enforce a process-local per-owner quota of at most 60 requests per 60-second window and 8 concurrent requests by default, with positive-integer environment overrides, returning `429 quota_exceeded` with `Retry-After: 60` before body parsing when exceeded."
- S6. "Quota state is released after every request, including handler, parsing, authentication, and error paths, and health/readiness probes do not consume owner quota."
- S7. "The gateway-hardening documentation describes TLS file mounting, metrics authentication, audit redaction, quota scope, and the single-process limit without claiming distributed enforcement or compliance certification."

## Tasks

| ID | Spec | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1-S2 | Config, HTTPS composition root, Dockerfile and Compose service | pending commit |
| T2 | S3-S6 | Metrics, audit lifecycle, and owner quota in the gateway server | pending commit |
| T3 | S7 | Runtime and deployment documentation | pending commit |
| T4 | all | Focused tests, package checks, disposable integration, tracker closure | pending commit |

## Log

- L1 (2026-11-06): Wayfinder H1-H3 resolved from existing gateway code, runtime boundary rules, and Compose configuration; no external evidence was needed.
- L2 (2026-11-06): Spec synthesized at `.scratch/gateway-hardening/spec.md`; implementation ticket marked `ready-for-agent`.
- L3 (2026-11-06): Test-first RED observed on missing TLS/quota configuration and missing metrics/quota behavior; focused tests turned GREEN after the gateway/config/CLI implementation.
- L4 (2026-11-06): Verified host unit suite, disposable pgvector integration, HTTPS smoke, Compose rendering, Node 22 image packaging, Debian-family image entrypoint, and Alpine Node 22 focused tests.

## Verification

Completed. Commit references are added after the work-unit commit is created.

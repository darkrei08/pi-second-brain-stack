# 04: Implement gateway hardening

Type: implementation
Status: resolved
Blocked by: None

## Question

Can the existing loopback gateway ship optional TLS, dependency-free operational metrics, redacted audit events, owner-scoped process-local quotas, and a repeatable container/Compose package without changing answer or retrieval semantics?

## Specification

`.scratch/gateway-hardening/spec.md`

## Acceptance criteria

- [x] S1 optional TLS is configured as a complete certificate/key pair and is off by default.
- [x] S2 Node 22 container and Compose packaging keep the host port loopback-only and add no dependency.
- [x] S3 authenticated dependency-free `/metrics` exposes only fixed operational labels and aggregates.
- [x] S4 audit events are optional, redacted, and failure-isolated.
- [x] S5/S6 process-local per-owner request and concurrency quotas reject before body parsing and release safely.
- [x] S7 docs explain operation and limitations.
- [x] Unit, package, and disposable integration verification are recorded.

## Non-goals

OpenAI-compatible chat completions, streaming, retrieval/segmentation/citation/answer changes, distributed rate limiting, external proxy installation, and compliance certification.

## Answer

Yes. The existing gateway now supports optional direct HTTPS, authenticated dependency-free metrics, redacted request audit events, and process-local per-owner quotas without changing retrieval or answer semantics. `Dockerfile`, `compose.gateway.yaml`, and `compose.gateway.tls.example.yaml` package the Node 22 gateway while keeping the host port loopback-only and the base Compose database stack unchanged.

Verification: `npm test` reports 90 pass / 22 expected skips / 0 fail; focused gateway tests pass 23/23; the assigned disposable pgvector container `sbs-test-pg-deploy` on `127.0.0.1:55441` passes integration 26/26 and is removed; an HTTPS smoke with a temporary self-signed certificate returns the health response; Compose config and `npm pack --dry-run` pass; the Node 22 slim image refuses missing configuration with one stable error. Debian-family container execution used the built image; Alpine Node 22 ran syntax checks and focused gateway tests 23/23.

## Comments

Resolved on 2026-11-06. Distributed quota enforcement, external reverse-proxy management, and compliance certification remain non-goals. The pre-existing `/v1/chat/completions` route was not added or changed by this effort.

Spec published after H1-H3 were resolved by synthesis from the existing gateway, runtime boundary, and Compose configuration. No external product, workload, hardware, or provider evidence is required for this boundary policy.

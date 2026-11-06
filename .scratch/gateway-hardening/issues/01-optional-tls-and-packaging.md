# 01: Optional TLS and deployment packaging

Type: decision
Status: resolved
Blocked by: None

## Question

How should the existing gateway support TLS and a repeatable deployment package without changing the loopback-only default or adding dependencies?

## Evidence

`src/gateway-cli.js` is the composition root and currently creates an HTTP server. `src/gateway-config.js` already owns deployment environment parsing. `compose.yaml` packages PostgreSQL only. `docs/private-runtime.md` requires TLS whenever traffic leaves the host and keeps local defaults loopback-only.

## Acceptance criteria

- Decide whether TLS terminates in the Node gateway or an external proxy for this slice.
- Decide the environment/file contract and the default when TLS is not configured.
- Decide the smallest container/Compose packaging that runs the existing gateway with no dependency change.

## Answer

Terminate TLS in the Node gateway when both `GATEWAY_TLS_CERT_FILE` and `GATEWAY_TLS_KEY_FILE` are configured; the pair is required together and the default remains plain HTTP on `127.0.0.1`. The CLI reads the files only at startup and never logs their contents. A small `node:22-bookworm-slim` image and a `gateway` Compose service package the existing gateway with the existing lockfile and no new dependency. The Compose host port remains bound to `127.0.0.1`; operators use a local Compose override or environment-mounted certificate directory to enable TLS.

## Comments

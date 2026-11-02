# 01: HTTP gateway with boundary identity

Type: implementation
Status: resolved
Blocked by: None

## Question

Can the sealed storage and retrieval seams be exposed as a loopback-only HTTP boundary that authenticates the operator, derives `owner_id` server-side, and never trusts a caller-supplied owner, collection ownership, or document ownership, using no new dependency?

## Context

`docs/implementation-brief.md` fixes the gateway contract; `docs/private-runtime.md` fixes the boundary rules; `.scratch/interface-stack/map.md` V5 fixes the identity mapping. Decisions D1-D7 in `map.md` scope this ticket. Nothing in `src/` serves HTTP today.

## Acceptance criteria

- [x] `GET /healthz` returns `200` with a constant JSON body and touches no dependency.
- [x] `GET /readyz` returns `200` only after a real storage read succeeds and `503` when it fails.
- [x] `POST /v1/retrieval/query` accepts lexical or hybrid mode with an optional `collection_ids` scope, derives `owner_id` server-side, and returns the matches plus the retrieval-mode description.
- [x] `POST /v1/citations/resolve` revalidates a citation batch of at most 100 entries against the derived owner.
- [x] `GET /v1/models` lists registered embedding models and, when a `model_id` is requested, the derived owner's coverage for it.
- [x] `POST /v1/documents/ingest` segments the submitted text, persists the document with its declared collections, and returns the stored identity and segment count.
- [x] A missing token, a wrong token, an unknown shell user, and a body that names `owner_id` all fail closed with the same compact error contract.
- [x] Request bodies are capped at 1 MiB and rejected before JSON parsing when the declared length exceeds the cap.
- [x] No error response contains a stack trace, SQL, filesystem path, token material, document text, or an existence proof.
- [x] The server module imports neither `pg` nor `postgres-store.js`; storage is injected.
- [x] No dependency is added and the process binds loopback by default.

## Non-goals

Answer generation (`/v1/chat/completions`, `/v1/research`), the Open WebUI filter and pipe, multi-user identity providers, TLS termination, rate limiting beyond the body and header limits, metrics, and any deployment packaging.

## Answer

Yes. The six routes are implemented as one loopback-only `node:http` server with no new dependency, and no caller can name an owner.

- `src/gateway-config.js` refuses a configuration without `GATEWAY_TOKEN` (32 characters minimum), `DATABASE_URL`, or an opaque `GATEWAY_OWNER_ID`, parses the port and the shell-user mapping strictly, and keeps the token non-enumerable so a logged config cannot carry it. Commit `b9bedd7`.
- `src/gateway-auth.js` compares the bearer token with `crypto.timingSafeEqual` after a length check, returns one indistinguishable `401` for a missing and a wrong token, resolves `owner_id` from the null-prototype shell-user map with an own-property check, and fails closed with `403` for an unmapped or missing shell user.
- `src/gateway-server.js` authenticates before routing, so an unauthenticated caller cannot enumerate the route table; caps bodies at 1 MiB from `Content-Length` and again while streaming; requires `application/json`; rejects a body that names `owner_id` at the top level, inside `document`, or inside `document.retention`; maps the three stable seam failures to `400` and `409`; answers an unexpected failure with a generic `500`; and closes the connection after refusing an oversized body. Health and readiness stay unauthenticated by decision D8 and touch no credential.
- `src/gateway-cli.js` is the composition root: it builds the pool, the storage, the optional OpenAI-compatible embedder, and the server, refuses an invalid configuration with one stderr line, and shuts down on `SIGINT`/`SIGTERM`.
- `docs/development.md` documents the environment and a curl example; `docs/implementation-brief.md` records the citation route as `POST` with the reason.

Verification: unit 61 pass / 19 expected skips / 0 fail; live pgvector/pg17 integration 23/23 including an HTTP ingest, scoped retrieval, and citation revalidation round trip and a cross-owner conflict; Debian `node:22-slim` and Alpine `node:22-alpine` 61/19/0 each; a smoke run of the real entry point against a disposable database returned `200` for health, readiness, models, ingest (two segments), and lexical retrieval, `401` unauthenticated, `400` for a forged owner, and `413` for an oversize body.

## Comments

Claimed and resolved on 2026-10-29 on `feat/http-gateway`. Answer generation, the shell glue, and TLS remain out of scope.

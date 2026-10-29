# Wayfinder: HTTP gateway and boundary identity

## Destination

A loopback-only HTTP gateway that is the single application boundary for the private RAG: it authenticates the operator, derives `owner_id` server-side, and exposes the retrieval, citation, model, and ingest seams already sealed in storage. No shell, no UI, no answer generation.

## Dependency position

Already sealed and verified: segmentation with provenance, parser normalization, PostgreSQL persistence with owner scoping, exact semantic and hybrid retrieval with an optional collection scope, citation revalidation, model registry and coverage, embedding backfill planning and execution, an OpenAI-compatible embedder adapter, retrieval-mode description.

Missing before this Wayfinder: any HTTP server, any authentication, any boundary identity. `docs/implementation-brief.md` names the contract and `docs/private-runtime.md` names the boundary rules; neither had an implementation.

## Decisions

- D1: First-release surface is six routes: `GET /healthz`, `GET /readyz`, `POST /v1/documents/ingest`, `POST /v1/retrieval/query`, `POST /v1/citations/resolve`, `GET /v1/models`. Answer generation (`POST /v1/chat/completions`, `POST /v1/research`) is deferred: no model client, no prompt policy, and no uncertainty reporting exist yet, so shipping a chat route now would be an open proxy with a plausible-looking answer shape. `POST /v1/search`, `/v1/memory/*`, `/v1/agents/run`, `/v1/sources/*`, `/v1/data/*`, and `/v1/documents/{id}` stay deferred with the same reasoning.
- D2: `GET /v1/citations/resolve` becomes `POST /v1/citations/resolve`. A citation batch is a JSON array of opaque identifiers and hashes; a GET carries it in a query string, which is length-limited and lands in access logs. The brief is updated in the same slice.
- D3: Authentication is one bearer token from configuration, compared with `crypto.timingSafeEqual` after a length check, never logged and never echoed. A missing and a wrong token return the same `401` body.
- D4: `owner_id` is always derived server-side. The mapping from a shell user id to `owner_id` is deployment configuration (`GATEWAY_SHELL_USERS`), not corpus state, because a single owner deploys one gateway and the mapping describes that deployment. A request that names an owner, or a shell user outside the mapping, fails closed. No fallback owner exists when a mapping is configured.
- D5: A document keeps its client-declared `document_id`, validated by the existing pattern. Generating it server-side would break re-ingest idempotency and provenance continuity, and the id is not an authorization boundary: ownership comes from the derived `owner_id`, and the storage seam already refuses to overwrite a document owned by someone else.
- D6: `/readyz` proves storage reachability by issuing a real read. It deliberately does not depend on the registry's contents, only on the query succeeding.
- D8: `GET /healthz` and `GET /readyz` answer without authentication, because a supervisor probes them and neither reads a credential or a document; every other path authenticates before routing, so an unauthenticated caller cannot tell a known path from an unknown one. A non-loopback bind is a deliberate operator choice and is documented rather than forbidden.
- D7: No new dependency. `node:http`, `node:crypto`, and the existing `pg` in the composition root only. The server module receives storage and an optional embedder as injected functions and never imports `pg` or `postgres-store.js`.

## Boundary rules

- Bind to `127.0.0.1` by default; a non-loopback bind requires an explicit `GATEWAY_HOST`.
- Bodies are JSON, capped at 1 MiB, and rejected before parsing when `Content-Length` exceeds the cap.
- Errors are compact JSON with a stable code and never contain stack traces, SQL, filesystem paths, token material, document text, or existence proofs.
- No corpus, credential, provider endpoint, or licence material enters the repository.

## Result

Implemented and verified on `feat/http-gateway`: commits `b9bedd7` (config and authenticator), `ac35b32` (server, handlers, composition root, docs), `230bf1a` (review findings). Ticket `.scratch/http-gateway/issues/01-http-gateway.md` is resolved.

## Exit condition

The gateway slice is done when the six routes are covered by tests that run without a database, an end-to-end test drives ingest, retrieval, and citation revalidation through HTTP against a real instance, and the tracker and brief state the same surface.

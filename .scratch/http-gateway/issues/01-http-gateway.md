# 01: HTTP gateway with boundary identity

Type: implementation
Status: claimed
Blocked by: None

## Question

Can the sealed storage and retrieval seams be exposed as a loopback-only HTTP boundary that authenticates the operator, derives `owner_id` server-side, and never trusts a caller-supplied owner, collection ownership, or document ownership, using no new dependency?

## Context

`docs/implementation-brief.md` fixes the gateway contract; `docs/private-runtime.md` fixes the boundary rules; `.scratch/interface-stack/map.md` V5 fixes the identity mapping. Decisions D1-D7 in `map.md` scope this ticket. Nothing in `src/` serves HTTP today.

## Acceptance criteria

- [ ] `GET /healthz` returns `200` with a constant JSON body and touches no dependency.
- [ ] `GET /readyz` returns `200` only after a real storage read succeeds and `503` when it fails.
- [ ] `POST /v1/retrieval/query` accepts lexical or hybrid mode with an optional `collection_ids` scope, derives `owner_id` server-side, and returns the matches plus the retrieval-mode description.
- [ ] `POST /v1/citations/resolve` revalidates a citation batch of at most 100 entries against the derived owner.
- [ ] `GET /v1/models` lists registered embedding models and, when a `model_id` is requested, the derived owner's coverage for it.
- [ ] `POST /v1/documents/ingest` segments the submitted text, persists the document with its declared collections, and returns the stored identity and segment count.
- [ ] A missing token, a wrong token, an unknown shell user, and a body that names `owner_id` all fail closed with the same compact error contract.
- [ ] Request bodies are capped at 1 MiB and rejected before JSON parsing when the declared length exceeds the cap.
- [ ] No error response contains a stack trace, SQL, filesystem path, token material, document text, or an existence proof.
- [ ] The server module imports neither `pg` nor `postgres-store.js`; storage is injected.
- [ ] No dependency is added and the process binds loopback by default.

## Non-goals

Answer generation (`/v1/chat/completions`, `/v1/research`), the Open WebUI filter and pipe, multi-user identity providers, TLS termination, rate limiting beyond the body and header limits, metrics, and any deployment packaging.

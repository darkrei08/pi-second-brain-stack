# 01: Grounded answers with reported uncertainty

Type: implementation
Status: claimed
Blocked by: None

## Question

Can a question over the corpus be answered only from retrieved evidence, with every cited span resolved and revalidated, with retrieved text treated as untrusted data, and with the uncertainty of the answer reported instead of hidden, using no new dependency?

## Context

Gateway contract and boundary rules live in `.scratch/http-gateway/map.md` and `docs/private-runtime.md`. Decisions A1-A7 of `../map.md` scope this ticket. `src/gateway-server.js` injects its dependencies; this slice follows the same shape.

## Acceptance criteria

- [ ] `answerQuestion` retrieves with the derived owner and the optional collection scope, and accepts an injected chat function.
- [ ] Evidence is numbered and bounded by `limit`; a retrieved segment cannot forge a delimiter or an instruction block.
- [ ] The prompt states that retrieved text is untrusted data, and the instruction block contains no retrieved text.
- [ ] `[n]` citations resolve against the numbered evidence; an out-of-range number is recorded as unresolved and never guessed.
- [ ] Cited spans are revalidated by storage; a stale citation is recorded, not repaired.
- [ ] No evidence means no model call, an explicit insufficient-evidence answer, and `unsupported` uncertainty.
- [ ] An answer with no valid citation, an unresolved citation, or a stale citation reports `high` uncertainty.
- [ ] A lexical-only cited answer reports `low`; a hybrid cited answer with clean citations reports `none`.
- [ ] The chat adapter surfaces a timeout as one stable error and never reads or returns the provider body.
- [ ] `POST /v1/answers` requires the bearer token, derives the owner, rejects a body that names `owner_id`, and answers `503` when no chat adapter is configured.
- [ ] No dependency is added and no corpus, question, or provider body is logged.

## Non-goals

`POST /v1/chat/completions` and streaming, tool calls, audit logging, quotas, reranking, answer caching, and any shell glue.

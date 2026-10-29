# 01: Grounded answers with reported uncertainty

Type: implementation
Status: resolved
Blocked by: None

## Question

Can a question over the corpus be answered only from retrieved evidence, with every cited span resolved and revalidated, with retrieved text treated as untrusted data, and with the uncertainty of the answer reported instead of hidden, using no new dependency?

## Context

Gateway contract and boundary rules live in `.scratch/http-gateway/map.md` and `docs/private-runtime.md`. Decisions A1-A7 of `../map.md` scope this ticket. `src/gateway-server.js` injects its dependencies; this slice follows the same shape.

## Acceptance criteria

- [x] `answerQuestion` retrieves with the derived owner and the optional collection scope, and accepts an injected chat function.
- [x] Evidence is numbered and bounded by `limit`; a retrieved segment cannot forge a delimiter or an instruction block.
- [x] The prompt states that retrieved text is untrusted data, and the instruction block contains no retrieved text.
- [x] `[n]` citations resolve against the numbered evidence; an out-of-range number is recorded as unresolved and never guessed.
- [x] Cited spans are revalidated by storage; a stale citation is recorded, not repaired.
- [x] No evidence means no model call, an explicit insufficient-evidence answer, and `unsupported` uncertainty.
- [x] An answer with no valid citation, an unresolved citation, or a stale citation reports `high` uncertainty.
- [x] A lexical-only cited answer reports `low`; a hybrid cited answer with clean citations reports `none`.
- [x] The chat adapter surfaces a timeout as one stable error and never reads or returns the provider body.
- [x] `POST /v1/answers` requires the bearer token, derives the owner, rejects a body that names `owner_id`, and answers `503` when no chat adapter is configured.
- [x] No dependency is added and no corpus, question, or provider body is logged.

## Non-goals

`POST /v1/chat/completions` and streaming, tool calls, audit logging, quotas, reranking, answer caching, and any shell glue.

## Answer

Yes. Answers are produced only from numbered evidence, and the uncertainty of an answer is a returned field rather than a claim in prose.

- `src/chat-client.js` is an OpenAI-compatible chat adapter shaped exactly like the embedder: `createOpenAICompatibleChat({ fetch, base_url, api_key, timeout_ms })` returns `chat({ model_id, messages, max_tokens })`. It refuses a cleartext non-loopback endpoint, refuses a redirect, surfaces a timeout as `chat request timed out`, and on a non-2xx status throws `chat request failed with status <n>` without ever reading the provider body.
- `src/answer-question.js` is the pure use case. It retrieves with the derived owner and the optional collection scope (lexical, or hybrid when an embedder and a registered model are given), numbers the evidence as one JSON object per line so a segment cannot forge a delimiter or an instruction, keeps retrieved text out of the system message, extracts `[n]` citations, resolves each cited match to provenance, revalidates the hashes against storage, and records out-of-range numbers, stale hashes, and self-inconsistent provenance instead of repairing or guessing them.
- Uncertainty is the ladder from decision A5: `unsupported` with no evidence and no model call, `high` when the answer cites nothing or cites outside, stale, or unusable evidence, `low` when lexical evidence backs a cited answer, `none` when hybrid evidence does with nothing unresolved.
- `POST /v1/answers` requires the bearer token, derives the owner, rejects a body that names `owner_id`, answers `503` when no chat adapter is configured, and maps a provider timeout to `504 model_timeout` and a provider failure to `502 model_failed`.

A defect the integration test forced into the open: when a document's stored segments hold provenance that no longer matches the document row, `resolveCitations` threw and the request failed as a caller error. The use case now treats such evidence as unusable and reports it, because the caller did nothing wrong and the answer must not cite it.

Verification: unit 78 pass / 20 expected skips / 0 fail; live pgvector/pg17 integration 24/24 including an HTTP answer round trip with a fake chat adapter, a no-evidence question that made no model call, and a tampered document that downgraded to `high` with one stale citation; Alpine `node:22-alpine` matrix identical. Commit `03331e1`.

## Comments

Claimed and resolved on 2026-10-29 on `feat/live-answers`. Streaming, `/v1/chat/completions`, audit logging, and quotas remain out of scope.

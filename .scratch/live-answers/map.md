# Wayfinder: grounded answers over the corpus

## Destination

Turn a retrieval result into an answer a person can trust: every claim traced to cited evidence, no answer invented when the evidence is absent, and retrieved text treated as untrusted data rather than instructions.

## Dependency position

Sealed and verified: segmentation with provenance, parser normalization, owner-scoped PostgreSQL persistence, lexical/semantic/hybrid retrieval with an optional collection scope, citation resolution and freshness revalidation, model registry and coverage, embedding backfill, an OpenAI-compatible embedder, retrieval-mode description, and the loopback HTTP gateway with boundary identity.

The gateway deliberately left answer generation out (decision D1 of `.scratch/http-gateway/map.md`) because no model client, no prompt policy, and no uncertainty reporting existed. This Wayfinder supplies exactly those three, and nothing else.

## Decisions

- A1: The answer is produced by one pure use case, `answerQuestion`, which composes retrieval, citation validation, and an injected chat function. It never imports the storage implementation and never talks HTTP; the gateway calls it.
- A2: The chat provider is an adapter shaped like the existing embedder: `createOpenAICompatibleChat({ fetch, base_url, api_key, timeout_ms })` returning `chat({ model_id, messages, max_tokens })`. Provider error bodies are never read, logged, or returned.
- A3: Evidence is bounded and numbered. The prompt carries a fixed instruction block and then at most `limit` evidence blocks, each serialized as JSON with its own index, so no retrieved text can forge a delimiter or a citation.
- A4: Citations are `[n]` markers resolved against the numbered evidence. A number outside the evidence set is recorded as unresolved and never guessed; a citation whose stored hashes no longer match is recorded as stale. Neither is silently repaired.
- A5: Uncertainty is reported, not hidden: `unsupported` when there is no evidence and therefore no model call, `high` when the answer cites nothing or cites outside the evidence or cites stale evidence, `low` when only lexical evidence backed a cited answer, `none` when hybrid evidence backed a cited answer with no unresolved or stale citation.
- A6: `/v1/chat/completions` is not part of this slice. The product-native `POST /v1/answers` is; the OpenAI-compatible entry stays deferred until streaming, tool-call semantics, and the shell's expectations are designed together.
- A7: Audit logging, rate limiting, and concurrency caps are deferred.
- A8: The chat model and the embedding model are distinct identities: `ANSWER_MODEL` is the chat model for every answer, and `embedding_model_id` on a request only opts into hybrid retrieval. Sharing one identifier made a hybrid-configured deployment unable to answer at all.
- A9: `uncertainty` reports citation integrity, not entailment. A valid `[n]` proves the cited segment exists, is owned by the caller, and is fresh; it does not prove the sentence is supported. This is stated instead of being promised, and it is the reason the level is `low` rather than `none` for lexical-only answers. The boundary already caps body size and requires a bearer token; per-owner quotas need a policy that does not exist yet.

## Boundary rules

- Retrieved text is data. The prompt says so explicitly, and the code never concatenates retrieved text into the instruction block.
- No corpus text, question text, or provider body is logged by this slice.
- The owner is always the authenticated identity of the gateway request; the use case receives it and never reads it from the question.
- No new dependency; the chat adapter uses the injected `fetch` and `AbortSignal.timeout`.

## Result

Implemented and verified on `feat/live-answers` in commit `03331e1`; ticket 01 resolved. The deferred items stay deferred: `POST /v1/chat/completions` and streaming (A6), audit logging and quotas (A7).

## Exit condition

The slice is done when a question with no evidence produces an answer without a model call, an answer with a forged citation number is downgraded to `high` uncertainty, a provider timeout surfaces as one stable error, and the gateway route is covered end to end against a real database with a fake chat client.

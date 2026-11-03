# 01: Add an OpenAI-compatible embedder for the backfill injection point

Type: implementation
Status: resolved
Blocked by: None

## Question

Can the repository turn the `embed` injection point of `runEmbeddingBackfill` into a real call against a customer-owned OpenAI-compatible endpoint, without adding a vendor SDK or dependency, without ever storing or leaking the API key, and while validating the provider response against the registry dimension?

## Acceptance criteria

- [x] `createOpenAICompatibleEmbedder` is exported from the package entry point and returns the `embed` contract already required by the worker.
- [x] Configuration fails closed for a missing `fetch`, a relative or plaintext non-loopback `base_url`, an empty `api_key`, and an invalid `timeout_ms`.
- [x] The request is a bounded `POST <base_url>/embeddings` with `{ model, input }`, a JSON content type, and a bearer header only when a key is configured.
- [x] Responses are ordered by `index` when present and validated for count, dimension, and finite values before returning.
- [x] Every failure message is secret-free and body-free.
- [x] The adapter composes with `runEmbeddingBackfill` end to end in a unit test.
- [x] No dependency, schema change, retry loop, logging, or credential storage is added.
- [x] Existing suites remain green.

## Answer

Implemented `createOpenAICompatibleEmbedder` in `src/embedding-client.js` and exported it from `src/index.js`. The adapter posts `{ model, input }` to `<base_url>/embeddings`, defaults `fetch` to the runtime global, carries the bearer header only when a key is configured, bounds the request with `AbortSignal.timeout`, refuses redirects, and validates the response for JSON shape, one vector per input, registry dimensions, finite values, and a strict `index` permutation before returning anything.

Two independent adversarial reviews drove the hardening: the first found a key leak through a credential-bearing `base_url` and through non-printable keys, plus unrefused redirects and an index contract that accepted duplicates, gaps, and partially indexed payloads; the second found an arbitrary `error.code` reflected into the message and two wording mismatches. All are fixed: credential URLs are rejected, the plaintext rule is unconditional off-loopback, keys must be printable ASCII without spaces, redirects are refused, indexing is a strict permutation, and a transport error code is echoed only when it matches `^[A-Z0-9_]{1,40}$`.

Verification: `node --test test/embedding-client.test.js` 8/8; full host suite 34 pass / 11 expected skips; Debian (`node:22-bookworm-slim`) and Alpine (`node:22-alpine`) matrix identical, 32 pass / 11 skips before the last hardening, and the entry point imports without network under `--network none`; composition with `runEmbeddingBackfill` proven by a unit test that asserts the written vectors. Implementation commit: see `odd/tasks/embedding-provider-boundary.md`.

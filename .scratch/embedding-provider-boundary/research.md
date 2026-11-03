# Research: OpenAI-compatible embedding provider boundary

## Decision

Implement one adapter, `createOpenAICompatibleEmbedder`, that turns the existing `embed` injection point into a real HTTP call against a customer-owned OpenAI-compatible endpoint. No vendor SDK, no dependency, no credential storage.

## Repository evidence

- `docs/implementation-brief.md:116` and `README.md:36` place a customer-owned LLM/embedding endpoint inside the private stack; `README.md:56` and `:204` describe custom OpenAI-compatible endpoints as the integration contract.
- `docs/implementation-brief.md` security section requires credentials in a customer-controlled mechanism, no committed secrets, loopback binding by default, and TLS whenever traffic leaves the host.
- `src/embedding-backfill.js` already defines the exact call contract the adapter must satisfy: `embed({ model_id, dimensions, inputs })` returning one vector per input, and it owns ordering, skip logic, and the write.
- `src/postgres-store.js` registers `model_id` and immutable `dimensions`, so the adapter can validate the provider response against the registry instead of guessing.
- `package.json` has one runtime dependency (`pg`) and `engines.node >= 22`, which provides a global `fetch` and `AbortSignal.timeout`, so no HTTP client dependency is needed.
- `.gitignore` already excludes `.env` files; no secret has a reason to enter the repository.

## Rejected alternatives

- Vendor SDKs (openai, cohere, ollama clients): each selects a vendor and adds a dependency for one POST request.
- Hardcoding an endpoint or model name: contradicts the customer-owned endpoint boundary and would make the registry meaningless.
- Retries and backoff inside the adapter: retry policy interacts with cost, rate limits, and the worker's derived-state loop, so it belongs to the caller.
- Sending `dimensions` to the provider: support varies by model, and the registry already owns the expected dimension; validating the response is stricter and vendor-neutral.
- Logging request or response payloads for debuggability: they contain document text and would leak the corpus into logs.

## Compatibility notes

- Additive module and export; no existing signature changes.
- Works against local loopback runtimes over `http` and against remote endpoints over `https`.
- Deterministic unit tests use an injected `fetch`, so no network access or fixture server is required.

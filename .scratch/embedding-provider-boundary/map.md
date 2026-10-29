# Wayfinder: OpenAI-compatible embedding provider boundary

## Destination

Give `runEmbeddingBackfill` a real embedder without choosing a vendor: one adapter that speaks the OpenAI-compatible `POST /embeddings` protocol against a customer-owned endpoint, with the transport injected and credentials handled safely.

## Dependency position

Completed prerequisites:

1. deterministic segmentation and hashes;
2. parser-neutral page/layout provenance;
3. owner-scoped transactional PostgreSQL persistence;
4. exact model-aware semantic retrieval;
5. deterministic hybrid retrieval;
6. pure citation resolution;
7. storage-backed citation freshness revalidation;
8. global embedding-model registry and owner-scoped coverage inspection;
9. owner-scoped backfill planning with a repair path for stale dimension rows;
10. provider-neutral backfill execution over an injected `embed` function.

This slice fills the injection point with a protocol adapter. Vendor, model name, endpoint, and credential remain runtime configuration.

## Public seam

```js
createOpenAICompatibleEmbedder({ fetch = globalThis.fetch, base_url, api_key, timeout_ms = 30000 })
```

The returned function matches the `embed({ model_id, dimensions, inputs })` contract already required by `runEmbeddingBackfill`.

## Decisions so far

- D1: The protocol is OpenAI-compatible because the documented target is a customer-owned OpenAI-compatible endpoint (`docs/implementation-brief.md`, `README.md`). The vendor is not selected here.
- D2: `fetch` is injected and defaults to the runtime global, so the adapter adds no dependency and stays testable without a network.
- D3: `model_id` from the registry is sent verbatim as the provider model name; a name translation is a caller wrapper, not repository policy.
- D4: The adapter refuses a plaintext non-loopback `base_url` even without a key, because corpus text and any credential would travel in cleartext to a remote host; it also refuses redirects and credential-bearing URLs so the body cannot be forwarded or the key reflected into an error.

## Review outcome

Two adversarial review rounds (security and contract) rejected the first and second drafts with concrete reproducible defects, all fixed before completion: credential-bearing and plaintext remote URLs, non-printable keys, unrefused redirects, permissive index handling, and a reflected transport error code. The adapter is complete for the injected seam; retries, rate limits, batching, cost control, and real provider credentials remain out of scope.

## Safety boundary

- No vendor SDK, no retry loop, no scheduler, no credential storage, no logging of request or response bodies.
- The API key is never echoed in an error message, and neither request nor response bodies appear in one.
- Response vectors are validated for count, dimension, and finite values before the caller can write them.
- Rate limiting, retries, cost control, and model selection remain the caller's responsibility.

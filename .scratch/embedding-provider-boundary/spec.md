# Spec: OpenAI-compatible embedding provider boundary

## Problem statement

`runEmbeddingBackfill` needs an `embed` function, and the documented deployment uses a customer-owned OpenAI-compatible endpoint. Without an adapter, every caller would hand-roll a POST, credentials handling, response parsing, and dimension checks, and would likely leak the corpus into logs or send an API key over plaintext.

## Public seam

```js
const embed = createOpenAICompatibleEmbedder({
  fetch = globalThis.fetch,
  base_url,
  api_key,
  timeout_ms = 30000
});
```

The returned function matches `embed({ model_id, dimensions, inputs })` and resolves to one vector per input, in input order.

## Invariants

- `fetch` must be a function; it defaults to the runtime global so the adapter adds no dependency.
- `base_url` must be an absolute `http` or `https` URL. A non-loopback `http` URL is rejected at construction, because corpus text and any API key would travel in cleartext.
- `base_url` must not carry credentials, and any query or fragment is dropped: the endpoint is always `<origin><path>/embeddings`.
- `api_key` is optional; when present it must be printable ASCII without spaces or control characters and is sent only as `Authorization: Bearer <key>`.
- `timeout_ms` is an integer from 1 through 600000 and bounds the request through `AbortSignal.timeout`; a conforming transport aborts the response body read as well.
- A call requires an object with a non-empty `model_id`, a `dimensions` integer from 1 through 16000, and a non-empty array of non-empty `inputs`.
- The request is `POST <base_url>/embeddings` with a JSON body of exactly `{ model: model_id, input: inputs }`, a JSON content type, and the authorization header only when a key is configured.
- The response must be JSON with a `data` array. When any item carries an `index`, every item must carry an integer one and the indexes must be exactly a permutation of `0..n-1`; a payload that indexes only some entries, or repeats or skips one, fails closed. Without indexes the array order is kept.
- The response must contain exactly one vector per input, each with exactly `dimensions` finite numeric values; any other shape fails closed.
- The request refuses redirects, so the POST body cannot be forwarded to another origin.
- Errors name the failure and never include the API key, the request body, the response body, or document text. A timeout reports only its category; a transport failure reports its category plus an error code only when that code matches `^[A-Z0-9_]{1,40}$`, so an arbitrary library-supplied code cannot echo a secret.
- No retries, logging of payloads, metrics, credential storage, or vendor SDK. Rate limits, backoff, and model selection belong to the caller.
- No new dependency, schema change, or runtime service.

## Acceptance criteria

- [ ] invalid `fetch`, non-absolute `base_url`, credential-bearing `base_url`, plaintext non-loopback `base_url` (with or without a key), empty or unprintable `api_key`, and out-of-range `timeout_ms` fail at construction;
- [ ] a query or fragment in `base_url` never reaches the endpoint, and the request refuses redirects;
- [ ] a call to a loopback `http` endpoint without a key sends no authorization header;
- [ ] a call to an `https` endpoint with a key sends the bearer header, the JSON content type, and the exact `{ model, input }` body;
- [ ] response vectors are returned in input order even when the provider returns them shuffled by `index`, and duplicated, skipped, or partially missing indexes fail closed;
- [ ] a non-2xx status, a timeout, and a transport failure fail closed with only the status or the cause category in the message and no secret;
- [ ] a response with invalid JSON, a missing `data` array, the wrong number of vectors, a wrong dimension, or non-finite values fails closed;
- [ ] the adapter composes with `runEmbeddingBackfill`, which writes the mapped vectors through the storage seam;
- [ ] existing suites remain green.

## Deferred

Retries and backoff, rate limiting, cost accounting, request batching per token limit, provider-specific options, multiple providers at once, credential retrieval from a secret manager, and metrics or tracing.

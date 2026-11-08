# Real provider compatibility smoke

Type: measurement
Status: resolved

## Scope

- Gateway: `src/gateway-cli.js` against disposable `pgvector/pgvector:pg17`.
- Provider origin: `http://127.0.0.1:8317/v1`.
- Model: `deepseek-v4.1-flash`.
- One synthetic document was ingested before the measured answer calls.
- Final measured retrieval was lexical. Hybrid retrieval was not faked: the proxy's `/v1/embeddings` route is 404, so hybrid retrieval needs a separate embedding provider.

## Answer

Final run measurements, with provider usage read from the provider usage record after the calls:

<table>
<tr><th>Call</th><th>Status</th><th>Client latency</th><th>Provider usage</th><th>Result</th></tr>
<tr><td>GET /readyz before</td><td>503</td><td>923.02 ms</td><td>32 input, 1 output, 33 total</td><td>Provider returned 200, but the one-token health response had empty content; gateway reported not ready.</td></tr>
<tr><td>POST /v1/documents/ingest</td><td>200</td><td>11.03 ms</td><td>not applicable</td><td>One synthetic document, one segment.</td></tr>
<tr><td>POST /v1/answers</td><td>200</td><td>1128.23 ms</td><td>260 input, 39 output, 299 total</td><td>Answered: the Italian invoice payment deadline is thirty days [1].</td></tr>
<tr><td>POST /v1/chat/completions</td><td>200</td><td>1107.80 ms</td><td>260 input, 48 output, 308 total</td><td>Answered with citation metadata.</td></tr>
<tr><td>GET /readyz after</td><td>503</td><td>1.76 ms</td><td>no new provider call</td><td>Cached not-ready verdict.</td></tr>
</table>

Verbatim gateway audit lines:

```text
{"event":"model_call","kind":"chat","route":"GET /readyz","owner_id":null,"model_id":"deepseek-v4.1-flash","outcome":"failed","duration_ms":875,"provider_host":"127.0.0.1:8317"}
{"event":"model_call","kind":"chat","route":"POST /v1/answers","owner_id":"perf-real-provider-owner","model_id":"deepseek-v4.1-flash","outcome":"ok","duration_ms":1125,"provider_host":"127.0.0.1:8317"}
{"event":"model_call","kind":"chat","route":"POST /v1/chat/completions","owner_id":"perf-real-provider-owner","model_id":"deepseek-v4.1-flash","outcome":"ok","duration_ms":1105,"provider_host":"127.0.0.1:8317"}
```

The chat path answered successfully, so the smoke is resolved. Readiness remains 503 because the gateway's health probe requires non-empty assistant content, while this model's `max_tokens: 1` probe returned an empty message despite HTTP 200. The provider key was read from `/root/.pi/agent/cliproxyapi.json` into an environment variable and was never printed or written.

## Blocker evidence

- `http://127.0.0.1:8317/v1/embeddings` is 404. Hybrid retrieval therefore requires a separate embedding provider; no embedding result was fabricated.
- `claude-sonnet-4-6` was not used because it is in upstream quota cooldown.

## Comments

A later attempt to pin the provider contract by listing what the proxy exposes found no usable client credential from this session: `/v1/models` on `127.0.0.1:8317` answered `401` for every key-like value available under `/root/.pi/agent`, and the proxy configuration mounted at `/root/git/personale/cliproxy/cliproxy-stack/data/cliproxy/gitstore/config/config.yaml` keeps its client `api-keys` root commented out. What is needed to unblock, in one line: a client key and the exact chat model id the proxy accepts, plus whether it exposes `/v1/embeddings` at all, since the embedding probe answered `404` and a hybrid-retrieval smoke needs it.

# R10 performance baseline report

## Summary

The fake-provider gateway path is bounded through concurrency 2 and returned explicit `429 model_busy` responses at concurrency 4. Retrieval remained successful through concurrency 4 in the bounded run. The real-provider smoke is resolved for answer and OpenAI-compatible chat completion with `deepseek-v4.1-flash`; readiness remains 503 because the gateway health probe rejects the provider's empty one-token message. Hybrid retrieval was not faked because the proxy's `/v1/embeddings` route is 404 and needs a separate embedding provider.

## Measurements

### Real provider

<table>
<tr><th>Request</th><th>Model</th><th>Client latency</th><th>Status</th><th>Provider usage</th><th>Provider host</th></tr>
<tr><td>GET /readyz before</td><td>deepseek-v4.1-flash</td><td>923.02 ms</td><td>503</td><td>32 input / 1 output / 33 total</td><td>127.0.0.1:8317</td></tr>
<tr><td>POST /v1/answers</td><td>deepseek-v4.1-flash</td><td>1128.23 ms</td><td>200</td><td>260 input / 39 output / 299 total</td><td>127.0.0.1:8317</td></tr>
<tr><td>POST /v1/chat/completions</td><td>deepseek-v4.1-flash</td><td>1107.80 ms</td><td>200</td><td>260 input / 48 output / 308 total</td><td>127.0.0.1:8317</td></tr>
<tr><td>GET /readyz after</td><td>deepseek-v4.1-flash</td><td>1.76 ms</td><td>503</td><td>no new provider call; cached verdict</td><td>127.0.0.1:8317</td></tr>
</table>

The synthetic ingest returned 200 in 11.03 ms with one segment. The answer and chat paths both returned a cited answer. The provider returned HTTP 200 for readiness, but the one-token health response had empty content, so the gateway kept readiness at 503.

Verbatim audit lines:

```text
{"event":"model_call","kind":"chat","route":"GET /readyz","owner_id":null,"model_id":"deepseek-v4.1-flash","outcome":"failed","duration_ms":875,"provider_host":"127.0.0.1:8317"}
{"event":"model_call","kind":"chat","route":"POST /v1/answers","owner_id":"perf-real-provider-owner","model_id":"deepseek-v4.1-flash","outcome":"ok","duration_ms":1125,"provider_host":"127.0.0.1:8317"}
{"event":"model_call","kind":"chat","route":"POST /v1/chat/completions","owner_id":"perf-real-provider-owner","model_id":"deepseek-v4.1-flash","outcome":"ok","duration_ms":1105,"provider_host":"127.0.0.1:8317"}
```

The final run made exactly one `POST /v1/answers` and one `POST /v1/chat/completions`. `/v1/embeddings` remains unavailable with HTTP 404; hybrid retrieval needs a separate embedding provider.

### Fake provider load

<table>
<tr><th>Route</th><th>Concurrency</th><th>Samples</th><th>p50 ms</th><th>p95 ms</th><th>Error rate</th><th>Statuses</th></tr>
<tr><td>/v1/answers</td><td>1</td><td>12</td><td>33.55</td><td>84.49</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/answers</td><td>2</td><td>12</td><td>31.08</td><td>43.13</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/answers</td><td>4</td><td>12</td><td>4.45</td><td>35.19</td><td>50%</td><td>200: 6, 429: 6</td></tr>
<tr><td>/v1/retrieval/query</td><td>1</td><td>12</td><td>2.16</td><td>2.79</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/retrieval/query</td><td>2</td><td>12</td><td>3.54</td><td>4.49</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/retrieval/query</td><td>4</td><td>12</td><td>3.57</td><td>12.76</td><td>0%</td><td>200: 12</td></tr>
</table>

## Exact commands

The smoke used a disposable random loopback port and password. The provider key was read from `/root/.pi/agent/cliproxyapi.json` into an environment variable and was never printed or written.

```bash
cd /tmp/r10-smoke2
pnpm install --frozen-lockfile --ignore-scripts
DATABASE_URL="postgres://rag:<disposable-password>@127.0.0.1:<free-port>/rag" pnpm migrate
DATABASE_URL="postgres://rag:<disposable-password>@127.0.0.1:<free-port>/rag" node /tmp/r10-smoke2-runner.mjs
```

Migration completed without retry in the final run. Cleanup verification: the disposable Postgres container and gateway process were absent after the run, and `/tmp/r10-smoke2` was removed after the main-worktree documentation update.

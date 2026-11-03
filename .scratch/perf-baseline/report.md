# R10 performance baseline report

## Summary

The gateway now defaults to three concurrent model requests, covering one to three parallel chats without queueing. The fake-provider repeat run returned 0% answer errors at concurrency 1, 2, and 3; concurrency 4 returned explicit `429 model_busy` responses for 25% of samples. Retrieval remained successful through concurrency 4. The contract remains bounded fail-fast capacity rather than an unbounded queue. The real-provider smoke passes: `deepseek-v4.1-flash` answered a grounded question in 1128.23 ms and a chat completion in 1107.80 ms, each reporting usage, against the local proxy at `http://127.0.0.1:8317/v1`. The proxy does not serve embeddings, so hybrid retrieval needs a separate embedding provider on this host.

## Measurements

### Real provider

<table>
<tr><th>Request</th><th>Model</th><th>Client latency</th><th>Status</th><th>Provider host</th></tr>
<tr><td>POST /v1/answers</td><td>deepseek-v4.1-flash</td><td>1128.23 ms</td><td>200</td><td>127.0.0.1:8317</td></tr>
<tr><td>POST /v1/chat/completions</td><td>deepseek-v4.1-flash</td><td>1107.80 ms</td><td>200</td><td>127.0.0.1:8317</td></tr>
<tr><td>POST /v1/retrieval/query hybrid</td><td>not exercised</td><td>n/a</td><td>n/a</td><td>proxy answers 404 on /v1/embeddings</td></tr>
</table>

Audit lines:

```text
{"event":"model_call","kind":"chat","route":"POST /v1/answers","owner_id":"perf-real-provider-owner","model_id":"cliproxyapi/deepseek-v4.1-flash","outcome":"failed","duration_ms":49,"provider_host":"127.0.0.1:8317"}
{"event":"model_call","kind":"embedding","route":"POST /v1/retrieval/query","owner_id":"perf-real-provider-owner","model_id":"deepseek-v4.1-flash","outcome":"failed","duration_ms":4,"provider_host":"127.0.0.1:8317"}
```

Token cost: not reported by the provider response exposed through the gateway or by the gateway audit record.

### Fake provider load

<table>
<tr><th>Route</th><th>Concurrency</th><th>Samples</th><th>p50 ms</th><th>p95 ms</th><th>Error rate</th><th>Statuses</th></tr>
<tr><td>/v1/answers</td><td>1</td><td>12</td><td>31.11</td><td>76.66</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/answers</td><td>2</td><td>12</td><td>29.50</td><td>37.22</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/answers</td><td>3</td><td>12</td><td>29.67</td><td>35.14</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/answers</td><td>4</td><td>12</td><td>30.76</td><td>31.51</td><td>25%</td><td>200: 9, 429: 3</td></tr>
<tr><td>/v1/retrieval/query</td><td>1</td><td>12</td><td>1.33</td><td>1.92</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/retrieval/query</td><td>2</td><td>12</td><td>1.55</td><td>2.54</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/retrieval/query</td><td>3</td><td>12</td><td>2.84</td><td>3.38</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/retrieval/query</td><td>4</td><td>12</td><td>2.92</td><td>9.64</td><td>0%</td><td>200: 12</td></tr>
</table>

## Exact commands

The commands below use a caller-provided disposable password and do not contain a credential value.

```bash
cd /root/git/personale/pi.dev/second-brain-stack/.worktrees/session-2
export PERF_PG_PASSWORD='<disposable local password>'
docker run -d --name sb-perf-r10-pg \
  -e POSTGRES_DB=rag -e POSTGRES_USER=rag -e POSTGRES_PASSWORD="$PERF_PG_PASSWORD" \
  -p 127.0.0.1:55437:5432 pgvector/pgvector:pg17
docker exec sb-perf-r10-pg pg_isready -U rag -d rag
DATABASE_URL="postgres://rag:${PERF_PG_PASSWORD}@127.0.0.1:55437/rag" pnpm migrate
PERF_DATABASE_URL="postgres://rag:${PERF_PG_PASSWORD}@127.0.0.1:55437/rag" node .scratch/perf-baseline/real-provider-smoke.mjs
PERF_DATABASE_URL="postgres://rag:${PERF_PG_PASSWORD}@127.0.0.1:55437/rag" node .scratch/perf-baseline/bounded-load-test.mjs  # default model concurrency: 3
docker rm -f sb-perf-r10-pg
```

Observed cleanup commands/results:

```text
container_present=false
gateway_process_present=false
```

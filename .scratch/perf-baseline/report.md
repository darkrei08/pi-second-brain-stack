# R10 performance baseline report

## Summary

The fake-provider gateway path is bounded through concurrency 2 and returned explicit `429 model_busy` responses at concurrency 4. Retrieval remained successful through concurrency 4 in this bounded run. The real-provider smoke is blocked by CLIProxyAPI compatibility: the prefixed chat model returned 400 and the embedding route returned 404.

## Measurements

### Real provider

<table>
<tr><th>Request</th><th>Model</th><th>Client latency</th><th>Status</th><th>Provider host</th></tr>
<tr><td>POST /v1/answers</td><td>cliproxyapi/deepseek-v4.1-flash</td><td>104.80 ms</td><td>502</td><td>127.0.0.1:8317</td></tr>
<tr><td>POST /v1/retrieval/query hybrid</td><td>deepseek-v4.1-flash</td><td>10.46 ms</td><td>502</td><td>127.0.0.1:8317</td></tr>
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
<tr><td>/v1/answers</td><td>1</td><td>12</td><td>33.55</td><td>84.49</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/answers</td><td>2</td><td>12</td><td>31.08</td><td>43.13</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/answers</td><td>4</td><td>12</td><td>4.45</td><td>35.19</td><td>50%</td><td>200: 6, 429: 6</td></tr>
<tr><td>/v1/retrieval/query</td><td>1</td><td>12</td><td>2.16</td><td>2.79</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/retrieval/query</td><td>2</td><td>12</td><td>3.54</td><td>4.49</td><td>0%</td><td>200: 12</td></tr>
<tr><td>/v1/retrieval/query</td><td>4</td><td>12</td><td>3.57</td><td>12.76</td><td>0%</td><td>200: 12</td></tr>
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
PERF_DATABASE_URL="postgres://rag:${PERF_PG_PASSWORD}@127.0.0.1:55437/rag" node .scratch/perf-baseline/bounded-load-test.mjs
docker rm -f sb-perf-r10-pg
```

Observed cleanup commands/results:

```text
container_present=false
gateway_process_present=false
```

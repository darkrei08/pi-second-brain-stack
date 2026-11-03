# Bounded fake-provider load test

Type: measurement
Status: resolved
Blocked by: none

## Answer

The fake OpenAI-compatible provider added a fixed 25 ms chat delay. The gateway used `GATEWAY_MODEL_CONCURRENCY=2` and `GATEWAY_MODEL_REQUESTS_PER_MINUTE=1000`. Each row contains 12 requests. Percentiles include successful and failed responses.

### POST /v1/answers

<table>
<tr><th>Concurrency</th><th>Samples</th><th>p50 ms</th><th>p95 ms</th><th>Errors</th><th>Error rate</th><th>Statuses</th></tr>
<tr><td>1</td><td>12</td><td>33.55</td><td>84.49</td><td>0</td><td>0%</td><td>200: 12</td></tr>
<tr><td>2</td><td>12</td><td>31.08</td><td>43.13</td><td>0</td><td>0%</td><td>200: 12</td></tr>
<tr><td>4</td><td>12</td><td>4.45</td><td>35.19</td><td>6</td><td>50%</td><td>200: 6, 429: 6</td></tr>
</table>

The run stopped at concurrency 4, immediately after the 50% `429 model_busy` result. The 429s are the configured concurrency budget, not the per-minute budget.

### POST /v1/retrieval/query

<table>
<tr><th>Concurrency</th><th>Samples</th><th>p50 ms</th><th>p95 ms</th><th>Errors</th><th>Error rate</th><th>Statuses</th></tr>
<tr><td>1</td><td>12</td><td>2.16</td><td>2.79</td><td>0</td><td>0%</td><td>200: 12</td></tr>
<tr><td>2</td><td>12</td><td>3.54</td><td>4.49</td><td>0</td><td>0%</td><td>200: 12</td></tr>
<tr><td>4</td><td>12</td><td>3.57</td><td>12.76</td><td>0</td><td>0%</td><td>200: 12</td></tr>
</table>

The fake provider received 30 chat requests. The gateway emitted 30 successful model-call audit records for the answer requests that reached the provider. Retrieval did not consume the model budget.

### Real-provider delta

A real provider would add provider network and queue latency, provider-side rate limits or transient failures, model-specific token usage, and provider response-shape differences. The gateway's fixed timeout and 429 budget would then be additional limits, not a substitute for provider quotas.

## Reproduction

Set a disposable local PostgreSQL password in `PERF_PG_PASSWORD`; the harness creates and stops the fake provider itself.

```bash
export PERF_PG_PASSWORD='<disposable local password>'
docker run -d --name sb-perf-r10-pg \
  -e POSTGRES_DB=rag -e POSTGRES_USER=rag -e POSTGRES_PASSWORD="$PERF_PG_PASSWORD" \
  -p 127.0.0.1:55437:5432 pgvector/pgvector:pg17
docker exec sb-perf-r10-pg pg_isready -U rag -d rag
DATABASE_URL="postgres://rag:${PERF_PG_PASSWORD}@127.0.0.1:55437/rag" pnpm migrate
PERF_DATABASE_URL="postgres://rag:${PERF_PG_PASSWORD}@127.0.0.1:55437/rag" \
  node .scratch/perf-baseline/bounded-load-test.mjs
docker rm -f sb-perf-r10-pg
```

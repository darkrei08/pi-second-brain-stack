# Real provider compatibility smoke

Type: measurement
Status: resolved
Blocked by: CLIProxyAPI did not accept the requested prefixed chat model and did not expose a usable embedding route through the gateway adapter.

## Scope

- Gateway: `src/gateway-cli.js` against disposable PostgreSQL/pgvector.
- Provider host: `127.0.0.1:8317`.
- Model attempted: `cliproxyapi/deepseek-v4.1-flash`.
- Requests: one answer request and one hybrid retrieval request in the recorded final attempt.
- The embedding registry requires an opaque model id, so the embedding attempt used `deepseek-v4.1-flash`; the provider returned 404.

## Answer

The final bounded attempt measured:

<table>
<tr><th>Route</th><th>Status</th><th>Latency</th><th>Result</th></tr>
<tr><td>POST /v1/answers</td><td>502</td><td>104.80 ms client latency</td><td>Provider returned HTTP 400; gateway mapped it to model_failed.</td></tr>
<tr><td>POST /v1/retrieval/query hybrid</td><td>502</td><td>10.46 ms client latency</td><td>Provider returned HTTP 404 for /v1/embeddings; gateway mapped it to model_failed.</td></tr>
</table>

Verbatim gateway audit lines from the prefixed-model attempt:

```text
{"event":"model_call","kind":"chat","route":"POST /v1/answers","owner_id":"perf-real-provider-owner","model_id":"cliproxyapi/deepseek-v4.1-flash","outcome":"failed","duration_ms":49,"provider_host":"127.0.0.1:8317"}
{"event":"model_call","kind":"embedding","route":"POST /v1/retrieval/query","owner_id":"perf-real-provider-owner","model_id":"deepseek-v4.1-flash","outcome":"failed","duration_ms":4,"provider_host":"127.0.0.1:8317"}
```

Token cost was not reported. The gateway audit record contains metadata and duration only, and both provider calls failed before a usable response was returned.

## Blocker evidence

- The authorized provider model listing observed unprefixed ids, while the task-required prefixed chat id produced HTTP 400.
- The gateway's embedding model id validation accepts opaque ids only, so `cliproxyapi/<model>` cannot be registered as an embedding model id.
- The provider returned HTTP 404 for the resulting unprefixed embedding request.

## Reproduction

The harness reads the provider key into process memory from the effective configuration and never prints it. Set a disposable local PostgreSQL password in `PERF_PG_PASSWORD` before running.

```bash
export PERF_PG_PASSWORD='<disposable local password>'
docker run -d --name sb-perf-r10-pg \
  -e POSTGRES_DB=rag -e POSTGRES_USER=rag -e POSTGRES_PASSWORD="$PERF_PG_PASSWORD" \
  -p 127.0.0.1:55437:5432 pgvector/pgvector:pg17
docker exec sb-perf-r10-pg pg_isready -U rag -d rag
DATABASE_URL="postgres://rag:${PERF_PG_PASSWORD}@127.0.0.1:55437/rag" pnpm migrate
PERF_DATABASE_URL="postgres://rag:${PERF_PG_PASSWORD}@127.0.0.1:55437/rag" \
  node .scratch/perf-baseline/real-provider-smoke.mjs
docker rm -f sb-perf-r10-pg
```

## Comments

A later attempt to pin the provider contract by listing what the proxy exposes found no usable client credential from this session: `/v1/models` on `127.0.0.1:8317` answered `401` for every key-like value available under `/root/.pi/agent`, and the proxy configuration mounted at `/root/git/personale/cliproxy/cliproxy-stack/data/cliproxy/gitstore/config/config.yaml` keeps its client `api-keys` root commented out. What is needed to unblock, in one line: a client key and the exact chat model id the proxy accepts, plus whether it exposes `/v1/embeddings` at all, since the embedding probe answered `404` and a hybrid-retrieval smoke needs it.

## Comments

Two facts pinned by direct probes of the proxy, with the credential read from the harness provider configuration and never printed:

- `claude-sonnet-4-6` answers `429` with `{"error":{"code":"model_cooldown","last_upstream_error": ... "Resource has been exhausted (e.g. check quota)"}}`. The id is valid; that upstream credential is in cooldown or out of quota, which is why the gateway smoke saw `502` on both routes.
- `deepseek-v4.1-flash` answers `200` and reports usage: `prompt_tokens` 31, `completion_tokens` 4, `total_tokens` 35, with a listed cost. Use that model for the smoke, and note that the provider does report usage while the gateway currently discards it (see the gateway-resilience ticket on token usage).

The base URL in `/root/.pi/agent/cliproxyapi.json` is the bare origin; the OpenAI-compatible routes live under `/v1`, so `ANSWER_BASE_URL` must be `http://127.0.0.1:8317/v1`.

## Answer

Measured on 2026-11-02 against the local proxy at `http://127.0.0.1:8317/v1` with `deepseek-v4.1-flash`, a disposable `pgvector/pgvector:pg17` instance and the gateway from the repository at `ed4176e`. The first attempt failed because `claude-sonnet-4-6` sits in upstream quota cooldown (`429 model_cooldown`) and because the base URL needed the `/v1` suffix; both are recorded in the comments above and were not code defects.

| Call | Status | Client latency | Provider usage |
|---|---|---|---|
| `POST /v1/documents/ingest` | 200 | 11.03 ms | 1 segment |
| `POST /v1/answers` | 200 | 1128.23 ms | 260 input, 39 output, 299 total |
| `POST /v1/chat/completions` | 200 | 1107.80 ms | 260 input, 48 output, 308 total |

Audit lines, verbatim:

```text
{"event":"model_call","kind":"chat","route":"GET /readyz","owner_id":null,"model_id":"deepseek-v4.1-flash","outcome":"failed","duration_ms":875,"provider_host":"127.0.0.1:8317"}
{"event":"model_call","kind":"chat","route":"POST /v1/answers","owner_id":"perf-real-provider-owner","model_id":"deepseek-v4.1-flash","outcome":"ok","duration_ms":1125,"provider_host":"127.0.0.1:8317"}
{"event":"model_call","kind":"chat","route":"POST /v1/chat/completions","owner_id":"perf-real-provider-owner","model_id":"deepseek-v4.1-flash","outcome":"ok","duration_ms":1105,"provider_host":"127.0.0.1:8317"}
```

Two findings that outlive the smoke. First, the gateway answered both routes while `/readyz` reported `503`, because the readiness probe at that commit spent one completion token and that call failed, so a healthy provider was reported unready: a false negative, corrected afterwards by probing provider metadata instead of generating tokens. Second, the provider reports token usage on every call and the gateway discards it, which is the token-usage ticket in `.scratch/gateway-resilience/`.

Hybrid retrieval was not exercised: the proxy answers `404` on `/v1/embeddings`, so an embedding provider separate from this proxy is required on this host. Cleanup was verified: container, gateway process and the temporary checkout were removed.

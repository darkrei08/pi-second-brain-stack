# R10 performance baseline map

## Destination

This measurement slice lives only under `.scratch/perf-baseline/`.

- `real-provider-smoke.mjs`: bounded CLIProxyAPI gateway smoke harness.
- `bounded-load-test.mjs`: fake OpenAI-compatible provider and bounded gateway load harness.
- `issues/01-real-provider-smoke.md`: real-provider compatibility result.
- `issues/02-bounded-load-test.md`: fake-provider load result.
- `report.md`: consolidated tables and commands.

## Notes

- The PostgreSQL dependency was a disposable pgvector/pgvector:pg17 container bound to a temporary loopback port.
- The real-provider run used the effective CLIProxyAPI configuration discovered from the running process mount. The requested /root/git/cliproxyapi/config.yaml path was absent on this host.
- The real-provider result is blocked by provider compatibility: the prefixed chat model returned HTTP 400 and the embedding request returned HTTP 404. No provider token cost was reported by the gateway response or audit record.
- The load test used a local fake OpenAI-compatible chat endpoint, GATEWAY_MODEL_CONCURRENCY=2, and a high per-minute budget so the observed 429s isolate the concurrency budget.
- Measurement stopped at concurrency 4 after /v1/answers reached 50% HTTP 429 errors. No 8-concurrency run was made.
- Cleanup evidence: the disposable container and gateway process were absent after the run.

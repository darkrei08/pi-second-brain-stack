# ANN harness smoke result

Measured, not assumed. This is the first real run of `bench/ann` against a live pgvector. It exists to prove the harness works and to record what it reported; it is **not** evidence for choosing an index, because the corpus is synthetic and small.

## Environment

- Disposable container `pgvector/pgvector:pg17` on `127.0.0.1:55441`, created from a temporary compose file outside the repository, initialised with `docker/postgres/init/001-extensions.sql` through `005-collections.sql`, then removed with `down -v`.
- Node `v22.23.3`, Linux, concurrency 1.
- Command: `node bench/ann/cli.js --database-url postgres://bench:bench@127.0.0.1:55441/bench`
- Exit status 1, because one candidate failed. That is the harness's intended signal, not a harness error.

## Corpus

`ann-corpus-v1`, seed `20261029`, 8 dimensions, 24 documents, 96 segments, 12 queries, top-k 5, 2 owners, 4 collections, model `ann-model-20261029`. Deterministic: same seed, same bytes.

Scoping applied identically to exact and to every candidate: owner, `retention_state = 'active'`, model id, dimension, and collection membership.

## Result

| candidate | planner used | recall@5 | p50 ms | p95 ms | build ms | index bytes | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| exact | n/a | 1.000 | 2.12 | 4.07 | n/a | n/a | passed |
| hnsw m=16 ef_construction=64 ef_search=40 | yes | 1.000 | 2.53 | 2.94 | 14.3 | 40960 | passed |
| ivfflat lists=100 probes=10 | no | n/a | n/a | n/a | 7.6 | 835584 | failed |

Hybrid comparison for HNSW at `rrf_k=60`: semantic candidate sets changed in 0 of 12 queries, hybrid rankings changed in 0 of 12.

Failure reason recorded for IVFFlat: `planner ignored the candidate index for one or more scoped queries`.

## What this actually says

1. The harness measures end to end against real PostgreSQL and produces every number the ticket asks for: recall against exact ground truth, planner usage, p50 and p95, build time, index size, and the hybrid rank delta.
2. **At 96 segments the ANN index is slower than exact search.** HNSW p50 is 2.53 ms against exact 2.12 ms, and recall is identical at 1.000. The index costs 40 KB and 14 ms of build time to buy nothing. That is the expected shape of a small corpus and it is exactly why a recall floor cannot be ratified here.
3. **IVFFlat was rejected by the planner at this scale**, and the harness classified it as failed instead of reporting a recall of zero or, worse, a recall of one from a sequential scan. `lists=100` over 96 rows is a degenerate configuration; the planner is right to ignore it.
4. Recall 1.000 on 12 queries over 96 segments is not a result. It is the trivial outcome of a corpus small enough that exact search already returns the true nearest neighbours.

## What remains open

`.scratch/ann-indexes/issues/02-index-and-recall.md` stays open. The harness now makes the missing evidence cheap to produce, but the inputs are still the operator's: a representative corpus at real scale, target hardware and concurrency, the owner's recall@k floor, and an approved latency and resource budget. No index is selected, no default changed, and exact search remains the shipped path and the rollback.

## CLI output contract

The first run emitted the full report as 9108 lines of JSON, including every EXPLAIN plan, which is unusable for the operator the tool exists for. The CLI now prints a compact table by default and keeps the full machine report behind `--json`. Both paths were exercised in this run.

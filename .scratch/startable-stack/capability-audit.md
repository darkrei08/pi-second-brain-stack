# Capability audit: discarded backend versions

Compares `/root/git/personale/pi.dev/second-brain-backend` against this worktree, because the operator chose that this worktree wins on every shared module. Its purpose is to make the discarded capability visible instead of silent.

## Method

Every file under `src/`, `test/`, and `docker/postgres/init/` on both sides was compared by capability rather than by diff size. Each capability in the discarded version is classified ALREADY-PROVIDED, PROVIDED-DIFFERENTLY, or DROPPED. Line references are to the version named in the column.

## Gateway server capabilities

| Capability | Backend evidence | Stack evidence | Outcome |
| --- | --- | --- | --- |
| Liveness probe | `gateway-server.js:426` | `gateway/routes/health.js` | ALREADY-PROVIDED |
| Storage readiness probe | `gateway-server.js:429` | `gateway/routes/health.js` | ALREADY-PROVIDED |
| Provider readiness probe in `/readyz` | `gateway-server.js:434` | absent | DROPPED |
| Lexical retrieval | `gateway-server.js:452` | `gateway/routes/retrieval.js` | ALREADY-PROVIDED |
| Hybrid retrieval | `gateway-server.js:464` | `gateway/routes/retrieval.js` | PROVIDED-DIFFERENTLY (no model-call audit wrap) |
| Collection suggestion route | `gateway-server.js:498` | absent | DROPPED |
| Document collection suggest route | `gateway-server.js:524` | absent | DROPPED |
| Document collection confirm route | `gateway-server.js:533` | absent | DROPPED |
| Document collection move route | `gateway-server.js:542` | absent | DROPPED |
| Citation revalidation | `gateway-server.js:551` | `gateway/routes/citations.js` | ALREADY-PROVIDED |
| Grounded answers | `gateway-server.js:559` | `gateway/routes/answers.js` | PROVIDED-DIFFERENTLY (no token audit) |
| Iterative deep research route | `gateway-server.js:577` | absent | DROPPED |
| Chat completions, non-streaming | `gateway-server.js:595` | `gateway/routes/chat-completions.js` | PROVIDED-DIFFERENTLY (backend requires exactly one user message and nests metadata; stack supports history and flattens grounding) |
| Chat completions, streaming | `gateway-server.js:621` | `gateway/routes/chat-completions.js` | PROVIDED-DIFFERENTLY (backend streams live provider deltas with abort propagation; stack buffers the full generation and slices it into 128-character chunks) |
| Model registry | `gateway-server.js:680` | `gateway/routes/models.js` | ALREADY-PROVIDED |
| Ingest with collection validation | `gateway-server.js:690` | `gateway/routes/ingest.js` | PROVIDED-DIFFERENTLY (backend normalizes opaque collection ids on input; stack passes the document through) |
| Model-scoped concurrency guard | `gateway-server.js:343` | absent | DROPPED |
| Per-owner request quota | absent | `gateway/quota.js` | ALREADY-PROVIDED (stack-only) |
| Provider call audit with token telemetry | `gateway-server.js:367` | absent | DROPPED |
| HTTP request audit | absent | `gateway/audit.js` | ALREADY-PROVIDED (stack-only) |
| Prometheus metrics | absent | `gateway/metrics.js` | ALREADY-PROVIDED (stack-only) |
| TLS termination | absent | `gateway-server.js` composition | ALREADY-PROVIDED (stack-only) |
| Unexpected-failure trace callback | `gateway-server.js:760` | absent | DROPPED |
| Mid-stream SSE error frame | `gateway-server.js:776` | socket destroy | PROVIDED-DIFFERENTLY |

## PostgreSQL store capabilities

| Capability | Backend evidence | Stack evidence | Outcome |
| --- | --- | --- | --- |
| Save document and segments | `postgres-store.js:387` | `postgres-store.js:348` | PROVIDED-DIFFERENTLY (backend auto-creates missing declared collections; stack throws `unknown or foreign collection for this owner`) |
| Embedding model register, get, list | `postgres-store.js:493-571` | `postgres-store.js:448-526` | ALREADY-PROVIDED |
| Embedding coverage | `postgres-store.js:573` | `postgres-store.js:528` | ALREADY-PROVIDED |
| Embedding backfill listing | `postgres-store.js:606` | `postgres-store.js:561` | ALREADY-PROVIDED |
| Save segment embeddings | `postgres-store.js:667` | `postgres-store.js:622` | ALREADY-PROVIDED |
| Collection create, delete, list | `postgres-store.js:762-813` | `postgres-store.js:717-768` | ALREADY-PROVIDED |
| Suggest document collections | `postgres-store.js:815` | absent | DROPPED |
| Move document collection | `postgres-store.js:886` | absent | DROPPED |
| Confirm document collections | `postgres-store.js:932` | absent | DROPPED |
| Exact semantic search | `postgres-store.js:983` | `postgres-store.js:770` | ALREADY-PROVIDED |
| Citation revalidation | `postgres-store.js:1018` | `postgres-store.js:805` | ALREADY-PROVIDED |
| Lexical search | `postgres-store.js:1048` | `postgres-store.js:835` | ALREADY-PROVIDED |
| Hybrid RRF search | `postgres-store.js:1098` | `postgres-store.js:870` | ALREADY-PROVIDED |
| Document with segments | `postgres-store.js:1152` | `postgres-store.js:924` | ALREADY-PROVIDED |
| Soft delete document | `postgres-store.js:1175` | `postgres-store.js:947` | ALREADY-PROVIDED |
| Retention state transition | `postgres-store.js:1186` | absent | DROPPED |
| Hard purge with count | `postgres-store.js:1206` | absent | DROPPED |
| Owner export | `postgres-store.js:1256` | absent | DROPPED |

## Other differing files

| Capability | Backend evidence | Stack evidence | Outcome |
| --- | --- | --- | --- |
| `answer-question.js`: single-turn answer | `answer-question.js:304` | `answer-question.js:121` | ALREADY-PROVIDED |
| `answer-question.js`: delta streaming | `answer-question.js:218` | absent | DROPPED |
| `answer-question.js`: token usage callback | `answer-question.js:216` | absent | DROPPED |
| `answer-question.js`: abort signal | `answer-question.js:217` | absent | DROPPED |
| `answer-question.js`: multi-step research | `answer-question.js:313` | absent | DROPPED |
| `chat-client.js`: completion | `chat-client.js:205` | `chat-client.js:112` | ALREADY-PROVIDED |
| `chat-client.js`: SSE stream generator | `chat-client.js:270` | absent | DROPPED |
| `chat-client.js`: provider probe | `chat-client.js:246` | absent | DROPPED |
| `chat-client.js`: allowed-hosts SSRF check | `chat-client.js:47` | absent | DROPPED |
| `chat-client.js`: usage parsing | `chat-client.js:88` | absent | DROPPED |
| `embedding-client.js`: allowed-hosts SSRF check | `embedding-client.js:47` | absent | DROPPED |
| `gateway-config.js`: `parseAllowedHosts` | `gateway-config.js:10` | absent | DROPPED |
| `gateway-config.js`: `GATEWAY_PRINCIPALS` | `gateway-config.js:68` | absent | DROPPED |
| `gateway-config.js`: model-scoped limits | `gateway-config.js:42` | absent | DROPPED |
| `gateway-config.js`: TLS parsing | absent | `gateway-config.js:73` | ALREADY-PROVIDED (stack-only) |
| `gateway-auth.js`: principal directory | `gateway-auth.js:31` | absent | DROPPED |
| `gateway-cli.js`: coordinated shutdown | `gateway-cli.js:62` | `gateway-cli.js:68` | PROVIDED-DIFFERENTLY (no step timeouts) |
| `gateway-error.js`: sanitized payload | `gateway-error.js:11` | `gateway-error.js:11` | ALREADY-PROVIDED |
| `index.js`: migrations and directory ingest exports | `index.js:1` | absent | DROPPED |
| `test/research-question.test.js` | present | absent | DROPPED |
| `test/answer-question.test.js`: streaming, usage, abort | `:152-302` | absent | DROPPED |
| `test/chat-client.test.js`: streaming, probe, SSRF | `:111-311` | absent | DROPPED |
| `test/gateway-server.test.js`: collection routes, model guard, token audit | `:641-1474` | absent | DROPPED |
| `test/integration/postgres-store.test.js`: move, confirm, retention, purge, export | `:1419-1621` | absent | DROPPED |

## Backend-only modules and their dependencies

- `src/gateway-shutdown.js` exports `shutdownGateway({ gateway, pool, timeout_ms, writeError, exit })`. Depends only on `gateway.stop()` and `pool.end()`. No store coupling.
- `src/ingest-directory.js` exports `ingestDirectory({ directory, collection_id, gateway_url, gateway_token, max_segment_chars })`. Imports `segmentDocument` for client-side pre-validation and posts to `/v1/documents/ingest`. Critical impedance mismatch: it declares `collections: [collection_id]`, which the stack store rejects unless the collection already exists.
- `src/ingest-directory-cli.js` is a CLI with no exports. Contract `ingest-directory <directory> <collection-id>`, reading `GATEWAY_URL` and `GATEWAY_TOKEN`.
- `src/migrations.js` exports `listMigrationFiles`, `selectPending`, `applyMigrations`. Needs a `pg` client, bootstraps `000-migrations.sql`, resolves the default directory relative to `src/` as `../docker/postgres/init/`.
- `scripts/migrate.mjs` exports `parseDatabaseUrl` and runs pending migrations from `DATABASE_URL`.

## Schema delta

The stack schema is a strict subset. `001-extensions.sql` through `005-collections.sql` are identical on both sides. The stack lacks `000-migrations.sql`, and therefore lacks the table `schema_migrations`, its columns `version TEXT` and `applied_at TIMESTAMPTZ NOT NULL DEFAULT now()`, and its primary key `schema_migrations_pkey`. No object exists in the stack that is absent from the backend.

## Deliberate losses

Ordered by severity. The first four are load-bearing and must be ported back rather than accepted.

1. Live provider streaming with abort propagation. The stack waits for the whole generation then slices it. The user sees no token until the generation ends, and a cancelled request keeps running upstream.
2. Collection auto-creation on ingest. `ingest-directory` and any ingest into a new collection fail with 400 until the collection is pre-created.
3. Revoked evidence can still reach an answer. `answer-question.js` returns `answer: rawAnswer` while separately reporting `stale_citations`. If retention changes while the model call is in flight, the response carries text derived from the revoked document.
4. Cross-owner impersonation under the shared token. `gateway-auth.js:36-53` authenticates one token, then selects the owner from the caller-supplied `x-shell-user-id`. Any holder of the gateway token can name any mapped shell user. The backend binds each token to an owner through a principal directory.
5. Provider destinations are not allowlisted. `chat-client.js` and `embedding-client.js` accept any HTTPS host, so a wrong or hostile provider configuration can receive private evidence.
6. No model-scoped capacity guard. Only per-owner quotas exist, so concurrent requests across owners can exhaust provider capacity.
7. Tenant data portability export dropped. No workspace export.
8. Retention transition and physical purge dropped. No GDPR-grade deletion path.
9. Multi-principal directory auth dropped.
10. Deep research route and query planner dropped.
11. Document collection suggest, move, and confirm routes dropped.
12. Provider readiness probe in `/readyz` dropped.
13. Per-call token telemetry dropped.
14. Mid-stream SSE error frame replaced by socket destruction.
15. Unexpected-failure trace callback dropped.

## Port checklist

Ordered. Each item is a work unit, not a commit.

1. Security and provider discipline: allowed-hosts allowlist for both clients, principal directory auth, model-scoped capacity guard, provider readiness probe, provider call telemetry, and the revoked-evidence answer fix.
2. Real SSE streaming: provider stream generator, delta and usage callbacks, abort signal propagation, route rewrite, mid-stream error frame.
3. Data lifecycle and migrations: `000-migrations.sql`, `migrations.js`, `scripts/migrate.mjs`, retention transition, physical purge, owner export, collection auto-creation.
4. Remaining surface: `/v1/research` with the query planner, collection suggest, move, and confirm routes, coordinated shutdown, directory ingestion with its CLI.

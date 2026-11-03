# Local development

This repository contains public reference documentation, a safe PostgreSQL/pgvector skeleton, and a Node 22 package under `src/` that exposes deterministic segmentation, parser normalization, the PostgreSQL storage seams, the citation resolver, the embedding backfill loop, and a loopback HTTP gateway with grounded answers, through `src/index.js`, the `segment-document` CLI, and `pnpm start`. It does not mount the P.IVA corpus.

## Requirements

- Git
- Node.js 22 or newer (the package declares `"node": ">=22"`)
- pnpm (the package declares `"packageManager"`; run `corepack enable pnpm` once)
- Docker Engine or Docker Desktop
- Docker Compose v2

Install the dependencies from the committed lockfile:

```bash
pnpm install --frozen-lockfile
```

`pnpm run verify` runs both suites locally. The script is not named `ci` because `pnpm ci` is a built-in alias for `pnpm install --frozen-lockfile`. CI runs the same scripts: `.github/workflows/ci.yml` has a unit job that calls `pnpm run verify`, and an integration job that starts `pgvector/pgvector:pg17`, applies the schema with `pnpm migrate`, and runs `pnpm run test:integration`.

## Start the database skeleton

Set the values in the shell or in an untracked local `.env` file. Use a random local password.

```bash
export POSTGRES_DB=rag
export POSTGRES_USER=rag
export POSTGRES_PASSWORD='replace-this-locally'
docker compose config
docker compose up -d postgres
docker compose ps
```

The port is bound to `127.0.0.1:55432`. The init scripts under `docker/postgres/init/` enable `vector` and `pg_trgm` and create `documents`, `segments`, `segment_embeddings`, `embedding_models`, `collections`, and `document_collections` with their indexes. Docker runs them only on an empty data volume; an existing volume is upgraded in place with `DATABASE_URL=... pnpm migrate`, which applies the same files forward-only and records them in `schema_migrations`. No P.IVA path is mounted by this reference file.

## Run the gateway

The package ships one loopback-only HTTP boundary. It authenticates one bearer token, derives `owner_id` server-side from configuration, and exposes liveness, readiness, ingest, retrieval, citation revalidation, and model inspection. It adds no dependency and no build step.

Two identity modes exist and they are mutually exclusive. `GATEWAY_PRINCIPALS` is the recommended one: a JSON array of `{"token": ..., "owner_id": ...}`, where the presented bearer token alone selects the owner, so a caller cannot name an identity. The legacy mode keeps one shared `GATEWAY_TOKEN` plus `GATEWAY_OWNER_ID`, and an optional `GATEWAY_SHELL_USERS` mapping that lets any token holder choose among the mapped owners. Setting `GATEWAY_PRINCIPALS` together with any of those three variables is refused, never merged. Rotation means editing the variable and restarting the process; there is no in-process revocation.

```bash
export DATABASE_URL='postgres://rag:replace-this-locally@127.0.0.1:55432/rag'
# recommended: one credential per principal; the bearer token alone decides the owner
export GATEWAY_PRINCIPALS='[{"token":"<32+ random characters>","owner_id":"operator-owner"}]'
pnpm start
```

On `SIGINT` or `SIGTERM`, the gateway waits at most five seconds for each of the HTTP server and PostgreSQL pool shutdown steps. A rejected or timed-out step is reported to stderr, the remaining step is attempted, and the process exits non-zero; a clean shutdown exits zero.

The legacy single-token mode remains available for a one-operator deployment:

```bash
export DATABASE_URL='postgres://rag:replace-this-locally@127.0.0.1:55432/rag'
export GATEWAY_TOKEN="$(openssl rand -base64 32)"
export GATEWAY_OWNER_ID=operator-owner
# optional: map shell user ids to owners, and an optional embedder for hybrid mode
export GATEWAY_SHELL_USERS='{"shell-user":"operator-owner"}'
export EMBEDDING_BASE_URL='http://127.0.0.1:11434/v1'
# optional: an OpenAI-compatible chat model for grounded answers
export ANSWER_BASE_URL='http://127.0.0.1:11434/v1'
export ANSWER_MODEL='llama3.1:8b'
export ANSWER_API_KEY='local-key'
# required for remote providers; comma-separated exact hostnames
export EMBEDDING_ALLOWED_HOSTS='api.example.com'
export ANSWER_ALLOWED_HOSTS='api.example.com'
pnpm start
```

`ANSWER_ALLOWED_HOSTS` and `EMBEDDING_ALLOWED_HOSTS` are comma-separated hostnames. Remote model endpoints fail closed unless their exact hostname is listed; matching is case-insensitive and ignores one trailing dot. Loopback endpoints need no entry. Leave either variable unset only when that client uses loopback.

`GATEWAY_HOST` defaults to `127.0.0.1` and `GATEWAY_PORT` to `8080`. `GATEWAY_MODEL_CONCURRENCY` defaults to `4` (valid range `1..64`) and caps concurrent requests to the model-backed routes. `GATEWAY_MODEL_REQUESTS_PER_MINUTE` defaults to `60` (valid range `1..60000`) and limits requests per authenticated owner in a fixed one-minute window. Both limits apply only to `POST /v1/answers`, `POST /v1/research`, and `POST /v1/chat/completions`; overload returns HTTP `429` with error code `model_busy`, while retrieval and citation routes are unaffected. The routes are `GET /healthz`, `GET /readyz`, `POST /v1/documents/ingest`, `POST /v1/retrieval/query`, `POST /v1/citations/resolve`, `POST /v1/answers`, `POST /v1/research`, `POST /v1/chat/completions`, and `GET /v1/models`. Ingest accepts the optional `document.collections` array of opaque shell folder ids; each id creates or reuses that owner's collection and replaces the document's memberships, while an explicit empty `collection_ids` retrieval scope returns zero matches and reads never create collections. Every route except the two probes requires `Authorization: Bearer` a configured token; a request that names `owner_id` is rejected. Bodies are JSON, capped at 1 MiB.

Every call that reaches a provider writes one JSON audit line to stdout, alongside the `gateway_listening` line: `event` is `model_call`, and the record carries `kind` (`chat` or `embedding`), `route`, `owner_id`, `model_id`, `provider_host`, `outcome` (`ok` or `failed`), and `duration_ms`. When the provider reports them, it also carries numeric `prompt_tokens` and `completion_tokens`; those fields are omitted when usage is absent. The record holds metadata only: no question, evidence, answer, citation text, or payload text is ever written. A call refused with `429 model_busy` never reaches a provider and writes no line. Audit lines go to stdout and are therefore outside the PostgreSQL export and purge path. An unexpected failure that becomes the generic `500` also writes one JSON trace line to stderr with `event: "gateway_unexpected_failure"`, the route, and the error class only; request, question, evidence, and answer text are excluded. `/readyz` checks PostgreSQL and the configured answer provider. It performs a credentialed `GET /models` metadata probe, verifies that `ANSWER_MODEL` is declared by the provider, and caches the result for 30 seconds. The readiness probe has a separate 3-second timeout, generates no completion, and writes no `model_call` audit event. An absent, unreachable, or misconfigured answer provider returns `503` with `not_ready`, so operators see the stricter verdict without provider details.

```bash
curl -sS -H "Authorization: Bearer $GATEWAY_TOKEN" -H 'content-type: application/json' \
  -d '{"query":"invoice","collection_ids":["synthetic-collection-alpha"]}' \
  http://127.0.0.1:8080/v1/retrieval/query
```

`POST /v1/answers` answers only from retrieved evidence and reports its own uncertainty (`none`, `low`, `high`, `unsupported`). It accepts `question` (required), `collection_ids`, `embedding_model_id` (enables hybrid retrieval; the chat model is a different model and comes from `ANSWER_MODEL`), `limit` (1-100, default 6), and `max_tokens` (1-8192, default 600). It returns `answer`, `citations`, `unresolved_citations` (the out-of-range citation numbers), `stale_citations` (segment ids whose stored hashes no longer match), `retrieval`, and `uncertainty`. It answers `503` when `ANSWER_BASE_URL` or `ANSWER_MODEL` is unset, `504` on a model timeout, `502` on a model failure, and it never calls the model when retrieval returns nothing.

```bash
curl -sS -H "Authorization: Bearer $GATEWAY_TOKEN" -H 'content-type: application/json' \
  -d '{"question":"when does the contract expire?"}' \
  http://127.0.0.1:8080/v1/answers
```

## Bounded research

`POST /v1/research` accepts the same fields as `/v1/answers` and returns the same answer, citation, retrieval, and uncertainty fields. It retrieves for the original question, makes at most one planner call, and uses up to two valid follow-up queries for a maximum of three retrieval rounds. Follow-ups are strict JSON strings of at most 256 characters; malformed plans stop expansion. Every round keeps the authenticated owner, collection scope, and embedding model unchanged. Results are deduplicated by segment id in first-seen order and capped at the request's `limit`; one final synthesis runs over that evidence. Empty initial evidence skips planning and synthesis, while a follow-up that adds no new evidence stops further retrieval. Citation provenance and freshness are revalidated before the response.

```bash
curl -sS -H "Authorization: Bearer $GATEWAY_TOKEN" -H 'content-type: application/json' \
  -d '{"question":"when does the contract expire?","collection_ids":["synthetic-collection-alpha"],"limit":12}' \
  http://127.0.0.1:8080/v1/research
```

## OpenAI-compatible chat completions

`POST /v1/chat/completions` accepts one non-empty user message; the request's `model` is required for client compatibility but the gateway always uses `ANSWER_MODEL`. Retrieval controls are `collection_ids`, `embedding_model_id`, `limit` (1-100, default 6), and `max_tokens` (1-8192, default 600). Tools, other roles, and other options are rejected. A request with no evidence gets the same insufficient-evidence answer as `/v1/answers`, without a model call.

Without `stream: true`, the response uses the OpenAI `chat.completion` shape (`id`, `created`, `model`, and `choices`) and adds `answer_metadata` with `citations`, `unresolved_citations`, `stale_citations`, `retrieval`, and `uncertainty`. With `stream: true`, the gateway emits OpenAI-compatible SSE content chunks and adds `answer_metadata` to the final completion chunk only after citation revalidation. It then emits `data: [DONE]`. `answer_metadata` is an extension; clients that only understand standard OpenAI chunks can ignore it and will not display the citation/uncertainty report. If an error occurs before the first content chunk, the gateway returns its stable JSON error; after SSE starts, it emits a sanitized `data: {"error":...}` event and ends without metadata or `[DONE]`. Disconnecting the client aborts upstream reading.

Buffered request:

```bash
curl -sS -H "Authorization: Bearer $GATEWAY_TOKEN" -H 'content-type: application/json' \\
  -d '{"model":"any-client-model","messages":[{"role":"user","content":"when does the contract expire?"}]}' \\
  http://127.0.0.1:8080/v1/chat/completions
```

Stream request:

```bash
curl -N -sS -H "Authorization: Bearer $GATEWAY_TOKEN" -H 'content-type: application/json' \\
  -d '{"model":"any-client-model","messages":[{"role":"user","content":"when does the contract expire?"}],"stream":true}' \\
  http://127.0.0.1:8080/v1/chat/completions
```

## Open WebUI Filter and Pipe

The standalone plugins are in `integrations/open-webui/filters/gateway_retrieval.py` and `integrations/open-webui/pipes/gateway_research.py`. Add each file through the Open WebUI filter/Pipe configuration, then set the admin-only `GATEWAY_URL` and `GATEWAY_TOKEN` Valves. The default URL is `http://127.0.0.1:8080`; non-loopback gateway URLs must use HTTPS. Both plugins disable redirects, use a 10-second HTTP timeout, and return masked errors.

The Filter maps `body.folder_id` directly to `collection_ids: [folder_id]` for `/v1/retrieval/query`, sends `__user__.id` as `x-shell-user-id`, injects retrieved text as explicitly untrusted evidence, and clears the handled `folder_id` so built-in folder retrieval does not run again. With no selected folder it omits `collection_ids` and uses the gateway's owner-wide behavior. The Pipe sends the latest user message and maps `__metadata__.folder_id` the same way to `/v1/research`; its response displays citations and uncertainty. An explicit unknown or foreign folder remains scoped and does not fall back to owner-wide retrieval. The bearer token and gateway URL come only from admin Valves, never request data.

Run the shell-independent tests with Python 3 and the `httpx` and `pydantic` packages available (both are dependencies of Open WebUI):

```bash
python3 -m unittest discover -s integrations/open-webui/tests -v
```

These tests use mocked HTTP responses and do not import or start Open WebUI. Without an installed Open WebUI shell, hook discovery/loading, Valve configuration in its UI, real `folder_id` propagation, and live shell-to-gateway/provider behavior cannot be verified. TLS termination remains the responsibility of an operator-controlled reverse proxy and is not included in the loopback gateway.

## Ingesting shell project files

For the documented manual bridge from an Open WebUI project folder to the gateway, see [Ingesting shell project files](shell-attachment-ingest.md). The command validates a complete directory before sending any document, then uses the existing authenticated ingest route and collection scope.

## Verify the package

`pnpm test` runs the unit suites. The integration file self-skips unless `TEST_DATABASE_URL` points at a reachable PostgreSQL instance with the init scripts applied, which is what the `test:integration` script runs. Both scripts are defined in `package.json`.

```bash
pnpm test
TEST_DATABASE_URL='postgres://rag:replace-this-locally@127.0.0.1:55432/rag' pnpm run test:integration
```

## Stop and remove local state

```bash
docker compose down
# Add -v only when intentionally deleting the local database volume.
```

## What is not included yet

- production gateway implementation;
- parser worker and OCR model images;
- private object storage;
- real corpus mounts;
- credentials or external model endpoints;
- mobile or desktop packaging.

Those are separate work units and must preserve the boundary documented in [Private runtime boundary](private-runtime.md).

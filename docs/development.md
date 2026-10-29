# Local development

This repository contains public reference documentation, a safe PostgreSQL/pgvector skeleton, and a Node 22 package under `src/` that exposes deterministic segmentation, parser normalization, the PostgreSQL storage seams, the citation resolver, the embedding backfill loop, and a loopback HTTP gateway with grounded answers, through `src/index.js`, the `segment-document` CLI, and `npm start`. It does not mount the P.IVA corpus.

## Requirements

- Git
- Node.js 22 or newer (the package declares `"node": ">=22"`)
- Docker Engine or Docker Desktop
- Docker Compose v2

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

The port is bound to `127.0.0.1:55432`. The init scripts under `docker/postgres/init/` enable `vector` and `pg_trgm` and create `documents`, `segments`, `segment_embeddings`, `embedding_models`, `collections`, and `document_collections` with their indexes. They run only when the data volume is empty, so a volume created by an older checkout must be recreated before the current seams work. No P.IVA path is mounted by this reference file.

## Run the gateway

The package ships one loopback-only HTTP boundary. It authenticates one bearer token, derives `owner_id` server-side from configuration, and exposes liveness, readiness, ingest, retrieval, citation revalidation, and model inspection. It adds no dependency and no build step.

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
npm start
```

`GATEWAY_HOST` defaults to `127.0.0.1` and `GATEWAY_PORT` to `8080`. The routes are `GET /healthz`, `GET /readyz`, `POST /v1/documents/ingest`, `POST /v1/retrieval/query`, `POST /v1/citations/resolve`, `POST /v1/answers`, and `GET /v1/models`. Every route except the two probes requires `Authorization: Bearer $GATEWAY_TOKEN`; a request that names `owner_id` is rejected. Bodies are JSON, capped at 1 MiB.

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

The OpenAI-compatible `POST /v1/chat/completions` entry, streaming, the Open WebUI filter and pipe, and TLS termination are not implemented.

## Verify the package

`npm test` runs the unit suites. The integration file self-skips unless `TEST_DATABASE_URL` points at a reachable PostgreSQL instance with the init scripts applied, which is what the `test:integration` script runs. Both scripts are defined in `package.json`.

```bash
npm test
TEST_DATABASE_URL='postgres://rag:replace-this-locally@127.0.0.1:55432/rag' npm run test:integration
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

# Local development

This repository contains public reference documentation, a safe PostgreSQL/pgvector skeleton, and a Node 22 package under `src/` that exposes deterministic segmentation, parser normalization, the PostgreSQL storage seams, the citation resolver, and the embedding backfill loop through `src/index.js` and the `segment-document` CLI. It does not mount the P.IVA corpus and it does not include an application gateway yet.

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

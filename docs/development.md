# Local development

This repository contains public reference documentation and a safe PostgreSQL/pgvector skeleton. It does not mount the P.IVA corpus and it does not include an application gateway yet.

## Requirements

- Git
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

The port is bound to `127.0.0.1:55432`. The init script enables `vector` and `pg_trgm`. No P.IVA path is mounted by this reference file.

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

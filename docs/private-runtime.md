# Private runtime boundary

This repository is public documentation and reference configuration. It is not the P.IVA archive.

## Data boundary

The private corpus lives outside this repository and is mounted read-only for ingestion. Runtime derivatives live in private volumes:

```text
P.IVA corpus (outside Git, read-only)
        |
        v
parser/indexer worker
        |
        +-- PostgreSQL metadata, full text, vectors and graph projections
        +-- private object storage for originals and derivatives
        +-- private logs and audit records
```

Never commit originals, OCR text, embeddings, graph exports, database dumps, secrets, provider keys, or model caches.

## Local-only defaults

- Bind the gateway and database to loopback unless remote access is deliberately designed.
- Do not expose PostgreSQL, pgvector, object storage, parser workers, or model-admin endpoints.
- Require gateway authentication even for one human operator.
- Keep outbound model and tool access disabled unless explicitly configured.
- Use TLS whenever a request leaves the host.

## Required lifecycle behavior

Ingestion must preserve hash, parser, model, page, region, and source provenance. Document lifecycle has three distinct outcomes:

- `active` documents are searchable.
- `tombstone` documents are retained but excluded from retrieval. Tombstone is reversible and is not erasure.
- Purge physically deletes the document and cascades to its segments, embeddings, and collection memberships. Purge is irreversible and requires a verified backup first.

The `purged` retention value remains only for legacy rows; setting it is not a purge. No HTTP export or purge route exists yet. Deletion outside the database must still cover originals, OCR, page images, graph rows, caches, logs according to policy, and backups according to the backup-retention procedure.

The runtime must support owner-scoped export, restore testing, audit events, timeouts, resource limits, archive traversal checks, and prompt-injection handling for retrieved content.

## Schema migrations and restore

The SQL files under `docker/postgres/init/` are the single source of schema. Apply pending files before deploying code that requires them:

```bash
DATABASE_URL="$DATABASE_URL" pnpm migrate
```

Before any migration on a volume containing data, take and verify a database backup:

```bash
docker exec <postgres-container> pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /secure/path/second-brain-$(date +%Y%m%dT%H%M%S).sql
```

Restore into a fresh PostgreSQL database/container, not over the source database:

```bash
cat /secure/path/backup.sql | docker exec -i <fresh-postgres-container> psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Verify restored documents and segments with the application's retrieval path, then run `DATABASE_URL="$RESTORED_DATABASE_URL" pnpm migrate`; it should apply zero versions. Keep backups private, protected, and subject to the same retention and deletion policy as the source data. Never commit a dump.

## Compliance posture

The stack is privacy-oriented and customer-controlled. It is not automatically GDPR-compliant or EU AI Act-compliant. The applicable role, purpose, retention, contracts, DPIA, subprocessors, and human oversight must be decided for the actual deployment.

## Public-repository check

Before every commit:

```bash
git status --short
git ls-files | grep -E '(^|/)(data|private|secrets|models|artifacts)(/|$)|\.(pdf|p7m|eml|docx?|xlsx?)$' && exit 1 || true
```

The check is a guardrail, not a substitute for reviewing the diff.

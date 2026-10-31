# 04: Versioned forward-only migrations and a rehearsed backup/restore

Type: task
Status: claimed
Blocked by: None
Source: R8 of [issue 01](01-risk-register.md), pre-deployment mitigation 3.

## Question

R8 records that the schema exists only as `docker/postgres/init/*.sql`, which the container entrypoint applies to an empty volume, and that there is neither a migration runner nor a tested restore path for a volume that already holds data. What is the smallest change that makes an existing database upgradeable without recreating it, and makes restore a runbook that was actually executed once?

## Context

All five init files are already idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, a guarded `ALTER TABLE` in a `DO` block). `compose.yaml` mounts `./docker/postgres/init` as `/docker-entrypoint-initdb.d:ro` and declares the persistent `postgres-data` volume. There is no migration command in `package.json` and no backup step in `docs/private-runtime.md`.

Keeping the init files as the single source of schema means the runner must apply the same files, not a second copy of the DDL.

## Acceptance criteria

- [x] `schema_migrations` is created by the init set and by the runner, and holds the applied filename plus an application timestamp.
- [x] `pnpm migrate` (`scripts/migrate.mjs`) applies, in filename order, only the files under `docker/postgres/init` whose names are not yet recorded, each inside one transaction, and records the name in the same transaction. A second run applies nothing and exits 0.
- [x] It refuses to run without `DATABASE_URL` with a specific message, and it never creates, drops, or truncates a database.
- [x] No duplicated DDL: the runner reads the existing init files.
- [x] A backup and restore rehearsal runs `pg_dump` on a populated disposable pgvector container and restores into a fresh one, then proves the restored database answers a retrieval query. The exact commands and their output are recorded in this ticket.
- [x] `docs/private-runtime.md` gains the migration and restore runbook, including the rule that a backup precedes any migration on a volume with data.
- [x] Tests: `test/migrations.test.js` covers filename ordering, selection of unapplied files, and the refusal paths without a database; the integration suite applies the runner twice against the disposable database and asserts the second run is a no-op.
- [x] No new dependency. `pnpm test` green.

## Rehearsal

Executed against disposable `pgvector/pgvector:pg17` containers. The dump was temporary and removed after restore.

```sh
docker run -d --rm --name sbs-r8-source -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=test -e POSTGRES_DB=test -p 127.0.0.1:55438:5432 pgvector/pgvector:pg17
# Output: 71f4a9d003a5e1e5f07b1dde57004cbd46d485eb73623625329231cdfe5920ca
docker exec sbs-r8-source pg_isready -U test -d test
# Output: /var/run/postgresql:5432 - accepting connections
DATABASE_URL=postgres://test@127.0.0.1:55438/test pnpm migrate
# Output: {"version":"001-extensions.sql"}
#         {"version":"002-schema.sql"}
#         {"version":"003-segment-embeddings.sql"}
#         {"version":"004-embedding-models.sql"}
#         {"version":"005-collections.sql"}
#         {"applied":5,"total":5}

docker exec -i sbs-r8-source psql -U test -d test <<'SQL'
INSERT INTO documents (document_id, text, source_label, source_hash, lineage, created_at, owner_id, retention_state)
VALUES ('urn:document:r8f3a9c2', 'Synthetic restore rehearsal document.', 'r8-rehearsal.txt', 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '{"parser":"synthetic"}', '2026-01-01T00:00:00Z', 'r8-owner-opaque', 'active');
INSERT INTO segments (id, document_id, segment_index, text, start_offset, end_offset, text_sha256, metadata, provenance)
VALUES ('urn:segment:r8b7d1e4', 'urn:document:r8f3a9c2', 0, 'Synthetic restore rehearsal segment.', 0, 36, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', '{}', '{"source":"synthetic"}');
SQL
# Output: INSERT 0 1
#         INSERT 0 1
docker exec sbs-r8-source pg_dump -U test -d test > /tmp/r8-backup.sql

# Fresh restore target
docker run -d --rm --name sbs-r8-restore -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=test -e POSTGRES_DB=test -p 127.0.0.1:55439:5432 pgvector/pgvector:pg17
# Output: 5d370248a3b654baf689bfe6cf7c570293110f60e7e2179bce03787ca43cb874
docker exec sbs-r8-restore pg_isready -U test -d test
# Output: /var/run/postgresql:5432 - accepting connections
docker cp /tmp/r8-backup.sql sbs-r8-restore:/tmp/r8-backup.sql
docker exec sbs-r8-restore psql -U test -d test -f /tmp/r8-backup.sql
# Relevant output: COPY 5 (schema_migrations rows restored)
docker exec sbs-r8-restore psql -U test -d test -c "SELECT d.document_id, s.id AS segment_id, s.text AS segment_text FROM documents d JOIN segments s USING (document_id) WHERE d.document_id = 'urn:document:r8f3a9c2';"
# Output: urn:document:r8f3a9c2 | urn:segment:r8b7d1e4 | Synthetic restore rehearsal segment.
DATABASE_URL=postgres://test@127.0.0.1:55439/test pnpm migrate
# Output: {"applied":0,"total":5}

docker stop sbs-r8-source sbs-r8-restore
rm -f /tmp/r8-backup.sql
docker ps -a --filter name=sbs-r8-source --format '{{.Names}}'
docker ps -a --filter name=sbs-r8-restore --format '{{.Names}}'
# Output: both listings empty; neither rehearsal container remains.
```

## Verification

- `node --test test/migrations.test.js`
- `pnpm test`
- `TEST_DATABASE_URL=... pnpm run test:integration`
- the rehearsal commands recorded below

## Answer

The five `docker/postgres/init/*.sql` files remain the single source of schema. `src/migrations.js` and `scripts/migrate.mjs` apply them forward-only and record each applied filename.

- `000-migrations.sql` creates `schema_migrations (version, applied_at)`.
- `applyMigrations(client, { dir })` bootstraps the ledger when it is absent, then applies only unrecorded files in filename order, each inside `BEGIN`/`COMMIT` with its version row inserted in the same transaction. A failing file rolls back and stops, leaving earlier files recorded.
- `pnpm migrate` reads `DATABASE_URL`, refuses with `DATABASE_URL is required to run migrations.` and exit 1 when it is unset, and never creates, drops, or truncates a database.
- A fresh Docker volume still gets the schema from the entrypoint; because every statement is idempotent, the runner then records those files. A restored dump carries the ledger, so the runner is a verified no-op there.

Checks run independently of the writer against a disposable `pgvector/pgvector:pg17` on `127.0.0.1:55437`:

| Check | Result |
|---|---|
| `pnpm migrate` on a brand-new database `sbs_migrate_probe` | five `{"version":…}` lines then `{"applied":5,"total":5}`, exit 0 |
| second run | `{"applied":0,"total":5}`, exit 0 |
| tables after the run | `collections, document_collections, documents, embedding_models, schema_migrations, segment_embeddings, segments` |
| `pnpm migrate` with no `DATABASE_URL` | `DATABASE_URL is required to run migrations.`, exit 1 |
| `TEST_DATABASE_URL=… pnpm run test:integration` | 27 pass, 0 fail, exit 0, including the twice-applied migration case |
| `pnpm test` | 136 tests, 113 pass, 23 expected skips, 0 fail, exit 0 |

The Rehearsal section above records the dump and restore of a populated disposable database, including the no-op migration on the restored copy. The developer volume was not touched, both rehearsal containers were removed, and the temporary dump was deleted.

Residual: scheduled backups, dump retention, and automated restore verification belong to deployment. R5's tombstone-versus-purge semantics remain undecided and are not changed here.

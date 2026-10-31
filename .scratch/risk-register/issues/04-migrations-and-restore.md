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

- [ ] `schema_migrations` is created by the init set and by the runner, and holds the applied filename plus an application timestamp.
- [ ] `pnpm migrate` (`scripts/migrate.mjs`) applies, in filename order, only the files under `docker/postgres/init` whose names are not yet recorded, each inside one transaction, and records the name in the same transaction. A second run applies nothing and exits 0.
- [ ] It refuses to run without `DATABASE_URL` with a specific message, and it never creates, drops, or truncates a database.
- [ ] No duplicated DDL: the runner reads the existing init files.
- [ ] A backup and restore rehearsal runs `pg_dump` on a populated disposable pgvector container and restores into a fresh one, then proves the restored database answers a retrieval query. The exact commands and their output are recorded in this ticket.
- [ ] `docs/private-runtime.md` gains the migration and restore runbook, including the rule that a backup precedes any migration on a volume with data.
- [ ] Tests: `test/migrations.test.js` covers filename ordering, selection of unapplied files, and the refusal paths without a database; the integration suite applies the runner twice against the disposable database and asserts the second run is a no-op.
- [ ] No new dependency. `pnpm test` green.

## Verification

- `node --test test/migrations.test.js`
- `pnpm test`
- `TEST_DATABASE_URL=... pnpm run test:integration`
- the rehearsal commands recorded below

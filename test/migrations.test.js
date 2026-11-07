import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseDatabaseUrl } from '../scripts/migrate.mjs';
import { applyMigrations, listMigrationFiles, selectPending } from '../src/migrations.js';

class FakeClient {
  constructor({ hasLedger = true, applied = [] } = {}) {
    this.hasLedger = hasLedger;
    this.applied = applied;
    this.calls = [];
  }

  async query(text, params) {
    this.calls.push({ text, params });
    if (text === "SELECT to_regclass('schema_migrations') AS name") {
      return { rows: [{ name: this.hasLedger ? 'schema_migrations' : null }] };
    }
    if (text === 'SELECT version FROM schema_migrations') {
      return { rows: this.applied.map((version) => ({ version })) };
    }
    return { rows: [], rowCount: 1 };
  }
}

test('lists SQL migration filenames in lexicographic order', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'migrations-'));
  try {
    await Promise.all(['002-schema.sql', '001-extensions.sql', 'notes.txt'].map((name) => writeFile(path.join(dir, name), '')));
    assert.deepEqual(await listMigrationFiles(dir), ['001-extensions.sql', '002-schema.sql']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('selects only unapplied migration files and preserves order', () => {
  assert.deepEqual(
    selectPending(['001.sql', '002.sql', '003.sql'], ['002.sql']),
    ['001.sql', '003.sql']
  );
});

test('applies each pending migration in its own transaction and records exact SQL', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'migrations-'));
  try {
    await writeFile(path.join(dir, '000-migrations.sql'), 'CREATE TABLE schema_migrations;\n');
    await writeFile(path.join(dir, '001-first.sql'), 'CREATE TABLE first_table;\n');
    await writeFile(path.join(dir, '002-second.sql'), 'CREATE TABLE second_table;\n');
    const client = new FakeClient({ applied: ['001-first.sql'] });

    assert.deepEqual(await applyMigrations(client, { dir }), ['002-second.sql']);
    assert.deepEqual(client.calls, [
      { text: "SELECT to_regclass('schema_migrations') AS name", params: undefined },
      { text: 'SELECT version FROM schema_migrations', params: undefined },
      { text: 'BEGIN', params: undefined },
      { text: 'CREATE TABLE second_table;\n', params: undefined },
      { text: 'INSERT INTO schema_migrations (version) VALUES ($1)', params: ['002-second.sql'] },
      { text: 'COMMIT', params: undefined }
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('bootstraps the migration ledger before applying tracked migrations', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'migrations-'));
  try {
    await writeFile(path.join(dir, '000-migrations.sql'), 'CREATE TABLE schema_migrations;\n');
    await writeFile(path.join(dir, '001-first.sql'), 'CREATE TABLE first_table;\n');
    const client = new FakeClient({ hasLedger: false });

    assert.deepEqual(await applyMigrations(client, { dir }), ['001-first.sql']);
    assert.deepEqual(client.calls, [
      { text: "SELECT to_regclass('schema_migrations') AS name", params: undefined },
      { text: 'BEGIN', params: undefined },
      { text: 'CREATE TABLE schema_migrations;\n', params: undefined },
      { text: 'COMMIT', params: undefined },
      { text: 'SELECT version FROM schema_migrations', params: undefined },
      { text: 'BEGIN', params: undefined },
      { text: 'CREATE TABLE first_table;\n', params: undefined },
      { text: 'INSERT INTO schema_migrations (version) VALUES ($1)', params: ['001-first.sql'] },
      { text: 'COMMIT', params: undefined }
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('returns an empty list for an empty migration directory', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'migrations-'));
  try {
    assert.deepEqual(await listMigrationFiles(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('refuses to plan without DATABASE_URL', () => {
  assert.throws(() => parseDatabaseUrl({}), { message: 'DATABASE_URL is required to run migrations.' });
});

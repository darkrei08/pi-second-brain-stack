import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(scriptsDirectory, 'seed-compose-env.mjs');

function runSeed(outputPath, environment = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, '--output', outputPath], {
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'second-brain-seed-'));
  await chmod(directory, 0o700);
  return { directory, outputPath: join(directory, 'private', 'compose.env') };
}

function populatedKeys(content) {
  return content.split('\n').flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/u);
    return match === null ? [] : [[match[1], match[2]]];
  });
}

const hostPortKeys = ['POSTGRES_HOST_PORT', 'GATEWAY_HOST_PORT', 'WEBUI_HOST_PORT'];

function secretEntriesOnly(entries) {
  return entries.filter(([key]) => !hostPortKeys.includes(key));
}

test('publishes owner-only secrets, stays quiet, and is idempotent', async () => {
  const fixture = await createFixture();
  const first = await runSeed(fixture.outputPath);
  assert.equal(first.code, 0, first.stderr);
  assert.equal(first.signal, null);

  const output = await readFile(fixture.outputPath, 'utf8');
  const entries = secretEntriesOnly(populatedKeys(output));
  assert.deepEqual(entries.map(([key]) => key).sort(), ['GATEWAY_TOKEN', 'POSTGRES_PASSWORD', 'WEBUI_SECRET_KEY']);
  for (const [, secret] of entries) assert.match(secret, /^[0-9a-f]{64}$/u);
  assert.equal(new Set(entries.map(([, secret]) => secret)).size, 3);

  const outputStats = await stat(fixture.outputPath);
  const directoryStats = await stat(dirname(fixture.outputPath));
  assert.equal(outputStats.mode & 0o777, 0o600);
  assert.equal(directoryStats.mode & 0o777, 0o700);
  assert.doesNotMatch(`${first.stdout}\n${first.stderr}`, new RegExp(entries.map(([, secret]) => secret).join('|'), 'u'));

  const second = await runSeed(fixture.outputPath);
  assert.equal(second.code, 0, second.stderr);
  assert.equal(await readFile(fixture.outputPath, 'utf8'), output);
  assert.doesNotMatch(`${second.stdout}\n${second.stderr}`, new RegExp(entries.map(([, secret]) => secret).join('|'), 'u'));
});

test('records host ports from the environment, else the documented defaults', async () => {
  const exported = await createFixture();
  const fromEnvironment = await runSeed(exported.outputPath, {
    POSTGRES_HOST_PORT: '65432',
    GATEWAY_HOST_PORT: '18080',
    WEBUI_HOST_PORT: '13300'
  });
  assert.equal(fromEnvironment.code, 0, fromEnvironment.stderr);
  const exportedEntries = new Map(populatedKeys(await readFile(exported.outputPath, 'utf8')));
  assert.equal(exportedEntries.get('POSTGRES_HOST_PORT'), '65432');
  assert.equal(exportedEntries.get('GATEWAY_HOST_PORT'), '18080');
  assert.equal(exportedEntries.get('WEBUI_HOST_PORT'), '13300');

  const defaults = await createFixture();
  const unset = await runSeed(defaults.outputPath, {
    POSTGRES_HOST_PORT: '',
    GATEWAY_HOST_PORT: '',
    WEBUI_HOST_PORT: ''
  });
  assert.equal(unset.code, 0, unset.stderr);
  const defaultEntries = new Map(populatedKeys(await readFile(defaults.outputPath, 'utf8')));
  assert.equal(defaultEntries.get('POSTGRES_HOST_PORT'), '55432');
  assert.equal(defaultEntries.get('GATEWAY_HOST_PORT'), '8080');
  assert.equal(defaultEntries.get('WEBUI_HOST_PORT'), '3300');
});

test('refuses to overwrite an existing environment file', async () => {
  const fixture = await createFixture();
  await mkdir(dirname(fixture.outputPath), 0o700);
  const original = 'POSTGRES_PASSWORD=existing\n';
  await writeFile(fixture.outputPath, original, { mode: 0o600 });

  const result = await runSeed(fixture.outputPath);
  assert.notEqual(result.code, 0);
  assert.equal(await readFile(fixture.outputPath, 'utf8'), original);
  assert.match(result.stderr, /existing environment file is incomplete/u);
});

test('refuses insecure and symlink output state', async () => {
  const fixture = await createFixture();
  await mkdir(dirname(fixture.outputPath), 0o700);
  await writeFile(fixture.outputPath, 'POSTGRES_PASSWORD=x\nGATEWAY_TOKEN=y\nWEBUI_SECRET_KEY=z\n', { mode: 0o644 });
  const insecure = await runSeed(fixture.outputPath);
  assert.notEqual(insecure.code, 0);
  assert.match(insecure.stderr, /environment file permissions are insecure/u);

  const symlinkPath = join(fixture.directory, 'symlink.env');
  await symlink(fixture.outputPath, symlinkPath);
  const linked = await runSeed(symlinkPath);
  assert.notEqual(linked.code, 0);
  assert.match(linked.stderr, /environment file must not be a symlink/u);
});

test('refuses a directory at the output path and leaves no temporary file', async () => {
  const fixture = await createFixture();
  await mkdir(dirname(fixture.outputPath), 0o700);
  const blockingPath = join(dirname(fixture.outputPath), 'blocked');
  await mkdir(blockingPath, 0o700);

  const result = await runSeed(blockingPath);
  assert.notEqual(result.code, 0);
  const leftovers = (await import('node:fs/promises')).readdir(dirname(fixture.outputPath));
  const names = await leftovers;
  assert.deepEqual(names.filter((name) => name.endsWith('.tmp')), []);
});

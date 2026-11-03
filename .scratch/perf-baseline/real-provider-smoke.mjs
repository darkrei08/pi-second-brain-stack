import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

import { createStorage, segmentDocument } from '../../src/index.js';

const databaseUrl = process.env.PERF_DATABASE_URL;
const configCandidates = [
  process.env.CLIPROXY_CONFIG,
  '/root/cliproxyapi/config.yaml',
  '/root/git/cliproxyapi/config.yaml',
  '/root/git/personale/cliproxy/cliproxy-stack/data/cliproxy/gitstore/config/config.yaml'
].filter(Boolean);
const ownerId = 'perf-real-provider-owner';
const documentId = 'urn:document:perf-real-provider';
const embeddingModelId = 'deepseek-v4.1-flash';
const answerModel = 'cliproxyapi/deepseek-v4.1-flash';
const gatewayToken = 'r'.repeat(32);

if (!databaseUrl) throw new Error('PERF_DATABASE_URL is required');

async function providerKey() {
  for (const path of configCandidates) {
    try {
      const text = await readFile(path, 'utf8');
      const match = text.match(/^\s+-\s+["']?(cpa_[^"'\s]+)["']?\s*$/mu);
      if (match) return match[1];
    } catch {}
  }
  throw new Error('no CLIProxyAPI client key was found in the configured candidate paths');
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForListening(child, lines) {
  return await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(new Error(`gateway did not listen: ${stderr.trim()}`)), 15000);
    const check = () => {
      const line = lines.find((entry) => entry.event === 'gateway_listening');
      if (line) {
        clearTimeout(timer);
        resolve(line);
      }
    };
    child.stdout.on('data', check);
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => {
      if (code !== null) {
        clearTimeout(timer);
        reject(new Error(`gateway exited before listening: ${code}; ${stderr.trim()}`));
      }
    });
    check();
  });
}

async function request(base, path, body) {
  const started = performance.now();
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${gatewayToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { status: response.status, latency_ms: Math.round((performance.now() - started) * 100) / 100, payload };
}

const key = await providerKey();
const pool = new pg.Pool({ connectionString: databaseUrl });
const storage = createStorage({ pool });
const document = {
  document_id: documentId,
  text: 'Synthetic evidence: the Italian invoice payment deadline is thirty days.',
  source_label: 'perf-real-provider.txt',
  source_hash: `sha256:${'a1'.repeat(32)}`,
  lineage: { parser: 'perf-harness@1.0.0', model: null },
  created_at: '2026-11-02T00:00:00Z',
  retention: { owner_id: ownerId, state: 'active' }
};
const gatewayPort = await freePort();
let child;
const lines = [];
try {
  await pool.query('DELETE FROM documents WHERE owner_id = $1', [ownerId]);
  await pool.query('DELETE FROM embedding_models WHERE model_id = $1', [embeddingModelId]);
  await storage.registerEmbeddingModel({ model_id: embeddingModelId, dimensions: 1536 });
  await storage.saveDocumentAndSegments(document, segmentDocument(document, { max_segment_chars: 300 }));

  child = spawn(process.execPath, ['src/gateway-cli.js'], {
    cwd: new URL('../..', import.meta.url),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      GATEWAY_PRINCIPALS: JSON.stringify([{ token: gatewayToken, owner_id: ownerId }]),
      GATEWAY_PORT: String(gatewayPort),
      ANSWER_BASE_URL: 'http://127.0.0.1:8317/v1',
      EMBEDDING_BASE_URL: 'http://127.0.0.1:8317/v1',
      ANSWER_API_KEY: key,
      EMBEDDING_API_KEY: key,
      ANSWER_MODEL: answerModel,
      GATEWAY_MODEL_CONCURRENCY: '2',
      GATEWAY_MODEL_REQUESTS_PER_MINUTE: '10'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let buffer = '';
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const parts = buffer.split('\n');
    buffer = parts.pop();
    for (const line of parts) {
      try { lines.push(JSON.parse(line)); } catch {}
    }
  });
  const listening = await waitForListening(child, lines);
  const base = listening.url;
  const answer = await request(base, '/v1/answers', { question: 'invoice', max_tokens: 16 });
  const embedding = await request(base, '/v1/retrieval/query', {
    query: 'invoice payment deadline', mode: 'hybrid', model_id: embeddingModelId, limit: 1
  });
  if (buffer.trim()) {
    try { lines.push(JSON.parse(buffer)); } catch {}
  }
  console.log(JSON.stringify({ event: 'smoke_result', answer, embedding }));
  for (const line of lines) console.log(JSON.stringify(line));
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
  await pool.query('DELETE FROM documents WHERE owner_id = $1', [ownerId]);
  await pool.query('DELETE FROM embedding_models WHERE model_id = $1', [embeddingModelId]);
  await pool.end();
}

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import pg from 'pg';

import { createStorage, segmentDocument } from '../../src/index.js';

const databaseUrl = process.env.PERF_DATABASE_URL;
const ownerId = 'perf-load-owner';
const documentId = 'urn:document:perf-load';
const gatewayToken = 'l'.repeat(32);
const answerModel = 'fake-chat-model';
const fakeDelayMs = 25;
const levels = [1, 2, 4];
const samplesPerLevel = 12;

if (!databaseUrl) throw new Error('PERF_DATABASE_URL is required');

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

async function freePort() {
  const server = createNetServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

function fakeProvider() {
  let requests = 0;
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404).end();
      return;
    }
    requests += 1;
    for await (const _chunk of request) {}
    await new Promise((resolve) => setTimeout(resolve, fakeDelayMs));
    const payload = {
      id: `fake-${requests}`,
      object: 'chat.completion',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Synthetic answer [1].' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 }
    };
    const serialized = JSON.stringify(payload);
    response.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(serialized) });
    response.end(serialized);
  });
  return { server, get requests() { return requests; } };
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

async function call(base, path) {
  const started = performance.now();
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${gatewayToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(path === '/v1/answers'
      ? { question: 'invoice', max_tokens: 16 }
      : { query: 'invoice', limit: 1 })
  });
  await response.arrayBuffer();
  return { status: response.status, latency_ms: Math.round((performance.now() - started) * 100) / 100 };
}

async function measure(base, path, concurrency) {
  const results = [];
  for (let completed = 0; completed < samplesPerLevel; completed += concurrency) {
    const waveSize = Math.min(concurrency, samplesPerLevel - completed);
    results.push(...await Promise.all(Array.from({ length: waveSize }, () => call(base, path))));
  }
  const latencies = results.map(({ latency_ms }) => latency_ms);
  const successes = results.filter(({ status }) => status >= 200 && status < 300).length;
  return {
    route: path,
    concurrency,
    samples: results.length,
    p50_latency_ms: percentile(latencies, 0.5),
    p95_latency_ms: percentile(latencies, 0.95),
    errors: results.length - successes,
    error_rate: (results.length - successes) / results.length,
    statuses: Object.fromEntries([...new Set(results.map(({ status }) => status))].sort().map((status) => [status, results.filter((result) => result.status === status).length]))
  };
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const storage = createStorage({ pool });
const document = {
  document_id: documentId,
  text: 'Synthetic evidence for load testing: invoice payment is due in thirty days.',
  source_label: 'perf-load.txt',
  source_hash: `sha256:${'b2'.repeat(32)}`,
  lineage: { parser: 'perf-harness@1.0.0', model: null },
  created_at: '2026-11-02T00:00:00Z',
  retention: { owner_id: ownerId, state: 'active' }
};
const fake = fakeProvider();
let gateway;
try {
  const fakePort = await listen(fake.server);
  const gatewayPort = await freePort();
  await pool.query('DELETE FROM documents WHERE owner_id = $1', [ownerId]);
  await storage.saveDocumentAndSegments(document, segmentDocument(document, { max_segment_chars: 300 }));
  gateway = spawn(process.execPath, ['src/gateway-cli.js'], {
    cwd: new URL('../..', import.meta.url),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      GATEWAY_PRINCIPALS: JSON.stringify([{ token: gatewayToken, owner_id: ownerId }]),
      GATEWAY_PORT: String(gatewayPort),
      ANSWER_BASE_URL: `http://127.0.0.1:${fakePort}/v1`,
      ANSWER_MODEL: answerModel,
      GATEWAY_MODEL_CONCURRENCY: '2',
      GATEWAY_MODEL_REQUESTS_PER_MINUTE: '1000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const lines = [];
  let buffer = '';
  gateway.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const parts = buffer.split('\n');
    buffer = parts.pop();
    for (const line of parts) {
      try { lines.push(JSON.parse(line)); } catch {}
    }
  });
  const listening = await waitForListening(gateway, lines);
  const answerResults = [];
  const retrievalResults = [];
  for (const concurrency of levels) {
    answerResults.push(await measure(listening.url, '/v1/answers', concurrency));
    retrievalResults.push(await measure(listening.url, '/v1/retrieval/query', concurrency));
    if (answerResults.at(-1).error_rate > 0) break;
  }
  if (buffer.trim()) {
    try { lines.push(JSON.parse(buffer)); } catch {}
  }
  const audits = lines.filter((entry) => entry.event === 'model_call');
  console.log(JSON.stringify({
    event: 'load_result',
    fake_provider_delay_ms: fakeDelayMs,
    configured_model_concurrency: 2,
    configured_model_requests_per_minute: 1000,
    samples_per_level: samplesPerLevel,
    answer_results: answerResults,
    retrieval_results: retrievalResults,
    fake_provider_requests: fake.requests,
    audit_sample: audits.find((entry) => entry.outcome === 'ok') ?? audits[0] ?? null,
    audit_count: audits.length
  }));
} finally {
  if (gateway && gateway.exitCode === null) {
    gateway.kill('SIGTERM');
    await new Promise((resolve) => gateway.once('exit', resolve));
  }
  await new Promise((resolve, reject) => fake.server.close((error) => error ? reject(error) : resolve()));
  await pool.query('DELETE FROM documents WHERE owner_id = $1', [ownerId]);
  await pool.end();
}

import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import test from 'node:test';

import { createAuthenticator } from '../src/gateway-auth.js';
import { createGatewayServer } from '../src/gateway-server.js';
import { segmentDocument } from '../src/index.js';

const token = 'a'.repeat(32);
const authenticator = createAuthenticator({
  token,
  owner_id: 'owner-one',
  shell_users: { 'shell-one': 'owner-one' }
});
const auth = { authorization: `Bearer ${token}`, 'x-shell-user-id': 'shell-one' };

function createRecordingStorage(overrides = {}) {
  const calls = [];
  const record = (name, result) => async (...args) => {
    calls.push({ name, input: args[0], args });
    if (result instanceof Error) throw result;
    return typeof result === 'function' ? result(...args) : result;
  };
  const storage = {
    calls,
    listEmbeddingModels: record('listEmbeddingModels', [{ model_id: 'synthetic-3d', dimensions: 3, status: 'active' }]),
    getEmbeddingModel: record('getEmbeddingModel', { model_id: 'synthetic-3d', dimensions: 3, status: 'active' }),
    inspectEmbeddingCoverage: record('inspectEmbeddingCoverage', { model_id: 'synthetic-3d', total_segments: 2 }),
    searchSegmentsLexical: record('searchSegmentsLexical', [{ id: 'urn:segment:a', document_id: 'urn:document:a', rank: 0.5 }]),
    searchSegmentsHybrid: record('searchSegmentsHybrid', [
      { id: 'urn:segment:a', document_id: 'urn:document:a', semantic_rank: 1, lexical_rank: 1, hybrid_score: 0.1 }
    ]),
    revalidateCitations: record('revalidateCitations', { valid: false, stale_ids: ['urn:segment:a'] }),
    searchSegmentsLexicalAnswerable: record('searchSegmentsLexicalAnswerable', []),
    saveDocumentAndSegments: record('saveDocumentAndSegments', undefined),
    listDocumentCollections: record('listDocumentCollections', ['synthetic-collection-alpha']),
    ...overrides
  };
  return storage;
}

function withServer(storage, options = {}) {
  return createGatewayServer({ storage, authenticator, answer_model: 'synthetic-chat', ...options });
}

async function call(gateway, path, { method = 'GET', headers = auth, body, rawBody, contentLength } = {}) {
  const { port } = gateway.server.listening ? { port: gateway.server.address().port } : await gateway.start({ port: 0 });
  const payload = rawBody ?? (body === undefined ? undefined : JSON.stringify(body));
  const requestHeaders = { ...headers };
  if (payload !== undefined && requestHeaders['content-type'] === undefined) {
    requestHeaders['content-type'] = 'application/json';
  }
  if (contentLength !== undefined) requestHeaders['content-length'] = contentLength;
  return await new Promise((resolve, reject) => {
    const request = httpRequest({ host: '127.0.0.1', port, path, method, headers: requestHeaders }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        const body = text === '' ? null : response.headers['content-type']?.startsWith('application/json') ? JSON.parse(text) : text;
        resolve({ status: response.statusCode, headers: response.headers, body });
      });
    });
    request.on('error', reject);
    if (payload !== undefined) request.write(payload);
    request.end();
  });
}

async function expectStatus(gateway, path, options, status) {
  const response = await call(gateway, path, options);
  await gateway.stop();
  assert.equal(response.status, status, `${path} -> ${response.status} ${JSON.stringify(response.body)}`);
  return response;
}

test('serves redacted metrics and isolates audit sink failures', async () => {
  const events = [];
  const gateway = withServer(createRecordingStorage(), {
    audit: (event) => {
      events.push(event);
      throw new Error('audit sink unavailable');
    }
  });
  const health = await call(gateway, '/healthz', { headers: {} });
  assert.equal(health.status, 200);
  const metrics = await call(gateway, '/metrics');
  await gateway.stop();
  assert.equal(metrics.status, 200);
  assert.match(metrics.body, /gateway_requests_total/);
  assert.match(metrics.body, /route="\/healthz"/);
  assert.doesNotMatch(metrics.body, new RegExp(token));
  assert.doesNotMatch(metrics.body, /owner-one/);
  assert.equal(events.length >= 2, true);
  assert.deepEqual(Object.keys(events[0]).sort(), ['duration_ms', 'method', 'outcome', 'request_id', 'route', 'status']);
  assert.equal(events[0].route, '/healthz');
});

test('enforces quotas before reading a body and releases quota after completion', async () => {
  const gateway = withServer(createRecordingStorage(), {
    requests_per_minute: 1,
    max_concurrent_requests: 1
  });
  const first = await call(gateway, '/v1/models');
  const rejected = await call(gateway, '/v1/retrieval/query', {
    method: 'POST',
    rawBody: '{not-json'
  });
  await gateway.stop();
  assert.equal(first.status, 200);
  assert.equal(rejected.status, 429);
  assert.deepEqual(rejected.body.error, { code: 'quota_exceeded', message: 'Request quota exceeded' });
  assert.equal(rejected.headers['retry-after'], '60');

  const released = withServer(createRecordingStorage(), {
    requests_per_minute: 2,
    max_concurrent_requests: 1
  });
  const one = await call(released, '/v1/models');
  const two = await call(released, '/v1/models');
  await released.stop();
  assert.equal(one.status, 200);
  assert.equal(two.status, 200);
});

test('does not charge health and readiness probes to owner quota', async () => {
  const gateway = withServer(createRecordingStorage(), {
    requests_per_minute: 1,
    max_concurrent_requests: 1
  });
  const health = await call(gateway, '/healthz', { headers: {} });
  const ready = await call(gateway, '/readyz', { headers: {} });
  const data = await call(gateway, '/v1/models');
  await gateway.stop();
  assert.equal(health.status, 200);
  assert.equal(ready.status, 200);
  assert.equal(data.status, 200);
});

test('serves liveness without a dependency and refuses unknown routes and methods', async () => {
  const storage = createRecordingStorage();
  const gateway = withServer(storage);
  const health = await expectStatus(gateway, '/healthz', { headers: {} }, 200);
  assert.deepEqual(health.body, { status: 'ok' });
  assert.deepEqual(storage.calls, []);

  const gateway2 = withServer(createRecordingStorage());
  const missing = await expectStatus(gateway2, '/v1/nope', { headers: auth }, 404);
  assert.equal(missing.body.error.code, 'not_found');

  const gateway2b = withServer(createRecordingStorage());
  const hidden = await expectStatus(gateway2b, '/v1/nope', { headers: {} }, 401);
  assert.equal(hidden.body.error.code, 'unauthorized');

  const gateway3 = withServer(createRecordingStorage());
  const wrongMethod = await expectStatus(gateway3, '/v1/models', { method: 'POST', headers: auth, body: {} }, 405);
  assert.equal(wrongMethod.body.error.code, 'method_not_allowed');
  assert.equal(wrongMethod.headers.allow, 'GET');
});

test('reports readiness from a real storage read', async () => {
  const ready = await expectStatus(withServer(createRecordingStorage()), '/readyz', { headers: {} }, 200);
  assert.deepEqual(ready.body, { status: 'ready' });

  const failing = withServer(createRecordingStorage({
    listEmbeddingModels: async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:55432');
    }
  }));
  const response = await call(failing, '/readyz', { headers: {} });
  await failing.stop();
  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, 'not_ready');
  assert.equal(JSON.stringify(response.body).includes('ECONNREFUSED'), false);
});

test('probes the configured provider once within the readiness cache', async () => {
  let probes = 0;
  const gateway = withServer(createRecordingStorage(), {
    chat: Object.assign(async () => 'unused', {
      async probe(model_id) {
        probes += 1;
        assert.equal(model_id, 'synthetic-chat');
      }
    })
  });
  const first = await call(gateway, '/readyz', { headers: {} });
  const second = await call(gateway, '/readyz', { headers: {} });
  await gateway.stop();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(probes, 1);

  let failedProbes = 0;
  const failing = withServer(createRecordingStorage(), {
    chat: Object.assign(async () => 'unused', {
      async probe() {
        failedProbes += 1;
        throw new Error('provider absent');
      }
    })
  });
  const failed = await call(failing, '/readyz', { headers: {} });
  const cached = await call(failing, '/readyz', { headers: {} });
  await failing.stop();
  assert.equal(failed.status, 503);
  assert.equal(cached.status, 503);
  assert.equal(failedProbes, 1);
});

test('limits concurrent calls per model independently of owner quota', async () => {
  let releaseFirst;
  const firstCall = new Promise((resolve) => { releaseFirst = resolve; });
  let calls = 0;
  const gateway = withServer(answerableStorage(), {
    max_model_concurrency: 1,
    chat: async () => {
      calls += 1;
      if (calls === 1) await firstCall;
      return 'answer [1].';
    }
  });
  const first = call(gateway, '/v1/answers', { method: 'POST', body: { question: 'first' } });
  await new Promise((resolve) => setImmediate(resolve));
  const refused = await call(gateway, '/v1/answers', { method: 'POST', body: { question: 'second' } });
  releaseFirst();
  const completed = await first;
  await gateway.stop();
  assert.equal(completed.status, 200);
  assert.equal(refused.status, 429);
  assert.equal(refused.body.error.code, 'model_busy');
  assert.equal(calls, 1);
});

test('records redacted provider-call telemetry with usage and isolates sink failures', async () => {
  const events = [];
  const gateway = withServer(answerableStorage(), {
    audit: (event) => {
      events.push(event);
      if (event.event === 'model_call') throw new Error('sink unavailable');
    },
    chat: async (input) => {
      input.on_usage({ prompt_tokens: 2, completion_tokens: 3 });
      return 'The invoice alpha is filed under the contract [1].';
    }
  });
  const response = await call(gateway, '/v1/answers', { method: 'POST', body: { question: 'private question' } });
  await gateway.stop();
  const modelEvent = events.find((event) => event.event === 'model_call');
  assert.equal(response.status, 200);
  assert.equal(modelEvent.kind, 'chat');
  assert.equal(modelEvent.model_id, 'synthetic-chat');
  assert.equal(modelEvent.owner_id, 'owner-one');
  assert.equal(modelEvent.outcome, 'ok');
  assert.equal(modelEvent.prompt_tokens, 2);
  assert.equal(modelEvent.completion_tokens, 3);
  assert.equal(JSON.stringify(modelEvent).includes('private question'), false);
});

test('authenticates every data route and refuses a caller-supplied owner', async () => {
  const storage = createRecordingStorage();
  const gateway = withServer(storage);
  const unauthorized = await expectStatus(gateway, '/v1/models', { headers: {} }, 401);
  assert.equal(unauthorized.body.error.code, 'unauthorized');

  const gateway2 = withServer(storage);
  const wrongToken = await expectStatus(gateway2, '/v1/models', { headers: { authorization: `Bearer ${'b'.repeat(32)}` } }, 401);
  assert.equal(wrongToken.body.error.code, 'unauthorized');

  const gateway3 = withServer(storage);
  const unmapped = await expectStatus(
    gateway3,
    '/v1/retrieval/query',
    { method: 'POST', headers: { authorization: `Bearer ${token}`, 'x-shell-user-id': 'shell-unknown' }, body: { query: 'x' } },
    403
  );
  assert.equal(unmapped.body.error.code, 'unknown_identity');

  const gateway4 = withServer(storage);
  const forged = await expectStatus(
    gateway4,
    '/v1/retrieval/query',
    { method: 'POST', body: { query: 'invoice', owner_id: 'owner-two' } },
    400
  );
  assert.equal(forged.body.error.code, 'invalid_request');
  assert.deepEqual(storage.calls, []);
});

test('caps the body before parsing and requires JSON', async () => {
  const gateway = withServer(createRecordingStorage());
  const declaredTooLarge = await call(gateway, '/v1/retrieval/query', {
    method: 'POST',
    body: { query: 'invoice' },
    contentLength: String(2 * 1024 * 1024)
  });
  await gateway.stop();
  assert.equal(declaredTooLarge.status, 413);
  assert.equal(declaredTooLarge.body.error.code, 'body_too_large');

  const streaming = withServer(createRecordingStorage());
  const streamedTooLarge = await call(streaming, '/v1/retrieval/query', {
    method: 'POST',
    rawBody: 'x'.repeat(1024 * 1024 + 1)
  });
  await streaming.stop();
  assert.equal(streamedTooLarge.status, 413);

  const wrongType = withServer(createRecordingStorage());
  const notJson = await call(wrongType, '/v1/retrieval/query', {
    method: 'POST',
    headers: { ...auth, 'content-type': 'text/plain' },
    rawBody: '{"query":"invoice"}'
  });
  await wrongType.stop();
  assert.equal(notJson.status, 415);

  const malformed = withServer(createRecordingStorage());
  const broken = await call(malformed, '/v1/retrieval/query', { method: 'POST', rawBody: '{"query":' });
  await malformed.stop();
  assert.equal(broken.status, 400);
  assert.equal(broken.body.error.code, 'invalid_json');
});

test('runs lexical and hybrid retrieval with the derived owner and the collection scope', async () => {
  const storage = createRecordingStorage();
  const gateway = withServer(storage);
  const lexical = await call(gateway, '/v1/retrieval/query', {
    method: 'POST',
    body: { query: 'invoice', collection_ids: ['synthetic-collection-alpha'], limit: 5 }
  });
  await gateway.stop();
  assert.equal(lexical.status, 200);
  assert.deepEqual(storage.calls[0].args, [{
    query: 'invoice',
    owner_id: 'owner-one',
    limit: 5,
    collection_ids: ['synthetic-collection-alpha']
  }]);
  assert.equal(lexical.body.retrieval.mode, 'lexical');
  assert.equal(lexical.body.retrieval.matches, 1);

  const hybridStorage = createRecordingStorage();
  const hybridGateway = withServer(hybridStorage);
  const hybrid = await call(hybridGateway, '/v1/retrieval/query', {
    method: 'POST',
    body: { mode: 'hybrid', query: 'invoice', model_id: 'synthetic-3d', query_embedding: [1, 0, 0] }
  });
  await hybridGateway.stop();
  assert.equal(hybrid.status, 200);
  assert.equal(hybridStorage.calls[0].input.owner_id, 'owner-one');
  assert.equal(hybrid.body.retrieval.mode, 'hybrid');

  const embedderCalls = [];
  const embedGateway = withServer(createRecordingStorage(), {
    embed: async (input) => {
      embedderCalls.push(input);
      return [[1, 0, 0]];
    }
  });
  const embedded = await call(embedGateway, '/v1/retrieval/query', {
    method: 'POST',
    body: { mode: 'hybrid', query: 'invoice', model_id: 'synthetic-3d' }
  });
  await embedGateway.stop();
  assert.equal(embedded.status, 200);
  assert.deepEqual(embedderCalls, [{ model_id: 'synthetic-3d', dimensions: 3, inputs: ['invoice'] }]);

  const noEmbedder = withServer(createRecordingStorage());
  const refused = await expectStatus(
    noEmbedder,
    '/v1/retrieval/query',
    { method: 'POST', body: { mode: 'hybrid', query: 'invoice', model_id: 'synthetic-3d' } },
    400
  );
  assert.match(refused.body.error.message, /query_embedding/);
});

test('resolves a citation batch within the storage limit', async () => {
  const storage = createRecordingStorage();
  const gateway = withServer(storage);
  const resolved = await call(gateway, '/v1/citations/resolve', {
    method: 'POST',
    body: {
      citations: [
        { document_id: 'urn:document:a', segment_id: 'urn:segment:a', citation: { source_hash: 'sha256:x', segment_hash: 'sha256:y' } }
      ]
    }
  });
  await gateway.stop();
  assert.equal(resolved.status, 200);
  assert.deepEqual(resolved.body, { valid: false, stale_ids: ['urn:segment:a'] });
  assert.equal(storage.calls[0].args[1].owner_id, 'owner-one');

  const tooMany = withServer(createRecordingStorage());
  const rejected = await expectStatus(
    tooMany,
    '/v1/citations/resolve',
    { method: 'POST', body: { citations: Array.from({ length: 101 }, () => ({})) } },
    400
  );
  assert.match(rejected.body.error.message, /100/);
});

test('lists models and the derived owner coverage on request', async () => {
  const storage = createRecordingStorage();
  const gateway = withServer(storage);
  const listed = await call(gateway, '/v1/models');
  await gateway.stop();
  assert.equal(listed.status, 200);
  assert.equal(listed.body.models.length, 1);
  assert.equal(listed.body.coverage, undefined);
  assert.deepEqual(storage.calls.map(({ name }) => name), ['listEmbeddingModels']);

  const covered = withServer(createRecordingStorage());
  const withCoverage = await call(covered, '/v1/models?model_id=synthetic-3d');
  await covered.stop();
  assert.equal(withCoverage.body.coverage.total_segments, 2);
  assert.deepEqual(withCoverage.body.coverage, { model_id: 'synthetic-3d', total_segments: 2 });
});

test('ingests through the segmentation seam with a server-derived owner', async () => {
  const storage = createRecordingStorage();
  const gateway = withServer(storage);
  const response = await call(gateway, '/v1/documents/ingest', {
    method: 'POST',
    body: {
      document: {
        document_id: 'urn:document:gateway-ingest',
        text: 'Invoice alpha. Contract beta.',
        source_label: 'gateway-ingest.txt',
        source_hash: `sha256:${'ab'.repeat(32)}`,
        lineage: { parser: 'synthetic-parser@1.0.0', model: null },
        created_at: '2026-01-03T00:00:00Z',
        collections: ['synthetic-collection-alpha']
      },
      max_segment_chars: 40
    }
  });
  await gateway.stop();
  assert.equal(response.status, 200);
  const saved = storage.calls.find(({ name }) => name === 'saveDocumentAndSegments');
  assert.equal(saved.input.retention.owner_id, 'owner-one');
  assert.equal(saved.input.retention.state, 'active');
  assert.deepEqual(saved.input.collections, ['synthetic-collection-alpha']);
  assert.deepEqual(response.body, {
    document_id: 'urn:document:gateway-ingest',
    collections: ['synthetic-collection-alpha'],
    segments: response.body.segments
  });
  assert.ok(response.body.segments >= 1);

  const forgedRetention = withServer(createRecordingStorage());
  const rejected = await expectStatus(
    forgedRetention,
    '/v1/documents/ingest',
    { method: 'POST', body: { document: { document_id: 'urn:document:x', retention: { owner_id: 'owner-two' } } } },
    400
  );
  assert.match(rejected.body.error.message, /owner_id/);

  const nestedOwner = withServer(createRecordingStorage());
  const nested = await expectStatus(
    nestedOwner,
    '/v1/documents/ingest',
    {
      method: 'POST',
      body: {
        document: {
          document_id: 'urn:document:x',
          owner_id: 'owner-two',
          text: 'x',
          source_label: 'x.txt',
          source_hash: `sha256:${'ab'.repeat(32)}`,
          lineage: { parser: 'synthetic-parser@1.0.0', model: null },
          created_at: '2026-01-03T00:00:00Z'
        }
      }
    },
    400
  );
  assert.match(nested.body.error.message, /owner_id/);
});

test('maps a refused ingest to a conflict and a missing collection to a caller error', async () => {
  const conflicting = withServer(createRecordingStorage({
    saveDocumentAndSegments: async () => {
      throw new Error('document belongs to a different owner');
    }
  }));
  const conflict = await call(conflicting, '/v1/documents/ingest', {
    method: 'POST',
    body: {
      document: {
        document_id: 'urn:document:gateway-conflict',
        text: 'Invoice alpha.',
        source_label: 'gateway-conflict.txt',
        source_hash: `sha256:${'ab'.repeat(32)}`,
        lineage: { parser: 'synthetic-parser@1.0.0', model: null },
        created_at: '2026-01-03T00:00:00Z'
      }
    }
  });
  await conflicting.stop();
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'conflict');

  const missingCollection = withServer(createRecordingStorage({
    saveDocumentAndSegments: async () => {
      throw new Error('unknown or foreign collection for this owner');
    }
  }));
  const refused = await call(missingCollection, '/v1/documents/ingest', {
    method: 'POST',
    body: {
      document: {
        document_id: 'urn:document:gateway-missing-collection',
        text: 'Invoice alpha.',
        source_label: 'gateway-missing.txt',
        source_hash: `sha256:${'ab'.repeat(32)}`,
        lineage: { parser: 'synthetic-parser@1.0.0', model: null },
        created_at: '2026-01-03T00:00:00Z',
        collections: ['synthetic-collection-unknown']
      }
    }
  });
  await missingCollection.stop();
  assert.equal(refused.status, 400);
  assert.equal(refused.body.error.code, 'invalid_request');
});

test('reports an unregistered model as a caller error on coverage', async () => {
  const storage = createRecordingStorage({
    inspectEmbeddingCoverage: async () => {
      throw new Error('embedding model is not registered');
    }
  });
  const gateway = withServer(storage);
  const response = await call(gateway, '/v1/models?model_id=synthetic-unknown');
  await gateway.stop();
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'invalid_request');
});

test('reports malformed seam input as a caller error', async () => {
  const storage = createRecordingStorage({
    searchSegmentsLexical: async () => {
      throw new TypeError('query must be non-empty text');
    }
  });
  const gateway = withServer(storage);
  const response = await call(gateway, '/v1/retrieval/query', { method: 'POST', body: { query: 'invoice' } });
  await gateway.stop();
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: { code: 'invalid_request', message: 'query must be non-empty text' } });
});

test('reports an unexpected dependency failure without leaking it', async () => {
  const storage = createRecordingStorage({
    searchSegmentsLexical: async () => {
      throw new Error('relation "segments" does not exist at /var/lib/postgresql/data');
    }
  });
  const gateway = withServer(storage);
  const response = await call(gateway, '/v1/retrieval/query', { method: 'POST', body: { query: 'invoice' } });
  await gateway.stop();
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: { code: 'internal_error', message: 'The request failed' } });
});

function answerableStorage() {
  const ownerId = 'owner-one';
  const document = {
    document_id: 'urn:document:gateway-answer',
    text: 'The invoice alpha is filed under the contract.',
    source_label: 'gateway-answer.txt',
    source_hash: `sha256:${'ac'.repeat(32)}`,
    lineage: { parser: 'synthetic-parser@1.0.0', model: null },
    created_at: '2026-01-06T00:00:00Z',
    retention: { owner_id: ownerId, state: 'active' }
  };
  const segmented = segmentDocument(document, { max_segment_chars: 200 });
  const matches = segmented.segments.map((segment) => ({
    ...segment,
    source_hash: document.source_hash,
    source_label: document.source_label,
    owner_id: ownerId,
    retention_state: 'active',
    rank: 0.5
  }));
  const calls = [];
  return {
    calls,
    async getEmbeddingModel(model_id) {
      calls.push({ name: 'getEmbeddingModel', input: { model_id } });
      return { model_id, dimensions: 3, status: 'active' };
    },
    async searchSegmentsLexical(input) {
      calls.push({ name: 'searchSegmentsLexical', input });
      return matches;
    },
    async searchSegmentsHybrid(input) {
      calls.push({ name: 'searchSegmentsHybrid', input });
      return matches;
    },
    async revalidateCitations(citations, options) {
      calls.push({ name: 'revalidateCitations', input: { citations, options } });
      return { valid: true, stale_ids: [] };
    }
  };
}

test('answers over evidence with a derived owner and the injected chat adapter', async () => {
  const storage = answerableStorage();
  const chatCalls = [];
  const gateway = withServer(storage, {
    chat: async (input) => {
      chatCalls.push(input);
      return 'The invoice alpha is filed under the contract [1].';
    }
  });
  const response = await call(gateway, '/v1/answers', {
    method: 'POST',
    body: { question: 'where is the invoice alpha?' }
  });
  await gateway.stop();
  assert.equal(response.status, 200);
  assert.equal(response.body.citations.length, 1);
  assert.deepEqual(response.body.unresolved_citations, []);
  assert.deepEqual(response.body.stale_citations, []);
  assert.equal(response.body.uncertainty.level, 'low');
  assert.equal(response.body.uncertainty.evidence_count, 1);
  assert.equal(chatCalls.length, 1);
  assert.equal(chatCalls[0].model_id, 'synthetic-chat');
  assert.equal(chatCalls[0].messages[0].role, 'system');
  assert.equal(chatCalls[0].messages[1].content.includes('where is the invoice alpha?'), true);
  const search = storage.calls.find(({ name }) => name === 'searchSegmentsLexical');
  assert.equal(search.input.owner_id, 'owner-one');
});

test('refuses an answer request without a configured model and without authentication', async () => {
  const unconfigured = withServer(answerableStorage(), { chat: undefined, answer_model: undefined });
  const unavailable = await expectStatus(
    unconfigured,
    '/v1/answers',
    { method: 'POST', body: { question: 'where is the invoice alpha?' } },
    503
  );
  assert.equal(unavailable.body.error.code, 'answers_unavailable');

  const unauthenticated = withServer(answerableStorage(), { chat: async () => 'x [1].' });
  const refused = await expectStatus(
    unauthenticated,
    '/v1/answers',
    { method: 'POST', headers: {}, body: { question: 'where is the invoice alpha?' } },
    401
  );
  assert.equal(refused.body.error.code, 'unauthorized');

  const forged = withServer(answerableStorage(), { chat: async () => 'x [1].' });
  const rejected = await expectStatus(
    forged,
    '/v1/answers',
    { method: 'POST', body: { question: 'where?', owner_id: 'owner-two' } },
    400
  );
  assert.equal(rejected.body.error.code, 'invalid_request');
});

test('maps a malformed provider response and an embedder failure to boundary errors', async () => {
  const malformed = withServer(answerableStorage(), {
    chat: async () => {
      throw new Error('chat response must be valid JSON');
    }
  });
  const broken = await expectStatus(malformed, '/v1/answers', { method: 'POST', body: { question: 'invoice alpha' } }, 502);
  assert.equal(broken.body.error.code, 'model_failed');

  const embedTimeout = withServer(answerableStorage(), {
    chat: async () => 'x [1].',
    embed: async () => {
      throw new Error('embedding request timed out');
    }
  });
  const timedOutEmbed = await expectStatus(
    embedTimeout,
    '/v1/answers',
    { method: 'POST', body: { question: 'invoice alpha', embedding_model_id: 'synthetic-3d' } },
    504
  );
  assert.equal(timedOutEmbed.body.error.code, 'model_timeout');

  const embedFailed = withServer(answerableStorage(), {
    chat: async () => 'x [1].',
    embed: async () => {
      throw new Error('embedding request failed with status 500');
    }
  });
  const failedEmbed = await expectStatus(
    embedFailed,
    '/v1/answers',
    { method: 'POST', body: { question: 'invoice alpha', embedding_model_id: 'synthetic-3d' } },
    502
  );
  assert.equal(failedEmbed.body.error.code, 'model_failed');
});

test('maps a provider timeout and a provider failure to stable boundary errors', async () => {
  const timeout = withServer(answerableStorage(), {
    chat: async () => {
      throw new Error('chat request timed out');
    }
  });
  const timedOut = await expectStatus(timeout, '/v1/answers', { method: 'POST', body: { question: 'where?' } }, 504);
  assert.equal(timedOut.body.error.code, 'model_timeout');

  const failing = withServer(answerableStorage(), {
    chat: async () => {
      throw new Error('chat request failed with status 429');
    }
  });
  const failed = await expectStatus(failing, '/v1/answers', { method: 'POST', body: { question: 'where?' } }, 502);
  assert.equal(failed.body.error.code, 'model_failed');
});

test('researches over planned follow-up evidence and reports provenance like an answer', async () => {
  const storage = answerableStorage();
  const chatCalls = [];
  const gateway = withServer(storage, {
    chat: async (input) => {
      chatCalls.push(input);
      return input.max_tokens === 128
        ? JSON.stringify({ queries: ['invoice alpha contract'] })
        : 'The invoice alpha is filed under the contract [1].';
    }
  });
  const response = await call(gateway, '/v1/research', {
    method: 'POST',
    body: { question: 'where is the invoice alpha?', collection_ids: ['collection-alpha'] }
  });
  await gateway.stop();
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.deepEqual(Object.keys(response.body).sort(), [
    'answer',
    'citations',
    'retrieval',
    'stale_citations',
    'uncertainty',
    'unresolved_citations'
  ]);
  assert.equal(response.body.answer, 'The invoice alpha is filed under the contract [1].');
  assert.equal(response.body.citations.length, 1);
  assert.deepEqual(response.body.stale_citations, []);
  assert.equal(response.body.uncertainty.level, 'low');
  assert.equal(chatCalls.length, 2, 'one planner call and one synthesis');
  assert.equal(chatCalls[1].model_id, 'synthetic-chat');
  const searches = storage.calls.filter(({ name }) => name === 'searchSegmentsLexical');
  assert.deepEqual(searches.map(({ input }) => input.query), ['where is the invoice alpha?', 'invoice alpha contract']);
  assert.ok(searches.every(({ input }) => input.owner_id === 'owner-one'));
  assert.ok(searches.every(({ input }) => input.collection_ids[0] === 'collection-alpha'));
});

test('maps research validation and provider failures to stable boundary errors', async () => {
  const gateway = withServer(answerableStorage(), { chat: async () => JSON.stringify({ queries: [] }) });
  const invalidLimit = await expectStatus(gateway, '/v1/research', { method: 'POST', body: { question: 'where?', limit: 0 } }, 400);
  assert.equal(invalidLimit.body.error.code, 'invalid_request');
  const invalidTokens = await expectStatus(gateway, '/v1/research', { method: 'POST', body: { question: 'where?', max_tokens: 9000 } }, 400);
  assert.equal(invalidTokens.body.error.code, 'invalid_request');
  const missingQuestion = await expectStatus(gateway, '/v1/research', { method: 'POST', body: {} }, 400);
  assert.equal(missingQuestion.body.error.code, 'invalid_request');
  const forged = await expectStatus(
    gateway,
    '/v1/research',
    { method: 'POST', body: { question: 'where?', owner_id: 'owner-two' } },
    400
  );
  assert.equal(forged.body.error.code, 'invalid_request');

  const unconfigured = withServer(answerableStorage(), { chat: undefined, answer_model: undefined });
  const unavailable = await expectStatus(unconfigured, '/v1/research', { method: 'POST', body: { question: 'where?' } }, 503);
  assert.equal(unavailable.body.error.code, 'answers_unavailable');

  const failing = withServer(answerableStorage(), {
    chat: async () => {
      throw new Error('chat request failed with status 500');
    }
  });
  const failed = await expectStatus(failing, '/v1/research', { method: 'POST', body: { question: 'where?' } }, 502);
  assert.equal(failed.body.error.code, 'model_failed');

  const timedOut = withServer(answerableStorage(), {
    chat: async () => {
      throw new Error('chat request timed out');
    }
  });
  const timeout = await expectStatus(timedOut, '/v1/research', { method: 'POST', body: { question: 'where?' } }, 504);
  assert.equal(timeout.body.error.code, 'model_timeout');
});

function collectionStorage(overrides = {}) {
  const calls = [];
  return {
    calls,
    async suggestDocumentCollections(input) {
      calls.push({ name: 'suggestDocumentCollections', input });
      return [{ collection_id: 'collection-alpha', score: 0.5, segment_id: 'urn:segment:a' }];
    },
    async moveDocumentCollection(input) {
      calls.push({ name: 'moveDocumentCollection', input });
      return input.collection_id;
    },
    async confirmDocumentCollections(input) {
      calls.push({ name: 'confirmDocumentCollections', input });
      return [...input.collection_ids].sort();
    },
    async listDocumentCollections(document_id, owner_id) {
      calls.push({ name: 'listDocumentCollections', input: { document_id, owner_id } });
      return ['collection-alpha'];
    },
    ...overrides
  };
}

test('suggests, moves, and confirms document collections under the authenticated owner', async () => {
  const storage = collectionStorage();
  const gateway = withServer(storage);
  const suggested = await call(gateway, '/v1/documents/collections/suggest', {
    method: 'POST',
    body: { document_id: 'urn:document:alpha', max_collections: 3 }
  });
  const moved = await call(gateway, '/v1/documents/collections/move', {
    method: 'POST',
    body: { document_id: 'urn:document:alpha', collection_id: 'collection-beta' }
  });
  const confirmed = await call(gateway, '/v1/documents/collections/confirm', {
    method: 'POST',
    body: { document_id: 'urn:document:alpha', collection_ids: ['collection-beta', 'collection-alpha'] }
  });
  await gateway.stop();

  assert.equal(suggested.status, 200, JSON.stringify(suggested.body));
  assert.deepEqual(suggested.body, {
    document_id: 'urn:document:alpha',
    candidates: [{ collection_id: 'collection-alpha', score: 0.5, segment_id: 'urn:segment:a' }]
  });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.deepEqual(moved.body, { document_id: 'urn:document:alpha', collections: ['collection-alpha'] });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
  assert.deepEqual(confirmed.body, { document_id: 'urn:document:alpha', collections: ['collection-alpha', 'collection-beta'] });

  const suggestCall = storage.calls.find(({ name }) => name === 'suggestDocumentCollections');
  assert.deepEqual(suggestCall.input, { document_id: 'urn:document:alpha', owner_id: 'owner-one', max_collections: 3 });
  const moveCall = storage.calls.find(({ name }) => name === 'moveDocumentCollection');
  assert.deepEqual(moveCall.input, { document_id: 'urn:document:alpha', owner_id: 'owner-one', collection_id: 'collection-beta' });
  const confirmCall = storage.calls.find(({ name }) => name === 'confirmDocumentCollections');
  assert.deepEqual(confirmCall.input, {
    document_id: 'urn:document:alpha',
    owner_id: 'owner-one',
    collection_ids: ['collection-beta', 'collection-alpha']
  });
});

test('validates collection management requests and maps owner and collection failures', async () => {
  const gateway = withServer(collectionStorage());
  const badDocument = await expectStatus(
    gateway,
    '/v1/documents/collections/suggest',
    { method: 'POST', body: { document_id: 'alpha' } },
    400
  );
  assert.equal(badDocument.body.error.code, 'invalid_request');
  const badMax = await expectStatus(
    gateway,
    '/v1/documents/collections/suggest',
    { method: 'POST', body: { document_id: 'urn:document:alpha', max_collections: 0 } },
    400
  );
  assert.equal(badMax.body.error.code, 'invalid_request');
  const badCollection = await expectStatus(
    gateway,
    '/v1/documents/collections/move',
    { method: 'POST', body: { document_id: 'urn:document:alpha', collection_id: '../alpha' } },
    400
  );
  assert.equal(badCollection.body.error.code, 'invalid_request');
  const emptyConfirm = await expectStatus(
    gateway,
    '/v1/documents/collections/confirm',
    { method: 'POST', body: { document_id: 'urn:document:alpha', collection_ids: [] } },
    400
  );
  assert.equal(emptyConfirm.body.error.code, 'invalid_request');
  const forgedOwner = await expectStatus(
    gateway,
    '/v1/documents/collections/move',
    { method: 'POST', body: { document_id: 'urn:document:alpha', collection_id: 'collection-beta', owner_id: 'owner-two' } },
    400
  );
  assert.equal(forgedOwner.body.error.code, 'invalid_request');

  const foreignCollection = withServer(collectionStorage({
    async moveDocumentCollection() {
      throw new Error('unknown or foreign collection for this owner');
    }
  }));
  const refused = await expectStatus(
    foreignCollection,
    '/v1/documents/collections/move',
    { method: 'POST', body: { document_id: 'urn:document:alpha', collection_id: 'collection-foreign' } },
    400
  );
  assert.equal(refused.body.error.code, 'invalid_request');

  const foreignDocument = withServer(collectionStorage({
    async confirmDocumentCollections() {
      throw new Error('document belongs to a different owner');
    }
  }));
  const conflicted = await expectStatus(
    foreignDocument,
    '/v1/documents/collections/confirm',
    { method: 'POST', body: { document_id: 'urn:document:alpha', collection_ids: ['collection-alpha'] } },
    409
  );
  assert.equal(conflicted.body.error.code, 'conflict');

  const missingDocument = withServer(collectionStorage({
    async suggestDocumentCollections() {
      throw new Error('document not found for this owner');
    }
  }));
  const missing = await expectStatus(
    missingDocument,
    '/v1/documents/collections/suggest',
    { method: 'POST', body: { document_id: 'urn:document:absent' } },
    404
  );
  assert.equal(missing.body.error.code, 'not_found');
});

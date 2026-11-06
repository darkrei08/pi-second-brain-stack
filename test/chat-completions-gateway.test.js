import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import test from 'node:test';

import { createAuthenticator } from '../src/gateway-auth.js';
import { createGatewayServer } from '../src/gateway-server.js';
import { segmentDocument } from '../src/index.js';

const token = 'a'.repeat(32);
const authenticator = createAuthenticator({ token, owner_id: 'operator-owner' });
const auth = { authorization: `Bearer ${token}` };

function answerableStorage({ empty = false } = {}) {
  const owner_id = 'operator-owner';
  const document = {
    document_id: 'urn:document:gateway-chat',
    text: 'The invoice alpha is filed under the contract.',
    source_label: 'gateway-chat.txt',
    source_hash: `sha256:${'ac'.repeat(32)}`,
    lineage: { parser: 'synthetic-parser@1.0.0', model: null },
    created_at: '2026-01-06T00:00:00Z',
    retention: { owner_id, state: 'active' }
  };
  const segmented = segmentDocument(document, { max_segment_chars: 200 });
  const matches = empty ? [] : segmented.segments.map((segment) => ({
    ...segment,
    source_hash: document.source_hash,
    source_label: document.source_label,
    owner_id,
    retention_state: 'active',
    rank: 0.5
  }));
  const calls = [];
  return {
    calls,
    async searchSegmentsLexical(input) {
      calls.push({ name: 'searchSegmentsLexical', input });
      return matches;
    },
    async revalidateCitations(citations, options) {
      calls.push({ name: 'revalidateCitations', input: { citations, options } });
      return { valid: true, stale_ids: [] };
    }
  };
}

async function request(gateway, body, headers = auth) {
  const { port } = await gateway.start({ port: 0 });
  return await new Promise((resolve, reject) => {
    const request = httpRequest({ host: '127.0.0.1', port, path: '/v1/chat/completions', method: 'POST', headers: { ...headers, 'content-type': 'application/json' } }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    request.on('error', reject);
    request.end(JSON.stringify(body));
  });
}

test('maps a grounded OpenAI request to the configured answer model and streams the report last', async () => {
  const storage = answerableStorage();
  const calls = [];
  const gateway = createGatewayServer({
    storage,
    authenticator,
    answer_model: 'configured-chat',
    chat: async (input) => {
      calls.push(input);
      return 'The invoice alpha is filed under the contract [1].';
    }
  });
  const response = await request(gateway, {
    model: 'client-model',
    messages: [{ role: 'system', content: 'Be concise.' }, { role: 'user', content: 'Where is invoice alpha?' }],
    stream: true,
    max_tokens: 77
  });
  await gateway.stop();
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /^text\/event-stream/u);
  const groundingPosition = response.body.indexOf('event: grounding');
  const donePosition = response.body.indexOf('data: [DONE]');
  assert.ok(groundingPosition > response.body.indexOf('The invoice alpha'));
  assert.ok(donePosition > groundingPosition);
  const grounding = JSON.parse(response.body.match(/event: grounding\ndata: (.+)\n/u)[1]);
  assert.equal(grounding.uncertainty.level, 'low');
  assert.equal(calls[0].model_id, 'configured-chat');
  assert.equal(calls[0].messages[1].content.includes('Where is invoice alpha?'), true);
});

test('returns a normal completion and does not call the model without evidence', async () => {
  let called = false;
  const gateway = createGatewayServer({
    storage: answerableStorage({ empty: true }),
    authenticator,
    answer_model: 'configured-chat',
    chat: async () => {
      called = true;
      return 'not used';
    }
  });
  const response = await request(gateway, {
    model: 'client-model',
    messages: [{ role: 'user', content: 'What is missing?' }]
  });
  await gateway.stop();
  const body = JSON.parse(response.body);
  assert.equal(response.status, 200);
  assert.equal(body.object, 'chat.completion');
  assert.equal(body.uncertainty.level, 'unsupported');
  assert.equal(called, false);
});

test('rejects malformed requests and unauthenticated callers', async () => {
  const create = () => createGatewayServer({ storage: answerableStorage(), authenticator, answer_model: 'configured-chat', chat: async () => 'x [1].' });
  const missingModel = create();
  const first = await request(missingModel, { messages: [{ role: 'user', content: 'q' }] });
  await missingModel.stop();
  assert.equal(first.status, 400);
  assert.match(JSON.parse(first.body).error.message, /model/);

  const unauthenticated = create();
  const second = await request(unauthenticated, { model: 'm', messages: [{ role: 'user', content: 'q' }] }, {});
  await unauthenticated.stop();
  assert.equal(second.status, 401);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseChatCompletionRequest, writeChatCompletionStream } from '../src/chat-completions.js';

const result = {
  answer: 'Risposta [1].',
  citations: [{ segment_id: 'urn:segment:one' }],
  unresolved_citations: [],
  stale_citations: [],
  retrieval: { mode: 'lexical', matches: 1 },
  uncertainty: { level: 'low', mode: 'lexical', evidence_count: 1, cited_count: 1, unresolved_count: 0, stale_count: 0 }
};

test('maps the latest user message and preserves answer options', () => {
  assert.deepEqual(parseChatCompletionRequest({
    model: 'client-model',
    messages: [
      { role: 'system', content: 'system' },
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'old answer' },
      { role: 'user', content: 'latest' }
    ],
    stream: true,
    max_tokens: 77,
    limit: 4,
    collection_ids: ['urn:collection:one'],
    embedding_model_id: 'embedding-model'
  }), {
    question: 'latest',
    stream: true,
    max_tokens: 77,
    limit: 4,
    collection_ids: ['urn:collection:one'],
    embedding_model_id: 'embedding-model'
  });
  assert.throws(() => parseChatCompletionRequest({ model: 'm', messages: [{ role: 'assistant', content: 'x' }] }), /user message/);
  assert.throws(() => parseChatCompletionRequest({ model: 'm', messages: [{ role: 'user', content: 'x' }], stream: 'yes' }), /stream/);
});

test('does not emit grounding metadata after a client disconnects', async () => {
  const writes = [];
  const response = {
    destroyed: false,
    writableEnded: false,
    writeHead() {},
    write(value) {
      writes.push(value);
      if (value.includes('Risposta')) this.destroyed = true;
      return true;
    },
    end() {
      this.writableEnded = true;
    }
  };
  const completed = await writeChatCompletionStream(response, { answer_model: 'chat-model', result });
  assert.equal(completed, false);
  assert.equal(writes.some((value) => value.includes('event: grounding')), false);
  assert.equal(writes.some((value) => value.includes('[DONE]')), false);
});

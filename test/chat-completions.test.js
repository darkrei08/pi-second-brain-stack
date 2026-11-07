import assert from 'node:assert/strict';
import test from 'node:test';

import { parseChatCompletionRequest } from '../src/chat-completions.js';

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


import { randomUUID } from 'node:crypto';

const MAX_STREAM_CHUNK_CHARS = 128;
const ROLES = new Set(['system', 'user', 'assistant']);

function requireNonEmptyText(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} must be non-empty text`);
  }
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new TypeError('messages must be a non-empty array');
  }
  for (const [index, message] of messages.entries()) {
    if (message === null || typeof message !== 'object' || Array.isArray(message)) {
      throw new TypeError(`messages[${index}] must be an object`);
    }
    if (!ROLES.has(message.role)) {
      throw new TypeError(`messages[${index}].role must be system, user, or assistant`);
    }
    requireNonEmptyText(message.content, `messages[${index}].content`);
  }
  const question = [...messages].reverse().find(({ role }) => role === 'user');
  if (question === undefined) {
    throw new TypeError('messages must contain a user message');
  }
  return question.content;
}

export function parseChatCompletionRequest(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('body must be an object');
  }
  requireNonEmptyText(body.model, 'model');
  const question = validateMessages(body.messages);
  if (body.stream !== undefined && typeof body.stream !== 'boolean') {
    throw new TypeError('stream must be a boolean');
  }
  return {
    question,
    stream: body.stream ?? false,
    max_tokens: body.max_tokens,
    limit: body.limit,
    collection_ids: body.collection_ids,
    embedding_model_id: body.embedding_model_id
  };
}

function completionId() {
  return `chatcmpl-${randomUUID()}`;
}

function groundingFields(result) {
  return {
    citations: result.citations,
    unresolved_citations: result.unresolved_citations,
    stale_citations: result.stale_citations,
    retrieval: result.retrieval,
    uncertainty: result.uncertainty
  };
}

export function createChatCompletion({ answer_model, result } = {}) {
  requireNonEmptyText(answer_model, 'answer_model');
  if (result === null || typeof result !== 'object') {
    throw new TypeError('result must be an object');
  }
  return {
    id: completionId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: answer_model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: result.answer },
      finish_reason: 'stop'
    }],
    ...groundingFields(result)
  };
}

function streamChunk({ id, answer_model, created, delta, finish_reason = null }) {
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model: answer_model,
    choices: [{ index: 0, delta, finish_reason }]
  };
}

function writeEvent(response, payload, event) {
  if (response.destroyed || response.writableEnded) return false;
  if (event !== undefined) response.write(`event: ${event}\n`);
  response.write(`data: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n\n`);
  return true;
}

export async function writeChatCompletionStream(response, { answer_model, result } = {}) {
  requireNonEmptyText(answer_model, 'answer_model');
  if (result === null || typeof result !== 'object') {
    throw new TypeError('result must be an object');
  }
  const id = completionId();
  const created = Math.floor(Date.now() / 1000);
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  });

  if (!writeEvent(response, streamChunk({ id, answer_model, created, delta: { role: 'assistant' } }))) return false;
  const characters = Array.from(result.answer);
  for (let offset = 0; offset < characters.length; offset += MAX_STREAM_CHUNK_CHARS) {
    if (!writeEvent(response, streamChunk({
      id,
      answer_model,
      created,
      delta: { content: characters.slice(offset, offset + MAX_STREAM_CHUNK_CHARS).join('') }
    }))) return false;
  }
  if (!writeEvent(response, groundingFields(result), 'grounding')) return false;
  if (!writeEvent(response, streamChunk({ id, answer_model, created, delta: {}, finish_reason: 'stop' }))) return false;
  writeEvent(response, '[DONE]');
  response.end();
  return true;
}

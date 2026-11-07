import { answerQuestion } from '../../answer-question.js';
import { createChatCompletion, createChatCompletionStream, parseChatCompletionRequest } from '../../chat-completions.js';
import { GatewayError } from '../../gateway-error.js';
import { mapSeamFailure } from '../route-error.js';
import { requireRouteBody } from '../request-body.js';

function createStreamingChat({ chat, model_call, owner_id, request_id }) {
  const callChat = (input) => model_call({ kind: 'chat', chat, input, owner_id, request_id });
  callChat.stream = (input) => {
    let buffered;
    let releaseProducer;
    let resolveConsumer;
    let completed = false;
    let failure;
    const publish = async (delta) => {
      if (completed) return;
      if (resolveConsumer !== undefined) {
        const resolve = resolveConsumer;
        resolveConsumer = undefined;
        resolve({ value: delta, done: false });
        return;
      }
      await new Promise((resolve) => {
        buffered = delta;
        releaseProducer = resolve;
      });
    };
    const complete = (error) => {
      if (completed) return;
      completed = true;
      failure = error;
      const resolve = resolveConsumer;
      resolveConsumer = undefined;
      resolve?.({ value: undefined, done: true, error });
      const release = releaseProducer;
      releaseProducer = undefined;
      release?.();
    };
    const provider = async (providerInput) => {
      let answer = '';
      try {
        for await (const delta of chat.stream(providerInput)) {
          answer += delta;
          await publish(delta);
        }
        complete();
        return answer;
      } catch (error) {
        complete(error);
        throw error;
      }
    };
    const pending = model_call({ kind: 'chat', chat: provider, input, owner_id, request_id });
    void pending.catch((error) => complete(error));
    return (async function* streamDeltas() {
      try {
        while (true) {
          let item;
          if (buffered !== undefined) {
            item = { value: buffered, done: false };
            buffered = undefined;
            const release = releaseProducer;
            releaseProducer = undefined;
            release?.();
          } else if (completed) {
            item = { value: undefined, done: true, error: failure };
          } else {
            item = await new Promise((resolve) => { resolveConsumer = resolve; });
          }
          if (item.done) {
            if (item.error !== undefined) throw item.error;
            return;
          }
          yield item.value;
        }
      } finally {
        complete();
      }
    })();
  };
  return callChat;
}

export function createChatCompletionRoutes({ storage, embed, chat, answer_model, model_call }) {
  return [{
    method: 'POST',
    path: '/v1/chat/completions',
    handler: async ({ body, owner_id, response, request_id }) => {
      const input = requireRouteBody(body);
      let stream;
      let abortController;
      let abortOnClose;
      try {
        if (chat === undefined || answer_model === undefined) {
          throw new GatewayError(503, 'answers_unavailable', 'No answer model is configured');
        }
        const request = parseChatCompletionRequest(input);
        const callChat = model_call === undefined
          ? chat
          : (modelInput) => model_call({ kind: 'chat', chat, input: modelInput, owner_id, request_id });
        if (!request.stream) {
          const result = await answerQuestion({
            storage,
            chat: callChat,
            embed,
            question: request.question,
            owner_id,
            collection_ids: request.collection_ids,
            // The chat model and the embedding model are different models with different identities.
            model_id: answer_model,
            embedding_model_id: embed === undefined ? undefined : request.embedding_model_id,
            limit: request.limit ?? 6,
            max_tokens: request.max_tokens ?? 600
          });
          return { status: 200, body: createChatCompletion({ answer_model, result }) };
        }
        if (typeof chat.stream !== 'function') {
          throw new GatewayError(503, 'answers_unavailable', 'The configured chat provider does not support streaming');
        }
        abortController = new AbortController();
        abortOnClose = () => abortController.abort();
        response.once('close', abortOnClose);
        const streamingChat = model_call === undefined
          ? chat
          : createStreamingChat({ chat, model_call, owner_id, request_id });
        const result = await answerQuestion({
          storage,
          chat: streamingChat,
          embed,
          question: request.question,
          owner_id,
          collection_ids: request.collection_ids,
          // The chat model and the embedding model are different models with different identities.
          model_id: answer_model,
          embedding_model_id: embed === undefined ? undefined : request.embedding_model_id,
          limit: request.limit ?? 6,
          max_tokens: request.max_tokens ?? 600,
          on_delta: (delta) => {
            if (stream === undefined) stream = createChatCompletionStream(response, { answer_model });
            if (!stream.writeDelta(delta)) abortController.abort();
          },
          signal: abortController.signal
        });
        if (response.destroyed || response.writableEnded) return { streamed: true };
        if (stream === undefined) {
          stream = createChatCompletionStream(response, { answer_model });
          if (result.answer !== '' && !stream.writeDelta(result.answer)) return { streamed: true };
        }
        stream.finish(result);
        return { streamed: true };
      } catch (error) {
        const mapped = mapSeamFailure(error) ?? error;
        if (stream !== undefined) {
          stream.fail(mapped);
          return { streamed: true };
        }
        throw mapped;
      } finally {
        if (abortOnClose !== undefined) response.off('close', abortOnClose);
      }
    }
  }];
}

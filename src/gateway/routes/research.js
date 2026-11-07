import { researchQuestion } from '../../answer-question.js';
import { GatewayError } from '../../gateway-error.js';
import { mapSeamFailure } from '../route-error.js';
import { optionalCollectionIds, requireRouteBody } from '../request-body.js';

const MAX_LIMIT = 100;
const MAX_COMPLETION_TOKENS = 8192;

export function createResearchRoutes({ storage, embed, chat, answer_model, model_call }) {
  return [{
    method: 'POST',
    path: '/v1/research',
    handler: async ({ body, owner_id, request_id }) => {
      const input = requireRouteBody(body);
      try {
        if (typeof input.question !== 'string' || input.question.trim() === '') {
          throw new GatewayError(400, 'invalid_request', 'question must be non-empty text');
        }
        if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > MAX_LIMIT)) {
          throw new GatewayError(400, 'invalid_request', `limit must be an integer between 1 and ${MAX_LIMIT}`);
        }
        if (input.max_tokens !== undefined
          && (!Number.isInteger(input.max_tokens) || input.max_tokens < 1 || input.max_tokens > MAX_COMPLETION_TOKENS)) {
          throw new GatewayError(400, 'invalid_request', `max_tokens must be an integer between 1 and ${MAX_COMPLETION_TOKENS}`);
        }
        if (input.embedding_model_id !== undefined
          && (typeof input.embedding_model_id !== 'string' || input.embedding_model_id.trim() === '')) {
          throw new GatewayError(400, 'invalid_request', 'embedding_model_id must be non-empty text');
        }
        const collection_ids = optionalCollectionIds(input);
        if (chat === undefined || answer_model === undefined) {
          throw new GatewayError(503, 'answers_unavailable', 'No answer model is configured');
        }
        const callChat = model_call === undefined
          ? chat
          : (chat_input) => model_call({ kind: 'chat', chat, input: chat_input, owner_id, request_id });
        return {
          status: 200,
          body: await researchQuestion({
            storage,
            chat: callChat,
            embed,
            question: input.question,
            owner_id,
            collection_ids,
            // The chat model and the embedding model are different models with different identities.
            model_id: answer_model,
            embedding_model_id: embed === undefined ? undefined : input.embedding_model_id,
            limit: input.limit ?? 6,
            max_tokens: input.max_tokens ?? 600
          })
        };
      } catch (error) {
        throw mapSeamFailure(error) ?? error;
      }
    }
  }];
}

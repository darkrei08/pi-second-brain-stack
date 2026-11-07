import { answerQuestion } from '../../answer-question.js';
import { GatewayError } from '../../gateway-error.js';
import { mapSeamFailure } from '../route-error.js';
import { optionalCollectionIds, requireRouteBody } from '../request-body.js';

export function createAnswerRoutes({ storage, embed, chat, answer_model, model_call }) {
  return [{
    method: 'POST',
    path: '/v1/answers',
    handler: async ({ body, owner_id, request_id }) => {
      const input = requireRouteBody(body);
      try {
        if (chat === undefined || answer_model === undefined) {
          throw new GatewayError(503, 'answers_unavailable', 'No answer model is configured');
        }
        const callChat = model_call === undefined
          ? chat
          : (input) => model_call({ kind: 'chat', chat, input, owner_id, request_id });
        return {
          status: 200,
          body: await answerQuestion({
            storage,
            chat: callChat,
            embed,
            question: input.question,
            owner_id,
            collection_ids: optionalCollectionIds(input),
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

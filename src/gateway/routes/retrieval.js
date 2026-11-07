import { describeRetrievalMode } from '../../index.js';
import { GatewayError } from '../../gateway-error.js';
import { mapSeamFailure } from '../route-error.js';
import { optionalCollectionIds, requireRouteBody } from '../request-body.js';

export function createRetrievalRoutes({ storage, embed, model_call }) {
  return [{
    method: 'POST',
    path: '/v1/retrieval/query',
    handler: async ({ body, owner_id, request_id }) => {
      const input = requireRouteBody(body);
      try {
        const mode = input.mode ?? 'lexical';
        const collection_ids = optionalCollectionIds(input);
        const limit = input.limit;
        if (mode === 'lexical') {
          const matches = await storage.searchSegmentsLexical({
            query: input.query,
            owner_id,
            limit: limit ?? 20,
            collection_ids
          });
          return { status: 200, body: { retrieval: describeRetrievalMode(matches), matches } };
        }
        if (mode !== 'hybrid') {
          throw new GatewayError(400, 'invalid_request', 'mode must be lexical or hybrid');
        }
        const model_id = input.model_id;
        if (typeof model_id !== 'string' || model_id === '') {
          throw new GatewayError(400, 'invalid_request', 'model_id is required for hybrid retrieval');
        }
        let query_embedding = input.query_embedding;
        if (query_embedding === undefined) {
          if (embed === undefined) {
            throw new GatewayError(400, 'invalid_request', 'query_embedding is required when no embedder is configured');
          }
          const model = await storage.getEmbeddingModel(model_id);
          if (model === null) {
            throw new GatewayError(400, 'invalid_request', 'model_id is not registered');
          }
          const vectors = model_call === undefined
            ? await embed({ model_id, dimensions: model.dimensions, inputs: [input.query] })
            : await model_call({
              kind: 'embedding',
              chat: embed,
              input: { model_id, dimensions: model.dimensions, inputs: [input.query] },
              owner_id,
              request_id
            });
          query_embedding = vectors[0];
        }
        const matches = await storage.searchSegmentsHybrid({
          query: input.query,
          query_embedding,
          model_id,
          owner_id,
          limit: limit ?? 20,
          collection_ids
        });
        return { status: 200, body: { retrieval: describeRetrievalMode(matches, { model_id }), matches } };
      } catch (error) {
        throw mapSeamFailure(error) ?? error;
      }
    }
  }];
}

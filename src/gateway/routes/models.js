import { mapSeamFailure } from '../route-error.js';

export function createModelRoutes({ storage }) {
  return [{
    method: 'GET',
    path: '/v1/models',
    handler: async ({ query, owner_id }) => {
      try {
        const models = await storage.listEmbeddingModels();
        const requested = query.get('model_id');
        const payload = { models };
        if (requested !== null) {
          payload.coverage = await storage.inspectEmbeddingCoverage({ model_id: requested, owner_id });
        }
        return { status: 200, body: payload };
      } catch (error) {
        throw mapSeamFailure(error) ?? error;
      }
    }
  }];
}

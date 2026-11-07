import { GatewayError } from '../../gateway-error.js';
import { mapSeamFailure } from '../route-error.js';
import { requireRouteBody } from '../request-body.js';

const MAX_CITATION_BATCH = 100;

export function createCitationRoutes({ storage }) {
  return [{
    method: 'POST',
    path: '/v1/citations/resolve',
    handler: async ({ body, owner_id }) => {
      const input = requireRouteBody(body);
      try {
        if (!Array.isArray(input.citations) || input.citations.length === 0 || input.citations.length > MAX_CITATION_BATCH) {
          throw new GatewayError(400, 'invalid_request', `citations must be an array of 1 to ${MAX_CITATION_BATCH} entries`);
        }
        const result = await storage.revalidateCitations(input.citations, { owner_id });
        return { status: 200, body: result };
      } catch (error) {
        throw mapSeamFailure(error) ?? error;
      }
    }
  }];
}

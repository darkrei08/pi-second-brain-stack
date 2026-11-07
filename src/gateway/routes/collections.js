import { GatewayError } from '../../gateway-error.js';
import { DOCUMENT_ID_PATTERN, OPAQUE_ID_PATTERN } from '../../opaque-id.js';
import { mapSeamFailure } from '../route-error.js';
import { optionalCollectionIds, requireRouteBody } from '../request-body.js';

const MAX_COLLECTION_SUGGESTIONS = 50;

function requireDocumentId(value) {
  if (typeof value !== 'string' || !DOCUMENT_ID_PATTERN.test(value)) {
    throw new GatewayError(400, 'invalid_request', 'document_id must be an opaque document id');
  }
  return value;
}

export function createCollectionRoutes({ storage }) {
  return [
    {
      method: 'POST',
      path: '/v1/documents/collections/suggest',
      handler: async ({ body, owner_id }) => {
        const input = requireRouteBody(body);
        try {
          const document_id = requireDocumentId(input.document_id);
          const max_collections = input.max_collections;
          if (max_collections !== undefined
            && (!Number.isInteger(max_collections) || max_collections < 1 || max_collections > MAX_COLLECTION_SUGGESTIONS)) {
            throw new GatewayError(400, 'invalid_request', `max_collections must be an integer between 1 and ${MAX_COLLECTION_SUGGESTIONS}`);
          }
          return {
            status: 200,
            body: {
              document_id,
              candidates: await storage.suggestDocumentCollections({ document_id, owner_id, max_collections })
            }
          };
        } catch (error) {
          throw mapSeamFailure(error) ?? error;
        }
      }
    },
    {
      method: 'POST',
      path: '/v1/documents/collections/move',
      handler: async ({ body, owner_id }) => {
        const input = requireRouteBody(body);
        try {
          const document_id = requireDocumentId(input.document_id);
          if (typeof input.collection_id !== 'string' || !OPAQUE_ID_PATTERN.test(input.collection_id)) {
            throw new GatewayError(400, 'invalid_request', 'collection_id must be an opaque collection id');
          }
          const collection_id = input.collection_id;
          await storage.moveDocumentCollection({ document_id, owner_id, collection_id });
          // Report the committed membership rather than the requested one.
          return {
            status: 200,
            body: { document_id, collections: await storage.listDocumentCollections(document_id, owner_id) }
          };
        } catch (error) {
          throw mapSeamFailure(error) ?? error;
        }
      }
    },
    {
      method: 'POST',
      path: '/v1/documents/collections/confirm',
      handler: async ({ body, owner_id }) => {
        const input = requireRouteBody(body);
        try {
          const document_id = requireDocumentId(input.document_id);
          const collection_ids = optionalCollectionIds(input);
          if (collection_ids === undefined) {
            throw new GatewayError(400, 'invalid_request', 'collection_ids must be a non-empty array');
          }
          return {
            status: 200,
            body: { document_id, collections: await storage.confirmDocumentCollections({ document_id, owner_id, collection_ids }) }
          };
        } catch (error) {
          throw mapSeamFailure(error) ?? error;
        }
      }
    }
  ];
}

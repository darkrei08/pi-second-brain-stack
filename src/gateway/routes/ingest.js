import { segmentDocument } from '../../index.js';
import { mapSeamFailure } from '../route-error.js';
import { rejectCallerOwner, requireObject, requireRouteBody } from '../request-body.js';

export function createIngestRoutes({ storage }) {
  return [{
    method: 'POST',
    path: '/v1/documents/ingest',
    handler: async ({ body, owner_id }) => {
      const input = requireRouteBody(body);
      try {
        const document = requireObject(input.document, 'document');
        rejectCallerOwner(document);
        if (document.retention !== undefined) {
          requireObject(document.retention, 'document.retention');
          rejectCallerOwner(document.retention);
        }
        const owned = Object.freeze({ ...document, retention: { owner_id, state: 'active' } });
        const result = segmentDocument(owned, { max_segment_chars: input.max_segment_chars ?? 1200 });
        await storage.saveDocumentAndSegments(owned, result);
        return {
          status: 200,
          body: {
            document_id: owned.document_id,
            collections: await storage.listDocumentCollections(owned.document_id, owner_id),
            segments: result.segments.length
          }
        };
      } catch (error) {
        throw mapSeamFailure(error) ?? error;
      }
    }
  }];
}

import { createHash } from 'node:crypto';

import { normalizeParserOutput, segmentDocument } from '../../index.js';
import { GatewayError } from '../../gateway-error.js';
import { mapSeamFailure } from '../route-error.js';
import { requireRouteBody } from '../request-body.js';

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/u;
const MEDIA_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'image/webp']);
const DEFAULT_MAX_SEGMENT_CHARS = 1200;

function requireFilename(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GatewayError(400, 'invalid_request', 'filename must be non-empty text');
  }
  if (/[/\\\u0000-\u001f\u007f]/u.test(value) || value !== value.trim() || value.includes('..')) {
    throw new GatewayError(400, 'invalid_request', 'filename must be a bare file name');
  }
  return value;
}

function requireMediaType(value) {
  if (typeof value !== 'string' || !MEDIA_TYPES.has(value)) {
    throw new GatewayError(415, 'unsupported_media_type', `media_type must be one of ${[...MEDIA_TYPES].join(', ')}`);
  }
  return value;
}

function requireDocumentBytes(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) {
    throw new GatewayError(400, 'invalid_request', 'content_base64 must be padded base64 text');
  }
  return Buffer.from(value, 'base64');
}

export function createParseRoutes({ storage, parser }) {
  return [{
    method: 'POST',
    path: '/v1/documents/parse',
    handler: async ({ body, owner_id }) => {
      const input = requireRouteBody(body);
      const filename = requireFilename(input.filename);
      requireMediaType(input.media_type);
      const bytes = requireDocumentBytes(input.content_base64);
      if (parser === undefined) {
        throw new GatewayError(503, 'parser_unavailable', 'No parser engine is configured');
      }
      const hash = createHash('sha256').update(bytes).digest('hex');
      try {
        const parsed = await parser({ filename, content_base64: input.content_base64 });
        let document;
        try {
          document = normalizeParserOutput({
            parser_type: parsed?.parser_type,
            raw_json: parsed?.raw_json,
            envelope: {
              document_id: `urn:document:${hash}`,
              source_label: filename,
              source_hash: `sha256:${hash}`,
              lineage: { parser: parsed?.parser_type, model: null },
              created_at: new Date().toISOString(),
              retention: { owner_id, state: 'active' }
            }
          });
        } catch {
          // The caller's own fields are validated above, so a rejection here came from the engine output.
          throw new GatewayError(502, 'parser_failed', 'The parser engine output could not be normalized');
        }
        const result = segmentDocument(document, { max_segment_chars: input.max_segment_chars ?? DEFAULT_MAX_SEGMENT_CHARS });
        await storage.saveDocumentAndSegments(document, result);
        // The route stores in this process; it never calls its own ingest route.
        return {
          status: 200,
          body: {
            document_id: document.document_id,
            collections: await storage.listDocumentCollections(document.document_id, owner_id),
            segments: result.segments.length
          }
        };
      } catch (error) {
        throw mapSeamFailure(error) ?? error;
      }
    }
  }];
}

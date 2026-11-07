import { GatewayError } from '../gateway-error.js';

export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const JSON_CONTENT_TYPE = /^application\/json(?:;|$)/iu;

function requireJsonBody(request) {
  const contentType = request.headers['content-type'];
  if (typeof contentType !== 'string' || !JSON_CONTENT_TYPE.test(contentType)) {
    throw new GatewayError(415, 'unsupported_media_type', 'Content-Type must be application/json');
  }
}

export async function readJsonBody(request, limit) {
  requireJsonBody(request);
  const declared = request.headers['content-length'];
  if (declared !== undefined) {
    if (!/^\d+$/u.test(declared)) {
      throw new GatewayError(400, 'invalid_request', 'Content-Length must be a byte count');
    }
    if (Number(declared) > limit) {
      throw new GatewayError(413, 'body_too_large', `The body exceeds ${limit} bytes`);
    }
  }
  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > limit) {
      throw new GatewayError(413, 'body_too_large', `The body exceeds ${limit} bytes`);
    }
    chunks.push(chunk);
  }
  if (received === 0) {
    throw new GatewayError(400, 'invalid_json', 'A JSON body is required');
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new GatewayError(400, 'invalid_json', 'The body is not valid JSON');
  }
}

export function requireObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new GatewayError(400, 'invalid_request', `${name} must be an object`);
  }
  return value;
}

export function rejectCallerOwner(body) {
  if (Object.hasOwn(body, 'owner_id')) {
    throw new GatewayError(400, 'invalid_request', 'owner_id is derived from the authenticated caller');
  }
}

export function requireRouteBody(value) {
  const body = requireObject(value, 'body');
  rejectCallerOwner(body);
  return body;
}

export function optionalCollectionIds(body) {
  if (body.collection_ids === undefined) return undefined;
  if (!Array.isArray(body.collection_ids) || body.collection_ids.length === 0) {
    throw new GatewayError(400, 'invalid_request', 'collection_ids must be a non-empty array');
  }
  return body.collection_ids;
}

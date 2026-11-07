import { GatewayError } from '../gateway-error.js';

const SEAM_FAILURES = [
  { pattern: /^embedding model is not registered$/u, status: 400, code: 'invalid_request' },
  { pattern: /^unknown or foreign collection for this owner$/u, status: 400, code: 'invalid_request' },
  { pattern: /^document belongs to a different owner$/u, status: 409, code: 'conflict' },
  { pattern: /^document not found for this owner$/u, status: 404, code: 'not_found' },
  { pattern: /^chat request timed out$/u, status: 504, code: 'model_timeout' },
  { pattern: /^chat request failed/u, status: 502, code: 'model_failed' },
  { pattern: /^chat response /u, status: 502, code: 'model_failed' },
  { pattern: /^embedding request timed out$/u, status: 504, code: 'model_timeout' },
  { pattern: /^embedding request failed/u, status: 502, code: 'model_failed' },
  { pattern: /^embedding response /u, status: 502, code: 'model_failed' },
  { pattern: /^parser engine request timed out$/u, status: 504, code: 'parser_timeout' },
  { pattern: /^parser engine request failed/u, status: 502, code: 'parser_failed' },
  { pattern: /^parser engine response /u, status: 502, code: 'parser_failed' }
];

export function mapSeamFailure(error) {
  if (!(error instanceof Error)) return null;
  for (const failure of SEAM_FAILURES) {
    if (failure.pattern.test(error.message)) {
      return new GatewayError(failure.status, failure.code, error.message);
    }
  }
  return null;
}

import { timingSafeEqual } from 'node:crypto';

import { GatewayError } from './gateway-error.js';
import { OPAQUE_ID_PATTERN } from './opaque-id.js';

const AUTHORIZATION_PATTERN = /^Bearer (.+)$/u;

function unauthorized() {
  // NOTE: a missing token and a wrong token share one response so a probe cannot learn which one it sent.
  return new GatewayError(401, 'unauthorized', 'Authentication required');
}

function tokenMatches(expected, presented) {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const presentedBytes = Buffer.from(presented, 'utf8');
  // NOTE: a length mismatch returns early; the length is not secret and both paths answer the same 401.
  if (expectedBytes.length !== presentedBytes.length) return false;
  return timingSafeEqual(expectedBytes, presentedBytes);
}

function parsePrincipals(principals) {
  if (!Array.isArray(principals) || principals.length === 0) {
    throw new TypeError('principals must be an array of { token, owner_id }');
  }
  const seen = new Set();
  return principals.map((principal) => {
    if (principal === null || typeof principal !== 'object') {
      throw new TypeError('principals must be an array of { token, owner_id }');
    }
    const { token, owner_id } = principal;
    if (typeof token !== 'string' || token.length === 0 || typeof owner_id !== 'string' || !OPAQUE_ID_PATTERN.test(owner_id) || seen.has(token)) {
      throw new TypeError('principals must be an array of { token, owner_id }');
    }
    seen.add(token);
    return Object.freeze({ token, owner_id });
  });
}

export function createAuthenticator({ token, owner_id, shell_users = {}, shell_mapping_trusted = false, principals } = {}) {
  const directory = principals === undefined ? undefined : parsePrincipals(principals);
  if (directory !== undefined) {
    if (token !== undefined || owner_id !== undefined || Object.keys(shell_users).length > 0) {
      throw new TypeError('principals cannot be combined with legacy gateway credentials');
    }
  } else {
    if (typeof token !== 'string' || token.length === 0) throw new TypeError('token must be a non-empty string');
    if (typeof owner_id !== 'string' || !OPAQUE_ID_PATTERN.test(owner_id)) throw new TypeError('owner_id must be opaque');
  }
  const mapping = Object.assign(Object.create(null), shell_users);
  if (directory === undefined && !shell_mapping_trusted && Object.values(mapping).some((mappedOwner) => mappedOwner !== owner_id)) {
    throw new TypeError('shell_users must bind to owner_id unless shell_mapping_trusted is true');
  }
  const mapped = Object.keys(mapping).length > 0;

  return Object.freeze({
    owner_id,
    authenticate(headers = {}) {
      const header = headers.authorization;
      const match = typeof header === 'string' ? AUTHORIZATION_PATTERN.exec(header) : null;
      if (match === null) throw unauthorized();
      if (directory !== undefined) {
        let resolved;
        for (const principal of directory) {
          if (tokenMatches(principal.token, match[1])) resolved = principal.owner_id;
        }
        if (resolved === undefined) throw unauthorized();
        return { owner_id: resolved };
      }
      if (!tokenMatches(token, match[1])) throw unauthorized();
      if (!mapped) return { owner_id };
      const shell_user_id = headers['x-shell-user-id'];
      if (typeof shell_user_id !== 'string' || !Object.hasOwn(mapping, shell_user_id)) {
        throw new GatewayError(403, 'unknown_identity', 'The caller identity is not mapped');
      }
      return { owner_id: shell_mapping_trusted ? mapping[shell_user_id] : owner_id };
    }
  });
}

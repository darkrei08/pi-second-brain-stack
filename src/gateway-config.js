import { OPAQUE_ID_PATTERN } from './opaque-id.js';

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 8080;
export const MINIMUM_TOKEN_LENGTH = 32;
export const DEFAULT_REQUESTS_PER_MINUTE = 60;
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 8;

function requireEnv(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be set`);
  }
  return value;
}

function parsePositiveInteger(value, name, default_value) {
  if (value === undefined) return default_value;
  if (!/^\d+$/u.test(value) || Number(value) < 1) {
    throw new TypeError(`${name} must be a positive integer`);
  }
  return Number(value);
}

function parsePort(value) {
  const port = parsePositiveInteger(value, 'GATEWAY_PORT', DEFAULT_PORT);
  if (port > 65535) {
    throw new TypeError('GATEWAY_PORT must be an integer between 1 and 65535');
  }
  return port;
}

function optionalEnv(env, name) {
  const value = env[name];
  return value === undefined || value === '' ? undefined : requireEnv(env, name);
}

function parseShellUsers(value) {
  if (value === undefined) return {};
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new TypeError('GATEWAY_SHELL_USERS must be a JSON object of shell user to owner id');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('GATEWAY_SHELL_USERS must be a JSON object of shell user to owner id');
  }
  const mapping = {};
  for (const [shell_user_id, owner_id] of Object.entries(parsed)) {
    if (!OPAQUE_ID_PATTERN.test(shell_user_id) || typeof owner_id !== 'string' || !OPAQUE_ID_PATTERN.test(owner_id)) {
      throw new TypeError('GATEWAY_SHELL_USERS must be a JSON object of shell user to owner id');
    }
    mapping[shell_user_id] = owner_id;
  }
  return mapping;
}

export function loadGatewayConfig(env = process.env) {
  const token = requireEnv(env, 'GATEWAY_TOKEN');
  if (token.length < MINIMUM_TOKEN_LENGTH) {
    throw new TypeError(`GATEWAY_TOKEN must be at least ${MINIMUM_TOKEN_LENGTH} characters`);
  }
  const database_url = requireEnv(env, 'DATABASE_URL');
  const owner_id = requireEnv(env, 'GATEWAY_OWNER_ID');
  if (!OPAQUE_ID_PATTERN.test(owner_id)) {
    throw new TypeError('GATEWAY_OWNER_ID must be opaque');
  }
  const tls_cert_file = optionalEnv(env, 'GATEWAY_TLS_CERT_FILE');
  const tls_key_file = optionalEnv(env, 'GATEWAY_TLS_KEY_FILE');
  if ((tls_cert_file === undefined) !== (tls_key_file === undefined)) {
    throw new TypeError('GATEWAY_TLS_CERT_FILE and GATEWAY_TLS_KEY_FILE must be configured together');
  }
  const config = {
    host: env.GATEWAY_HOST === undefined ? DEFAULT_HOST : requireEnv(env, 'GATEWAY_HOST'),
    port: parsePort(env.GATEWAY_PORT),
    owner_id,
    shell_users: parseShellUsers(env.GATEWAY_SHELL_USERS),
    database_url,
    tls_cert_file,
    tls_key_file,
    requests_per_minute: parsePositiveInteger(env.GATEWAY_REQUESTS_PER_MINUTE, 'GATEWAY_REQUESTS_PER_MINUTE', DEFAULT_REQUESTS_PER_MINUTE),
    max_concurrent_requests: parsePositiveInteger(env.GATEWAY_MAX_CONCURRENT_REQUESTS, 'GATEWAY_MAX_CONCURRENT_REQUESTS', DEFAULT_MAX_CONCURRENT_REQUESTS)
  };
  // The token is not enumerable, so a logged config can never carry it.
  Object.defineProperty(config, 'token', { value: token, enumerable: false });
  return Object.freeze(config);
}

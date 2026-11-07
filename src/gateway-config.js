import { OPAQUE_ID_PATTERN } from './opaque-id.js';

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 8080;
export const MINIMUM_TOKEN_LENGTH = 32;
export const DEFAULT_REQUESTS_PER_MINUTE = 60;
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 8;
export const DEFAULT_MODEL_CONCURRENCY = 3;
export const DEFAULT_MODEL_REQUESTS_PER_MINUTE = 60;
export const DEFAULT_PARSER_ENGINE_TIMEOUT_MS = 60000;

const HOSTNAME_PATTERN = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?$/u;

function requireEnv(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be set`);
  }
  return value;
}

function parsePositiveInteger(value, name, default_value, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return default_value;
  if (!/^\d+$/u.test(value) || Number(value) < 1 || Number(value) > maximum) {
    throw new TypeError(`${name} must be an integer between 1 and ${maximum}`);
  }
  return Number(value);
}

export function parseAllowedHosts(value, name) {
  if (value === undefined || value.trim() === '') return Object.freeze([]);
  return Object.freeze(value.split(',').map((entry) => {
    const hostname = entry.trim().toLowerCase();
    if (!HOSTNAME_PATTERN.test(hostname)) {
      throw new TypeError(`${name} contains an invalid hostname entry: ${JSON.stringify(entry.trim())}`);
    }
    return hostname.replace(/\.$/u, '');
  }).filter((hostname, index, hosts) => hosts.indexOf(hostname) === index));
}

function parsePort(value) {
  const port = parsePositiveInteger(value, 'GATEWAY_PORT', DEFAULT_PORT, 65535);
  return port;
}

function optionalEnv(env, name) {
  const value = env[name];
  return value === undefined || value === '' ? undefined : requireEnv(env, name);
}

function parseBoolean(value, name, default_value = false) {
  if (value === undefined) return default_value;
  if (value !== 'true' && value !== 'false') throw new TypeError(`${name} must be true or false`);
  return value === 'true';
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

function parsePrincipals(value) {
  const refuse = () => new TypeError(
    'GATEWAY_PRINCIPALS must be a JSON array of { token, owner_id } with a token of at least 32 characters'
  );
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw refuse();
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw refuse();
  const seen = new Set();
  return parsed.map((entry) => {
    if (entry === null || typeof entry !== 'object') throw refuse();
    const { token, owner_id } = entry;
    if (typeof token !== 'string' || token.length < MINIMUM_TOKEN_LENGTH
      || typeof owner_id !== 'string' || !OPAQUE_ID_PATTERN.test(owner_id) || seen.has(token)) {
      throw refuse();
    }
    seen.add(token);
    const principal = { owner_id };
    Object.defineProperty(principal, 'token', { value: token, enumerable: false });
    return Object.freeze(principal);
  });
}

function commonConfig(env, database_url) {
  return {
    host: env.GATEWAY_HOST === undefined ? DEFAULT_HOST : requireEnv(env, 'GATEWAY_HOST'),
    port: parsePort(env.GATEWAY_PORT),
    answer_allowed_hosts: parseAllowedHosts(env.ANSWER_ALLOWED_HOSTS, 'ANSWER_ALLOWED_HOSTS'),
    embedding_allowed_hosts: parseAllowedHosts(env.EMBEDDING_ALLOWED_HOSTS, 'EMBEDDING_ALLOWED_HOSTS'),
    parser_engine_base_url: optionalEnv(env, 'PARSER_ENGINE_BASE_URL'),
    parser_engine_allowed_hosts: parseAllowedHosts(env.PARSER_ENGINE_ALLOWED_HOSTS, 'PARSER_ENGINE_ALLOWED_HOSTS'),
    parser_engine_timeout_ms: parsePositiveInteger(env.PARSER_ENGINE_TIMEOUT_MS, 'PARSER_ENGINE_TIMEOUT_MS', DEFAULT_PARSER_ENGINE_TIMEOUT_MS, 600000),
    max_model_concurrency: parsePositiveInteger(env.GATEWAY_MODEL_CONCURRENCY, 'GATEWAY_MODEL_CONCURRENCY', DEFAULT_MODEL_CONCURRENCY, 64),
    model_requests_per_minute: parsePositiveInteger(env.GATEWAY_MODEL_REQUESTS_PER_MINUTE, 'GATEWAY_MODEL_REQUESTS_PER_MINUTE', DEFAULT_MODEL_REQUESTS_PER_MINUTE, 60000),
    requests_per_minute: parsePositiveInteger(env.GATEWAY_REQUESTS_PER_MINUTE, 'GATEWAY_REQUESTS_PER_MINUTE', DEFAULT_REQUESTS_PER_MINUTE),
    max_concurrent_requests: parsePositiveInteger(env.GATEWAY_MAX_CONCURRENT_REQUESTS, 'GATEWAY_MAX_CONCURRENT_REQUESTS', DEFAULT_MAX_CONCURRENT_REQUESTS),
    tls_cert_file: optionalEnv(env, 'GATEWAY_TLS_CERT_FILE'),
    tls_key_file: optionalEnv(env, 'GATEWAY_TLS_KEY_FILE'),
    database_url
  };
}

function validateTls(config) {
  if ((config.tls_cert_file === undefined) !== (config.tls_key_file === undefined)) {
    throw new TypeError('GATEWAY_TLS_CERT_FILE and GATEWAY_TLS_KEY_FILE must be configured together');
  }
  return config;
}

export function loadGatewayConfig(env = process.env) {
  const database_url = requireEnv(env, 'DATABASE_URL');
  if (typeof env.GATEWAY_PRINCIPALS === 'string' && env.GATEWAY_PRINCIPALS.trim() !== '') {
    for (const legacy of ['GATEWAY_TOKEN', 'GATEWAY_OWNER_ID', 'GATEWAY_SHELL_USERS']) {
      const value = env[legacy];
      if (typeof value === 'string' && value.trim() !== '' && !(legacy === 'GATEWAY_SHELL_USERS' && value.trim() === '{}')) {
        throw new TypeError(`GATEWAY_PRINCIPALS cannot be combined with ${legacy}`);
      }
    }
    return Object.freeze({
      ...validateTls(commonConfig(env, database_url)),
      principals: Object.freeze(parsePrincipals(env.GATEWAY_PRINCIPALS)),
      shell_users: Object.freeze({}),
      shell_mapping_trusted: false
    });
  }

  const token = requireEnv(env, 'GATEWAY_TOKEN');
  if (token.length < MINIMUM_TOKEN_LENGTH) {
    throw new TypeError(`GATEWAY_TOKEN must be at least ${MINIMUM_TOKEN_LENGTH} characters`);
  }
  const owner_id = requireEnv(env, 'GATEWAY_OWNER_ID');
  if (!OPAQUE_ID_PATTERN.test(owner_id)) {
    throw new TypeError('GATEWAY_OWNER_ID must be opaque');
  }
  const shell_users = parseShellUsers(env.GATEWAY_SHELL_USERS);
  const shell_mapping_trusted = parseBoolean(env.GATEWAY_SHELL_MAPPING_TRUSTED, 'GATEWAY_SHELL_MAPPING_TRUSTED');
  if (!shell_mapping_trusted && Object.values(shell_users).some((mappedOwner) => mappedOwner !== owner_id)) {
    throw new TypeError('GATEWAY_SHELL_USERS must bind every shell user to GATEWAY_OWNER_ID unless GATEWAY_SHELL_MAPPING_TRUSTED=true');
  }
  const config = {
    ...validateTls(commonConfig(env, database_url)),
    owner_id,
    shell_users,
    shell_mapping_trusted
  };
  Object.defineProperty(config, 'token', { value: token, enumerable: false });
  return Object.freeze(config);
}

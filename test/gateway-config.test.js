import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadGatewayConfig,
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_MODEL_CONCURRENCY,
  DEFAULT_MODEL_REQUESTS_PER_MINUTE,
  DEFAULT_PARSER_ENGINE_TIMEOUT_MS
} from '../src/gateway-config.js';

const baseEnv = {
  GATEWAY_TOKEN: 'a'.repeat(32),
  DATABASE_URL: 'postgres://operator@127.0.0.1:55432/rag',
  GATEWAY_OWNER_ID: 'operator-owner'
};

test('loads the documented defaults and requires the token, database, and owner', () => {
  const config = loadGatewayConfig(baseEnv);
  assert.equal(config.host, DEFAULT_HOST);
  assert.equal(config.port, DEFAULT_PORT);
  assert.equal(config.owner_id, 'operator-owner');
  assert.deepEqual(config.shell_users, {});
  assert.equal(config.shell_mapping_trusted, false);
  assert.deepEqual(config.answer_allowed_hosts, []);
  assert.deepEqual(config.embedding_allowed_hosts, []);
  assert.equal(config.max_model_concurrency, DEFAULT_MODEL_CONCURRENCY);
  assert.equal(config.model_requests_per_minute, DEFAULT_MODEL_REQUESTS_PER_MINUTE);
  assert.equal(DEFAULT_HOST, '127.0.0.1');

  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_TOKEN: undefined }), /GATEWAY_TOKEN/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_TOKEN: 'short' }), /GATEWAY_TOKEN/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, DATABASE_URL: undefined }), /DATABASE_URL/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_OWNER_ID: undefined }), /GATEWAY_OWNER_ID/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_OWNER_ID: '../other-owner' }), /GATEWAY_OWNER_ID/);
});

test('parses the port, the host override, and the shell-user mapping strictly', () => {
  const configured = loadGatewayConfig({
    ...baseEnv,
    GATEWAY_HOST: '127.0.0.1',
    GATEWAY_PORT: '9443',
    GATEWAY_SHELL_USERS: JSON.stringify({ 'shell-one': 'owner-one', 'shell-two': 'owner-two' }),
    GATEWAY_SHELL_MAPPING_TRUSTED: 'true'
  });
  assert.equal(configured.port, 9443);
  assert.equal(configured.host, '127.0.0.1');
  assert.deepEqual(configured.shell_users, { 'shell-one': 'owner-one', 'shell-two': 'owner-two' });
  assert.equal(configured.shell_mapping_trusted, true);

  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_PORT: '0' }), /GATEWAY_PORT/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_PORT: '65536' }), /GATEWAY_PORT/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_PORT: 'eighty' }), /GATEWAY_PORT/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_SHELL_USERS: 'not-json' }), /GATEWAY_SHELL_USERS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_SHELL_USERS: '["shell-one"]' }), /GATEWAY_SHELL_USERS/);
  assert.throws(
    () => loadGatewayConfig({ ...baseEnv, GATEWAY_SHELL_USERS: JSON.stringify({ 'shell-one': '../other-owner' }) }),
    /GATEWAY_SHELL_USERS/
  );
  assert.throws(
    () => loadGatewayConfig({ ...baseEnv, GATEWAY_SHELL_USERS: JSON.stringify({ '../shell': 'operator-owner' }) }),
    /GATEWAY_SHELL_USERS/
  );
  assert.throws(
    () => loadGatewayConfig({ ...baseEnv, GATEWAY_SHELL_USERS: JSON.stringify({ 'shell-one': 'owner-one' }) }),
    /GATEWAY_SHELL_USERS.*bind/
  );
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_SHELL_MAPPING_TRUSTED: 'yes' }), /GATEWAY_SHELL_MAPPING_TRUSTED/);
});

test('loads provider allowlists, principal credentials, and model limits', () => {
  const principals = JSON.stringify([
    { token: 'p'.repeat(32), owner_id: 'owner-one' },
    { token: 'q'.repeat(32), owner_id: 'owner-two' }
  ]);
  const config = loadGatewayConfig({
    DATABASE_URL: baseEnv.DATABASE_URL,
    GATEWAY_PRINCIPALS: principals,
    ANSWER_ALLOWED_HOSTS: 'Models.Example.com, models.example.com.',
    EMBEDDING_ALLOWED_HOSTS: 'embeddings.example.com',
    GATEWAY_MODEL_CONCURRENCY: '4',
    GATEWAY_MODEL_REQUESTS_PER_MINUTE: '90'
  });
  assert.equal(config.token, undefined);
  assert.deepEqual(config.principals.map(({ owner_id }) => owner_id), ['owner-one', 'owner-two']);
  assert.deepEqual(config.answer_allowed_hosts, ['models.example.com']);
  assert.deepEqual(config.embedding_allowed_hosts, ['embeddings.example.com']);
  assert.equal(config.max_model_concurrency, 4);
  assert.equal(config.model_requests_per_minute, 90);

  assert.throws(() => loadGatewayConfig({ ...baseEnv, ANSWER_ALLOWED_HOSTS: 'https://models.example.com' }), /ANSWER_ALLOWED_HOSTS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, EMBEDDING_ALLOWED_HOSTS: 'bad host' }), /EMBEDDING_ALLOWED_HOSTS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_MODEL_CONCURRENCY: '0' }), /GATEWAY_MODEL_CONCURRENCY/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_MODEL_REQUESTS_PER_MINUTE: '60001' }), /GATEWAY_MODEL_REQUESTS_PER_MINUTE/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_PRINCIPALS: 'not-json' }), /GATEWAY_PRINCIPALS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_PRINCIPALS: JSON.stringify([{ token: 'short', owner_id: 'owner-one' }]) }), /GATEWAY_PRINCIPALS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_PRINCIPALS: principals }), /cannot be combined/);
});

test('loads the parser engine endpoint, allowlist, and timeout as deployment settings', () => {
  const unconfigured = loadGatewayConfig(baseEnv);
  assert.equal(unconfigured.parser_engine_base_url, undefined);
  assert.deepEqual(unconfigured.parser_engine_allowed_hosts, []);
  assert.equal(unconfigured.parser_engine_timeout_ms, DEFAULT_PARSER_ENGINE_TIMEOUT_MS);

  const config = loadGatewayConfig({
    ...baseEnv,
    PARSER_ENGINE_BASE_URL: 'http://127.0.0.1:5001',
    PARSER_ENGINE_ALLOWED_HOSTS: 'parser.internal',
    PARSER_ENGINE_TIMEOUT_MS: '45000'
  });
  assert.equal(config.parser_engine_base_url, 'http://127.0.0.1:5001');
  assert.deepEqual(config.parser_engine_allowed_hosts, ['parser.internal']);
  assert.equal(config.parser_engine_timeout_ms, 45000);

  assert.throws(() => loadGatewayConfig({ ...baseEnv, PARSER_ENGINE_TIMEOUT_MS: '0' }), /PARSER_ENGINE_TIMEOUT_MS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, PARSER_ENGINE_TIMEOUT_MS: '600001' }), /PARSER_ENGINE_TIMEOUT_MS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, PARSER_ENGINE_ALLOWED_HOSTS: 'bad host' }), /PARSER_ENGINE_ALLOWED_HOSTS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, PARSER_ENGINE_BASE_URL: ' ' }), /PARSER_ENGINE_BASE_URL/);
});

test('loads optional TLS paths and quota limits as deployment settings', () => {
  const config = loadGatewayConfig({
    ...baseEnv,
    GATEWAY_TLS_CERT_FILE: '/run/gateway/tls/cert.pem',
    GATEWAY_TLS_KEY_FILE: '/run/gateway/tls/key.pem',
    GATEWAY_REQUESTS_PER_MINUTE: '90',
    GATEWAY_MAX_CONCURRENT_REQUESTS: '4'
  });
  assert.equal(config.tls_cert_file, '/run/gateway/tls/cert.pem');
  assert.equal(config.tls_key_file, '/run/gateway/tls/key.pem');
  assert.equal(config.requests_per_minute, 90);
  assert.equal(config.max_concurrent_requests, 4);

  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_TLS_CERT_FILE: '/tmp/cert.pem' }), /TLS/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_MAX_CONCURRENT_REQUESTS: '0' }), /MAX_CONCURRENT/);
  assert.throws(() => loadGatewayConfig({ ...baseEnv, GATEWAY_REQUESTS_PER_MINUTE: 'not-an-integer' }), /REQUESTS_PER_MINUTE/);
});

test('refuses a configuration that would log or echo the token', () => {
  const config = loadGatewayConfig(baseEnv);
  assert.equal(JSON.stringify(config).includes(config.token), false);
  assert.equal(String(config).includes(config.token), false);
});

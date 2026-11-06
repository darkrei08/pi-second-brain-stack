import assert from 'node:assert/strict';
import test from 'node:test';

import { loadGatewayConfig, DEFAULT_HOST, DEFAULT_PORT } from '../src/gateway-config.js';

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
    GATEWAY_SHELL_USERS: JSON.stringify({ 'shell-one': 'owner-one', 'shell-two': 'owner-two' })
  });
  assert.equal(configured.port, 9443);
  assert.equal(configured.host, '127.0.0.1');
  assert.deepEqual(configured.shell_users, { 'shell-one': 'owner-one', 'shell-two': 'owner-two' });

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
    () => loadGatewayConfig({ ...baseEnv, GATEWAY_SHELL_USERS: JSON.stringify({ '../shell': 'owner-one' }) }),
    /GATEWAY_SHELL_USERS/
  );
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

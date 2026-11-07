#!/usr/bin/env node

import { readFileSync } from 'node:fs';

import pg from 'pg';

import { createOpenAICompatibleChat, createOpenAICompatibleEmbedder, createParserEngine, createStorage } from './index.js';
import { createAuthenticator } from './gateway-auth.js';
import { loadGatewayConfig } from './gateway-config.js';
import { createGatewayServer } from './gateway-server.js';
import { shutdownGateway } from './gateway-shutdown.js';

let config;
try {
  config = loadGatewayConfig(process.env);
} catch (error) {
  process.stderr.write(`gateway configuration refused: ${error.message}\n`);
  process.exit(1);
}
let tls;
try {
  if (config.tls_cert_file !== undefined) {
    tls = {
      cert: readFileSync(config.tls_cert_file),
      key: readFileSync(config.tls_key_file)
    };
  }
} catch {
  process.stderr.write('gateway TLS configuration refused: certificate or key could not be read\n');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: config.database_url });
const embed = process.env.EMBEDDING_BASE_URL === undefined
  ? undefined
  : createOpenAICompatibleEmbedder({
    base_url: process.env.EMBEDDING_BASE_URL,
    api_key: process.env.EMBEDDING_API_KEY,
    allowed_hosts: config.embedding_allowed_hosts
  });

const chat = process.env.ANSWER_BASE_URL === undefined
  ? undefined
  : createOpenAICompatibleChat({
    base_url: process.env.ANSWER_BASE_URL,
    api_key: process.env.ANSWER_API_KEY,
    allowed_hosts: config.answer_allowed_hosts
  });

const parser = config.parser_engine_base_url === undefined
  ? undefined
  : createParserEngine({
    base_url: config.parser_engine_base_url,
    allowed_hosts: config.parser_engine_allowed_hosts,
    timeout_ms: config.parser_engine_timeout_ms
  });

const gateway = createGatewayServer({
  storage: createStorage({ pool }),
  chat,
  parser,
  answer_model: process.env.ANSWER_MODEL,
  authenticator: config.principals === undefined
    ? createAuthenticator({
      token: config.token,
      owner_id: config.owner_id,
      shell_users: config.shell_users,
      shell_mapping_trusted: config.shell_mapping_trusted
    })
    : createAuthenticator({ principals: config.principals.map(({ token, owner_id }) => ({ token, owner_id })) }),
  audit: (event) => process.stderr.write(`${JSON.stringify({ event: 'gateway_request', ...event })}\n`),
  requests_per_minute: config.requests_per_minute,
  max_concurrent_requests: config.max_concurrent_requests,
  max_model_concurrency: config.max_model_concurrency,
  model_requests_per_minute: config.model_requests_per_minute,
  tls,
  embed
});

const address = await gateway.start({ host: config.host, port: config.port });
process.stdout.write(`${JSON.stringify({ event: 'gateway_listening', ...address })}\n`);

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    await shutdownGateway({ gateway, pool });
  });
}

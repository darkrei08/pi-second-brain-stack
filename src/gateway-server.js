import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';

import { createAnswerRoutes } from './gateway/routes/answers.js';
import { createChatCompletionRoutes } from './gateway/routes/chat-completions.js';
import { createCitationRoutes } from './gateway/routes/citations.js';
import { createCollectionRoutes } from './gateway/routes/collections.js';
import { createHealthRoutes } from './gateway/routes/health.js';
import { createIngestRoutes } from './gateway/routes/ingest.js';
import { createModelRoutes } from './gateway/routes/models.js';
import { createParseRoutes } from './gateway/routes/parse.js';
import { createResearchRoutes } from './gateway/routes/research.js';
import { createRetrievalRoutes } from './gateway/routes/retrieval.js';
import { authenticateRequest } from './gateway/authentication.js';
import { createAuditEmitter } from './gateway/audit.js';
import { DEFAULT_MAX_BODY_BYTES, readJsonBody } from './gateway/request-body.js';
import { createMetrics } from './gateway/metrics.js';
import { createQuota } from './gateway/quota.js';
import { sendResponse } from './gateway/response.js';
import { GatewayError, errorPayload } from './gateway-error.js';

export const MAX_BODY_BYTES = DEFAULT_MAX_BODY_BYTES;

export function createGatewayServer({
  storage,
  authenticator,
  embed,
  chat,
  parser,
  answer_model,
  audit,
  requests_per_minute = 60,
  max_concurrent_requests = 8,
  max_model_concurrency = 3,
  model_requests_per_minute = 60,
  max_body_bytes = MAX_BODY_BYTES,
  tls
} = {}) {
  if (storage === undefined || storage === null) {
    throw new TypeError('storage is required');
  }
  if (authenticator === undefined || authenticator === null || typeof authenticator.authenticate !== 'function') {
    throw new TypeError('authenticator is required');
  }
  if (embed !== undefined && typeof embed !== 'function') {
    throw new TypeError('embed must be a function when provided');
  }
  if (chat !== undefined && typeof chat !== 'function') {
    throw new TypeError('chat must be a function when provided');
  }
  if (parser !== undefined && typeof parser !== 'function') {
    throw new TypeError('parser must be a function when provided');
  }
  if (audit !== undefined && typeof audit !== 'function') {
    throw new TypeError('audit must be a function when provided');
  }
  if (answer_model !== undefined && (typeof answer_model !== 'string' || answer_model.trim() === '')) {
    throw new TypeError('answer_model must be non-empty text when provided');
  }
  if (!Number.isInteger(max_body_bytes) || max_body_bytes < 1) {
    throw new TypeError('max_body_bytes must be a positive integer');
  }
  if (!Number.isInteger(requests_per_minute) || requests_per_minute < 1) {
    throw new TypeError('requests_per_minute must be a positive integer');
  }
  if (!Number.isInteger(max_concurrent_requests) || max_concurrent_requests < 1) {
    throw new TypeError('max_concurrent_requests must be a positive integer');
  }
  if (!Number.isSafeInteger(max_model_concurrency) || max_model_concurrency < 1 || max_model_concurrency > 64) {
    throw new TypeError('max_model_concurrency must be an integer between 1 and 64');
  }
  if (!Number.isSafeInteger(model_requests_per_minute) || model_requests_per_minute < 1 || model_requests_per_minute > 60000) {
    throw new TypeError('model_requests_per_minute must be an integer between 1 and 60000');
  }
  if (tls !== undefined && (tls === null || typeof tls !== 'object'
    || (!Buffer.isBuffer(tls.key) && typeof tls.key !== 'string')
    || (!Buffer.isBuffer(tls.cert) && typeof tls.cert !== 'string'))) {
    throw new TypeError('tls must contain certificate and key text when provided');
  }

  const paths = new Map();
  const metrics = createMetrics({ paths });
  let active_model_requests = 0;
  const ownerModelRequests = new Map();
  const acquireModel = (owner_id) => {
    const now = Date.now();
    for (const [budgetOwner, budget] of ownerModelRequests) {
      if (now - budget.window_started_at >= 60000) ownerModelRequests.delete(budgetOwner);
    }
    const budget = ownerModelRequests.get(owner_id);
    if (active_model_requests >= max_model_concurrency || (budget?.requests ?? 0) >= model_requests_per_minute) {
      throw new GatewayError(429, 'model_busy', 'The model is at capacity; retry the request shortly.');
    }
    active_model_requests += 1;
    if (budget === undefined) ownerModelRequests.set(owner_id, { window_started_at: now, requests: 1 });
    else budget.requests += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active_model_requests -= 1;
    };
  };
  const routeModelCall = async ({ kind, chat: provider, input, owner_id, request_id }) => {
    const release = acquireModel(owner_id);
    const started = Date.now();
    const usage = {};
    let outcome = 'ok';
    try {
      const providerInput = { ...input };
      if (kind === 'chat') {
        providerInput.on_usage = (reported) => {
          for (const field of ['prompt_tokens', 'completion_tokens']) {
            if (Number.isSafeInteger(reported?.[field]) && reported[field] >= 0) usage[field] = reported[field];
          }
          input.on_usage?.(reported);
        };
      } else {
        delete providerInput.on_usage;
      }
      return await provider(providerInput);
    } catch (error) {
      outcome = 'error';
      throw error;
    } finally {
      release();
      emitAudit({
        event: 'model_call',
        request_id,
        kind,
        model_id: input.model_id,
        owner_id,
        outcome,
        duration_ms: Date.now() - started,
        ...usage
      });
    }
  };
  const routeDefinitions = [
    metrics.route(),
    ...createHealthRoutes({ storage, chat, answer_model }),
    ...createRetrievalRoutes({ storage, embed, model_call: routeModelCall }),
    ...createCitationRoutes({ storage }),
    ...createAnswerRoutes({ storage, embed, chat, answer_model, model_call: routeModelCall }),
    ...createResearchRoutes({ storage, embed, chat, answer_model, model_call: routeModelCall }),
    ...createChatCompletionRoutes({ storage, embed, chat, answer_model, model_call: routeModelCall }),
    ...createModelRoutes({ storage }),
    ...createIngestRoutes({ storage }),
    ...createParseRoutes({ storage, parser }),
    ...createCollectionRoutes({ storage })
  ];
  const handlers = new Map();
  for (const { method, path, handler } of routeDefinitions) {
    handlers.set(`${method} ${path}`, handler);
    if (!paths.has(path)) paths.set(path, new Set());
    paths.get(path).add(method);
  }

  const quota = createQuota({ requests_per_minute, max_concurrent_requests });
  const emitAudit = createAuditEmitter(audit);

  async function handle(request, response) {
    const url = new URL(request.url ?? '/', 'http://gateway.invalid');
    // Authenticate before routing so an unauthenticated caller cannot map the route table.
    const identity = authenticateRequest({ request, pathname: url.pathname, authenticator });
    const allowed = paths.get(url.pathname);
    if (allowed === undefined) {
      throw new GatewayError(404, 'not_found', 'No such route');
    }
    const handler = handlers.get(`${request.method} ${url.pathname}`);
    if (handler === undefined) {
      const error = new GatewayError(405, 'method_not_allowed', 'That method is not supported for this route');
      error.headers = { allow: [...allowed].join(', ') };
      throw error;
    }
    let release;
    try {
      if (identity.owner_id !== null) {
        release = quota.acquire(identity.owner_id);
        if (request.method === 'POST') {
          const body = await readJsonBody(request, max_body_bytes);
          return await handler({ body, query: url.searchParams, owner_id: identity.owner_id, response, request_id: request.request_id });
        }
        return await handler({ body: {}, query: url.searchParams, owner_id: identity.owner_id, response, request_id: request.request_id });
      }
      return await handler({ body: {}, query: url.searchParams, owner_id: null, response, request_id: request.request_id });
    } finally {
      release?.();
    }
  }

  const create = tls === undefined ? createServer : createHttpsServer;
  const server = create(tls, (request, response) => {
    const request_id = randomUUID();
    const requestMetrics = metrics.begin(request);
    const complete = (status, outcome) => {
      emitAudit({
        request_id,
        method: request.method ?? 'UNKNOWN',
        route: requestMetrics.route,
        status,
        duration_ms: requestMetrics.complete(status),
        outcome
      });
    };
    request.request_id = request_id;
    handle(request, response)
      .then((result) => {
        if (result?.streamed) {
          complete(200, 'ok');
          return;
        }
        sendResponse(response, result.status, result.body);
        complete(result.status, result.status < 400 ? 'ok' : 'error');
      })
      .catch((error) => {
        const mapped = error;
        const { status, body } = errorPayload(mapped);
        const headers = mapped instanceof GatewayError && mapped.headers ? mapped.headers : {};
        if (response.headersSent) {
          response.destroy();
          complete(status, 'error');
          return;
        }
        // An oversized body was refused without reading it, so the connection cannot be reused safely.
        sendResponse(response, status, body, status === 413 ? { ...headers, connection: 'close' } : headers);
        complete(status, 'error');
        if (status === 413) request.destroy();
      });
  });
  server.headersTimeout = 5000;
  // An answer may legitimately wait for the model longer than an ordinary request.
  server.requestTimeout = 120000;
  server.maxHeadersCount = 64;

  return Object.freeze({
    server,
    handler: (request, response) => handle(request, response),
    async start({ port = 0, host = '127.0.0.1' } = {}) {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, resolve);
      });
      const address = server.address();
      return { host, port: address.port, url: `${tls === undefined ? 'http' : 'https'}://${host}:${address.port}` };
    },
    async stop() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
}

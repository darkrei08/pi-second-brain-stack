import { GatewayError } from '../../gateway-error.js';

const DEFAULT_READINESS_CACHE_MS = 5000;

export function createHealthRoutes({ storage, chat, answer_model, readiness_cache_ms = DEFAULT_READINESS_CACHE_MS }) {
  if (!Number.isInteger(readiness_cache_ms) || readiness_cache_ms < 0) {
    throw new TypeError('readiness_cache_ms must be a non-negative integer');
  }
  let cached;
  let checked_at = 0;
  let in_flight;
  const check = async () => {
    const now = Date.now();
    if (cached !== undefined && now - checked_at < readiness_cache_ms) return cached;
    if (in_flight !== undefined) return in_flight;
    in_flight = (async () => {
      try {
        await storage.listEmbeddingModels();
        if (chat !== undefined && answer_model !== undefined && typeof chat.probe === 'function') {
          await chat.probe(answer_model);
        }
        cached = true;
        checked_at = Date.now();
        return true;
      } catch {
        cached = false;
        checked_at = Date.now();
        return false;
      } finally {
        in_flight = undefined;
      }
    })();
    return in_flight;
  };
  return [
    { method: 'GET', path: '/healthz', handler: () => ({ status: 200, body: { status: 'ok' } }) },
    {
      method: 'GET',
      path: '/readyz',
      handler: async () => {
        if (!await check()) throw new GatewayError(503, 'not_ready', 'Configured dependencies are not ready');
        return { status: 200, body: { status: 'ready' } };
      }
    }
  ];
}

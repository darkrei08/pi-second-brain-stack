import { GatewayError } from '../gateway-error.js';

const QUOTA_WINDOW_MS = 60_000;
const RETRY_AFTER_SECONDS = 60;

export function createQuota({ requests_per_minute, max_concurrent_requests }) {
  const owners = new Map();
  return {
    acquire(owner_id) {
      const now = Date.now();
      const current = owners.get(owner_id);
      const state = current === undefined || now - current.window_started_at >= QUOTA_WINDOW_MS
        ? { window_started_at: now, request_count: 0, active_count: 0 }
        : current;
      if (state.request_count >= requests_per_minute || state.active_count >= max_concurrent_requests) {
        const error = new GatewayError(429, 'quota_exceeded', 'Request quota exceeded');
        error.headers = { 'retry-after': String(RETRY_AFTER_SECONDS) };
        throw error;
      }
      state.request_count += 1;
      state.active_count += 1;
      owners.set(owner_id, state);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        state.active_count -= 1;
        if (state.active_count === 0 && now - state.window_started_at >= QUOTA_WINDOW_MS) {
          owners.delete(owner_id);
        }
      };
    }
  };
}

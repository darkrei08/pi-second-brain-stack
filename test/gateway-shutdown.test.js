import assert from 'node:assert/strict';
import test from 'node:test';

import { shutdownGateway } from '../src/gateway-shutdown.js';

function recorder() {
  const steps = [];
  const errors = [];
  const exits = [];
  return {
    steps,
    errors,
    exits,
    gateway: { async stop() { steps.push('gateway.stop'); } },
    pool: { async end() { steps.push('pool.end'); } },
    writeError: (message) => errors.push(message),
    exit: (code) => exits.push(code)
  };
}

test('stops the gateway before draining the pool and exits cleanly', async () => {
  const harness = recorder();
  await shutdownGateway({
    gateway: harness.gateway,
    pool: harness.pool,
    writeError: harness.writeError,
    exit: harness.exit
  });
  assert.deepEqual(harness.steps, ['gateway.stop', 'pool.end']);
  assert.deepEqual(harness.errors, []);
  assert.deepEqual(harness.exits, [0]);
});

test('reports a step that exceeds its timeout without hanging or skipping the next step', async () => {
  const harness = recorder();
  const started = Date.now();
  await shutdownGateway({
    gateway: {
      stop() {
        return new Promise(() => {});
      }
    },
    pool: harness.pool,
    timeout_ms: 50,
    writeError: harness.writeError,
    exit: harness.exit
  });
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 2000, `shutdown must not hang, took ${elapsed}ms`);
  assert.deepEqual(harness.errors, ['gateway.stop failed: timed out after 50ms']);
  assert.deepEqual(harness.steps, ['pool.end']);
  assert.deepEqual(harness.exits, [1]);
});

test('reports a rejected step and a rejected pool drain independently', async () => {
  const harness = recorder();
  await shutdownGateway({
    gateway: {
      async stop() {
        throw new Error('server is not listening');
      }
    },
    pool: {
      async end() {
        throw new Error('pool is already closed');
      }
    },
    writeError: harness.writeError,
    exit: harness.exit
  });
  assert.deepEqual(harness.errors, ['gateway.stop failed: server is not listening', 'pool.end failed: pool is already closed']);
  assert.deepEqual(harness.exits, [1]);
});

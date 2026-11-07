import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureGroundTruth,
  cleanupCorpus,
  createPool,
  generateCorpus,
  loadCorpus,
  measureCandidate
} from '../bench/ann/index.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl ? test : test.skip;

integrationTest('an exact candidate reports recall at k of 1.0', async () => {
  const pool = createPool(databaseUrl);
  const corpus = generateCorpus({
    seed: 20261029,
    dimensions: 6,
    document_count: 8,
    segments_per_document: 3,
    query_count: 4,
    top_k: 3
  });

  let connected = false;
  try {
    await pool.query('SELECT 1');
    connected = true;
    await loadCorpus(pool, corpus);
    const groundTruth = await captureGroundTruth({ pool, corpus });
    const measurement = await measureCandidate({
      pool,
      corpus,
      groundTruth,
      candidate: { type: 'exact', name: 'identical-to-exact' }
    });

    assert.equal(measurement.status, 'passed');
    assert.equal(measurement.recall_at_k, 1);
  } finally {
    if (connected) await cleanupCorpus(pool, corpus);
    await pool.end();
  }
});

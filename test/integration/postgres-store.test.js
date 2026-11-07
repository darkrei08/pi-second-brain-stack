import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMigrations, createStorage, describeRetrievalMode, resolveCitations, runEmbeddingBackfill, segmentDocument } from '../../src/index.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl ? test : test.skip;
const pg = databaseUrl ? (await import('pg')).default : null;
const pool = pg ? new pg.Pool({ connectionString: databaseUrl }) : null;

const document = {
  document_id: 'urn:document:postgres-synthetic',
  text: 'Lexical invoice search works. Provenance remains available.',
  source_label: 'synthetic-postgres-fixture.txt',
  source_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  lineage: { parser: 'synthetic-parser@1.0.0', model: null },
  created_at: '2026-01-01T00:00:00Z',
  retention: { owner_id: 'synthetic-owner-a', state: 'active' }
};
const result = segmentDocument(document, { max_segment_chars: 80 });
const semanticDocument = {
  ...document,
  document_id: 'urn:document:postgres-semantic',
  text: 'alpha invoice text.\n\nbeta contract text.\n\ngamma retention text.',
  source_hash: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  source_label: 'synthetic-semantic-fixture.txt'
};
const semanticResult = segmentDocument(semanticDocument, { max_segment_chars: 100 });
const hybridDocument = {
  ...document,
  document_id: 'urn:document:postgres-hybrid',
  text: 'invoice contract alpha.\n\ncontract beta.\n\nretention gamma.',
  source_hash: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  source_label: 'synthetic-hybrid-fixture.txt',
  retention: { owner_id: 'synthetic-hybrid-owner-a', state: 'active' }
};
const hybridResult = segmentDocument(hybridDocument, { max_segment_chars: 100 });
const backfillDocument = {
  ...document,
  document_id: 'urn:document:postgres-backfill',
  text: 'alpha one.\n\nbeta two.\n\ngamma three.',
  source_hash: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  source_label: 'synthetic-backfill-fixture.txt',
  retention: { owner_id: 'synthetic-backfill-owner-a', state: 'active' }
};
const backfillResult = segmentDocument(backfillDocument, { max_segment_chars: 100 });
const backfillSecondDocument = {
  ...backfillDocument,
  document_id: 'urn:document:postgres-backfill-b'
};
const backfillSecondResult = segmentDocument(backfillSecondDocument, { max_segment_chars: 100 });
const backfillForeignDocument = {
  ...backfillDocument,
  document_id: 'urn:document:postgres-backfill-foreign',
  retention: { owner_id: 'synthetic-backfill-owner-b', state: 'active' }
};
const backfillForeignResult = segmentDocument(backfillForeignDocument, { max_segment_chars: 100 });
const semanticVectors3d = [
  [1, 0, 0],
  [0, 1, 0],
  [0.7, 0.7, 0]
];
const semanticVectors4d = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0]
];

test('rejects malformed persistence input before connecting', async () => {
  const storage = createStorage({ pool: { connect() { throw new Error('database must not be contacted'); } } });

  await assert.rejects(
    storage.saveDocumentAndSegments({ ...document, document_id: '/private/source.pdf' }, result),
    /opaque document/
  );
  await assert.rejects(
    storage.saveDocumentAndSegments({ ...document, retention: { owner_id: '../other-owner', state: 'active' } }, result),
    /owner_id/
  );
});

test('rejects malformed backfill plan input before connecting', async () => {
  const storage = createStorage({ pool: { connect() { throw new Error('database must not be contacted'); } } });

  await assert.rejects(storage.listEmbeddingBackfill('/private/model'), /input must be an object/);
  await assert.rejects(
    storage.listEmbeddingBackfill({ model_id: '/private/model', owner_id: 'synthetic-owner-a' }),
    /model_id must be opaque/
  );
  await assert.rejects(
    storage.listEmbeddingBackfill({ model_id: 'backfill-3d', owner_id: '../other-owner' }),
    /owner_id must be opaque/
  );
  await assert.rejects(
    storage.listEmbeddingBackfill({ model_id: 'backfill-3d', owner_id: 'synthetic-owner-a', limit: 0 }),
    /limit must be an integer between 1 and 100/
  );
  await assert.rejects(
    storage.listEmbeddingBackfill({ model_id: 'backfill-3d', owner_id: 'synthetic-owner-a', limit: 101 }),
    /limit must be an integer between 1 and 100/
  );
  await assert.rejects(
    storage.listEmbeddingBackfill({ model_id: 'backfill-3d', owner_id: 'synthetic-owner-a', limit: 1.5 }),
    /limit must be an integer between 1 and 100/
  );
});

test('rejects malformed semantic input before connecting', async () => {
  let contacts = 0;
  const storage = createStorage({
    pool: {
      connect() {
        contacts += 1;
        throw new Error('database must not be contacted');
      },
      query() {
        contacts += 1;
        throw new Error('database must not be contacted');
      }
    }
  });
  const valid = {
    document_id: document.document_id,
    owner_id: document.retention.owner_id,
    model_id: 'synthetic-3d',
    dimensions: 3,
    embeddings: [{ segment_id: result.segments[0].id, embedding: [1, 0, 0] }],
    created_at: document.created_at
  };

  await assert.rejects(storage.registerEmbeddingModel({ model_id: '../model', dimensions: 3 }), /model_id/);
  await assert.rejects(storage.registerEmbeddingModel({ model_id: 'synthetic-3d', dimensions: 0 }), /dimensions/);
  await assert.rejects(storage.registerEmbeddingModel({ model_id: 'synthetic-3d', dimensions: 3, status: 'unknown' }), /status/);
  await assert.rejects(storage.getEmbeddingModel('../model'), /model_id/);
  await assert.rejects(storage.inspectEmbeddingCoverage({ model_id: '../model', owner_id: document.retention.owner_id }), /model_id/);
  await assert.rejects(storage.inspectEmbeddingCoverage({ model_id: 'synthetic-3d', owner_id: '../owner' }), /owner_id/);
  await assert.rejects(storage.saveSegmentEmbeddings({ ...valid, dimensions: 0 }), /dimensions/);
  await assert.rejects(storage.saveSegmentEmbeddings({ ...valid, model_id: '../model' }), /model_id/);
  await assert.rejects(storage.saveSegmentEmbeddings({ ...valid, embeddings: [valid.embeddings[0], valid.embeddings[0]] }), /duplicate/);
  await assert.rejects(storage.saveSegmentEmbeddings({ ...valid, embeddings: [{ ...valid.embeddings[0], embedding: [1, 0] }] }), /dimension/);
  await assert.rejects(storage.saveSegmentEmbeddings({ ...valid, embeddings: [{ ...valid.embeddings[0], embedding: [0, 0, 0] }] }), /non-zero/);
  await assert.rejects(storage.saveSegmentEmbeddings({ ...valid, embeddings: [{ ...valid.embeddings[0], embedding: [1, Number.NaN, 0] }] }), /finite/);
  await assert.rejects(storage.searchSegmentsSemantic({ query_embedding: [1, 0, 0], model_id: 'synthetic-3d', owner_id: document.retention.owner_id, limit: 101 }), /limit/);
  await assert.rejects(storage.searchSegmentsSemantic({ query_embedding: [0, 0, 0], model_id: 'synthetic-3d', owner_id: document.retention.owner_id, limit: 1 }), /non-zero/);
  await assert.rejects(
    storage.searchSegmentsHybrid({
      query: 'invoice',
      query_embedding: [1, 0, 0],
      model_id: 'synthetic-3d',
      owner_id: document.retention.owner_id,
      limit: 1,
      rrf_k: 0
    }),
    /rrf_k/
  );
  await assert.rejects(
    storage.searchSegmentsHybrid({
      query: 'invoice',
      query_embedding: [1, 0, 0],
      model_id: 'synthetic-3d',
      owner_id: document.retention.owner_id,
      limit: 101
    }),
    /limit/
  );
  await assert.rejects(
    storage.revalidateCitations([], { owner_id: document.retention.owner_id }),
    /non-empty/
  );
  await assert.rejects(
    storage.revalidateCitations([{}], { owner_id: '../other-owner' }),
    /owner_id/
  );
  await assert.rejects(
    storage.revalidateCitations(Array.from({ length: 101 }, () => ({})), { owner_id: document.retention.owner_id }),
    /100/
  );
  await assert.rejects(
    storage.searchSegmentsLexical({ query: 'invoice', owner_id: '../other-owner', limit: 1 }),
    /opaque/
  );
  await assert.rejects(
    storage.searchSegmentsLexical({ query: 'invoice', owner_id: document.retention.owner_id, limit: 0 }),
    /100/
  );
  await assert.rejects(
    storage.searchSegmentsLexical({ query: 'invoice', owner_id: document.retention.owner_id, limit: 1.5 }),
    /100/
  );
  await assert.rejects(
    storage.searchSegmentsLexical({ query: 'invoice', owner_id: document.retention.owner_id, limit: 101 }),
    /100/
  );
  assert.equal(contacts, 0);
});

async function removeDocument(documentId, ownerId) {
  await pool.query('DELETE FROM documents WHERE document_id = $1 AND owner_id = $2', [documentId, ownerId]);
}

if (pool) {
  test.after(async () => pool.end());
}

integrationTest('stores and reads the complete segmented document contract', async () => {
  const storage = createStorage({ pool });
  await removeDocument(document.document_id, document.retention.owner_id);

  await storage.saveDocumentAndSegments(document, result);
  const stored = await storage.getDocumentWithSegments(document.document_id, document.retention.owner_id);

  assert.deepEqual(stored, { ...document, segments: result.segments });
  await removeDocument(document.document_id, document.retention.owner_id);
});

integrationTest('rejects cross-owner replacement and preserves the original document', async () => {
  const storage = createStorage({ pool });
  const guardedDocument = {
    ...document,
    document_id: 'urn:document:postgres-owner-guard',
    retention: { owner_id: 'synthetic-owner-guard', state: 'active' }
  };
  const guardedResult = segmentDocument(guardedDocument, { max_segment_chars: 80 });
  const hostileDocument = {
    ...guardedDocument,
    retention: { owner_id: 'synthetic-owner-hostile', state: 'active' }
  };

  await removeDocument(guardedDocument.document_id, guardedDocument.retention.owner_id);
  await storage.saveDocumentAndSegments(guardedDocument, guardedResult);

  await assert.rejects(
    storage.saveDocumentAndSegments(hostileDocument, segmentDocument(hostileDocument, { max_segment_chars: 80 })),
    /owner/
  );
  assert.deepEqual(
    await storage.getDocumentWithSegments(guardedDocument.document_id, guardedDocument.retention.owner_id),
    { ...guardedDocument, segments: guardedResult.segments }
  );
  assert.equal(await storage.getDocumentWithSegments(guardedDocument.document_id, hostileDocument.retention.owner_id), null);

  await removeDocument(guardedDocument.document_id, guardedDocument.retention.owner_id);
});

integrationTest('searches lexical matches with owner isolation and active retention', async () => {
  const storage = createStorage({ pool });
  const otherDocument = {
    ...document,
    document_id: 'urn:document:postgres-other-owner',
    retention: { owner_id: 'synthetic-owner-b', state: 'active' }
  };
  const tombstoneDocument = {
    ...document,
    document_id: 'urn:document:postgres-tombstone',
    retention: { owner_id: 'synthetic-owner-c', state: 'tombstone' }
  };

  await Promise.all([
    removeDocument(document.document_id, document.retention.owner_id),
    removeDocument(otherDocument.document_id, otherDocument.retention.owner_id),
    removeDocument(tombstoneDocument.document_id, tombstoneDocument.retention.owner_id),
    removeDocument(semanticDocument.document_id, semanticDocument.retention.owner_id),
    removeDocument('urn:document:postgres-semantic-other', 'synthetic-owner-b'),
    removeDocument('urn:document:postgres-semantic-tombstone', 'synthetic-owner-c')
  ]);
  await storage.saveDocumentAndSegments(document, result);
  await storage.saveDocumentAndSegments(otherDocument, segmentDocument(otherDocument, { max_segment_chars: 80 }));
  await storage.saveDocumentAndSegments(tombstoneDocument, segmentDocument(tombstoneDocument, { max_segment_chars: 80 }));

  const matches = await storage.searchSegmentsLexical({ query: 'invoice', owner_id: document.retention.owner_id, limit: 10 });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].document_id, document.document_id);
  assert.equal(matches[0].provenance.citation.ref, result.segments[0].provenance.citation.ref);
  assert.equal((await storage.searchSegmentsLexical({ query: 'invoice', owner_id: otherDocument.retention.owner_id, limit: 10 })).length, 1);
  assert.equal((await storage.searchSegmentsLexical({ query: 'invoice', owner_id: tombstoneDocument.retention.owner_id, limit: 10 })).length, 0);

  assert.equal(await storage.getDocumentWithSegments(document.document_id, otherDocument.retention.owner_id), null);
  assert.equal(await storage.deleteDocument(document.document_id, otherDocument.retention.owner_id), false);

  await removeDocument(document.document_id, document.retention.owner_id);
  await removeDocument(otherDocument.document_id, otherDocument.retention.owner_id);
  await removeDocument(tombstoneDocument.document_id, tombstoneDocument.retention.owner_id);
});

integrationTest('stores exact model-scoped cosine results and replaces embeddings deterministically', async () => {
  const storage = createStorage({ pool });
  await removeDocument(semanticDocument.document_id, semanticDocument.retention.owner_id);
  await storage.saveDocumentAndSegments(semanticDocument, semanticResult);

  await storage.saveSegmentEmbeddings({
    document_id: semanticDocument.document_id,
    owner_id: semanticDocument.retention.owner_id,
    model_id: 'synthetic-3d',
    dimensions: 3,
    embeddings: semanticResult.segments.map((segment, index) => ({ segment_id: segment.id, embedding: semanticVectors3d[index] })),
    created_at: semanticDocument.created_at
  });
  await storage.saveSegmentEmbeddings({
    document_id: semanticDocument.document_id,
    owner_id: semanticDocument.retention.owner_id,
    model_id: 'synthetic-4d',
    dimensions: 4,
    embeddings: semanticResult.segments.map((segment, index) => ({ segment_id: segment.id, embedding: semanticVectors4d[index] })),
    created_at: semanticDocument.created_at
  });
  await assert.rejects(
    storage.saveSegmentEmbeddings({
      document_id: semanticDocument.document_id,
      owner_id: semanticDocument.retention.owner_id,
      model_id: 'synthetic-3d',
      dimensions: 4,
      embeddings: semanticResult.segments.map((segment, index) => ({ segment_id: segment.id, embedding: semanticVectors4d[index] })),
      created_at: semanticDocument.created_at
    }),
    /inconsistent/
  );

  const matches = await storage.searchSegmentsSemantic({
    query_embedding: [1, 0, 0],
    model_id: 'synthetic-3d',
    owner_id: semanticDocument.retention.owner_id,
    limit: 3
  });
  assert.deepEqual(matches.map((match) => match.segment_index), [0, 2, 1]);
  assert.equal(matches[0].model_id, 'synthetic-3d');
  assert.equal(matches[0].distance, 0);
  assert.equal(matches[0].score, 1);
  assert.ok(Math.abs(matches[1].score - Math.SQRT1_2) < 0.0001);
  assert.equal(matches[0].provenance.segment_id, matches[0].id);

  await storage.saveSegmentEmbeddings({
    document_id: semanticDocument.document_id,
    owner_id: semanticDocument.retention.owner_id,
    model_id: 'synthetic-3d',
    dimensions: 3,
    embeddings: semanticResult.segments.map((segment, index) => ({
      segment_id: segment.id,
      embedding: index === 1 ? [1, 0, 0] : semanticVectors3d[index]
    })),
    created_at: '2026-01-02T00:00:00Z'
  });
  const replaced = await storage.searchSegmentsSemantic({
    query_embedding: [1, 0, 0],
    model_id: 'synthetic-3d',
    owner_id: semanticDocument.retention.owner_id,
    limit: 3
  });
  assert.deepEqual(replaced.slice(0, 2).map((match) => match.segment_index), [0, 1]);

  await removeDocument(semanticDocument.document_id, semanticDocument.retention.owner_id);
});

integrationTest('registers global models and reports owner-scoped partial coverage', async () => {
  const storage = createStorage({ pool });
  const coverageModel = 'coverage-3d';
  const mismatchModel = 'coverage-mismatch';
  await pool.query('DELETE FROM embedding_models WHERE model_id = ANY($1::text[])', [[coverageModel, mismatchModel]]);
  await removeDocument(semanticDocument.document_id, semanticDocument.retention.owner_id);
  await storage.saveDocumentAndSegments(semanticDocument, semanticResult);

  assert.deepEqual(
    await Promise.all([
      storage.registerEmbeddingModel({ model_id: coverageModel, dimensions: 3 }),
      storage.registerEmbeddingModel({ model_id: coverageModel, dimensions: 3 })
    ]),
    [
      { model_id: coverageModel, dimensions: 3, status: 'active' },
      { model_id: coverageModel, dimensions: 3, status: 'active' }
    ]
  );
  await assert.rejects(
    storage.registerEmbeddingModel({ model_id: coverageModel, dimensions: 4 }),
    /conflicts/
  );
  assert.deepEqual(await storage.getEmbeddingModel(coverageModel), { model_id: coverageModel, dimensions: 3, status: 'active' });

  await storage.saveSegmentEmbeddings({
    document_id: semanticDocument.document_id,
    owner_id: semanticDocument.retention.owner_id,
    model_id: coverageModel,
    dimensions: 3,
    embeddings: [{ segment_id: semanticResult.segments[0].id, embedding: semanticVectors3d[0] }],
    created_at: semanticDocument.created_at
  });
  assert.deepEqual(
    await storage.inspectEmbeddingCoverage({ model_id: coverageModel, owner_id: semanticDocument.retention.owner_id }),
    {
      model_id: coverageModel,
      owner_id: semanticDocument.retention.owner_id,
      status: 'active',
      dimensions: 3,
      total_segments: 3,
      embedded_segments: 1,
      missing_segments: 2,
      dimension_mismatch_segments: 0
    }
  );

  assert.deepEqual(
    await storage.registerEmbeddingModel({ model_id: mismatchModel, dimensions: 4 }),
    { model_id: mismatchModel, dimensions: 4, status: 'active' }
  );
  await storage.saveSegmentEmbeddings({
    document_id: semanticDocument.document_id,
    owner_id: semanticDocument.retention.owner_id,
    model_id: mismatchModel,
    dimensions: 3,
    embeddings: [{ segment_id: semanticResult.segments[1].id, embedding: semanticVectors3d[1] }],
    created_at: semanticDocument.created_at
  });
  assert.deepEqual(
    await storage.inspectEmbeddingCoverage({ model_id: mismatchModel, owner_id: semanticDocument.retention.owner_id }),
    {
      model_id: mismatchModel,
      owner_id: semanticDocument.retention.owner_id,
      status: 'active',
      dimensions: 4,
      total_segments: 3,
      embedded_segments: 0,
      missing_segments: 2,
      dimension_mismatch_segments: 1
    }
  );

  assert.deepEqual(
    await Promise.all([
      storage.registerEmbeddingModel({ model_id: coverageModel, dimensions: 3, status: 'deprecated' }),
      storage.registerEmbeddingModel({ model_id: coverageModel, dimensions: 3, status: 'deprecated' })
    ]),
    [
      { model_id: coverageModel, dimensions: 3, status: 'deprecated' },
      { model_id: coverageModel, dimensions: 3, status: 'deprecated' }
    ]
  );
  await assert.rejects(
    storage.registerEmbeddingModel({ model_id: coverageModel, dimensions: 3 }),
    /reactivated/
  );
  assert.deepEqual(
    (await storage.listEmbeddingModels())
      .map(({ model_id }) => model_id)
      .filter((model_id) => model_id === coverageModel || model_id === mismatchModel),
    [coverageModel, mismatchModel]
  );

  await pool.query(
    "UPDATE documents SET retention_state = 'tombstone' WHERE document_id = $1 AND owner_id = $2",
    [semanticDocument.document_id, semanticDocument.retention.owner_id]
  );
  assert.deepEqual(
    await storage.inspectEmbeddingCoverage({ model_id: coverageModel, owner_id: semanticDocument.retention.owner_id }),
    {
      model_id: coverageModel,
      owner_id: semanticDocument.retention.owner_id,
      status: 'deprecated',
      dimensions: 3,
      total_segments: 0,
      embedded_segments: 0,
      missing_segments: 0,
      dimension_mismatch_segments: 0
    }
  );
  await removeDocument(semanticDocument.document_id, semanticDocument.retention.owner_id);
});

integrationTest('plans owner-scoped embedding backfill per registered model', async () => {
  const storage = createStorage({ pool });
  const model = 'backfill-3d';
  const mismatchModel = 'backfill-mismatch';
  const deprecatedModel = 'backfill-deprecated';
  const owner = backfillDocument.retention.owner_id;
  const segmentIds = backfillResult.segments.map(({ id }) => id);
  const secondSegmentIds = backfillSecondResult.segments.map(({ id }) => id);

  await pool.query('DELETE FROM embedding_models WHERE model_id = ANY($1::text[])', [[model, mismatchModel, deprecatedModel]]);
  for (const [candidate, candidateOwner] of [
    [backfillDocument, owner],
    [backfillSecondDocument, owner],
    [backfillForeignDocument, backfillForeignDocument.retention.owner_id]
  ]) {
    await removeDocument(candidate.document_id, candidateOwner);
  }
  await storage.saveDocumentAndSegments(backfillDocument, backfillResult);
  await storage.saveDocumentAndSegments(backfillSecondDocument, backfillSecondResult);
  await storage.saveDocumentAndSegments(backfillForeignDocument, backfillForeignResult);
  await storage.registerEmbeddingModel({ model_id: model, dimensions: 3 });

  const expectedPlan = {
    model_id: model,
    owner_id: owner,
    status: 'active',
    dimensions: 3,
    documents: [
      {
        document_id: backfillDocument.document_id,
        segment_ids: segmentIds,
        missing_segment_ids: segmentIds,
        dimension_mismatch_segment_ids: []
      },
      {
        document_id: backfillSecondDocument.document_id,
        segment_ids: secondSegmentIds,
        missing_segment_ids: secondSegmentIds,
        dimension_mismatch_segment_ids: []
      }
    ]
  };
  const coverageBefore = await storage.inspectEmbeddingCoverage({ model_id: model, owner_id: owner });
  assert.deepEqual(await storage.listEmbeddingBackfill({ model_id: model, owner_id: owner }), expectedPlan);
  assert.deepEqual(await storage.listEmbeddingBackfill({ model_id: model, owner_id: owner }), expectedPlan);
  assert.deepEqual(
    await storage.inspectEmbeddingCoverage({ model_id: model, owner_id: owner }),
    coverageBefore
  );
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: model, owner_id: owner, limit: 1 })).documents.map(({ document_id }) => document_id),
    [backfillDocument.document_id]
  );
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: model, owner_id: backfillForeignDocument.retention.owner_id })).documents.map(({ document_id }) => document_id),
    [backfillForeignDocument.document_id]
  );
  await assert.rejects(
    storage.listEmbeddingBackfill({ model_id: 'backfill-unregistered', owner_id: owner }),
    /embedding model is not registered/
  );

  await storage.saveSegmentEmbeddings({
    document_id: backfillDocument.document_id,
    owner_id: owner,
    model_id: model,
    dimensions: 3,
    embeddings: [{ segment_id: segmentIds[0], embedding: semanticVectors3d[0] }],
    created_at: backfillDocument.created_at
  });
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: model, owner_id: owner })).documents[0],
    {
      document_id: backfillDocument.document_id,
      segment_ids: segmentIds,
      missing_segment_ids: [segmentIds[1], segmentIds[2]],
      dimension_mismatch_segment_ids: []
    }
  );

  await storage.registerEmbeddingModel({ model_id: mismatchModel, dimensions: 4 });
  await storage.saveSegmentEmbeddings({
    document_id: backfillDocument.document_id,
    owner_id: owner,
    model_id: mismatchModel,
    dimensions: 3,
    embeddings: [{ segment_id: segmentIds[1], embedding: semanticVectors3d[1] }],
    created_at: backfillDocument.created_at
  });
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: mismatchModel, owner_id: owner })).documents[0],
    {
      document_id: backfillDocument.document_id,
      segment_ids: segmentIds,
      missing_segment_ids: [segmentIds[0], segmentIds[2]],
      dimension_mismatch_segment_ids: [segmentIds[1]]
    }
  );

  await assert.rejects(
    storage.saveSegmentEmbeddings({
      document_id: backfillDocument.document_id,
      owner_id: owner,
      model_id: mismatchModel,
      dimensions: 4,
      embeddings: [{ segment_id: segmentIds[0], embedding: semanticVectors4d[0] }],
      created_at: backfillDocument.created_at
    }),
    /inconsistent with existing embeddings/
  );

  await storage.saveSegmentEmbeddings({
    document_id: backfillForeignDocument.document_id,
    owner_id: backfillForeignDocument.retention.owner_id,
    model_id: mismatchModel,
    dimensions: 3,
    embeddings: [{ segment_id: backfillForeignResult.segments[0].id, embedding: semanticVectors3d[0] }],
    created_at: backfillForeignDocument.created_at
  });
  await storage.saveSegmentEmbeddings({
    document_id: backfillDocument.document_id,
    owner_id: owner,
    model_id: mismatchModel,
    dimensions: 4,
    embeddings: segmentIds.map((segment_id, index) => ({ segment_id, embedding: semanticVectors4d[index] })),
    created_at: backfillDocument.created_at
  });
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: mismatchModel, owner_id: owner })).documents.map(({ document_id }) => document_id),
    [backfillSecondDocument.document_id]
  );

  await storage.registerEmbeddingModel({ model_id: deprecatedModel, dimensions: 2, status: 'deprecated' });
  const deprecatedPlan = await storage.listEmbeddingBackfill({ model_id: deprecatedModel, owner_id: owner });
  assert.deepEqual({ ...deprecatedPlan, documents: deprecatedPlan.documents.length }, {
    model_id: deprecatedModel,
    owner_id: owner,
    status: 'deprecated',
    dimensions: 2,
    documents: 2
  });

  await storage.saveSegmentEmbeddings({
    document_id: backfillDocument.document_id,
    owner_id: owner,
    model_id: model,
    dimensions: 3,
    embeddings: segmentIds.map((segment_id, index) => ({ segment_id, embedding: semanticVectors3d[index] })),
    created_at: backfillDocument.created_at
  });
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: model, owner_id: owner })).documents.map(({ document_id }) => document_id),
    [backfillSecondDocument.document_id]
  );

  await pool.query(
    "UPDATE documents SET retention_state = 'tombstone' WHERE document_id = $1 AND owner_id = $2",
    [backfillSecondDocument.document_id, owner]
  );
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: model, owner_id: owner })).documents,
    []
  );

  for (const [candidate, candidateOwner] of [
    [backfillDocument, owner],
    [backfillSecondDocument, owner],
    [backfillForeignDocument, backfillForeignDocument.retention.owner_id]
  ]) {
    await removeDocument(candidate.document_id, candidateOwner);
  }
  await pool.query('DELETE FROM embedding_models WHERE model_id = ANY($1::text[])', [[model, mismatchModel, deprecatedModel]]);
});

integrationTest('isolates semantic results by owner, active retention, model, and cascades twice', async () => {
  const storage = createStorage({ pool });
  const otherDocument = { ...semanticDocument, document_id: 'urn:document:postgres-semantic-other', retention: { owner_id: 'synthetic-owner-b', state: 'active' } };
  const tombstoneDocument = { ...semanticDocument, document_id: 'urn:document:postgres-semantic-tombstone', retention: { owner_id: 'synthetic-owner-c', state: 'active' } };
  const otherResult = segmentDocument(otherDocument, { max_segment_chars: 100 });
  const tombstoneResult = segmentDocument(tombstoneDocument, { max_segment_chars: 100 });
  await Promise.all([
    removeDocument(semanticDocument.document_id, semanticDocument.retention.owner_id),
    removeDocument(otherDocument.document_id, otherDocument.retention.owner_id),
    removeDocument(tombstoneDocument.document_id, tombstoneDocument.retention.owner_id)
  ]);
  await Promise.all([
    storage.saveDocumentAndSegments(semanticDocument, semanticResult),
    storage.saveDocumentAndSegments(otherDocument, otherResult),
    storage.saveDocumentAndSegments(tombstoneDocument, tombstoneResult)
  ]);
  const save = (doc, segmentResult, modelId = 'synthetic-3d') => storage.saveSegmentEmbeddings({
    document_id: doc.document_id,
    owner_id: doc.retention.owner_id,
    model_id: modelId,
    dimensions: 3,
    embeddings: segmentResult.segments.map((segment) => ({ segment_id: segment.id, embedding: [1, 0, 0] })),
    created_at: doc.created_at
  });
  await Promise.all([
    save(semanticDocument, semanticResult),
    save(otherDocument, otherResult),
    save(tombstoneDocument, tombstoneResult)
  ]);
  await pool.query(
    "UPDATE documents SET retention_state = 'tombstone' WHERE document_id = $1 AND owner_id = $2",
    [tombstoneDocument.document_id, tombstoneDocument.retention.owner_id]
  );

  assert.equal((await storage.searchSegmentsSemantic({ query_embedding: [1, 0, 0], model_id: 'synthetic-3d', owner_id: semanticDocument.retention.owner_id, limit: 100 })).length, 3);
  assert.equal((await storage.searchSegmentsSemantic({ query_embedding: [1, 0, 0], model_id: 'synthetic-3d', owner_id: otherDocument.retention.owner_id, limit: 100 })).length, 3);
  assert.equal((await storage.searchSegmentsSemantic({ query_embedding: [1, 0, 0], model_id: 'synthetic-3d', owner_id: tombstoneDocument.retention.owner_id, limit: 100 })).length, 0);
  assert.equal((await storage.searchSegmentsSemantic({ query_embedding: [1, 0, 0], model_id: 'synthetic-4d', owner_id: semanticDocument.retention.owner_id, limit: 100 })).length, 0);

  await storage.deleteDocument(semanticDocument.document_id, semanticDocument.retention.owner_id);
  const firstCascade = await pool.query('SELECT count(*)::int AS count FROM segment_embeddings WHERE segment_id LIKE $1', ['urn:segment:urn:document:postgres-semantic-%']);
  assert.equal(firstCascade.rows[0].count, 6);
  await storage.deleteDocument(otherDocument.document_id, otherDocument.retention.owner_id);
  await storage.deleteDocument(tombstoneDocument.document_id, tombstoneDocument.retention.owner_id);
  const secondCascade = await pool.query('SELECT count(*)::int AS count FROM segment_embeddings WHERE segment_id LIKE $1', ['urn:segment:urn:document:postgres-semantic-%']);
  assert.equal(secondCascade.rows[0].count, 0);
});

integrationTest('fuses lexical and semantic matches with deterministic isolation and provenance', async () => {
  const storage = createStorage({ pool });
  const otherDocument = {
    ...hybridDocument,
    document_id: 'urn:document:postgres-hybrid-other',
    source_hash: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    source_label: 'synthetic-hybrid-other.txt',
    retention: { owner_id: 'synthetic-hybrid-owner-b', state: 'active' }
  };
  const tombstoneDocument = {
    ...hybridDocument,
    document_id: 'urn:document:postgres-hybrid-tombstone',
    source_hash: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    source_label: 'synthetic-hybrid-tombstone.txt',
    retention: { owner_id: 'synthetic-hybrid-owner-c', state: 'active' }
  };
  const purgedDocument = {
    ...hybridDocument,
    document_id: 'urn:document:postgres-hybrid-purged',
    source_hash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    source_label: 'synthetic-hybrid-purged.txt',
    retention: { owner_id: 'synthetic-hybrid-owner-d', state: 'active' }
  };
  const otherResult = segmentDocument(otherDocument, { max_segment_chars: 100 });
  const tombstoneResult = segmentDocument(tombstoneDocument, { max_segment_chars: 100 });
  const purgedResult = segmentDocument(purgedDocument, { max_segment_chars: 100 });
  const documents = [hybridDocument, otherDocument, tombstoneDocument, purgedDocument];
  await Promise.all(documents.map((entry) => removeDocument(entry.document_id, entry.retention.owner_id)));
  await Promise.all([
    storage.saveDocumentAndSegments(hybridDocument, hybridResult),
    storage.saveDocumentAndSegments(otherDocument, otherResult),
    storage.saveDocumentAndSegments(tombstoneDocument, tombstoneResult),
    storage.saveDocumentAndSegments(purgedDocument, purgedResult)
  ]);
  const saveEmbeddings = (entry, entryResult) => storage.saveSegmentEmbeddings({
    document_id: entry.document_id,
    owner_id: entry.retention.owner_id,
    model_id: 'hybrid-3d',
    dimensions: 3,
    embeddings: [
      { segment_id: entryResult.segments[0].id, embedding: [1, 0, 0] },
      { segment_id: entryResult.segments[2].id, embedding: [0, 1, 0] }
    ],
    created_at: entry.created_at
  });
  await Promise.all([
    saveEmbeddings(hybridDocument, hybridResult),
    saveEmbeddings(otherDocument, otherResult),
    saveEmbeddings(tombstoneDocument, tombstoneResult),
    saveEmbeddings(purgedDocument, purgedResult)
  ]);
  await pool.query(
    "UPDATE documents SET retention_state = 'tombstone' WHERE document_id = $1 AND owner_id = $2",
    [tombstoneDocument.document_id, tombstoneDocument.retention.owner_id]
  );
  await pool.query(
    "UPDATE documents SET retention_state = 'purged' WHERE document_id = $1 AND owner_id = $2",
    [purgedDocument.document_id, purgedDocument.retention.owner_id]
  );

  const request = {
    query: 'contract',
    query_embedding: [1, 0, 0],
    model_id: 'hybrid-3d',
    owner_id: hybridDocument.retention.owner_id,
    limit: 3,
    rrf_k: 60
  };
  const matches = await storage.searchSegmentsHybrid(request);
  assert.deepEqual(matches.map((match) => match.segment_index), [0, 1, 2]);
  assert.deepEqual(matches.map((match) => [match.lexical_rank, match.semantic_rank]), [[1, 1], [2, null], [null, 2]]);
  assert.deepEqual(describeRetrievalMode(matches, { model_id: 'hybrid-3d' }), {
    mode: 'hybrid',
    model_id: 'hybrid-3d',
    matches: 3,
    semantic_matches: 2
  });
  assert.ok(Math.abs(matches[0].hybrid_score - 2 / 61) < 0.000001);
  assert.ok(Math.abs(matches[1].hybrid_score - 1 / 62) < 0.000001);
  assert.equal(matches[0].provenance.citation.ref, hybridResult.segments[0].provenance.citation.ref);
  assert.deepEqual(await storage.searchSegmentsHybrid(request), matches);
  assert.deepEqual(
    (await storage.searchSegmentsHybrid({ ...request, owner_id: otherDocument.retention.owner_id })).map((match) => match.document_id),
    [otherDocument.document_id, otherDocument.document_id, otherDocument.document_id]
  );
  assert.equal((await storage.searchSegmentsHybrid({ ...request, owner_id: tombstoneDocument.retention.owner_id })).length, 0);
  assert.equal((await storage.searchSegmentsHybrid({ ...request, owner_id: purgedDocument.retention.owner_id })).length, 0);
  const wrongDimensionMatches = await storage.searchSegmentsHybrid({ ...request, query_embedding: [1, 0, 0, 0], model_id: 'hybrid-4d' });
  assert.deepEqual(wrongDimensionMatches.map((match) => match.semantic_rank), [null, null]);
  assert.deepEqual(describeRetrievalMode(wrongDimensionMatches, { model_id: 'hybrid-4d' }), {
    mode: 'lexical',
    model_id: 'hybrid-4d',
    matches: 2,
    semantic_matches: 0
  });

  await Promise.all(documents.map((entry) => removeDocument(entry.document_id, entry.retention.owner_id)));
});

integrationTest('revalidates citation freshness across ownership, retention, deletion, and re-ingestion', async () => {
  const storage = createStorage({ pool });
  await removeDocument(hybridDocument.document_id, hybridDocument.retention.owner_id);
  await storage.saveDocumentAndSegments(hybridDocument, hybridResult);

  const matches = await storage.searchSegmentsLexical({
    query: 'contract',
    owner_id: hybridDocument.retention.owner_id,
    limit: 2
  });
  const citations = resolveCitations(matches, { owner_id: hybridDocument.retention.owner_id });
  assert.deepEqual(
    await storage.revalidateCitations(citations, { owner_id: hybridDocument.retention.owner_id }),
    { valid: true, stale_ids: [] }
  );

  const mixedCitations = [
    citations[0],
    { ...citations[1], segment_id: 'missing-segment-1' },
    citations[1],
    { ...citations[0], segment_id: 'missing-segment-2' }
  ];
  assert.deepEqual(
    await storage.revalidateCitations(mixedCitations, { owner_id: hybridDocument.retention.owner_id }),
    { valid: false, stale_ids: ['missing-segment-1', 'missing-segment-2'] }
  );

  assert.deepEqual(
    await storage.revalidateCitations(citations, { owner_id: 'synthetic-hybrid-owner-b' }),
    { valid: false, stale_ids: citations.map((citation) => citation.segment_id) }
  );

  await pool.query(
    "UPDATE documents SET retention_state = 'tombstone' WHERE document_id = $1 AND owner_id = $2",
    [hybridDocument.document_id, hybridDocument.retention.owner_id]
  );
  assert.deepEqual(
    await storage.revalidateCitations(citations, { owner_id: hybridDocument.retention.owner_id }),
    { valid: false, stale_ids: citations.map((citation) => citation.segment_id) }
  );
  await pool.query(
    "UPDATE documents SET retention_state = 'purged' WHERE document_id = $1 AND owner_id = $2",
    [hybridDocument.document_id, hybridDocument.retention.owner_id]
  );
  assert.deepEqual(
    await storage.revalidateCitations(citations, { owner_id: hybridDocument.retention.owner_id }),
    { valid: false, stale_ids: citations.map((citation) => citation.segment_id) }
  );

  await pool.query(
    "UPDATE documents SET retention_state = 'active' WHERE document_id = $1 AND owner_id = $2",
    [hybridDocument.document_id, hybridDocument.retention.owner_id]
  );
  const changedDocument = {
    ...hybridDocument,
    text: 'contract replacement only.',
    source_hash: 'sha256:9999999999999999999999999999999999999999999999999999999999999999'
  };
  await storage.saveDocumentAndSegments(changedDocument, segmentDocument(changedDocument, { max_segment_chars: 100 }));
  assert.deepEqual(
    await storage.revalidateCitations(citations, { owner_id: hybridDocument.retention.owner_id }),
    { valid: false, stale_ids: citations.map((citation) => citation.segment_id) }
  );

  await storage.deleteDocument(hybridDocument.document_id, hybridDocument.retention.owner_id);
  assert.deepEqual(
    await storage.revalidateCitations(citations, { owner_id: hybridDocument.retention.owner_id }),
    { valid: false, stale_ids: citations.map((citation) => citation.segment_id) }
  );
});

integrationTest('executes a backfill plan to complete and repair coverage with an injected embedder', async () => {
  const storage = createStorage({ pool });
  const model = 'backfill-worker-3d';
  const owner = 'synthetic-worker-owner-a';
  const workerDocument = {
    ...document,
    document_id: 'urn:document:postgres-backfill-worker',
    text: 'alpha one.\n\nbeta two.\n\ngamma three.',
    source_hash: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    source_label: 'synthetic-backfill-worker-fixture.txt',
    retention: { owner_id: owner, state: 'active' }
  };
  const workerResult = segmentDocument(workerDocument, { max_segment_chars: 100 });
  const segmentIds = workerResult.segments.map(({ id }) => id);
  const expectedInputs = workerResult.segments.map(({ text }) => text);
  const embedCalls = [];
  const embed = async ({ model_id, dimensions, inputs }) => {
    embedCalls.push({ model_id, dimensions, inputs });
    return inputs.map((_, index) => semanticVectors3d[index % semanticVectors3d.length]);
  };

  await pool.query('DELETE FROM embedding_models WHERE model_id = $1', [model]);
  await removeDocument(workerDocument.document_id, owner);
  await storage.saveDocumentAndSegments(workerDocument, workerResult);
  await storage.registerEmbeddingModel({ model_id: model, dimensions: 3 });

  assert.deepEqual(
    await runEmbeddingBackfill({ storage, embed, model_id: model, owner_id: owner }),
    {
      model_id: model,
      owner_id: owner,
      dimensions: 3,
      processed_documents: 1,
      embedded_segments: 3,
      skipped_documents: []
    }
  );
  assert.deepEqual(embedCalls, [{ model_id: model, dimensions: 3, inputs: expectedInputs }]);
  assert.deepEqual(
    await storage.inspectEmbeddingCoverage({ model_id: model, owner_id: owner }),
    {
      model_id: model,
      owner_id: owner,
      status: 'active',
      dimensions: 3,
      total_segments: 3,
      embedded_segments: 3,
      missing_segments: 0,
      dimension_mismatch_segments: 0
    }
  );
  assert.deepEqual(
    await runEmbeddingBackfill({ storage, embed, model_id: model, owner_id: owner }),
    {
      model_id: model,
      owner_id: owner,
      dimensions: 3,
      processed_documents: 0,
      embedded_segments: 0,
      skipped_documents: []
    }
  );
  assert.equal(embedCalls.length, 1);
  const workerMatches = await storage.searchSegmentsSemantic({
    query_embedding: [0, 1, 0],
    model_id: model,
    owner_id: owner,
    limit: 3
  });
  assert.equal(workerMatches[0].id, workerResult.segments[1].id);
  assert.equal(workerMatches[0].segment_index, 1);
  const workerFirstMatches = await storage.searchSegmentsSemantic({
    query_embedding: [1, 0, 0],
    model_id: model,
    owner_id: owner,
    limit: 3
  });
  assert.equal(workerFirstMatches[0].id, workerResult.segments[0].id);

  await pool.query(
    'UPDATE segment_embeddings SET dimensions = 2 WHERE segment_id = $1 AND model_id = $2',
    [segmentIds[1], model]
  );
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: model, owner_id: owner })).documents[0].dimension_mismatch_segment_ids,
    [segmentIds[1]]
  );
  assert.deepEqual(
    await runEmbeddingBackfill({ storage, embed, model_id: model, owner_id: owner }),
    {
      model_id: model,
      owner_id: owner,
      dimensions: 3,
      processed_documents: 1,
      embedded_segments: 3,
      skipped_documents: []
    }
  );
  assert.deepEqual(
    await storage.inspectEmbeddingCoverage({ model_id: model, owner_id: owner }),
    {
      model_id: model,
      owner_id: owner,
      status: 'active',
      dimensions: 3,
      total_segments: 3,
      embedded_segments: 3,
      missing_segments: 0,
      dimension_mismatch_segments: 0
    }
  );

  await removeDocument(workerDocument.document_id, owner);
  await pool.query('DELETE FROM embedding_models WHERE model_id = $1', [model]);
});

integrationTest('replaces atomically and cascades document deletion', async () => {
  const storage = createStorage({ pool });
  await removeDocument(document.document_id, document.retention.owner_id);
  await storage.saveDocumentAndSegments(document, result);
  await storage.saveDocumentAndSegments(document, result);
  assert.deepEqual(await storage.getDocumentWithSegments(document.document_id, document.retention.owner_id), { ...document, segments: result.segments });

  const broken = {
    ...result,
    segments: [result.segments[0], { ...result.segments[1], id: result.segments[0].id }]
  };
  await assert.rejects(storage.saveDocumentAndSegments(document, broken));
  assert.deepEqual(await storage.getDocumentWithSegments(document.document_id, document.retention.owner_id), { ...document, segments: result.segments });

  assert.equal(await storage.deleteDocument(document.document_id, document.retention.owner_id), true);
  assert.equal(await storage.getDocumentWithSegments(document.document_id, document.retention.owner_id), null);
  const childRows = await pool.query('SELECT count(*)::int AS count FROM segments WHERE document_id = $1', [document.document_id]);
  assert.equal(childRows.rows[0].count, 0);
});

const collectionsOwnerA = 'synthetic-collections-owner-a';
const collectionsOwnerB = 'synthetic-collections-owner-b';
const collectionAlpha = 'synthetic-collection-alpha';
const collectionBeta = 'synthetic-collection-beta';
const collectionForeign = 'synthetic-collection-foreign';
const collectionsModel3d = 'synthetic-collections-3d';
const collectionsModel4d = 'synthetic-collections-4d';
const collectionsCreatedAt = '2026-01-02T00:00:00Z';

function collectionDocument(documentId, text, ownerId, collections) {
  const candidate = {
    document_id: documentId,
    text,
    source_label: `${documentId.slice('urn:document:'.length)}.txt`,
    source_hash: `sha256:${String(documentId.length).padStart(2, '0').repeat(32)}`,
    lineage: { parser: 'synthetic-parser@1.0.0', model: null },
    created_at: '2026-01-01T00:00:00Z',
    retention: { owner_id: ownerId, state: 'active' }
  };
  if (collections !== undefined) {
    candidate.collections = collections;
  }
  return candidate;
}

const collectionsAlphaDocument = collectionDocument(
  'urn:document:collections-alpha',
  'invoice alpha quarterly',
  collectionsOwnerA,
  [collectionAlpha]
);
const collectionsBetaDocument = collectionDocument(
  'urn:document:collections-beta',
  'contract beta renewal',
  collectionsOwnerA,
  [collectionBeta]
);
const collectionsUnscopedDocument = collectionDocument(
  'urn:document:collections-unscoped',
  'invoice contract gamma mixed',
  collectionsOwnerA
);
const collectionsForeignDocument = collectionDocument(
  'urn:document:collections-foreign',
  'invoice delta foreign',
  collectionsOwnerB,
  [collectionForeign]
);

async function seedCollections(storage) {
  await removeCollections(collectionsOwnerA);
  await removeCollections(collectionsOwnerB);
  await storage.createCollection({ collection_id: collectionAlpha, owner_id: collectionsOwnerA, created_at: collectionsCreatedAt });
  await storage.createCollection({ collection_id: collectionBeta, owner_id: collectionsOwnerA, created_at: collectionsCreatedAt });
  await storage.createCollection({ collection_id: collectionForeign, owner_id: collectionsOwnerB, created_at: collectionsCreatedAt });
  for (const candidate of [
    collectionsAlphaDocument,
    collectionsBetaDocument,
    collectionsUnscopedDocument,
    collectionsForeignDocument
  ]) {
    await removeDocument(candidate.document_id, candidate.retention.owner_id);
    const segmented = segmentDocument(candidate, { max_segment_chars: 100 });
    await storage.saveDocumentAndSegments(candidate, segmented);
  }
  await storage.registerEmbeddingModel({ model_id: collectionsModel3d, dimensions: 3 });
  await storage.registerEmbeddingModel({ model_id: collectionsModel4d, dimensions: 4 });
  const vectors = {
    [collectionsAlphaDocument.document_id]: [1, 0, 0],
    [collectionsBetaDocument.document_id]: [0, 1, 0],
    [collectionsUnscopedDocument.document_id]: [0.7, 0.7, 0],
    [collectionsForeignDocument.document_id]: [1, 0, 0]
  };
  for (const candidate of [
    collectionsAlphaDocument,
    collectionsBetaDocument,
    collectionsUnscopedDocument,
    collectionsForeignDocument
  ]) {
    const stored = await storage.getDocumentWithSegments(candidate.document_id, candidate.retention.owner_id);
    await storage.saveSegmentEmbeddings({
      document_id: candidate.document_id,
      owner_id: candidate.retention.owner_id,
      model_id: collectionsModel3d,
      dimensions: 3,
      embeddings: stored.segments.map((segment) => ({
        segment_id: segment.id,
        embedding: vectors[candidate.document_id]
      })),
      created_at: candidate.created_at
    });
  }
}

async function removeCollections(ownerId) {
  await pool.query('DELETE FROM collections WHERE owner_id = $1', [ownerId]);
}

test('rejects malformed collection scope before connecting', async () => {
  const storage = createStorage({ pool: { connect() { throw new Error('database must not be contacted'); } } });
  const contactlessPool = {
    connect() {
      throw new Error('database must not be contacted');
    },
    query() {
      throw new Error('database must not be contacted');
    }
  };
  const readOnly = createStorage({ pool: contactlessPool });

  await assert.rejects(
    storage.saveDocumentAndSegments({ ...document, collections: collectionAlpha }, result),
    /collections/
  );
  await assert.rejects(
    storage.saveDocumentAndSegments({ ...document, collections: ['../other-collection'] }, result),
    /collections/
  );
  await assert.rejects(readOnly.listDocumentCollections(document.document_id, '../other-owner'), /owner_id/);
  await assert.rejects(
    readOnly.searchSegmentsLexical({ query: 'invoice', owner_id: document.retention.owner_id, collection_ids: [] }),
    /collection_ids/
  );
  await assert.rejects(
    readOnly.searchSegmentsLexical({ query: 'invoice', owner_id: document.retention.owner_id, collection_ids: 'synthetic-collection-alpha' }),
    /collection_ids/
  );
  await assert.rejects(
    readOnly.searchSegmentsLexical({ query: 'invoice', owner_id: document.retention.owner_id, collection_ids: ['../other-collection'] }),
    /collection_ids/
  );
  await assert.rejects(
    readOnly.searchSegmentsSemantic({
      query_embedding: [1, 0, 0],
      model_id: collectionsModel3d,
      owner_id: document.retention.owner_id,
      collection_ids: ['']
    }),
    /collection_ids/
  );
  await assert.rejects(
    readOnly.searchSegmentsHybrid({
      query: 'invoice',
      query_embedding: [1, 0, 0],
      model_id: collectionsModel3d,
      owner_id: document.retention.owner_id,
      collection_ids: []
    }),
    /collection_ids/
  );
  await assert.rejects(
    readOnly.listEmbeddingBackfill({ model_id: collectionsModel3d, owner_id: document.retention.owner_id, collection_ids: [] }),
    /collection_ids/
  );
  await assert.rejects(readOnly.createCollection({ collection_id: '../other-collection', owner_id: collectionsOwnerA }), /collection_id/);
  await assert.rejects(
    readOnly.createCollection({ collection_id: collectionAlpha, owner_id: '../other-owner' }),
    /owner_id/
  );
  await assert.rejects(readOnly.deleteCollection('../other-collection', collectionsOwnerA), /collection_id/);
  await assert.rejects(readOnly.deleteCollection(collectionAlpha, '../other-owner'), /owner_id/);
});

integrationTest('ingests a document into zero, one, or many collections of its owner', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);
  const ownerId = collectionsOwnerA;

  assert.deepEqual(
    await storage.listDocumentCollections(collectionsUnscopedDocument.document_id, ownerId),
    []
  );
  assert.deepEqual(
    await storage.listDocumentCollections(collectionsAlphaDocument.document_id, ownerId),
    [collectionAlpha]
  );

  const many = { ...collectionsUnscopedDocument, collections: [collectionAlpha, collectionBeta] };
  await storage.saveDocumentAndSegments(many, segmentDocument(many, { max_segment_chars: 100 }));
  assert.deepEqual(
    await storage.listDocumentCollections(collectionsUnscopedDocument.document_id, ownerId),
    [collectionAlpha, collectionBeta]
  );

  const replaced = { ...collectionsUnscopedDocument, collections: [collectionBeta] };
  await storage.saveDocumentAndSegments(replaced, segmentDocument(replaced, { max_segment_chars: 100 }));
  assert.deepEqual(
    await storage.listDocumentCollections(collectionsUnscopedDocument.document_id, ownerId),
    [collectionBeta]
  );
  await removeCollections(ownerId);
});

integrationTest('auto-creates an unknown collection and refuses a foreign collection', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);
  const ownerId = collectionsOwnerA;
  const target = collectionDocument('urn:document:collections-rejected', 'invoice rejected', ownerId, [
    'synthetic-collection-missing'
  ]);
  await removeDocument(target.document_id, ownerId);

  await storage.saveDocumentAndSegments(target, segmentDocument({ ...target, text: 'invoice rejected' }, { max_segment_chars: 100 }));
  assert.deepEqual(await storage.listDocumentCollections(target.document_id, ownerId), ['synthetic-collection-missing']);

  const foreignTarget = { ...target, document_id: 'urn:document:collections-foreign-rejected', collections: [collectionForeign] };
  await assert.rejects(
    storage.saveDocumentAndSegments(foreignTarget, segmentDocument(foreignTarget, { max_segment_chars: 100 })),
    /collection/
  );
  assert.equal(await storage.getDocumentWithSegments(foreignTarget.document_id, ownerId), null);

  await assert.rejects(
    pool.query(
      'INSERT INTO document_collections (collection_id, document_id, owner_id) VALUES ($1, $2, $3)',
      [collectionAlpha, collectionsForeignDocument.document_id, collectionsOwnerA]
    ),
    /foreign key/
  );
  await removeDocument(target.document_id, ownerId);
  await removeCollections(ownerId);
  await removeCollections(collectionsOwnerB);
});

integrationTest('scopes lexical, semantic, hybrid, and backfill retrieval to a collection', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);
  const ownerId = collectionsOwnerA;
  const segmentIds = async (candidate) => (
    (await storage.getDocumentWithSegments(candidate.document_id, candidate.retention.owner_id)).segments.map((segment) => segment.id)
  );
  const alphaSegments = await segmentIds(collectionsAlphaDocument);
  const betaSegments = await segmentIds(collectionsBetaDocument);
  const unscopedSegments = await segmentIds(collectionsUnscopedDocument);

  assert.deepEqual(
    (await storage.searchSegmentsLexical({ query: 'invoice', owner_id: ownerId })).map((match) => match.id).sort(),
    [...alphaSegments, ...unscopedSegments].sort()
  );
  assert.deepEqual(
    (await storage.searchSegmentsLexical({ query: 'invoice', owner_id: ownerId, collection_ids: [collectionAlpha] })).map((match) => match.id),
    alphaSegments
  );
  assert.deepEqual(
    (await storage.searchSegmentsLexical({ query: 'invoice', owner_id: ownerId, collection_ids: [collectionAlpha, collectionBeta] })).map((match) => match.id).sort(),
    alphaSegments
  );

  assert.deepEqual(
    (await storage.searchSegmentsSemantic({
      query_embedding: [1, 0, 0],
      model_id: collectionsModel3d,
      owner_id: ownerId,
      collection_ids: [collectionAlpha]
    })).map((match) => match.id),
    alphaSegments
  );
  assert.deepEqual(
    (await storage.searchSegmentsSemantic({
      query_embedding: [1, 0, 0],
      model_id: collectionsModel3d,
      owner_id: ownerId,
      collection_ids: [collectionBeta]
    })).map((match) => match.id),
    betaSegments
  );
  assert.equal(
    (await storage.searchSegmentsSemantic({ query_embedding: [1, 0, 0], model_id: collectionsModel3d, owner_id: ownerId })).length,
    3
  );

  const alphaHybrid = await storage.searchSegmentsHybrid({
    query: 'invoice',
    query_embedding: [1, 0, 0],
    model_id: collectionsModel3d,
    owner_id: ownerId,
    collection_ids: [collectionAlpha]
  });
  assert.deepEqual(alphaHybrid.map((match) => match.id), alphaSegments);
  assert.deepEqual(Object.keys(alphaHybrid[0]).sort(), [
    'document_id',
    'end_offset',
    'hybrid_score',
    'id',
    'lexical_rank',
    'metadata',
    'owner_id',
    'provenance',
    'retention_state',
    'segment_index',
    'semantic_rank',
    'source_hash',
    'source_label',
    'start_offset',
    'text',
    'text_sha256'
  ]);
  assert.equal(
    (await storage.searchSegmentsHybrid({
      query: 'invoice',
      query_embedding: [1, 0, 0],
      model_id: collectionsModel3d,
      owner_id: ownerId
    })).length,
    3
  );

  assert.deepEqual(
    (await storage.listEmbeddingBackfill({ model_id: collectionsModel4d, owner_id: ownerId })).documents.map(({ document_id }) => document_id),
    [collectionsAlphaDocument.document_id, collectionsBetaDocument.document_id, collectionsUnscopedDocument.document_id]
  );
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({
      model_id: collectionsModel4d,
      owner_id: ownerId,
      collection_ids: [collectionBeta]
    })).documents.map(({ document_id }) => document_id),
    [collectionsBetaDocument.document_id]
  );
  await removeCollections(ownerId);
});

integrationTest('isolates a scoped query from another owner and from another collection', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);
  const ownerB = collectionsOwnerB;
  const foreignSegments = (
    await storage.getDocumentWithSegments(collectionsForeignDocument.document_id, ownerB)
  ).segments.map((segment) => segment.id);

  assert.deepEqual(
    (await storage.searchSegmentsLexical({ query: 'invoice', owner_id: ownerB, collection_ids: [collectionForeign] })).map((match) => match.id),
    foreignSegments
  );
  assert.deepEqual(
    await storage.searchSegmentsLexical({ query: 'invoice', owner_id: collectionsOwnerA, collection_ids: [collectionForeign] }),
    []
  );
  assert.deepEqual(
    await storage.searchSegmentsSemantic({
      query_embedding: [1, 0, 0],
      model_id: collectionsModel3d,
      owner_id: collectionsOwnerA,
      collection_ids: [collectionForeign]
    }),
    []
  );
  assert.deepEqual(
    await storage.searchSegmentsHybrid({
      query: 'invoice',
      query_embedding: [1, 0, 0],
      model_id: collectionsModel3d,
      owner_id: collectionsOwnerA,
      collection_ids: [collectionForeign]
    }),
    []
  );
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({
      model_id: collectionsModel4d,
      owner_id: collectionsOwnerB,
      collection_ids: [collectionForeign]
    })).documents.map(({ document_id }) => document_id),
    [collectionsForeignDocument.document_id]
  );
  assert.deepEqual(
    (await storage.listEmbeddingBackfill({
      model_id: collectionsModel4d,
      owner_id: collectionsOwnerA,
      collection_ids: [collectionForeign]
    })).documents,
    []
  );
  assert.deepEqual(await storage.listDocumentCollections(collectionsForeignDocument.document_id, collectionsOwnerA), []);
  await removeCollections(collectionsOwnerA);
  await removeCollections(ownerB);
});

integrationTest('deletes a collection without deleting its documents or embeddings', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);
  const ownerId = collectionsOwnerA;
  const documentSegments = (
    await storage.getDocumentWithSegments(collectionsAlphaDocument.document_id, ownerId)
  ).segments.map((segment) => segment.id);

  assert.equal(await storage.deleteCollection(collectionAlpha, collectionsOwnerB), false);
  assert.equal(await storage.deleteCollection(collectionAlpha, ownerId), true);
  assert.deepEqual(await storage.listDocumentCollections(collectionsAlphaDocument.document_id, ownerId), []);
  assert.deepEqual(
    await storage.searchSegmentsLexical({ query: 'invoice', owner_id: ownerId, collection_ids: [collectionAlpha] }),
    []
  );
  assert.deepEqual(
    (await storage.searchSegmentsLexical({ query: 'invoice', owner_id: ownerId })).map((match) => match.id).sort(),
    [...documentSegments, ...(await storage.getDocumentWithSegments(collectionsUnscopedDocument.document_id, ownerId)).segments.map((segment) => segment.id)].sort()
  );
  const embeddings = await pool.query(
    'SELECT count(*)::int AS count FROM segment_embeddings WHERE segment_id = ANY($1::text[])',
    [documentSegments]
  );
  assert.equal(embeddings.rows[0].count, documentSegments.length);
  await removeCollections(ownerId);
});

integrationTest('removes memberships when a document is deleted', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);
  const ownerId = collectionsOwnerA;

  assert.deepEqual(
    await storage.listDocumentCollections(collectionsBetaDocument.document_id, ownerId),
    [collectionBeta]
  );
  assert.equal(await storage.deleteDocument(collectionsBetaDocument.document_id, ownerId), true);
  const memberships = await pool.query(
    'SELECT count(*)::int AS count FROM document_collections WHERE document_id = $1',
    [collectionsBetaDocument.document_id]
  );
  assert.equal(memberships.rows[0].count, 0);
  const collections = await pool.query('SELECT count(*)::int AS count FROM collections WHERE owner_id = $1', [ownerId]);
  assert.equal(collections.rows[0].count, 2);
  await removeCollections(ownerId);
});

integrationTest('auto-creates declared collections and refuses foreign collections', async () => {
  const storage = createStorage({ pool });
  const ownerId = 'synthetic-auto-collection-owner';
  const foreignOwnerId = 'synthetic-auto-collection-foreign';
  const collectionId = 'synthetic-auto-collection';
  const foreignCollectionId = 'synthetic-foreign-collection';
  const autoDocument = {
    ...document,
    document_id: 'urn:document:postgres-auto-collection',
    retention: { owner_id: ownerId, state: 'active' },
    collections: [collectionId]
  };
  const foreignCollectionDocument = {
    ...autoDocument,
    document_id: 'urn:document:postgres-foreign-collection',
    collections: [foreignCollectionId]
  };

  await removeDocument(autoDocument.document_id, ownerId);
  await removeDocument(foreignCollectionDocument.document_id, ownerId);
  await pool.query('DELETE FROM collections WHERE collection_id = ANY($1::text[])', [[collectionId, foreignCollectionId]]);
  await storage.createCollection({ collection_id: foreignCollectionId, owner_id: foreignOwnerId, created_at: document.created_at });

  await storage.saveDocumentAndSegments(autoDocument, segmentDocument(autoDocument, { max_segment_chars: 80 }));
  assert.deepEqual(await storage.listDocumentCollections(autoDocument.document_id, ownerId), [collectionId]);
  assert.deepEqual((await pool.query('SELECT owner_id FROM collections WHERE collection_id = $1', [collectionId])).rows, [{ owner_id: ownerId }]);
  await assert.rejects(
    storage.saveDocumentAndSegments(foreignCollectionDocument, segmentDocument(foreignCollectionDocument, { max_segment_chars: 80 })),
    /unknown or foreign collection/
  );
  assert.equal(await storage.getDocumentWithSegments(foreignCollectionDocument.document_id, ownerId), null);

  await removeDocument(autoDocument.document_id, ownerId);
  await pool.query('DELETE FROM collections WHERE collection_id = ANY($1::text[])', [[collectionId, foreignCollectionId]]);
});

integrationTest('moves documents between retention states and purges owner-scoped rows with counts', async () => {
  const storage = createStorage({ pool });
  const ownerId = 'synthetic-retention-owner';
  const foreignOwnerId = 'synthetic-retention-foreign';
  const retentionDocument = {
    ...semanticDocument,
    document_id: 'urn:document:postgres-retention-lifecycle',
    retention: { owner_id: ownerId, state: 'active' }
  };
  const retentionResult = segmentDocument(retentionDocument, { max_segment_chars: 100 });

  await removeDocument(retentionDocument.document_id, ownerId);
  await storage.saveDocumentAndSegments(retentionDocument, retentionResult);
  await storage.saveSegmentEmbeddings({
    document_id: retentionDocument.document_id,
    owner_id: ownerId,
    model_id: 'retention-3d',
    dimensions: 3,
    embeddings: retentionResult.segments.map((segment) => ({ segment_id: segment.id, embedding: [1, 0, 0] })),
    created_at: retentionDocument.created_at
  });

  assert.equal(await storage.setDocumentRetention(retentionDocument.document_id, ownerId, 'tombstone'), 'tombstone');
  assert.equal((await storage.getDocumentWithSegments(retentionDocument.document_id, ownerId)).retention.state, 'tombstone');
  assert.equal(await storage.setDocumentRetention(retentionDocument.document_id, ownerId, 'active'), 'active');
  assert.equal(await storage.setDocumentRetention(retentionDocument.document_id, foreignOwnerId, 'tombstone'), null);
  await assert.rejects(storage.setDocumentRetention(retentionDocument.document_id, ownerId, 'purged'), /physically removed/);

  await assert.rejects(storage.purgeDocument(retentionDocument.document_id, foreignOwnerId), /different owner/);
  assert.deepEqual(await storage.purgeDocument(retentionDocument.document_id, ownerId), {
    documents: 1,
    segments: retentionResult.segments.length,
    embeddings: retentionResult.segments.length
  });
  assert.deepEqual(await storage.purgeDocument(retentionDocument.document_id, ownerId), {
    documents: 0,
    segments: 0,
    embeddings: 0
  });
});

integrationTest('exports one owner corpus with collections, memberships, segments, and embedding metadata', async () => {
  const storage = createStorage({ pool });
  const ownerId = 'synthetic-export-owner';
  const foreignOwnerId = 'synthetic-export-foreign';
  const collectionId = 'synthetic-export-collection';
  const exportedDocument = {
    ...document,
    document_id: 'urn:document:postgres-export-owner',
    retention: { owner_id: ownerId, state: 'active' },
    collections: [collectionId]
  };
  const foreignDocument = {
    ...document,
    document_id: 'urn:document:postgres-export-foreign',
    retention: { owner_id: foreignOwnerId, state: 'active' }
  };
  const exportedResult = segmentDocument(exportedDocument, { max_segment_chars: 80 });

  await Promise.all([
    removeDocument(exportedDocument.document_id, ownerId),
    removeDocument(foreignDocument.document_id, foreignOwnerId)
  ]);
  await pool.query('DELETE FROM collections WHERE collection_id = $1', [collectionId]);
  await storage.saveDocumentAndSegments(exportedDocument, exportedResult);
  await storage.saveDocumentAndSegments(foreignDocument, segmentDocument(foreignDocument, { max_segment_chars: 80 }));
  await storage.saveSegmentEmbeddings({
    document_id: exportedDocument.document_id,
    owner_id: ownerId,
    model_id: 'export-3d',
    dimensions: 3,
    embeddings: [{ segment_id: exportedResult.segments[0].id, embedding: [1, 0, 0] }],
    created_at: exportedDocument.created_at
  });

  await storage.setDocumentRetention(exportedDocument.document_id, ownerId, 'tombstone');
  const exported = await storage.exportOwner(ownerId);
  assert.equal(exported.owner_id, ownerId);
  assert.deepEqual(exported.collections.map(({ collection_id, owner_id }) => ({ collection_id, owner_id })), [{ collection_id: collectionId, owner_id: ownerId }]);
  assert.equal(exported.documents.length, 1);
  assert.deepEqual(exported.documents[0], {
    document_id: exportedDocument.document_id,
    text: exportedDocument.text,
    source_label: exportedDocument.source_label,
    source_hash: exportedDocument.source_hash,
    lineage: exportedDocument.lineage,
    created_at: exportedDocument.created_at,
    retention: { owner_id: ownerId, state: 'tombstone' },
    collection_ids: [collectionId],
    segments: exportedResult.segments.map((segment) => ({
      ...segment,
      embedding_metadata: [{ model_id: 'export-3d', dimensions: 3 }]
    }))
  });

  await removeDocument(exportedDocument.document_id, ownerId);
  await removeDocument(foreignDocument.document_id, foreignOwnerId);
  await pool.query('DELETE FROM collections WHERE collection_id = $1', [collectionId]);
});

integrationTest('applies migrations once and makes the second run a no-op', async () => {
  const client = await pool.connect();
  try {
    await applyMigrations(client);
    assert.deepEqual(await applyMigrations(client), []);
    const recorded = await client.query('SELECT version FROM schema_migrations ORDER BY version');
    assert.deepEqual(recorded.rows.map(({ version }) => version), [
      '001-extensions.sql',
      '002-schema.sql',
      '003-segment-embeddings.sql',
      '004-embedding-models.sql',
      '005-collections.sql',
      '006-graph-projection.sql'
    ]);
  } finally {
    client.release();
  }
});

integrationTest('suggests document collections from the document content within one owner boundary', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);

  const candidates = await storage.suggestDocumentCollections({
    document_id: collectionsUnscopedDocument.document_id,
    owner_id: collectionsOwnerA,
    max_collections: 5
  });
  const ownedCollections = (await pool.query('SELECT collection_id FROM collections WHERE owner_id = $1', [collectionsOwnerA]))
    .rows.map(({ collection_id }) => collection_id);
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every(({ collection_id }) => ownedCollections.includes(collection_id)));
  assert.ok(candidates.some(({ collection_id }) => collection_id === collectionAlpha));
  assert.ok(candidates.some(({ collection_id }) => collection_id === collectionBeta));
  assert.ok(!candidates.some(({ collection_id }) => collection_id === collectionForeign));
  assert.ok(candidates.every(({ segment_id }) => typeof segment_id === 'string'));
  const scores = candidates.map(({ score }) => score);
  assert.deepEqual(scores, [...scores].sort((left, right) => right - left));

  const capped = await storage.suggestDocumentCollections({
    document_id: collectionsUnscopedDocument.document_id,
    owner_id: collectionsOwnerA,
    max_collections: 1
  });
  assert.equal(capped.length, 1);

  // The same document is invisible to another owner, so nothing is suggested from it.
  assert.deepEqual(
    await storage.suggestDocumentCollections({ document_id: collectionsUnscopedDocument.document_id, owner_id: collectionsOwnerB }),
    []
  );
  assert.deepEqual(
    await storage.suggestDocumentCollections({ document_id: collectionsForeignDocument.document_id, owner_id: collectionsOwnerA }),
    []
  );
  await removeCollections(collectionsOwnerA);
  await removeCollections(collectionsOwnerB);
});

integrationTest('moves a document to one collection atomically and refuses a foreign collection', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);

  assert.equal(
    await storage.moveDocumentCollection({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerA,
      collection_id: collectionBeta
    }),
    collectionBeta
  );
  assert.deepEqual(await storage.listDocumentCollections(collectionsAlphaDocument.document_id, collectionsOwnerA), [collectionBeta]);

  // A concurrent reader holds the document row, so it sees the old membership only: never both, never none.
  const holder = await pool.connect();
  try {
    await holder.query('BEGIN');
    await holder.query('SELECT document_id FROM documents WHERE document_id = $1 FOR UPDATE', [collectionsAlphaDocument.document_id]);
    let moved = false;
    const pending = storage.moveDocumentCollection({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerA,
      collection_id: collectionAlpha
    }).then(() => {
      moved = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(moved, false, 'the move must wait for the row lock');
    assert.deepEqual(await storage.listDocumentCollections(collectionsAlphaDocument.document_id, collectionsOwnerA), [collectionBeta]);
    await holder.query('COMMIT');
    await pending;
    assert.deepEqual(await storage.listDocumentCollections(collectionsAlphaDocument.document_id, collectionsOwnerA), [collectionAlpha]);
  } finally {
    holder.release();
  }

  await assert.rejects(
    storage.moveDocumentCollection({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerA,
      collection_id: collectionForeign
    }),
    /unknown or foreign collection/
  );
  assert.deepEqual(await storage.listDocumentCollections(collectionsAlphaDocument.document_id, collectionsOwnerA), [collectionAlpha]);
  await assert.rejects(
    storage.moveDocumentCollection({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerB,
      collection_id: collectionBeta
    }),
    /different owner/
  );
  await assert.rejects(
    storage.moveDocumentCollection({
      document_id: 'urn:document:collections-absent',
      owner_id: collectionsOwnerA,
      collection_id: collectionBeta
    }),
    /not found/
  );
  await removeCollections(collectionsOwnerA);
  await removeCollections(collectionsOwnerB);
});

integrationTest('confirms a document collection set atomically and refuses a foreign collection', async () => {
  const storage = createStorage({ pool });
  await seedCollections(storage);

  assert.deepEqual(
    await storage.confirmDocumentCollections({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerA,
      collection_ids: [collectionAlpha, collectionBeta]
    }),
    [collectionAlpha, collectionBeta]
  );
  assert.deepEqual(await storage.listDocumentCollections(collectionsAlphaDocument.document_id, collectionsOwnerA), [collectionAlpha, collectionBeta]);
  assert.deepEqual(
    await storage.confirmDocumentCollections({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerA,
      collection_ids: [collectionBeta]
    }),
    [collectionAlpha, collectionBeta]
  );

  await assert.rejects(
    storage.confirmDocumentCollections({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerA,
      collection_ids: [collectionBeta, collectionForeign]
    }),
    /unknown or foreign collection/
  );
  assert.deepEqual(await storage.listDocumentCollections(collectionsAlphaDocument.document_id, collectionsOwnerA), [collectionAlpha, collectionBeta]);
  await assert.rejects(
    storage.confirmDocumentCollections({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerB,
      collection_ids: [collectionForeign]
    }),
    /different owner/
  );
  await assert.rejects(
    storage.confirmDocumentCollections({
      document_id: collectionsAlphaDocument.document_id,
      owner_id: collectionsOwnerA,
      collection_ids: []
    }),
    /collection_ids/
  );
  await removeCollections(collectionsOwnerA);
  await removeCollections(collectionsOwnerB);
});

test('rejects malformed collection management input before connecting', async () => {
  const contactless = {
    connect() {
      throw new Error('database must not be contacted');
    },
    query() {
      throw new Error('database must not be contacted');
    }
  };
  const readOnly = createStorage({ pool: contactless });

  await assert.rejects(
    readOnly.suggestDocumentCollections({ document_id: '/private/source.pdf', owner_id: collectionsOwnerA }),
    /document_id/
  );
  await assert.rejects(
    readOnly.suggestDocumentCollections({ document_id: collectionsAlphaDocument.document_id, owner_id: '../other-owner' }),
    /owner_id/
  );
  await assert.rejects(
    readOnly.suggestDocumentCollections({ document_id: collectionsAlphaDocument.document_id, owner_id: collectionsOwnerA, max_collections: 0 }),
    /max_collections/
  );
  await assert.rejects(
    readOnly.suggestDocumentCollections({ document_id: collectionsAlphaDocument.document_id, owner_id: collectionsOwnerA, max_collections: 51 }),
    /max_collections/
  );
  await assert.rejects(
    readOnly.moveDocumentCollection({ document_id: collectionsAlphaDocument.document_id, owner_id: collectionsOwnerA, collection_id: '../other-collection' }),
    /collection_id/
  );
  await assert.rejects(
    readOnly.moveDocumentCollection({ document_id: collectionsAlphaDocument.document_id, owner_id: '../other-owner', collection_id: collectionAlpha }),
    /owner_id/
  );
  await assert.rejects(
    readOnly.confirmDocumentCollections({ document_id: collectionsAlphaDocument.document_id, owner_id: collectionsOwnerA, collection_ids: ['../other-collection'] }),
    /collection_ids/
  );
  await assert.rejects(
    readOnly.confirmDocumentCollections({ document_id: collectionsAlphaDocument.document_id, owner_id: collectionsOwnerA, collection_ids: [] }),
    /collection_ids/
  );
});

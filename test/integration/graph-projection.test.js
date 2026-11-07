import assert from 'node:assert/strict';
import test from 'node:test';
import { createGraphProjection, createStorage, segmentDocument } from '../../src/index.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl ? test : test.skip;
const pg = databaseUrl ? (await import('pg')).default : null;
const pool = pg ? new pg.Pool({ connectionString: databaseUrl }) : null;

const ownerA = 'synthetic-graph-owner-a';
const ownerB = 'synthetic-graph-owner-b';
const createdAt = '2026-01-01T00:00:00Z';

const documentA = {
  document_id: 'urn:document:graph-doc-a',
  text: 'Alice works at Acme Corp. Bob works at Beta Inc.',
  source_label: 'graph-fixture-a.txt',
  source_hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  lineage: { parser: 'synthetic-parser@1.0.0', model: null },
  created_at: createdAt,
  retention: { owner_id: ownerA, state: 'active' }
};
const resultA = segmentDocument(documentA, { max_segment_chars: 80 });

const documentB = {
  document_id: 'urn:document:graph-doc-b',
  text: 'Acme Corp acquired Gamma LLC in 2025.',
  source_label: 'graph-fixture-b.txt',
  source_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  lineage: { parser: 'synthetic-parser@1.0.0', model: null },
  created_at: createdAt,
  retention: { owner_id: ownerA, state: 'active' }
};
const resultB = segmentDocument(documentB, { max_segment_chars: 100 });

const foreignDocument = {
  document_id: 'urn:document:graph-doc-foreign',
  text: 'Foreign owner data.',
  source_label: 'graph-fixture-foreign.txt',
  source_hash: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  lineage: { parser: 'synthetic-parser@1.0.0', model: null },
  created_at: createdAt,
  retention: { owner_id: ownerB, state: 'active' }
};
const foreignResult = segmentDocument(foreignDocument, { max_segment_chars: 100 });

function makeCitation(doc, segResult, segIndex = 0) {
  const seg = segResult.segments[segIndex];
  return {
    document_id: doc.document_id,
    segment_id: seg.id,
    segment_index: seg.segment_index,
    source_hash: doc.source_hash,
    segment_hash: `sha256:${seg.text_sha256}`,
    citation_ref: `[doc:${doc.document_id}#seg${seg.segment_index}]`
  };
}

function makeEntity(id, doc, segResult, overrides = {}) {
  return {
    entity_id: id,
    owner_id: doc.retention.owner_id,
    document_id: doc.document_id,
    kind: 'organization',
    canonical_key: id,
    label: `Entity ${id}`,
    extractor: 'test-extractor@1.0.0',
    extraction_revision: 'rev-1',
    created_at: createdAt,
    segment_citations: [makeCitation(doc, segResult)],
    ...overrides
  };
}

function makeRelationship(id, doc, sourceEntityId, targetEntityId, segResult, overrides = {}) {
  return {
    relationship_id: id,
    owner_id: doc.retention.owner_id,
    document_id: doc.document_id,
    source_entity_id: sourceEntityId,
    target_entity_id: targetEntityId,
    relation: 'employs',
    confidence: 0.9,
    extractor: 'test-extractor@1.0.0',
    extraction_revision: 'rev-1',
    created_at: createdAt,
    segment_citations: [makeCitation(doc, segResult)],
    ...overrides
  };
}

async function cleanup() {
  await pool.query('DELETE FROM graph_entities WHERE owner_id = ANY($1::text[])', [[ownerA, ownerB]]);
  for (const docId of [documentA.document_id, documentB.document_id, foreignDocument.document_id]) {
    await pool.query('DELETE FROM documents WHERE document_id = $1', [docId]);
  }
}

test('rejects malformed graph projection input before connecting', async () => {
  const graph = createGraphProjection({ pool: { connect() { throw new Error('no db'); } } });

  await assert.rejects(
    graph.replaceProjection({ document_id: '/bad', owner_id: ownerA, entities: [], relationships: [] }),
    /document_id/
  );
  await assert.rejects(
    graph.replaceProjection({ document_id: documentA.document_id, owner_id: '../bad', entities: [], relationships: [] }),
    /owner_id/
  );
  await assert.rejects(
    graph.replaceProjection({ document_id: documentA.document_id, owner_id: ownerA, entities: 'bad', relationships: [] }),
    /entities/
  );
  await assert.rejects(
    graph.deleteProjection('/bad', ownerA),
    /document_id/
  );
  await assert.rejects(
    graph.deleteProjection(documentA.document_id, '../bad'),
    /owner_id/
  );
});

test('rejects malformed expand input', async () => {
  const graph = createGraphProjection({ pool: { connect() { throw new Error('no db'); } } });

  // Empty seed returns empty, not an error
  const empty = await graph.expandGraph({ seed_entity_ids: [], owner_id: ownerA });
  assert.deepEqual(empty, []);

  await assert.rejects(
    graph.expandGraph({ seed_entity_ids: ['e1'], owner_id: '../bad' }),
    /owner_id/
  );
  await assert.rejects(
    graph.expandGraph({ seed_entity_ids: ['e1'], owner_id: ownerA, max_depth: 0 }),
    /max_depth/
  );
  await assert.rejects(
    graph.expandGraph({ seed_entity_ids: ['e1'], owner_id: ownerA, max_results: 0 }),
    /max_results/
  );
  await assert.rejects(
    graph.expandGraph({ seed_entity_ids: ['e1'], owner_id: ownerA, statement_timeout_ms: 50 }),
    /statement_timeout_ms/
  );
});

if (pool) {
  test.after(async () => pool.end());
}

integrationTest('projection re-run does not duplicate rows', async () => {
  const storage = createStorage({ pool });
  const graph = createGraphProjection({ pool });
  await cleanup();
  await storage.saveDocumentAndSegments(documentA, resultA);

  const entityAcme = makeEntity('acme-1', documentA, resultA);
  const projection = {
    document_id: documentA.document_id,
    owner_id: ownerA,
    entities: [entityAcme],
    relationships: []
  };

  await graph.replaceProjection(projection);
  const firstCount = await pool.query(
    'SELECT count(*)::int AS c FROM graph_entities WHERE document_id = $1 AND owner_id = $2',
    [documentA.document_id, ownerA]
  );
  assert.equal(firstCount.rows[0].c, 1);

  // Re-run the same projection
  await graph.replaceProjection(projection);
  const secondCount = await pool.query(
    'SELECT count(*)::int AS c FROM graph_entities WHERE document_id = $1 AND owner_id = $2',
    [documentA.document_id, ownerA]
  );
  assert.equal(secondCount.rows[0].c, 1);

  await cleanup();
});

integrationTest('expansion returns claims with their citations', async () => {
  const storage = createStorage({ pool });
  const graph = createGraphProjection({ pool });
  await cleanup();
  await storage.saveDocumentAndSegments(documentA, resultA);

  const entityAcme = makeEntity('acme-2', documentA, resultA, {
    kind: 'organization', canonical_key: 'acme', label: 'Acme Corp'
  });
  const entityAlice = makeEntity('alice-2', documentA, resultA, {
    kind: 'person', canonical_key: 'alice', label: 'Alice'
  });
  const relEmploys = makeRelationship('rel-employs-2', documentA, 'acme-2', 'alice-2', resultA);

  await graph.replaceProjection({
    document_id: documentA.document_id,
    owner_id: ownerA,
    entities: [entityAcme, entityAlice],
    relationships: [relEmploys]
  });

  const claims = await graph.expandGraph({ seed_entity_ids: ['acme-2'], owner_id: ownerA });
  assert.ok(claims.length > 0, 'expansion must return at least one claim');

  // The seed entity itself must appear
  const seedClaim = claims.find(c => c.claim_type === 'entity' && c.entity_id === 'acme-2');
  assert.ok(seedClaim, 'seed entity must be in results');
  assert.ok(Array.isArray(seedClaim.segment_citations) && seedClaim.segment_citations.length > 0,
    'entity claim must carry segment citations');
  assert.equal(seedClaim.segment_citations[0].document_id, documentA.document_id);
  assert.ok(seedClaim.assertion_hash, 'entity claim must carry an assertion hash');

  // The relationship must appear
  const relClaim = claims.find(c => c.claim_type === 'relationship' && c.relationship_id === 'rel-employs-2');
  assert.ok(relClaim, 'relationship claim must be in results');
  assert.ok(Array.isArray(relClaim.segment_citations) && relClaim.segment_citations.length > 0,
    'relationship claim must carry segment citations');
  assert.equal(relClaim.source_entity_id, 'acme-2');
  assert.equal(relClaim.target_entity_id, 'alice-2');

  // The target entity must appear (reached via relationship)
  const targetClaim = claims.find(c => c.claim_type === 'entity' && c.entity_id === 'alice-2');
  assert.ok(targetClaim, 'target entity must be reachable');

  await cleanup();
});

integrationTest('expansion refuses a claim whose source segment is no longer active', async () => {
  const storage = createStorage({ pool });
  const graph = createGraphProjection({ pool });
  await cleanup();
  await storage.saveDocumentAndSegments(documentA, resultA);

  const entity = makeEntity('stale-entity', documentA, resultA);
  await graph.replaceProjection({
    document_id: documentA.document_id,
    owner_id: ownerA,
    entities: [entity],
    relationships: []
  });

  // Verify it works while active
  let claims = await graph.expandGraph({ seed_entity_ids: ['stale-entity'], owner_id: ownerA });
  assert.equal(claims.length, 1);

  // Tombstone the document
  await pool.query(
    "UPDATE documents SET retention_state = 'tombstone' WHERE document_id = $1 AND owner_id = $2",
    [documentA.document_id, ownerA]
  );

  claims = await graph.expandGraph({ seed_entity_ids: ['stale-entity'], owner_id: ownerA });
  assert.equal(claims.length, 0, 'tombstoned document must yield no claims');

  // Restore and change source hash (simulating re-ingestion)
  await pool.query(
    "UPDATE documents SET retention_state = 'active', source_hash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000' WHERE document_id = $1 AND owner_id = $2",
    [documentA.document_id, ownerA]
  );

  claims = await graph.expandGraph({ seed_entity_ids: ['stale-entity'], owner_id: ownerA });
  assert.equal(claims.length, 0, 'changed source hash must invalidate the claim');

  await cleanup();
});

integrationTest('expansion never crosses an owner boundary', async () => {
  const storage = createStorage({ pool });
  const graph = createGraphProjection({ pool });
  await cleanup();
  await storage.saveDocumentAndSegments(documentA, resultA);
  await storage.saveDocumentAndSegments(foreignDocument, foreignResult);

  const entityOwnerA = makeEntity('owner-a-entity', documentA, resultA);
  const entityOwnerB = makeEntity('owner-b-entity', foreignDocument, foreignResult, {
    owner_id: ownerB
  });

  await graph.replaceProjection({
    document_id: documentA.document_id,
    owner_id: ownerA,
    entities: [entityOwnerA],
    relationships: []
  });
  await graph.replaceProjection({
    document_id: foreignDocument.document_id,
    owner_id: ownerB,
    entities: [entityOwnerB],
    relationships: []
  });

  // Owner A can see their entity but not owner B's
  const claimsA = await graph.expandGraph({ seed_entity_ids: ['owner-a-entity', 'owner-b-entity'], owner_id: ownerA });
  assert.ok(claimsA.every(c => c.document_id === documentA.document_id || c.entity_id === 'owner-a-entity'),
    'owner A must not see owner B entities');
  assert.ok(!claimsA.some(c => c.entity_id === 'owner-b-entity'),
    'owner B entity must not appear for owner A');

  // Owner B can see their entity but not owner A's
  const claimsB = await graph.expandGraph({ seed_entity_ids: ['owner-a-entity', 'owner-b-entity'], owner_id: ownerB });
  assert.ok(!claimsB.some(c => c.entity_id === 'owner-a-entity'),
    'owner A entity must not appear for owner B');

  await cleanup();
});

integrationTest('depth and cap are enforced', async () => {
  const storage = createStorage({ pool });
  const graph = createGraphProjection({ pool });
  await cleanup();
  await storage.saveDocumentAndSegments(documentA, resultA);
  await storage.saveDocumentAndSegments(documentB, resultB);

  // Build a chain: e0 -> e1 -> e2 -> e3 (depth 3 from e0)
  const entities = [];
  for (let i = 0; i < 4; i++) {
    entities.push(makeEntity(`chain-${i}`, documentA, resultA, {
      canonical_key: `chain-${i}`, label: `Chain ${i}`
    }));
  }
  const relationships = [];
  for (let i = 0; i < 3; i++) {
    relationships.push(makeRelationship(
      `chain-rel-${i}`, documentA, `chain-${i}`, `chain-${i + 1}`, resultA
    ));
  }

  await graph.replaceProjection({
    document_id: documentA.document_id,
    owner_id: ownerA,
    entities,
    relationships
  });

  // Depth 1: should get e0, the rel to e1, and e1
  const depth1 = await graph.expandGraph({
    seed_entity_ids: ['chain-0'],
    owner_id: ownerA,
    max_depth: 1
  });
  const entityIdsDepth1 = depth1.filter(c => c.claim_type === 'entity').map(c => c.entity_id);
  assert.ok(entityIdsDepth1.includes('chain-0'), 'seed must be at depth 1');
  assert.ok(entityIdsDepth1.includes('chain-1'), 'first hop must be at depth 1');
  assert.ok(!entityIdsDepth1.includes('chain-2'), 'second hop must NOT be at depth 1');

  // Depth 3: should get all four entities
  const depth3 = await graph.expandGraph({
    seed_entity_ids: ['chain-0'],
    owner_id: ownerA,
    max_depth: 3
  });
  const entityIdsDepth3 = depth3.filter(c => c.claim_type === 'entity').map(c => c.entity_id);
  assert.ok(entityIdsDepth3.includes('chain-0'));
  assert.ok(entityIdsDepth3.includes('chain-3'), 'last hop must be reachable at depth 3');

  // Cap: max_results=1 must limit output
  const capped = await graph.expandGraph({
    seed_entity_ids: ['chain-0'],
    owner_id: ownerA,
    max_results: 1
  });
  assert.equal(capped.length, 1, 'max_results must be enforced');

  await cleanup();
});

integrationTest('empty graph returns an empty result rather than an error', async () => {
  const graph = createGraphProjection({ pool });

  // No entities exist at all
  const result = await graph.expandGraph({ seed_entity_ids: ['nonexistent'], owner_id: ownerA });
  assert.deepEqual(result, []);
});

integrationTest('document deletion cascades to graph entities and relationships', async () => {
  const storage = createStorage({ pool });
  const graph = createGraphProjection({ pool });
  await cleanup();
  await storage.saveDocumentAndSegments(documentA, resultA);

  const entity = makeEntity('cascade-entity', documentA, resultA);
  await graph.replaceProjection({
    document_id: documentA.document_id,
    owner_id: ownerA,
    entities: [entity],
    relationships: []
  });

  const before = await pool.query(
    'SELECT count(*)::int AS c FROM graph_entities WHERE document_id = $1',
    [documentA.document_id]
  );
  assert.equal(before.rows[0].c, 1);

  await storage.deleteDocument(documentA.document_id, ownerA);

  const after = await pool.query(
    'SELECT count(*)::int AS c FROM graph_entities WHERE document_id = $1',
    [documentA.document_id]
  );
  assert.equal(after.rows[0].c, 0);

  await cleanup();
});

integrationTest('cross-document expansion follows relationships between documents', async () => {
  const storage = createStorage({ pool });
  const graph = createGraphProjection({ pool });
  await cleanup();
  await storage.saveDocumentAndSegments(documentA, resultA);
  await storage.saveDocumentAndSegments(documentB, resultB);

  // Entity in doc A, entity in doc B, relationship in doc A connecting them
  const entityA = makeEntity('xdoc-a', documentA, resultA);
  const entityB = makeEntity('xdoc-b', documentB, resultB);

  await graph.replaceProjection({
    document_id: documentA.document_id,
    owner_id: ownerA,
    entities: [entityA],
    relationships: []
  });
  await graph.replaceProjection({
    document_id: documentB.document_id,
    owner_id: ownerA,
    entities: [entityB],
    relationships: []
  });

  // Add a relationship in doc A connecting the two entities
  // (entity xdoc-b exists in a different document's projection but same owner)
  await graph.replaceProjection({
    document_id: documentA.document_id,
    owner_id: ownerA,
    entities: [entityA],
    relationships: [makeRelationship('xdoc-rel', documentA, 'xdoc-a', 'xdoc-b', resultA, {
      relation: 'acquired'
    })]
  });

  const claims = await graph.expandGraph({ seed_entity_ids: ['xdoc-a'], owner_id: ownerA });
  const entityIds = claims.filter(c => c.claim_type === 'entity').map(c => c.entity_id);
  assert.ok(entityIds.includes('xdoc-a'));
  assert.ok(entityIds.includes('xdoc-b'), 'cross-document entity must be reachable');

  await cleanup();
});

integrationTest('applies migrations with graph projection script', async () => {
  // Just verify the schema exists (it was created by init scripts for the test container)
  const { rows } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('graph_entities', 'graph_relationships')
    ORDER BY table_name
  `);
  assert.deepEqual(rows.map(r => r.table_name), ['graph_entities', 'graph_relationships']);
});

import pg from 'pg';

const { Pool } = pg;

function quoteIdentifier(identifier) {
  if (!/^ann_bench_[a-z0-9_-]+$/u.test(identifier)) throw new TypeError('unsafe ANN index name');
  return `"${identifier}"`;
}

function vectorLiteral(vector) {
  return `[${vector.join(',')}]`;
}

function queryParameters(query) {
  return [
    vectorLiteral(query.query_embedding),
    query.model_id,
    query.owner_id,
    query.dimensions,
    query.top_k,
    query.collection_ids
  ];
}

function semanticQuery(candidate = { type: 'exact' }) {
  const vectorType = candidate.type === 'exact' ? 'vector' : `vector(${candidate.dimensions})`;
  const embedding = candidate.type === 'exact' ? 'e.embedding' : `(e.embedding::${vectorType})`;
  return `
    SELECT
      s.id AS segment_id, s.document_id, s.segment_index, s.text,
      s.start_offset, s.end_offset, s.text_sha256, s.metadata, s.provenance,
      d.source_hash, d.source_label, d.owner_id, d.retention_state,
      e.model_id,
      ${embedding} <=> $1::${vectorType} AS distance,
      1 - (${embedding} <=> $1::${vectorType}) AS score
    FROM segment_embeddings AS e
    JOIN segments AS s ON s.id = e.segment_id
    JOIN documents AS d ON d.document_id = s.document_id
    WHERE d.owner_id = $3
      AND d.retention_state = 'active'
      AND e.model_id = $2
      AND e.dimensions = $4
      AND (
        $6::text[] IS NULL
        OR EXISTS (
          SELECT 1
          FROM document_collections AS dc
          WHERE dc.document_id = d.document_id
            AND dc.owner_id = d.owner_id
            AND dc.collection_id = ANY($6::text[])
        )
      )
    ORDER BY ${embedding} <=> $1::${vectorType} ASC, s.document_id, s.segment_index, s.id
    LIMIT $5::integer
  `;
}

const lexicalQuery = `
  SELECT
    s.id AS segment_id, s.document_id, s.segment_index, s.text,
    s.start_offset, s.end_offset, s.text_sha256, s.metadata, s.provenance,
    d.source_hash, d.source_label, d.owner_id, d.retention_state,
    ts_rank_cd(s.search_vector, plainto_tsquery('simple', $1)) AS rank
  FROM segments AS s
  JOIN documents AS d ON d.document_id = s.document_id
  WHERE d.owner_id = $2
    AND d.retention_state = 'active'
    AND s.search_vector @@ plainto_tsquery('simple', $1)
    AND (
      $4::text[] IS NULL
      OR EXISTS (
        SELECT 1
        FROM document_collections AS dc
        WHERE dc.document_id = d.document_id
          AND dc.owner_id = d.owner_id
          AND dc.collection_id = ANY($4::text[])
      )
    )
  ORDER BY rank DESC, s.document_id, s.segment_index
  LIMIT $3::integer
`;

function mapRow(row) {
  return {
    id: row.segment_id,
    document_id: row.document_id,
    segment_index: row.segment_index,
    text: row.text,
    source_hash: row.source_hash,
    source_label: row.source_label,
    owner_id: row.owner_id,
    retention_state: row.retention_state,
    metadata: row.metadata,
    provenance: row.provenance,
    distance: row.distance === undefined ? undefined : Number(row.distance),
    score: row.score === undefined ? undefined : Number(row.score),
    rank: row.rank === undefined ? undefined : Number(row.rank)
  };
}

async function withClient(pool, callback) {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

async function runSemantic(client, query, candidate = { type: 'exact' }) {
  const { rows } = await client.query(semanticQuery(candidate), queryParameters(query));
  return rows.map(mapRow);
}

async function runLexical(client, query) {
  const { rows } = await client.query(lexicalQuery, [
    query.lexical_query,
    query.owner_id,
    query.top_k,
    query.collection_ids
  ]);
  return rows.map(mapRow);
}

function validateSearchParameter(candidate) {
  if (candidate.type === 'hnsw') {
    if (!Number.isSafeInteger(candidate.parameters.ef_search) || candidate.parameters.ef_search < 1) {
      throw new TypeError('hnsw ef_search must be a positive integer');
    }
    return `SET hnsw.ef_search = ${candidate.parameters.ef_search}`;
  }
  if (candidate.type === 'ivfflat') {
    if (!Number.isSafeInteger(candidate.parameters.probes) || candidate.parameters.probes < 1) {
      throw new TypeError('ivfflat probes must be a positive integer');
    }
    return `SET ivfflat.probes = ${candidate.parameters.probes}`;
  }
  return null;
}

async function setSearchParameter(client, candidate) {
  const setting = validateSearchParameter(candidate);
  if (setting !== null) await client.query(setting);
}

function planUsesIndex(plan, indexName) {
  if (!plan || typeof plan !== 'object') return false;
  if (plan['Index Name'] === indexName) return true;
  return Array.isArray(plan.Plans) && plan.Plans.some((child) => planUsesIndex(child, indexName));
}

function explainPayload(result) {
  return result.rows[0]['QUERY PLAN'][0];
}

function planBufferTotals(plan) {
  const totals = { shared_hit_blocks: 0, shared_read_blocks: 0, temp_read_blocks: 0, temp_written_blocks: 0 };
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    totals.shared_hit_blocks += node['Shared Hit Blocks'] ?? 0;
    totals.shared_read_blocks += node['Shared Read Blocks'] ?? 0;
    totals.temp_read_blocks += node['Temp Read Blocks'] ?? 0;
    totals.temp_written_blocks += node['Temp Written Blocks'] ?? 0;
    for (const child of node.Plans ?? []) visit(child);
  };
  visit(plan?.Plan);
  return totals;
}

async function explainSemantic(client, query, candidate, analyze = false) {
  await setSearchParameter(client, candidate);
  const prefix = analyze ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)' : 'EXPLAIN (FORMAT JSON)';
  const result = await client.query(`${prefix} ${semanticQuery(candidate)}`, queryParameters(query));
  const plan = explainPayload(result);
  return {
    uses_index: candidate.type === 'exact' ? null : planUsesIndex(plan.Plan, candidate.index_name),
    plan,
    execution_time_ms: plan['Execution Time'] ?? null,
    planning_time_ms: plan['Planning Time'] ?? null,
    buffers: planBufferTotals(plan)
  };
}

function candidateName(type, seed) {
  return `ann_bench_${type}_${String(seed).replace(/[^a-z0-9_-]/giu, '-')}`;
}

function candidateParameters(type, parameters = {}) {
  if (type === 'hnsw') {
    const result = { m: parameters.m ?? 16, ef_construction: parameters.ef_construction ?? 64, ef_search: parameters.ef_search ?? 40 };
    if (![result.m, result.ef_construction, result.ef_search].every((value) => Number.isSafeInteger(value) && value > 0)) {
      throw new TypeError('HNSW parameters must be positive integers');
    }
    return result;
  }
  if (type === 'ivfflat') {
    const result = { lists: parameters.lists ?? 100, probes: parameters.probes ?? 10 };
    if (![result.lists, result.probes].every((value) => Number.isSafeInteger(value) && value > 0)) {
      throw new TypeError('IVFFlat parameters must be positive integers');
    }
    return result;
  }
  throw new TypeError('candidate type must be hnsw or ivfflat');
}

export function createPool(databaseUrl) {
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) throw new TypeError('database URL is required');
  return new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
}

export async function loadCorpus(pool, corpus) {
  await withClient(pool, async (client) => {
    await client.query('BEGIN');
    try {
      await client.query('DELETE FROM segment_embeddings WHERE model_id = $1', [corpus.model_id]);
      await client.query('DELETE FROM documents WHERE owner_id = ANY($1::text[])', [corpus.owners]);
      await client.query('DELETE FROM collections WHERE owner_id = ANY($1::text[])', [corpus.owners]);
      await client.query('DELETE FROM embedding_models WHERE model_id = $1', [corpus.model_id]);
      await client.query(
        'INSERT INTO embedding_models (model_id, dimensions, status) VALUES ($1, $2, \'active\')',
        [corpus.model_id, corpus.dimensions]
      );
      for (const collection of corpus.collections) {
        await client.query(
          'INSERT INTO collections (collection_id, owner_id, created_at) VALUES ($1, $2, $3)',
          [collection.collection_id, collection.owner_id, collection.created_at]
        );
      }
      for (const document of corpus.documents) {
        await client.query(`
          INSERT INTO documents (
            document_id, text, source_label, source_hash, lineage,
            created_at, owner_id, retention_state
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        `, [
          document.document_id,
          document.text,
          document.source_label,
          document.source_hash,
          JSON.stringify(document.lineage),
          document.created_at,
          document.owner_id,
          document.retention_state
        ]);
        for (const segment of document.segments) {
          await client.query(`
            INSERT INTO segments (
              id, document_id, segment_index, text, start_offset, end_offset,
              text_sha256, metadata, provenance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
          `, [
            segment.id,
            document.document_id,
            segment.segment_index,
            segment.text,
            segment.start_offset,
            segment.end_offset,
            segment.text_sha256,
            JSON.stringify(segment.metadata),
            JSON.stringify(segment.provenance)
          ]);
          await client.query(`
            INSERT INTO segment_embeddings (segment_id, model_id, dimensions, embedding, created_at)
            VALUES ($1, $2, $3, $4::vector, $5)
          `, [segment.id, corpus.model_id, corpus.dimensions, vectorLiteral(segment.embedding), document.created_at]);
        }
        for (const collectionId of document.collection_ids) {
          await client.query(
            'INSERT INTO document_collections (collection_id, document_id, owner_id) VALUES ($1, $2, $3)',
            [collectionId, document.document_id, document.owner_id]
          );
        }
      }
      await client.query('ANALYZE segment_embeddings');
      await client.query('ANALYZE documents');
      await client.query('ANALYZE segments');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function cleanupCorpus(pool, corpus) {
  await withClient(pool, async (client) => {
    await client.query('BEGIN');
    try {
      await client.query('DELETE FROM segment_embeddings WHERE model_id = $1', [corpus.model_id]);
      await client.query('DELETE FROM documents WHERE owner_id = ANY($1::text[])', [corpus.owners]);
      await client.query('DELETE FROM collections WHERE owner_id = ANY($1::text[])', [corpus.owners]);
      await client.query('DELETE FROM embedding_models WHERE model_id = $1', [corpus.model_id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function captureGroundTruth({ pool, corpus }) {
  return withClient(pool, async (client) => {
    const queries = [];
    for (const query of corpus.queries) {
      const started = performance.now();
      const results = await runSemantic(client, query);
      queries.push({
        query_id: query.query_id,
        results,
        segment_ids: results.map((result) => result.id),
        generated_nearest_segment_ids: query.expected_nearest_segment_ids,
        latency_ms: performance.now() - started
      });
    }
    return { source: 'exact-cosine', queries };
  });
}

export async function buildCandidate({ pool, corpus, type, parameters }) {
  const candidateParametersValue = candidateParameters(type, parameters);
  const indexName = candidateName(type, corpus.seed);
  const candidate = {
    type,
    name: indexName,
    index_name: indexName,
    dimensions: corpus.dimensions,
    parameters: candidateParametersValue
  };
  return withClient(pool, async (client) => {
    await client.query(`DROP INDEX IF EXISTS ${quoteIdentifier(indexName)}`);
    const started = performance.now();
    try {
      if (type === 'hnsw') {
        await client.query(`CREATE INDEX ${quoteIdentifier(indexName)} ON segment_embeddings USING hnsw ((embedding::vector(${corpus.dimensions})) vector_cosine_ops) WITH (m = ${candidateParametersValue.m}, ef_construction = ${candidateParametersValue.ef_construction}) WHERE dimensions = ${corpus.dimensions}`);
      } else {
        await client.query(`CREATE INDEX ${quoteIdentifier(indexName)} ON segment_embeddings USING ivfflat ((embedding::vector(${corpus.dimensions})) vector_cosine_ops) WITH (lists = ${candidateParametersValue.lists}) WHERE dimensions = ${corpus.dimensions}`);
      }
    } catch (error) {
      return { status: 'failed', candidate, failure_reason: `index build failed: ${error.message}` };
    }
    const buildTimeMs = performance.now() - started;
    await client.query('ANALYZE segment_embeddings');
    const planner = [];
    for (const query of corpus.queries) {
      planner.push({ query_id: query.query_id, ...(await explainSemantic(client, query, candidate)) });
    }
    const sizeResult = await client.query('SELECT pg_relation_size($1::regclass)::bigint AS bytes', [indexName]);
    const plannerUsed = planner.every((entry) => entry.uses_index === true);
    return {
      status: plannerUsed ? 'passed' : 'failed',
      candidate,
      build_time_ms: buildTimeMs,
      index_size_bytes: Number(sizeResult.rows[0].bytes),
      planner_used: plannerUsed,
      planner,
      failure_reason: plannerUsed ? null : 'planner ignored the candidate index for one or more scoped queries'
    };
  });
}

export async function dropCandidate(pool, candidateResult) {
  if (!candidateResult?.candidate?.index_name) return;
  await pool.query(`DROP INDEX IF EXISTS ${quoteIdentifier(candidateResult.candidate.index_name)}`);
}

export async function runLexicalCandidates({ pool, corpus, query }) {
  return withClient(pool, (client) => runLexical(client, query));
}

export async function runSemanticCandidate(client, query, candidate) {
  return runSemantic(client, query, candidate);
}

export { explainSemantic, runLexical, runSemantic, setSearchParameter };

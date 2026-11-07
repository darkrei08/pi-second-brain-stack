#!/usr/bin/env node

import {
  buildCandidate,
  captureGroundTruth,
  cleanupCorpus,
  compareHybridCandidateSets,
  createPool,
  dropCandidate,
  generateCorpus,
  loadCorpus,
  measureCandidate
} from './index.js';

function numberOption(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError(`${name} must be a positive integer`);
  return parsed;
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') return { help: true };
    if (argument === '--json') {
      values.json = true;
      continue;
    }
    if (!argument.startsWith('--')) throw new TypeError(`unknown argument ${argument}`);
    const name = argument.slice(2).replaceAll('-', '_');
    if (name === 'database_url') {
      values.database_url = argv[++index];
      continue;
    }
    if (name === 'seed' || name === 'dimensions' || name === 'document_count'
      || name === 'segments_per_document' || name === 'query_count' || name === 'top_k'
      || name === 'hnsw_m' || name === 'hnsw_ef_construction' || name === 'hnsw_ef_search'
      || name === 'ivfflat_lists' || name === 'ivfflat_probes') {
      values[name] = numberOption(argv[++index], name);
      continue;
    }
    throw new TypeError(`unknown argument ${argument}`);
  }
  values.database_url ??= process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!values.database_url) throw new TypeError('--database-url or DATABASE_URL is required');
  return values;
}

function usage() {
  return `Usage: node bench/ann/cli.js --database-url URL [options]

Options:
  --json  print the full machine report instead of the human summary
  --seed N
  --dimensions N
  --document-count N
  --segments-per-document N
  --query-count N
  --top-k N
  --hnsw-m N --hnsw-ef-construction N --hnsw-ef-search N
  --ivfflat-lists N --ivfflat-probes N
`;
}

function fixed(value, digits) {
  return typeof value === 'number' ? value.toFixed(digits) : 'n/a';
}

function row(label, planner, measurement, build) {
  const latency = measurement?.latency_ms ?? {};
  return [
    label,
    planner,
    measurement ? fixed(measurement.recall_at_k, 3) : 'n/a',
    fixed(latency.p50, 2),
    fixed(latency.p95, 2),
    fixed(build?.build_time_ms, 1),
    build?.index_size_bytes ?? 'n/a',
    build?.status ?? measurement?.status ?? 'n/a'
  ];
}

function summarize(report) {
  const { corpus } = report;
  const lines = [];
  lines.push(`ANN comparison: ${corpus.version} seed=${corpus.seed}`);
  lines.push(`  corpus: ${corpus.documents} documents, ${corpus.segments} segments, ${corpus.queries} queries, top-k ${corpus.top_k}, ${corpus.dimensions} dimensions, ${corpus.owners} owners, ${corpus.collections} collections`);
  lines.push('  scoping: owner + active retention + model + dimension + collection');
  lines.push('');
  const header = ['candidate', 'planner', 'recall@k', 'p50 ms', 'p95 ms', 'build ms', 'index bytes', 'status'];
  const rows = [row('exact', 'n/a', report.exact.measurement, null)];
  const failures = [];
  for (const candidate of report.candidates) {
    const label = candidate.build?.candidate?.type ?? 'candidate';
    rows.push(row(label, candidate.build?.planner_used === true ? 'yes' : 'no', candidate.measurement, candidate.build));
    if (candidate.build?.status !== 'passed') {
      failures.push(`${label}: ${candidate.build?.failure_reason ?? 'build failed'}`);
    }
  }
  const widths = header.map((cell, index) => Math.max(cell.length, ...rows.map((line) => String(line[index]).length)));
  const render = (cells) => cells.map((cell, index) => String(cell).padEnd(widths[index])).join('  ').trimEnd();
  lines.push(`  ${render(header)}`);
  for (const line of rows) lines.push(`  ${render(line)}`);
  lines.push('');
  for (const candidate of report.candidates) {
    if (candidate.hybrid === undefined) continue;
    const label = candidate.build?.candidate?.type ?? 'candidate';
    lines.push(`  hybrid (rrf_k=${candidate.hybrid.rrf_k}) for ${label}: semantic candidate sets changed ${candidate.hybrid.changed_semantic_candidate_sets}/${corpus.queries}, hybrid rankings changed ${candidate.hybrid.changed_hybrid_rankings}/${corpus.queries}`);
  }
  if (failures.length > 0) {
    lines.push('');
    for (const failure of failures) lines.push(`  failed candidate -> ${failure}`);
  }
  lines.push('');
  lines.push('  verdict: this harness measures, it does not ratify. A high recall on a synthetic corpus is not');
  lines.push('  evidence for a production index, and a candidate the planner ignores is a failed candidate, not');
  lines.push('  a passing one. Exact search remains the shipped path and the rollback.');
  return `${lines.join('\n')}\n`;
}

async function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const pool = createPool(options.database_url);
  let corpus;
  let loaded = false;
  const candidateResults = [];
  try {
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      throw new Error(`database unreachable: ${error.message}`, { cause: error });
    }
    corpus = generateCorpus(options);
    await loadCorpus(pool, corpus);
    loaded = true;
    const groundTruth = await captureGroundTruth({ pool, corpus });
    const exact = await measureCandidate({
      pool,
      corpus,
      groundTruth,
      candidate: { type: 'exact', name: 'exact-cosine' }
    });
    const candidates = [
      ['hnsw', {
        m: options.hnsw_m,
        ef_construction: options.hnsw_ef_construction,
        ef_search: options.hnsw_ef_search
      }],
      ['ivfflat', { lists: options.ivfflat_lists, probes: options.ivfflat_probes }]
    ];
    for (const [type, parameters] of candidates) {
      const built = await buildCandidate({ pool, corpus, type, parameters });
      candidateResults.push({ build: built });
      if (built.status === 'passed') {
        const measurement = await measureCandidate({ pool, corpus, groundTruth, candidate: built });
        const hybrid = await compareHybridCandidateSets({ pool, corpus, groundTruth, measurement });
        candidateResults[candidateResults.length - 1].measurement = measurement;
        candidateResults[candidateResults.length - 1].hybrid = hybrid;
      }
    }
    const report = {
      harness_version: 'ann-harness-v1',
      database_reachable: true,
      runtime: { node: process.version, platform: process.platform, concurrency: 1 },
      corpus: {
        version: corpus.version,
        seed: corpus.seed,
        dimensions: corpus.dimensions,
        model_id: corpus.model_id,
        owners: corpus.owners.length,
        collections: corpus.collections.length,
        documents: corpus.documents.length,
        segments: corpus.documents.reduce((sum, document) => sum + document.segments.length, 0),
        queries: corpus.queries.length,
        top_k: corpus.queries[0].top_k
      },
      scoping: {
        owner: 'documents.owner_id = query.owner_id',
        retention: "documents.retention_state = 'active'",
        model: 'segment_embeddings.model_id = query.model_id',
        dimension: 'segment_embeddings.dimensions = query.dimensions',
        collection: 'document_collections contains any query.collection_ids'
      },
      exact: { ground_truth: groundTruth, measurement: exact },
      candidates: candidateResults
    };
    process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : summarize(report));
    if (candidateResults.some(({ build }) => build.status !== 'passed')) process.exitCode = 1;
  } finally {
    for (const result of candidateResults) {
      try {
        await dropCandidate(pool, result.build);
      } catch (error) {
        process.stderr.write(`cleanup failed for ${result.build.candidate?.index_name ?? 'candidate'}: ${error.message}\n`);
        process.exitCode = 1;
      }
    }
    if (loaded) {
      try {
        await cleanupCorpus(pool, corpus);
      } catch (error) {
        process.stderr.write(`cleanup failed for corpus: ${error.message}\n`);
        process.exitCode = 1;
      }
    }
    await pool.end();
  }
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

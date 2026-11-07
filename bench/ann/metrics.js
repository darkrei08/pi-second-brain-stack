import { explainSemantic, runLexical, runSemantic, setSearchParameter } from './postgres.js';

function percentile(values, percentage) {
  if (values.length === 0) return null;
  const index = Math.max(0, Math.ceil(values.length * percentage) - 1);
  return values[index];
}

function recallAtK(expected, actual) {
  const actualSet = new Set(actual);
  return expected.length === 0 ? 1 : expected.filter((id) => actualSet.has(id)).length / expected.length;
}

function resourceSnapshot(before) {
  const usage = process.resourceUsage();
  const memory = process.memoryUsage();
  return {
    user_cpu_time_us: usage.userCPUTime - before.userCPUTime,
    system_cpu_time_us: usage.systemCPUTime - before.systemCPUTime,
    max_rss_kb: usage.maxRSS,
    heap_used_bytes: memory.heapUsed,
    rss_bytes: memory.rss
  };
}

function hybridOrder(lexical, semantic, limit, rrfK) {
  const entries = new Map();
  const add = (matches, rankName) => {
    matches.forEach((match, index) => {
      const existing = entries.get(match.id) ?? {
        match,
        hybrid_score: 0,
        lexical_rank: null,
        semantic_rank: null
      };
      existing.hybrid_score += 1 / (rrfK + index + 1);
      existing[rankName] = index + 1;
      entries.set(match.id, existing);
    });
  };
  add(lexical, 'lexical_rank');
  add(semantic, 'semantic_rank');
  return [...entries.values()]
    .sort((left, right) => (
      right.hybrid_score - left.hybrid_score
      || left.match.document_id.localeCompare(right.match.document_id)
      || left.match.segment_index - right.match.segment_index
      || left.match.id.localeCompare(right.match.id)
    ))
    .slice(0, limit)
    .map((entry) => ({
      id: entry.match.id,
      hybrid_score: entry.hybrid_score,
      lexical_rank: entry.lexical_rank,
      semantic_rank: entry.semantic_rank
    }));
}

export async function measureCandidate({ pool, corpus, groundTruth, candidate }) {
  if (candidate.type !== 'exact' && candidate.status !== 'passed') {
    return {
      status: 'failed',
      candidate,
      failure_reason: candidate.failure_reason ?? 'candidate was not planner-verified'
    };
  }
  return (async () => {
    const client = await pool.connect();
    const before = process.resourceUsage();
    try {
      if (candidate.type !== 'exact') await setSearchParameter(client, candidate.candidate ?? candidate);
      const truthByQuery = new Map(groundTruth.queries.map((query) => [query.query_id, query]));
      const perQuery = [];
      for (const query of corpus.queries) {
        const started = performance.now();
        const results = await runSemantic(client, query, candidate.type === 'exact' ? { type: 'exact' } : (candidate.candidate ?? candidate));
        const latencyMs = performance.now() - started;
        const truth = truthByQuery.get(query.query_id);
        if (!truth) throw new Error(`ground truth is missing query ${query.query_id}`);
        perQuery.push({
          query_id: query.query_id,
          latency_ms: latencyMs,
          segment_ids: results.map((result) => result.id),
          results,
          recall_at_k: recallAtK(truth.segment_ids, results.map((result) => result.id))
        });
      }
      const explain = await explainSemantic(client, corpus.queries[0], candidate.type === 'exact' ? { type: 'exact' } : (candidate.candidate ?? candidate), true);
      const latencies = perQuery.map((query) => query.latency_ms).sort((left, right) => left - right);
      const recallValues = perQuery.map((query) => query.recall_at_k);
      return {
        status: 'passed',
        candidate: candidate.candidate ?? candidate,
        recall_at_k: recallValues.reduce((sum, value) => sum + value, 0) / recallValues.length,
        recall_at_k_min: Math.min(...recallValues),
        recall_at_k_by_query: perQuery.map(({ query_id, recall_at_k }) => ({ query_id, recall_at_k })),
        latency_ms: {
          p50: percentile(latencies, 0.5),
          p95: percentile(latencies, 0.95),
          samples: latencies.length
        },
        resource: resourceSnapshot(before),
        explain: {
          planning_time_ms: explain.planning_time_ms,
          execution_time_ms: explain.execution_time_ms,
          buffers: explain.buffers,
          uses_index: explain.uses_index
        },
        queries: perQuery
      };
    } finally {
      client.release();
    }
  })();
}

export async function compareHybridCandidateSets({ pool, corpus, groundTruth, measurement, rrf_k = 60 }) {
  const client = await pool.connect();
  try {
    const exactByQuery = new Map(groundTruth.queries.map((query) => [query.query_id, query]));
    const candidateByQuery = new Map(measurement.queries.map((query) => [query.query_id, query]));
    const perQuery = [];
    for (const query of corpus.queries) {
      const lexical = await runLexical(client, query);
      const exact = exactByQuery.get(query.query_id);
      const candidate = candidateByQuery.get(query.query_id);
      const exactHybrid = hybridOrder(lexical, exact.results, query.top_k, rrf_k);
      const candidateHybrid = hybridOrder(lexical, candidate.results, query.top_k, rrf_k);
      const exactSemanticIds = exact.segment_ids;
      const candidateSemanticIds = candidate.segment_ids;
      const exactSemanticSet = [...exactSemanticIds].sort().join('|');
      const candidateSemanticSet = [...candidateSemanticIds].sort().join('|');
      const exactSemanticOrder = exactSemanticIds.join('|');
      const candidateSemanticOrder = candidateSemanticIds.join('|');
      const exactHybridOrder = exactHybrid.map((match) => match.id).join('|');
      const candidateHybridOrder = candidateHybrid.map((match) => match.id).join('|');
      perQuery.push({
        query_id: query.query_id,
        lexical_segment_ids: lexical.map((match) => match.id),
        exact_semantic_segment_ids: exactSemanticIds,
        candidate_semantic_segment_ids: candidateSemanticIds,
        semantic_candidate_set_changed: exactSemanticSet !== candidateSemanticSet,
        semantic_candidate_order_changed: exactSemanticOrder !== candidateSemanticOrder,
        exact_hybrid_segment_ids: exactHybrid.map((match) => match.id),
        candidate_hybrid_segment_ids: candidateHybrid.map((match) => match.id),
        hybrid_rank_changed: exactHybridOrder !== candidateHybridOrder
      });
    }
    return {
      rrf_k,
      changed_semantic_candidate_sets: perQuery.filter((query) => query.semantic_candidate_set_changed).length,
      changed_hybrid_rankings: perQuery.filter((query) => query.hybrid_rank_changed).length,
      per_query: perQuery
    };
  } finally {
    client.release();
  }
}

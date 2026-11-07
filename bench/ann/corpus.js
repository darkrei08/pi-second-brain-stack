import { createHash } from 'node:crypto';

export const DEFAULT_CORPUS_OPTIONS = Object.freeze({
  seed: 20261029,
  dimensions: 8,
  document_count: 24,
  segments_per_document: 4,
  owner_count: 2,
  collections_per_owner: 2,
  query_count: 12,
  top_k: 5,
  model_id: null
});

function requireInteger(value, name, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${name} must be an integer no smaller than ${minimum}`);
  }
}

function hashText(text) {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function unitVector(values) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return unitVector(values.map((value, index) => value + (index === 0 ? 1 : 0.5)));
  return values.map((value) => Number((value / norm).toFixed(8)));
}

function vectorFrom(random, dimensions, noise = 0) {
  return unitVector(Array.from({ length: dimensions }, () => (random() * 2 - 1) + (random() * 2 - 1) * noise));
}

function cosine(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function validateOptions(input) {
  const options = { ...DEFAULT_CORPUS_OPTIONS, ...input };
  requireInteger(options.seed, 'seed', 1);
  requireInteger(options.dimensions, 'dimensions', 1);
  requireInteger(options.document_count, 'document_count', 1);
  requireInteger(options.segments_per_document, 'segments_per_document', 1);
  requireInteger(options.owner_count, 'owner_count', 1);
  requireInteger(options.collections_per_owner, 'collections_per_owner', 1);
  requireInteger(options.query_count, 'query_count', 1);
  requireInteger(options.top_k, 'top_k', 1);
  if (options.top_k > options.document_count * options.segments_per_document) {
    throw new TypeError('top_k must not exceed the total segment count');
  }
  if (options.model_id !== null && !/^[A-Za-z0-9][A-Za-z0-9._~-]*$/u.test(options.model_id)) {
    throw new TypeError('model_id must be an opaque model identifier');
  }
  return options;
}

export function generateCorpus(input = {}) {
  const options = validateOptions(input);
  const random = randomGenerator(options.seed);
  const modelId = options.model_id ?? `ann-model-${options.seed}`;
  const owners = Array.from({ length: options.owner_count }, (_, index) => `ann-owner-${options.seed}-${index}`);
  const collections = owners.flatMap((ownerId, ownerIndex) => (
    Array.from({ length: options.collections_per_owner }, (_, collectionIndex) => ({
      collection_id: `ann-collection-${options.seed}-${ownerIndex}-${collectionIndex}`,
      owner_id: ownerId,
      created_at: '2026-01-01T00:00:00Z'
    }))
  ));
  const documents = [];

  for (let documentIndex = 0; documentIndex < options.document_count; documentIndex += 1) {
    const ownerIndex = documentIndex % owners.length;
    const ownerId = owners[ownerIndex];
    const collection = collections.find((entry) => entry.owner_id === ownerId
      && entry.collection_id.endsWith(`-${documentIndex % options.collections_per_owner}`));
    const collectionIds = [collection.collection_id];
    const active = documentIndex % 7 !== 0;
    const segments = [];
    const segmentTexts = [];
    for (let segmentIndex = 0; segmentIndex < options.segments_per_document; segmentIndex += 1) {
      const topic = `topic${documentIndex % Math.max(4, options.collections_per_owner * 2)}`;
      const text = `owner${ownerIndex} collection${documentIndex % options.collections_per_owner} ${topic} document${documentIndex} segment${segmentIndex}`;
      segmentTexts.push(text);
      segments.push({
        id: `urn:segment:urn:document:ann-${options.seed}-${documentIndex}:${segmentIndex}`,
        segment_index: segmentIndex,
        text,
        start_offset: segmentIndex * text.length,
        end_offset: (segmentIndex + 1) * text.length,
        text_sha256: hashText(text).slice('sha256:'.length),
        metadata: { synthetic: true, topic },
        provenance: { segment_id: `urn:segment:urn:document:ann-${options.seed}-${documentIndex}:${segmentIndex}` },
        embedding: vectorFrom(random, options.dimensions)
      });
    }
    const text = segmentTexts.join('\n\n');
    const documentId = `urn:document:ann-${options.seed}-${documentIndex}`;
    const sourceHash = hashText(text);
    for (const segment of segments) {
      segment.provenance.source_hash = sourceHash;
    }
    documents.push({
      document_id: documentId,
      text,
      source_label: `ann-${options.seed}-${documentIndex}.txt`,
      source_hash: sourceHash,
      lineage: { parser: 'ann-synthetic@1.0.0', model: null },
      created_at: '2026-01-01T00:00:00Z',
      owner_id: ownerId,
      retention_state: active ? 'active' : 'tombstone',
      collection_ids: collectionIds,
      segments
    });
  }

  const activeSegments = documents.flatMap((document) => document.segments.map((segment) => ({
    ...segment,
    document_id: document.document_id,
    owner_id: document.owner_id,
    retention_state: document.retention_state,
    collection_ids: document.collection_ids
  }))).filter((segment) => segment.retention_state === 'active');
  const queries = [];
  for (let queryIndex = 0; queryIndex < options.query_count; queryIndex += 1) {
    const ownerId = owners[queryIndex % owners.length];
    const ownerSegments = activeSegments.filter((segment) => segment.owner_id === ownerId);
    const target = ownerSegments[queryIndex % ownerSegments.length];
    const queryEmbedding = unitVector(target.embedding.map((value) => value + (random() * 2 - 1) * 0.01));
    const nearest = ownerSegments
      .filter((segment) => segment.collection_ids.includes(target.collection_ids[0]))
      .map((segment) => ({ segment, score: cosine(queryEmbedding, segment.embedding) }))
      .sort((left, right) => (
        right.score - left.score
        || left.document_id.localeCompare(right.document_id)
        || left.segment_index - right.segment_index
        || left.id.localeCompare(right.id)
      ))
      .slice(0, options.top_k);
    queries.push({
      query_id: `ann-query-${options.seed}-${queryIndex}`,
      owner_id: ownerId,
      model_id: modelId,
      dimensions: options.dimensions,
      collection_ids: [...target.collection_ids],
      lexical_query: target.metadata.topic,
      query_embedding: queryEmbedding,
      top_k: options.top_k,
      expected_nearest_segment_ids: nearest.map(({ segment }) => segment.id)
    });
  }

  return {
    version: 'ann-corpus-v1',
    seed: options.seed,
    dimensions: options.dimensions,
    model_id: modelId,
    owners,
    collections,
    documents,
    queries
  };
}

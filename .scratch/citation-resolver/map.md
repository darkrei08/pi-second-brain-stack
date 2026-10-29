# Wayfinder: citation mapping and resolver contract

## Destination

Turn validated lexical/semantic retrieval results into prompt-ready evidence blocks with stable source references, page/region metadata, character spans, hashes, lineage, and confidence. The resolver is pure and provider-neutral.

## Dependency position

Completed prerequisites:

1. deterministic Unicode-aware segmentation;
2. parser-neutral page/layout provenance normalization;
3. transactional PostgreSQL persistence with owner and retention isolation;
4. exact model-aware semantic search;
5. deterministic lexical/semantic hybrid retrieval with RRF.

Citation resolution is the next downstream slice because retrieval now returns the stored provenance needed to validate evidence before an answer consumes it.

## Public seam

`src/index.js` exports:

```js
resolveCitations(results, {
  owner_id,
  min_confidence = 0
})
```

The method returns validated evidence blocks and fails closed on any invalid result. It does not query PostgreSQL, call an LLM, read files, or resolve external URLs.

## Evidence block

```js
{
  document_id,
  segment_id,
  text,
  citation: {
    label,
    ref,
    confidence,
    source_hash,
    segment_hash,
    location,
    lineage
  }
}
```

## Decisions

- Validate owner and active retention at the resolver boundary.
- Recompute the segment SHA-256 from the returned text and compare it with `text_sha256` and `provenance.segment_hash`.
- Require the provenance segment/document IDs, source hash, citation reference, and character span to agree with the result.
- Preserve normalized page and bounding-box data without inventing values.
- Require sanitized citation labels and finite confidence in `0..1`.
- Reject the whole batch if any result fails validation.
- Keep output free of full source documents, filesystem paths, credentials, private corpus data, or network-derived content.

## Deferred

Database freshness queries, citation URL generation, model registry/re-embedding, graph entities and edges, parser benchmarks, ANN/sidecar search, gateway authentication, and live LLM answer generation.

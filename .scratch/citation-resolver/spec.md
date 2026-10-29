# Spec: citation mapping and resolver contract

## Problem statement

Hybrid retrieval returns ranked segments with provenance, but the stack has no deterministic boundary that validates citation integrity before evidence is passed to an answer layer.

## Public seam

Add `resolveCitations(results, { owner_id, min_confidence = 0 })` to `src/index.js`.

Input `results` are segment retrieval results from the existing storage seams. Output is an ordered array of:

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

## Invariants

- `results` is a non-empty array of result objects.
- `owner_id` is an opaque ID and must match every result and its provenance retention owner.
- Every result has `retention_state: 'active'`.
- `text_sha256` is the lowercase SHA-256 hash of the exact returned text.
- `provenance.segment_hash` is `sha256:${text_sha256}`.
- `provenance.segment_id` and `provenance.source_hash` match the result.
- `provenance.citation.ref` is `[doc:${document_id}#seg${segment_index}]`.
- `provenance.location.char_span` equals `[start_offset, end_offset]`.
- Citation labels are sanitized and cannot contain a path, control character, or traversal marker.
- Citation confidence is finite and in `0..1`; `min_confidence` is finite and in `0..1`.
- A failure rejects the complete batch without returning partial evidence.
- No file, database, network, LLM, provider, schema, or dependency is added.

## Acceptance criteria

- [ ] valid synthetic segment results map to prompt-ready evidence blocks;
- [ ] source and segment hashes are recomputed and validated;
- [ ] document/segment IDs, citation ref, source hash, and character span mismatches fail closed;
- [ ] another owner, tombstone, and purged results are rejected;
- [ ] malformed labels, lineage, confidence, and location fail closed;
- [ ] confidence below `min_confidence` is rejected;
- [ ] normalized page/bounding-box metadata is preserved exactly;
- [ ] batches reject without returning partial output;
- [ ] the public export is available through `src/index.js`;
- [ ] existing segmentation, parser, persistence, lexical, semantic, and hybrid tests remain green;
- [ ] no private corpus, path, credential, model cache, network service, or LLM is introduced.

## Deferred

Database freshness checks, external citation URLs, model lifecycle, graph retrieval, parser benchmarking, ANN/sidecar evaluation, gateway/authentication, and live answer generation.

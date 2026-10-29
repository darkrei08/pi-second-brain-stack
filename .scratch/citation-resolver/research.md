# Research: citation mapping and resolver contract

## Decision

Implement a pure `resolveCitations(results, options)` function that validates stored retrieval result provenance and emits prompt-ready evidence blocks. Do not add a database query, gateway, LLM, URL resolver, or external citation service in this slice.

## Repository evidence

- `src/segment-document.js` emits `segment_id`, `document_id`, raw `text_sha256`, qualified `segment_hash`, `source_hash`, normalized `location.char_span`, optional page/bounding box, lineage, citation label/ref/confidence, retention, and creation time.
- `src/postgres-store.js` returns the segment text, raw hash, stored provenance, source hash/label, owner, and retention state from lexical, semantic, and hybrid searches.
- `.scratch/document-segmentation-wayfinder/issues/02-provenance-citation-contract.md` requires opaque IDs, source/segment hashes, optional location, parser/model lineage, sanitized citation, retention ownership/state, and derivation links.
- `docs/retrieval-and-graph.md` requires citation validation before an answer is returned and retention of original chunk/page citations for derived evidence.
- `docs/private-runtime.md` forbids public-repository corpus files, paths, credentials, embeddings, and model caches.

## Validation rules

For every result, the resolver must verify:

1. the requested `owner_id` matches the result owner and provenance retention owner;
2. the result retention state is `active`;
3. `sha256(result.text)` equals `result.text_sha256`;
4. `provenance.segment_id`, `provenance.source_hash`, `provenance.segment_hash`, and `provenance.citation.ref` agree with the result;
5. `provenance.location.char_span` equals `[start_offset, end_offset]`;
6. the citation label is non-empty and contains no path separators, control characters, or traversal marker;
7. citation confidence is finite and in `0..1`, and is not below `min_confidence`;
8. all required lineage and citation fields are objects/text with no invented defaults.

A tombstone, purged, mismatched, low-confidence, or malformed result rejects the complete batch. No partial evidence list is returned.

## Output contract

The output keeps only answer-facing evidence: opaque document/segment IDs, exact segment text, and a citation object containing label, ref, confidence, source/segment hashes, normalized location, and parser/model lineage. It does not expose the full document or add unverified external links.

## Rejected alternatives

- **Database freshness lookup:** adds a transaction/query boundary before the pure evidence contract is stable; the existing storage methods already scope active retention.
- **URL/page renderer:** requires private object-storage paths and product decisions not present in the public skeleton.
- **LLM citation judge:** introduces a provider and non-deterministic acceptance into a trust boundary.
- **Graph citation resolver:** graph extraction is a later consumer of the same segment provenance.

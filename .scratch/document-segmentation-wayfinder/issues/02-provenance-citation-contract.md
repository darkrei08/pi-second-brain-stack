# 02: Choose the provenance and citation contract

Type: research
Status: resolved
Blocked by: None

## Question

What provenance envelope must accompany each segment so later retrieval and GraphRAG answers can cite the source, page/region when available, parser/model version, content hash, and derivation chain without exposing the private corpus in the public repository?

## Answer

Use a compact provenance envelope alongside the segment payload. It must contain opaque `document_id` and `segment_id`, `sequence_index`, `source_hash`, `segment_hash`, optional `location`, processing `lineage`, a sanitized `citation`, retention ownership/state, and `created_at`.

Minimal shape:

```json
{
  "document_id": "urn:document:<opaque-id>",
  "segment_id": "urn:segment:<opaque-id>:0",
  "sequence_index": 0,
  "source_hash": "sha256:<64 lowercase hex characters>",
  "segment_hash": "sha256:<64 lowercase hex characters>",
  "location": {"page": null, "bounding_box": null, "char_span": [0, 21]},
  "lineage": {"parser": "text-native@1.0.0", "model": null, "stage": "chunk"},
  "citation": {"label": "synthetic-fixture.txt", "ref": "[doc:<opaque-id>#seg0]", "confidence": 1.0},
  "retention": {"owner_id": "piva_operator", "state": "active"},
  "created_at": "2026-01-01T00:00:00Z"
}
```

Invariants:

- Hashes are over the raw source bytes and canonical UTF-8 segment text, respectively.
- Identifiers are opaque and never contain filesystem paths, names, tax identifiers, or live P.IVA metadata.
- Every derived entity, relationship, embedding, and summary keeps a link to its source segment.
- Page and normalized bounding-box coordinates are optional; non-paged text uses null values.
- Parser/model revisions are pinned so derived data can be invalidated and rebuilt.
- Deleting a document must cascade to segments, embeddings, graph projections, and private artifacts.
- Public tests use synthetic fixtures only.
- Citations with extraction confidence below the configured threshold must expose uncertainty.

Canonical character spans use the segment contract's Unicode code-point offsets; byte offsets are derived implementation metadata only.

Rejected: raw filesystem paths, full text duplicated inside provenance, absolute pixel coordinates, a standalone graph database before workload evidence, and a full W3C PROV-O triplestore for this first slice.

Evidence: W3C PROV-O (`https://www.w3.org/TR/prov-o/`), Microsoft GraphRAG local search (`https://github.com/microsoft/graphrag/blob/main/docs/query/local_search.md`), Docling document model (`https://ds4sd.github.io/docling/concepts/document_model/`), RFC 9562 (`https://www.rfc-editor.org/rfc/rfc9562.html`), and the local retrieval/runtime docs.

# 01: Choose the document segment contract

Type: research
Status: resolved
Blocked by: None

## Question

What is the smallest deterministic segment contract for text input that preserves ordering, stable segment identity, source offsets, and enough metadata for later PostgreSQL full-text, pgvector, graph extraction, and citations? Compare practical chunking boundaries and choose explicit invariants without assuming a specific parser or model.

## Answer

Use a parser-neutral JSON segment with `id`, `document_id`, `segment_index`, `text`, `start_offset`, `end_offset`, and `text_sha256`, plus optional metadata for page, section path, language, and derived byte offsets.

Invariants:

- `segment_index` is zero-based, contiguous, and ordered.
- `[start_offset, end_offset)` is a canonical Unicode code-point span and must reproduce `text` exactly from the source text.
- `text_sha256` is the lowercase SHA-256 digest of the exact segment text.
- `id` is deterministic from document identity and segment index; it never uses a random UUID or raw path.
- Segments are non-empty and boundaries prefer paragraphs, then Unicode sentence boundaries, then safe whitespace/punctuation fallback.
- The contract does not depend on an embedding tokenizer.

Minimal shape:

```json
{
  "id": "urn:segment:<document_id>:<segment_index>",
  "document_id": "urn:document:<opaque-id>",
  "segment_index": 0,
  "text": "Synthetic source text.",
  "start_offset": 0,
  "end_offset": 21,
  "text_sha256": "<64 lowercase hex characters>",
  "metadata": {}
}
```

Rejected: fixed character windows without boundary awareness, tokenizer-coupled storage, content-hash-only identity, linked-list adjacency, and parser-specific rich-text ASTs.

Evidence: Unicode UAX #29 (`https://unicode.org/reports/tr29/`), PostgreSQL text-search controls (`https://www.postgresql.org/docs/current/textsearch-controls.html`), Microsoft GraphRAG dataflow (`https://github.com/microsoft/graphrag/blob/main/docs/index/default_dataflow.md`), Dense X Retrieval (`https://arxiv.org/abs/2312.06648`), and pgvector (`https://github.com/pgvector/pgvector`).

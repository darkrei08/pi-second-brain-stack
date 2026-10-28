# 03: Choose the first vertical-slice boundary

Type: task
Status: resolved
Blocked by: 01, 02

## Question

Given the segment and provenance contracts, what public interface and fixture shape should the first TDD vertical slice implement? The result must be demoable without a database or real P.IVA documents and must leave a clean adapter boundary for future parser workers and PostgreSQL indexing.

## Answer

Implement a pure, transport-neutral use-case seam:

```text
segmentDocument(document, policy) -> result
```

The input contains an opaque `document_id`, UTF-8 `text`, sanitized `source_label`, `source_hash`, parser/model lineage, fixed `created_at`, and retention owner/state. The policy contains only a positive `max_segment_chars`. The output contains the document hash and ordered segments carrying the resolved segment and provenance contracts from tickets 01 and 02.

Acceptance criteria:

- A synthetic fixture produces stable JSON without PostgreSQL, filesystem corpus access, network calls, or an LLM.
- Segment and sequence indexes are contiguous and source ordered.
- Every canonical span reproduces the exact segment text and hashes.
- Identical input and policy produce byte-equivalent output.
- Paragraph, sentence, then safe whitespace/punctuation boundaries are preferred; empty segments are rejected.
- The result is storage-neutral but sufficient for future PostgreSQL/pgvector indexing and citation resolution.
- A CLI adapter, if added, must only serialize the pure use-case result.

Test only the public `segmentDocument` seam with a golden JSON fixture containing paragraphs, accented text, an emoji, and one long paragraph. Do not add HTTP, database, OCR, real P.IVA data, tokenizer dependencies, or a graph store in this slice.

Recommended spec title: **Implement deterministic text segmentation with provenance output**.

# Spec: Implement deterministic text segmentation with provenance output

## Problem Statement

The private P.IVA RAG needs a stable first processing boundary before adding PDF/OCR parsers, PostgreSQL, pgvector, GraphRAG, or a network gateway. Without a deterministic segment contract, later retrieval records cannot reliably reproduce source text, cite locations, or invalidate derived data.

The public repository must demonstrate this behavior without containing the real P.IVA corpus, private paths, credentials, or model artifacts.

## Solution

Implement a pure, transport-neutral `segmentDocument(document, policy)` use case in a dependency-free Node.js ESM package. It accepts parser-normalized UTF-8 text and emits ordered segments with deterministic IDs, canonical Unicode code-point offsets, SHA-256 hashes, and a compact provenance/citation envelope.

Provide a small JSON CLI adapter over the same use case. The CLI is a demonstration boundary only; it must not access PostgreSQL, the filesystem corpus, a remote model, or an LLM. Future parser workers can emit the normalized input contract, and future PostgreSQL/pgvector adapters can persist the output without changing the segmenter.

## User Stories

1. As a RAG pipeline, I want identical normalized input and policy to produce identical segment JSON, so that indexing is idempotent.
2. As a retrieval system, I want each segment to have a contiguous zero-based index, so that source order and neighboring context are deterministic.
3. As a citation renderer, I want canonical half-open source offsets, so that I can reproduce the exact segment text from the source.
4. As a data-integrity check, I want a SHA-256 hash of the exact segment text, so that derived records can detect accidental changes.
5. As a future PostgreSQL adapter, I want opaque document and segment identifiers, so that storage never exposes private filesystem paths or tax identifiers.
6. As a future pgvector indexer, I want plain segment text independent of a tokenizer, so that embedding models can change without changing the storage contract.
7. As a future GraphRAG extractor, I want every derived segment to retain parser/model lineage and a citation reference, so that entities and relationships can point back to evidence.
8. As an operator, I want paragraph and sentence boundaries preferred over arbitrary cuts, so that legal text, identifiers, and amounts remain readable.
9. As a public-repository maintainer, I want synthetic fixtures only, so that tests never expose P.IVA documents or private metadata.
10. As a CLI user, I want JSON input and JSON output through the same public use case, so that the first slice is demonstrable without deploying the full stack.
11. As a deletion workflow, I want retention ownership and state carried in the output, so that later storage adapters can cascade deletion by document identity.
12. As a multilingual document pipeline, I want Unicode-aware offsets and exact hashes, so that accented text and emoji do not shift citation spans.

## Implementation Decisions

- Use Node.js 22+ ESM and the Node standard library only for the first slice.
- Expose one pure public use-case function: `segmentDocument(document, policy)`.
- Accept a normalized document with opaque `document_id`, UTF-8 `text`, sanitized `source_label`, `source_hash`, parser/model lineage, fixed RFC3339 `created_at`, and retention owner/state.
- Accept a policy with one required positive `max_segment_chars` value.
- Emit segments with `id`, `document_id`, `segment_index`, `text`, `start_offset`, `end_offset`, `text_sha256`, and metadata.
- Emit provenance fields `segment_id`, `sequence_index`, `source_hash`, `segment_hash`, `location`, `lineage`, `citation`, `retention`, and `created_at` alongside or within each segment without duplicating the text payload.
- Use Unicode code-point offsets as canonical coordinates. Derived UTF-8 byte offsets are optional metadata and are not part of the first implementation's required output.
- Choose boundaries in this order: paragraph breaks, sentence-like punctuation, then safe whitespace or punctuation fallback. Do not add a tokenizer dependency.
- Reject empty or whitespace-only input segments, invalid hashes, non-positive policy values, non-opaque identifiers, and invalid retention states at the public boundary.
- Make IDs and hashes deterministic. Do not use random UUIDs, current time, raw filesystem paths, or live P.IVA data.
- Provide a JSON CLI adapter that reads one JSON document from stdin and writes one JSON result to stdout. It must not read arbitrary files or call a network service.
- Keep parser, database, embedding, graph, HTTP, OCR, and model adapters out of this slice.

## Testing Decisions

- Test only through the public `segmentDocument` function and the JSON CLI boundary. Do not test private helpers.
- Use Node's built-in `node:test` runner and `assert` module; no runtime dependency is needed.
- Use a synthetic fixture containing two paragraphs, accented characters, an emoji, and a long paragraph that forces a fallback boundary.
- Assert exact segment text, indexes, spans, hashes, deterministic IDs, provenance, citations, lineage, and retention values.
- Assert that slicing the fixture by every emitted span reproduces the emitted text.
- Assert repeated calls are byte-equivalent after JSON serialization.
- Assert invalid input fails through the public boundary and does not emit partial segments.
- Assert the CLI returns the same contract as the function and writes no extra output.
- Do not introduce database or real-corpus tests until those interfaces exist and have an independently approved spec.

## Out of Scope

- PDF, Office, email, image, `.p7m`, ZIP, OCR, MinerU, PaddleOCR-VL, or Docling adapters.
- PostgreSQL schema migrations, pgvector indexes, Qdrant, Apache AGE, or GraphRAG community indexing.
- HTTP gateway, LibreChat integration, PWA, native desktop, Android, iOS, or iPadOS packaging.
- Real P.IVA corpus ingestion or tests containing private documents.
- Multi-user authorization, remote deployment, hosted SaaS, and external model calls.
- Tokenizer-specific chunk sizing, semantic LLM chunking, or automatic entity extraction.

## Further Notes

The next implementation slice can adapt parser-normalized output from PDF/OCR workers into this contract. It must preserve the canonical segment and provenance invariants. The first slice is intentionally small so its behavior can be used as a golden contract for later storage and retrieval adapters.

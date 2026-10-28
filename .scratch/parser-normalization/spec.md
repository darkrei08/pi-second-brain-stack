# Spec: parser-neutral document normalization

## Problem Statement

The segmenter and PostgreSQL store accept normalized text but currently cannot preserve page or layout provenance from parser output. Parser runtimes have incompatible page bases, coordinate origins, scales, and JSON shapes.

## Solution

Implement `normalizeParserOutput({ parser_type, raw_json, envelope })` as a pure Node.js adapter for synthetic Docling, MinerU, and PaddleOCR-style JSON. It returns the existing document envelope plus ordered `elements` with text, Unicode code-point spans, one-based pages, and normalized rectangular locations. Update segmentation to project intersecting element locations into segment provenance.

## Public seams

- `normalizeParserOutput({ parser_type, raw_json, envelope })`
- Existing `segmentDocument(document, policy)` with optional `document.elements`

## Invariants

- The returned document passes the existing normalized-document validation boundary.
- Text block ordering is deterministic and blocks are joined with exactly `\n\n`.
- Element spans reproduce their exact element text from the returned document text.
- Pages are integers `>= 1`.
- Bounding boxes are finite, ordered, and within `[0, 1]`.
- Unsupported parser types, malformed envelopes, missing dimensions, invalid pages, and invalid boxes fail before partial output.
- No parser runtime, model, filesystem, network, database, or private corpus access is introduced.

## Acceptance

- Docling bottom-left coordinates convert correctly using page height and normalize to top-left coordinates.
- MinerU zero-based pages and 0..1000 boxes normalize correctly.
- PaddleOCR pixel boxes normalize using `[width, height]`.
- Segments inherit the page and union bounding box of intersecting elements.
- Documents without elements preserve current null page/bounding-box behavior.
- Synthetic unit tests cover all parser shapes and invalid inputs through public seams.

## Deferred

Production parser containers, license packaging, OCR execution, page-aware chunking, polygon geometry, embeddings, pgvector indexing, graph extraction, gateway, and client integration.

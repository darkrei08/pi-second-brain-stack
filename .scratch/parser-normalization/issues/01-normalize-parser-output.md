# 01: Normalize parser output and preserve layout provenance

Type: implementation
Status: resolved
Blocked by: None

## Question

What is the smallest parser-neutral adapter contract that lets Docling, MinerU, and PaddleOCR-style workers feed the existing segmenter and retain safe page/region citations?

## Acceptance criteria

- [x] A pure public normalizer supports synthetic Docling, MinerU, and PaddleOCR JSON.
- [x] Canonical pages are one-based and canonical boxes are normalized top-left floats.
- [x] Joined text and element spans are deterministic Unicode code-point ranges.
- [x] Segment provenance inherits page and bounding-box data when elements intersect.
- [x] Existing documents without layout elements behave exactly as before.
- [x] Invalid parser type, envelope, page, dimension, and box input fails without partial output.
- [x] No parser runtime, model weight, private file, database, or network dependency is added.

## Answer

Implemented `normalizeParserOutput` as a pure JSON adapter for synthetic Docling, MinerU, and PaddleOCR-style outputs. Canonical page and geometry metadata now flows into segment provenance, with null fallback for documents without layout elements and multi-page segments. Added defensive bounding-box reduction and public tests for valid and invalid inputs.

Verification: `npm test` passed with 12 passing and 4 expected PostgreSQL skips without a database; PostgreSQL integration remained 5/5; package dry-run, Compose config, syntax, privacy checks, and Debian, Fedora, Arch, openSUSE, and Alpine container rows passed. Parser runtimes, real PDFs, Windows, and macOS were not executed.

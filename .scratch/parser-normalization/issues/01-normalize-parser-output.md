# 01: Normalize parser output and preserve layout provenance

Type: implementation
Status: claimed
Blocked by: None

## Question

What is the smallest parser-neutral adapter contract that lets Docling, MinerU, and PaddleOCR-style workers feed the existing segmenter and retain safe page/region citations?

## Acceptance criteria

- [ ] A pure public normalizer supports synthetic Docling, MinerU, and PaddleOCR JSON.
- [ ] Canonical pages are one-based and canonical boxes are normalized top-left floats.
- [ ] Joined text and element spans are deterministic Unicode code-point ranges.
- [ ] Segment provenance inherits page and bounding-box data when elements intersect.
- [ ] Existing documents without layout elements behave exactly as before.
- [ ] Invalid parser type, envelope, page, dimension, and box input fails without partial output.
- [ ] No parser runtime, model weight, private file, database, or network dependency is added.

# Wayfinder: parser-neutral normalization

## Destination

A deterministic pure adapter that converts Docling, MinerU, or PaddleOCR-style JSON into the existing normalized document contract with canonical page and layout provenance, without bundling parser runtimes or private corpus data.

## Decisions so far

- Normalize all geometry to top-left `[left, top, right, bottom]` floats in `0.0..1.0`.
- Normalize all page identifiers to positive one-based integers.
- Join ordered text blocks with `\n\n` and calculate Unicode code-point offsets.
- Preserve exact parser/model lineage in the document envelope.
- Enrich segment provenance from intersecting normalized elements; preserve null geometry when no elements are supplied.
- Keep parser workers outside Node.js and defer embedding/vector work until the model/dimension contract is decided.

## Not yet specified

- Production parser image/PDF worker packaging and sandbox policy.
- Exact model releases, weights, hardware profiles, and license notices.
- Page-break-aware segmentation policy and polygon geometry.
- Embedding provider, vector dimension, and ANN index.

## Out of scope

- Executing Docling, MinerU, or PaddleOCR.
- Real P.IVA files, OCR output, model caches, or external inference.
- PostgreSQL schema changes, vector indexing, graph extraction, HTTP gateway, and UI clients.

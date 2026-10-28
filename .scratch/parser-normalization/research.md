# Research: parser-neutral document normalization

## Decision

The next dependency-ordered slice is a pure JSON normalization adapter, not a parser runtime and not pgvector indexing. It converts parser-emitted JSON into the existing document contract and canonical layout metadata before segmentation.

## Primary evidence

- Docling exposes a hierarchical `DoclingDocument` with provenance records containing page number, bounding box, and character spans. Its coordinate origin may be `BOTTOMLEFT`; page dimensions are available for conversion. Code: <https://github.com/docling-project/docling-core/blob/main/docling_core/types/doc/base.py>. Model reference: <https://docling-project.github.io/docling/reference/docling_document/>.
- MinerU exposes ordered `content_list`/`middle.json` data with page indices, page sizes, text blocks, and bounding boxes. Output reference: <https://github.com/Core-corporation/mineru/blob/master/docs/en/reference/output_files.md>.
- PaddleOCR/PP-StructureV3 exposes ordered layout/text blocks and pixel-coordinate boxes. Pipeline reference: <https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/pipeline_usage/PP-StructureV3.en.md>.
- PostgreSQL already stores segment `provenance` as JSONB, so normalized page and bounding-box metadata requires no schema change in this slice.

## Finalized contract decisions

- Canonical bounding boxes are `[left, top, right, bottom]`, `0.0..1.0`, top-left origin.
- Canonical pages are positive one-based integers.
- Parser blocks are joined with `\n\n`; offsets are Unicode code-point half-open spans.
- The adapter is pure JSON-to-JSON and runs separately from Python/PyTorch/CUDA parser workers.
- `lineage.parser` and `lineage.model` preserve exact parser/model identity for invalidation and licensing records.
- Missing geometry remains `null`; the adapter must not invent coordinates.

## Provisional or deferred

- The production parser and model release remain deployment decisions. MinerU licensing and model-weight licenses need release-specific audit; Docling and PaddleOCR model notices also remain tracked per release.
- Segment-spanning page breaks may need a future page-aware segmentation policy. This slice uses the bounding-box union for intersecting elements and keeps the existing segment contract.
- Embedding dimension/model choice, pgvector DDL, parser containers, OCR weights, real PDFs, and the gateway remain separate slices.

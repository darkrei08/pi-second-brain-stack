# Wayfinder: first document-segmentation slice

## Destination

A published, testable spec and implementation for the first safe vertical slice of the private RAG: synthetic text input is accepted through a stable public boundary, segmented deterministically, and emitted with provenance for later PostgreSQL/pgvector indexing. The public repository contains no P.IVA data.

## Notes

This is a local-only repository using Markdown issues. Consult `AGENTS.md`, `docs/agents/`, the engineering-excellence references, TDD, SDD, to-spec, to-tickets, and implement-spec. Keep the first slice format-agnostic and safe for later PDF/OCR adapters. Work one decision ticket at a time; research tickets may run in parallel.

## Decisions so far

- [Choose the document segment contract](issues/01-document-segment-contract.md): use deterministic, parser-neutral segments with contiguous indexes, Unicode code-point spans, exact text hashes, and boundary-aware splitting.
- [Choose the provenance and citation contract](issues/02-provenance-citation-contract.md): keep opaque document/segment IDs, source and segment hashes, optional page/region coordinates, parser/model lineage, sanitized citations, retention state, and derivation links.
- [Implement deterministic text segmentation with provenance output](../deterministic-text-segmentation/issues/01-segment-text-with-provenance.md): implemented the pure segmenter and JSON CLI with synthetic public-seam tests.

## Not yet specified

- Native PDF, Office, email, image, and signed-container adapters.
- OCR/parser worker selection and release-specific model licensing.
- PostgreSQL schema migration and pgvector indexing implementation.
- Graph entity extraction, community summaries, and global GraphRAG search.
- Remote access, multi-user authorization, native mobile packaging, and production object storage.

## Out of scope

- Importing or indexing the real P.IVA corpus in this first vertical slice.
- Public hosting, multi-tenant SaaS, external issue trackers, and automatic external actions.

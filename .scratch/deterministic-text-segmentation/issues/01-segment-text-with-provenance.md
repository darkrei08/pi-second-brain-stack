# 01: Implement deterministic text segmentation with provenance output

**What to build:** A public, dependency-free Node.js use case and JSON CLI that accepts normalized UTF-8 document text and returns deterministic segments with exact offsets, hashes, citations, lineage, and retention metadata.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `segmentDocument(document, policy)` is a public importable boundary.
- [x] Segment indexes and sequence indexes are contiguous, ordered, and deterministic.
- [x] Unicode code-point spans reproduce exact segment text, including accented characters and emoji.
- [x] Paragraph, sentence, and safe fallback boundaries are applied without empty segments.
- [x] Segment and source hashes are exact lowercase SHA-256 values.
- [x] Provenance contains opaque IDs, source/segment hashes, location, parser/model lineage, citation, retention, and creation timestamp.
- [x] JSON CLI delegates to the same use case and emits no extra output.
- [x] Node built-in tests cover valid, deterministic, boundary, and invalid-input behavior through public seams only.
- [x] No real P.IVA data, private paths, credentials, or runtime dependencies are added.

## Answer

Implemented the first vertical slice in `src/segment-document.js`, exposed it from `src/index.js`, and added the stdin/stdout adapter at `src/cli.js`. Tests use only synthetic text and exercise the function and CLI seams.

Verification: `npm test`, `node --check src/segment-document.js`, `node --check src/cli.js`, `npm pack --dry-run`, and Node 22+ container checks on Debian, Alpine, Fedora, Arch, and openSUSE.

# 01: Implement deterministic text segmentation with provenance output

**What to build:** A public, dependency-free Node.js use case and JSON CLI that accepts normalized UTF-8 document text and returns deterministic segments with exact offsets, hashes, citations, lineage, and retention metadata.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `segmentDocument(document, policy)` is a public importable boundary.
- [ ] Segment indexes and sequence indexes are contiguous, ordered, and deterministic.
- [ ] Unicode code-point spans reproduce exact segment text, including accented characters and emoji.
- [ ] Paragraph, sentence, and safe fallback boundaries are applied without empty segments.
- [ ] Segment and source hashes are exact lowercase SHA-256 values.
- [ ] Provenance contains opaque IDs, source/segment hashes, location, parser/model lineage, citation, retention, and creation timestamp.
- [ ] JSON CLI delegates to the same use case and emits no extra output.
- [ ] Node built-in tests cover valid, deterministic, boundary, and invalid-input behavior through public seams only.
- [ ] No real P.IVA data, private paths, credentials, or runtime dependencies are added.

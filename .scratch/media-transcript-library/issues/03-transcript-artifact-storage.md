# 03: Define the per-owner transcript and artifact storage layout

Type: decision
Status: open
Blocked by: 01, 02

## Question

How should each owner's raw audio, transcript text, timestamps, derived renders, and search indexes be stored, and which representation is authoritative versus rebuildable?

## Acceptance criteria

1. A per-owner storage layout names the location and identity of raw audio, transcript text, timestamp data, derived renders, metadata, and search indexes; the transcript text and timestamp shape comes from `media_distill/manifest.py`, `media_distill/transcript.py`, and the toolkit `examples/`, not a second schema.
2. Each artifact class is marked authoritative, reproducible, or disposable, with the source and rebuild path for every rebuildable class.
3. The layout preserves owner isolation, source URL or media identity, provenance, versioning, and deletion semantics without exposing corpus data through shared paths.
4. The design states whether search indexes live beside the corpus or in the existing retrieval store, and how index rebuilds and stale indexes are detected.
5. Partial failures are observable: the ticket records what happens when fetching, transcription, rendering, or indexing stops after an earlier artifact exists.
6. The design does not require a second chat store or a second authoritative corpus store.

## Evidence to gather

- S10 and the service outputs in `odd/tasks/media-transcript-library-and-agent-console.md`.
- `docs/media-transcript-repos.md`, `media_distill/manifest.py`, `media_distill/transcript.py`, and the toolkit `examples/` as the authoritative transcript contract evidence.
- The answer from ticket 02 for service boundaries and artifact hand-offs.
- Existing owner, document, segment, embedding, provenance, retention, deletion, and collection conventions in this repository.
- Authorized target-stack filesystem or object-storage conventions, without creating corpus data or running services in this pass. Storage and retrieval belong to `second-brain-stack`, including its `pgvector/pgvector:pg17` at `127.0.0.1:55432`; the toolkit's ignored `artifacts/` is not the authoritative stack store.

## Constraints

- The S9 capabilities remain separate services with separate contracts; storage must not hide a monolithic implementation or make one arm responsible for another arm's lifecycle.
- Nothing is installed, vendored, cloned further, or run for rakazo until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions hold. Any remote or multi-user need becomes its own ticket with its own threat note.
- V1 Open WebUI, V2 one source of truth per record type, V3 folder equals retrieval scope backed by collections, and V4 attachment ingestion into our store remain in force unless explicitly reopened with evidence.

## Open question

What is the authoritative, rebuildable, per-owner storage layout for every transcript artifact and its search index?

## Comments


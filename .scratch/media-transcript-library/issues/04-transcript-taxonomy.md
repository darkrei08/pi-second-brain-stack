# 04: Define transcript taxonomy and folder retrieval mapping

Type: decision
Status: open
Blocked by: 03

## Question

What is the taxonomy for transcript owner, tags, playlist or macro-topic membership, and folder presentation, and how does that taxonomy map to the existing collection-backed retrieval scope without reopening V3?

## Acceptance criteria

1. The model defines owner, tag, playlist, macro-topic, transcript, and folder concepts with their cardinality and ownership rules; it does not redefine the transcript payload shape, which must follow `media_distill/manifest.py`, `media_distill/transcript.py`, and the toolkit `examples/`.
2. It distinguishes presentation labels from retrieval scope and states which relationships are persisted in our store versus owned by the shell.
3. A folder maps to one or more existing collection scopes in a way that preserves V3 and owner isolation; the ticket does not silently replace collections with shell file IDs.
4. The model covers a transcript appearing in multiple tags or playlists and records the update and deletion consequences.
5. The model identifies how source provenance and transcript revisions remain addressable when taxonomy labels change.
6. Any need for multi-owner sharing or remote collaboration is rejected from the default model and becomes a separate threat-noted ticket.

## Evidence to gather

- S2 and S10 in `odd/tasks/media-transcript-library-and-agent-console.md`.
- `docs/media-transcript-repos.md` and the toolkit's `media_distill/manifest.py`, `media_distill/transcript.py`, and `examples/` files for the existing transcript contract.
- Inherited V2 and V3 in `.scratch/interface-stack/map.md` and the resolved collections ticket.
- Ticket 03's authoritative artifact and identity decisions.
- Existing owner, collection, provenance, and retrieval terminology in this repository; persisted taxonomy, storage, and retrieval remain owned by `second-brain-stack`, not the toolkit.

## Constraints

- The S9 arms remain separate small services with independent contracts; taxonomy must not create a monolithic service or merge their ownership.
- Nothing is installed, vendored, cloned further, or run for rakazo until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions hold. Any remote or multi-user need becomes its own ticket with its own threat note.
- V1 Open WebUI, V2 one source of truth per record type, V3 folder equals retrieval scope backed by collections, and V4 attachment ingestion into our store remain in force unless explicitly reopened with evidence.

## Open question

What taxonomy and folder-to-collection mapping gives the library owner, tag, playlist, and macro-topic organization without changing V3?

## Comments


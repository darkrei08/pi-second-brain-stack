# 04: Set the console/library record-type boundary

Type: decision
Status: open
Blocked by: 01

## Question

Under inherited V2, which system owns chats, attachments, documents, transcripts, collections, citations, and agent-console records so the console and the transcript library never become competing sources of truth?

## Acceptance criteria

1. Provide a table assigning exactly one owner and source of truth to chats, chat attachments, source documents, transcript records, transcript provenance, collections or folders, citations, agent status, and console metadata.
2. Distinguish an agent-console conversation or attachment from a library document or transcript, including the allowed reference between them without mirroring their payloads.
3. Define ingest, update, deletion, export, backup, and retention boundaries for each record type, including provenance preservation.
4. Show how the boundary preserves inherited V1, V3, and V4, or explicitly identifies the evidence required to reopen one of them.
5. State which records remain inside the console candidate and which remain in our store, with no implied second corpus or hidden library database.

## Evidence to gather

- Inherited V2-V4 decisions and the resolved collection-scope ticket in `.scratch/interface-stack/`.
- The second-brain gateway and storage contracts, plus the transcript-library design once it exists; storage, retrieval, and surface ownership is `second-brain-stack`.
- `docs/media-transcript-repos.md` and the toolkit's `media_distill/manifest.py`, `media_distill/transcript.py`, and `examples/` files for the transcript contract boundary.
- The selected console's persistence model only after ticket 01 authorizes the exact source inspection.

## Constraints

- S9 binds the storage boundary: fetch, transcribe, render, and search are separate services with separate contracts, activated and searched through the second brain; this ticket must not merge them.
- Rakazo at `/root/git/fork/elie222/rakazo` remains a candidate only; nothing about it is installed, vendored, cloned further, configured, or run until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions remain the default; record ownership must not imply multi-user access.
- V1-V4 stay in force unless this ticket explicitly reopens one with evidence. V2's one-source-of-truth rule is binding.
- No corpus, credentials, transcript payload, or private attachment is copied into this repository.

## Open question

Which single owner and storage boundary applies to each console and library record type while preserving V2 and the existing attachment-ingest and collection-scope decisions?

## Comments

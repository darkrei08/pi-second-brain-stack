# Wayfinder: media transcript library

## Destination

Produce the decision map for a NotebookLM-style library of online-video transcripts and derived artifacts, plus its Open WebUI-shaped Media Stack Transcriptions surface. The destination is a handoff-ready set of decisions and contracts; this pass does not implement services, storage, UI, or repository changes outside this directory.

## Dependency position

The existing RAG stack already has owner-scoped documents, provenance, retrieval seams, and collection-backed retrieval scopes. The interface-stack Wayfinder has already settled the shell and record-ownership constraints that this area must inherit. The HTTP and media implementation boundaries are not yet specified.

This area covers transcript taxonomy, artifact storage, the library surface, the four S9 service arms, and repository boundaries. Agent-console and rakazo adoption work from the wider feature document is outside this area.

## Decisions

- Inherited from V1: Open WebUI is the primary interaction shell.
- Inherited from V2: each record type has one source of truth; the shell and our store do not mirror records.
- Inherited from V3: a folder represents a retrieval scope backed by collections; this area must not reopen that decision without explicit evidence.
- Inherited from V4: attachments are ingested into our store with provenance.
- No new decision is made in this map. Each unresolved choice belongs in one open ticket below.

## Candidate/evidence table

| Area | Candidate or existing evidence | Open use |
|---|---|---|
| Surface and ownership | `.scratch/interface-stack/map.md`, `issues/01-select-interaction-shell-and-collections.md`, and `issues/02-collections-as-retrieval-scope.md` | Reuse V1-V4 while specifying transcript records and surface flows. |
| Repository boundary | This repository, a `media-distillation-toolkit` repository, and the media stack named by the feature document | Assign each service, contract, artifact, and UI responsibility without creating a monolith. |
| S9 arms | Feature document S3, S4, S9, and its T5 task | Define fetch, transcribe, render, and search contracts and assign their owners; decide the yt-dlp lane. |
| Artifact storage | Feature document S10 plus existing owner/provenance and retrieval conventions | Decide authoritative files, rebuildable derivatives, per-owner paths, and index placement. |
| Taxonomy | Feature document S2 plus inherited V2/V3 and collection-backed retrieval | Define owner, tag, playlist or macro-topic, and folder-to-scope semantics without changing V3. |

## Repository reference

The authority for these assignments is `docs/media-transcript-repos.md`.

- `/root/git/personale/media-distillation-toolkit` (remote `darkrei08/media-distillation-toolkit`, branch `master`, HEAD `c367992`) is the transcript **CONTRACT** surface: validate + render via `media_distill/manifest.py` and `media_distill/transcript.py`, using dependency-free Python 3.11 and writing into ignored `artifacts/`. It does **not** download media and does **not** call AI providers, so it is not the fetch lane.
- `/root/git/personale/pi.dev/second-brain-stack` is this repository (branch `feat/live-answers`, HEAD `c010dbd`) and owns retrieval, storage and surfaces, with `pgvector/pgvector:pg17` on `127.0.0.1:55432`.
- `/root/git/fork/elie222/rakazo` is the console **CANDIDATE** only.
- `/root/git/personale/data-research-stack` is the other candidate home for the fetch lane and is **NOT yet inspected**.

## The frontier

1. [01: Define repository boundaries for the transcript library](issues/01-repository-boundaries.md) — unblocked; establishes the ownership candidates for the remaining tickets.
2. [02: Define S9 service contracts and the fetch-lane owner](issues/02-service-contracts-and-fetch-lane.md) — blocked by 01.
3. [03: Define the per-owner transcript and artifact storage layout](issues/03-transcript-artifact-storage.md) — blocked by 01 and 02.
4. [04: Define transcript taxonomy and folder retrieval mapping](issues/04-transcript-taxonomy.md) — blocked by 03.
5. [05: Define the Open WebUI library surface and record ownership](issues/05-library-surface-record-ownership.md) — blocked by 03 and 04.

## Safety boundary

- Documentation only in `.scratch/media-transcript-library/`; no code, installs, Docker, network research, or edits outside the assigned directory.
- Fetch, transcribe, render, and search remain separate small services with separate contracts and independent activation/search through the second brain. No capability is folded into a monolith; any ticket proposing a merge must name and justify it.
- Nothing is installed, vendored, cloned further, or run for rakazo until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions remain in force. Any remote or multi-user requirement becomes a separate ticket with its own threat note.
- V1-V4 remain in force unless a ticket explicitly reopens one with evidence.
- No transcript corpus, raw media, OCR output, embeddings, graph export, database dump, credential, token, or model cache enters this repository.

## Reading order

Read the feature document, inherited interface-stack map and tickets, then 01 through 05 in frontier order.

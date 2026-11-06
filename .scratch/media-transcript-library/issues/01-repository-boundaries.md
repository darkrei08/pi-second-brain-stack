# 01: Define repository boundaries for the transcript library

Type: decision
Status: open
Blocked by: none

## Question

Which responsibilities for the transcript library belong in this repository, a separate `media-distillation-toolkit` repository, the media stack, or the second brain, so the S9 capabilities and Open WebUI surface remain composable rather than becoming one monolithic repository?

## Acceptance criteria

1. A responsibility table assigns the transcript surface, service contracts, fetch, transcription, rendering, search, storage, indexes, and second-brain orchestration to exactly one candidate owner or marks the assignment unresolved.
2. The table names the interface between the second brain and each of the four independent S9 arms.
3. The repository role is stated using evidence from its guidance and the candidate stack boundaries, without moving implementation into this documentation repository by assumption.
4. Any unresolved ownership has one named follow-up question and a blocker reference for the next ticket.
5. No proposed boundary requires a monolithic service or repository; any exception is explicitly justified.

## Evidence to gather

- `odd/tasks/media-transcript-library-and-agent-console.md`, especially S3, S4, S9, S10, T4, and T5.
- `docs/media-transcript-repos.md` and the toolkit contract files `media_distill/manifest.py`, `media_distill/transcript.py`, `examples/playlist-manifest.json`, and `examples/transcript.json`; transcript shape must be read from those files rather than invented here.
- Repository guidance under `AGENTS.md`, `docs/agents/`, and the existing Wayfinder maps.
- The media stack and any authorized `media-distillation-toolkit` repository documentation, without installing or cloning anything in this pass.
- Existing second-brain gateway and retrieval ownership conventions; storage, retrieval, and surface responsibilities belong to `second-brain-stack`.

## Constraints

- The S9 boundary is mandatory: fetch, transcribe, render, and search are separate small services with their own contracts and are activated/searched through the second brain. Do not merge them into a monolith; a merge proposal must state and justify the exception.
- Nothing is installed, vendored, cloned further, or run for rakazo until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions hold. Any remote or multi-user need requires its own ticket and threat note.
- V1 Open WebUI, V2 one source of truth per record type, V3 folder equals retrieval scope backed by collections, and V4 attachment ingestion into our store remain in force unless explicitly reopened with evidence.

## Open question

What exact repository or stack owns each transcript-library responsibility while preserving the four independent S9 service boundaries?

## Comments


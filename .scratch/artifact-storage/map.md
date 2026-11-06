# Wayfinder: artifact storage for media transcripts and private artifacts

## Destination

Produce a handoff-ready storage decision for S10-S12: a per-artifact ownership matrix, an operator-readable export path, and recorded restore/deletion proof requirements. This pass records decisions and evidence only; it does not implement storage, install protocols, change Compose, or move private data.

## Dependency position

This slice inherits the single-owner, loopback-only, small-service boundary from `AGENTS.md`, `docs/agents/domain.md`, `docs/media-transcript-repos.md`, and S9-S12 in `odd/tasks/media-transcript-library-and-agent-console.md`. It must fit the existing second-brain storage and provenance seams. The source feature file is absent from this worktree but is present in the parent checkout; its recorded L8-L10 evidence is used read-only for this slice.

The map is downstream of the existing storage research and upstream of any implementation. Ticket 01 is the adversarial evidence pass; tickets 02 and 03 turn that evidence into an artifact matrix and literal operator path; ticket 04 requires the export, restore, and deletion actions to be performed and recorded before this way is considered clear.

## Decisions

- No storage service is installed or adopted by this map.
- The phase-one direction and rejected alternatives are recorded in `decision.md`, but remain subject to the proof tickets where the record says so.
- The decision must reconcile, rather than silently contradict, `docs/implementation-brief.md` line 125 (local filesystem or S3-compatible storage), line 144 (SeaweedFS behind source files, page images, and artifacts), line 151 (SeaweedFS as the default expanded candidate because of Apache-2.0 and S3 compatibility), and lines 160-171 (export, deletion, backup, and restore across originals, derivatives, chunks, vectors, and caches).
- The operator's 23 GB free constraint is a capacity boundary, not an invitation to build a media hoard; raw media retention and any NAS-backed path remain explicit decisions.

## The frontier

1. [01: Grill the storage candidates against the same eight questions](issues/01-grilling-questions.md) — open; unblocked.
2. [02: Define the per-artifact storage matrix](issues/02-artifact-matrix.md) — open; blocked by `01`.
3. [03: Define the literal operator export path](issues/03-operator-export.md) — open; blocked by `01`.
4. [04: Prove restore and deletion instead of asserting them](issues/04-restore-and-deletion-proof.md) — open; blocked by `02`, `03`.

## Safety boundary

- Documentation only under `.scratch/artifact-storage/`; no code, installs, Docker, network mounts, corpus, OCR output, embeddings, graph exports, database dumps, credentials, or model caches.
- Keep services loopback-only and single-owner. Keep fetch, transcribe, render, search, storage, and retrieval as small services with explicit boundaries; do not create a monolith.
- Do not install Samba, NFS, rclone, MinIO, or any replacement; do not change `compose.yaml`; do not modify `odd/tasks/` or the other `.scratch` areas.
- A missing NAS path must never be treated as an empty directory or a successful export.

## Repository reference

- `.scratch/artifact-storage/research.md` — bounded candidate research, host observation, source links, and unverified gaps.
- `docs/implementation-brief.md:125` — local filesystem or S3-compatible object storage.
- `docs/implementation-brief.md:144` — SeaweedFS for source files, page images, and artifacts.
- `docs/implementation-brief.md:151` — SeaweedFS as the default expanded candidate, Apache-2.0 and S3-compatible.
- `docs/implementation-brief.md:160-171` — export, deletion, backup, and restore boundary across originals, derivatives, chunks, vectors, and caches.
- `docs/media-transcript-repos.md` — repository ownership and the transcript toolkit's ignored `artifacts/` output boundary.
- `odd/tasks/media-transcript-library-and-agent-console.md` — S11, S12, T8, T9, T10, and L8-L10; read from the parent checkout because that file is not present in this worktree.

# 02: Define the per-artifact storage matrix

Type: decision
Status: open
Blocked by: 01

## Question

For each artifact class, decide which store is authoritative in phase one, what may be derived or temporary, why that store fits the evidence, and what the transcript toolkit's own `artifacts/` directory means. Keep one source of truth per record type and preserve provenance.

Required artifact classes:

| Artifact type | Store that should hold it | Reason and boundary | Evidence or gap to close |
|---|---|---|---|
| Documents and original downloads | Candidate phase-one local filesystem for bounded, selected originals; no unbounded media download tree | Local storage is the simplest hot store but the host has about 23-24 GB free; NAS adds missing client/mount dependencies; S3 adds a service boundary. (`research.md`; `docs/implementation-brief.md:125`) | Define the byte quota and refusal behavior; ticket 01/04 must not leave this as an implicit limit. |
| Page images and OCR output | Local derivative area while an active document is processed; retain only the classes needed for provenance/retrieval until the retention decision | Page images can multiply; OCR is derived and may be rebuildable only when parser/model identity is retained. SeaweedFS is the expanded candidate for source files, page images, and artifacts, not a phase-one install. (`research.md`; `docs/implementation-brief.md:144,151`) | Prove which derivatives survive deletion and restore; ticket 04. |
| Audio | No persistent phase-one raw-media library; bounded local staging only for an active transcription, then delete after verified transcript or export | Audio is large and immutable; cold NAS saves host bytes but makes re-transcription NAS-dependent. (`research.md`) | Define the active-job quota and export-before-delete evidence; tickets 03 and 04. |
| Video | Refuse persistent phase-one raw video and encoded-video hoarding; accept a source URI/hash and bounded staging only when a job is explicitly running | Video is the likely first capacity consumer; encoded derivatives can exceed the host margin. (`research.md`) | Confirm refusal and cleanup behavior with a synthetic fixture; ticket 04. |
| Photos | No unbounded phase-one photo library; keep source URI/hash and only bounded presentation derivatives needed by an active workflow | Human browsing wants hot thumbnails while originals can be cold; the original hash must remain independent of presentation derivatives. (`research.md`) | Decide whether an operator-exported NAS library becomes phase two; tickets 01 and 03. |
| Transcripts and manifests | PostgreSQL/system of record for searchable transcript metadata, provenance, ownership, source URI/hash, parser/model identity, and relations; rendered text/JSON may be exported as small files | Text is cheap and searchable; the media toolkit already defines manifest/transcript contracts. (`research.md`; `docs/media-transcript-repos.md`) | Prove export includes the database metadata and rendered files together; ticket 04. |
| Embeddings and vectors | PostgreSQL/pgvector as retrieval authority; rebuildable export on the operator's selected backup store | Vectors are model-specific and derived; source and model metadata must survive. (`research.md`; `docs/implementation-brief.md:160-171`) | Prove vector rows, model identity, and source references restore together; ticket 04. |
| Database dumps and backups | Short-lived local staging only until a verified TrueNAS/WebDAV/rclone export exists; the durable copy must be on the operator-selected external store | A file copy is not a complete restore; dumps, schema/version, manifest, and key handling travel together. (`research.md`; `docs/implementation-brief.md:160-171`) | NAS capacity, protocol, credentials, and measured restore remain open; tickets 03 and 04. |

### Meaning of the toolkit `artifacts/` directory

`/root/git/personale/media-distillation-toolkit` owns the transcript contract and writes deterministic render output into its ignored `artifacts/` directory; it does not download media, call AI providers, or own storage. (`docs/media-transcript-repos.md`) That directory is a toolkit-local build/output workspace, not the second brain's authoritative artifact store, not a backup, and not a reason to duplicate records. A service may import the toolkit contract and copy an approved rendered output into the second-brain store with provenance; it must not treat ignored `artifacts/` contents as durable unless the export/restore ticket proves that path explicitly.

## Acceptance criteria

1. The resolved matrix has exactly the eight required artifact classes and names one authoritative store or an explicit refusal/temporary boundary for each.
2. The matrix distinguishes originals, derivatives, chunks, vectors, caches, manifests, database state, and backups, and does not make the toolkit `artifacts/` directory a second source of truth.
3. It reconciles `docs/implementation-brief.md:125`, `:144`, `:151`, and `:160-171` explicitly.
4. It states the capacity guard for approximately 23 GB free and the behavior when the guard would be exceeded.
5. It identifies every unproven matrix row as a gap for ticket 03 or 04.

## Evidence to gather

- `research.md`, especially the decision matrix rows and the three dominating constraints.
- `docs/media-transcript-repos.md` for the toolkit boundary.
- `docs/implementation-brief.md:125,144,151,160-171`.
- `odd/tasks/media-transcript-library-and-agent-console.md` S10-S12 and L8-L10, read-only from the parent checkout because it is absent in this worktree.

## Constraints

- Decision documentation only; no code, installs, mounts, Compose edits, or corpus material.
- Keep storage, fetch, transcribe, render, and search as separate small services under loopback-only, single-owner assumptions.
- Do not expand phase one into a media hoard or silently contradict the implementation brief.

## Open question

Which exact phase-one artifact classes can be retained locally without exhausting the host, and which must be refused, staged temporarily, or exported before retention?

## Comments

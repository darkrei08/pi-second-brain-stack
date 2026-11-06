# Decision: bounded local-first transcript storage with export-gated media retention

## Named decision

Phase one is a bounded, local-first transcript store: PostgreSQL/pgvector remains the authority for transcript metadata, provenance, chunks, and vectors; the local filesystem holds small approved originals, manifests, rendered text, and active derivatives; raw audio, video, and photo libraries are not retained locally. Media may exist only as bounded job staging until its transcript is verified or the operator exports it. This shape uses the local-filesystem branch already allowed by `docs/implementation-brief.md:125` and respects the approximately 23-24 GB free observation in `.scratch/artifact-storage/research.md`.

This is not a media hoard and it is not a completed durability claim. The durable external copy, restore evidence, and deletion evidence remain blocked on tickets 03 and 04. Services stay small, loopback-only, and single-owner as required by `AGENTS.md`, `docs/media-transcript-repos.md`, and S9 in the feature record.

## Why this is the smallest coherent phase one

- **Stores:** transcript JSON/Markdown, manifests, source URI and SHA-256, ownership/provenance, searchable text, chunks, and model-aware vectors; bounded document originals and active page/OCR derivatives may stay on the local filesystem. Text is cheap, while the research identifies page images, video derivatives, duplicates, database/WAL growth, and 20 GB restores as capacity risks. (`research.md`; `docs/media-transcript-repos.md`)
- **Refuses:** persistent raw audio, video, or photo hoarding; unbounded encoded-video derivatives; and any claim that a local database dump is a backup before an export and restore have been proven. The research identifies video as the likely first capacity consumer and says a file-only copy is not a complete restore. (`research.md`)
- **Stages:** active media only for a bounded transcription job, with a source URI/hash retained after the bytes are removed. The research describes audio as large and immutable and hybrid tiering as application-managed rather than transparent. (`research.md`)
- **Triggers phase two:** either the operator needs retained raw media beyond the local quota, or tickets 03 and 04 prove a TrueNAS export/restore/deletion path and establish NAS capacity, protocol, ACL, and throughput facts. Then reopen the storage boundary for an expanded object-store or NAS-backed layout. Those facts are currently listed as unverified in `research.md`.
- **Expanded candidate:** SeaweedFS remains the default phase-two candidate for source files, page images, and artifacts because the implementation brief names it at lines 144 and 151 for Apache-2.0 and S3 compatibility. It is not installed or silently made mandatory in phase one. (`docs/implementation-brief.md:144,151`)

## Rejected alternatives for phase one

- **Unbounded local media hoard:** rejected because the host has about 23-24 GB free and the research identifies video, duplicates, derivatives, and database growth as first-fill risks; it remains the bounded local filesystem for text and selected small originals. (`research.md`)
- **TrueNAS as primary storage or an immediate hybrid tier:** deferred because the NAS protocol, pool, capacity, ACLs, credentials, snapshots, throughput, and failure behavior are unknown; `mount.cifs` and `mount.nfs` were absent, and a missing mount must not look like an empty directory. (`research.md`)
- **SeaweedFS now:** deferred, not rejected as the expanded candidate, because it adds a service boundary and local metadata/volume bytes while no candidate was installed or restore-tested; the implementation brief still requires its explicit reconciliation. (`research.md`; `docs/implementation-brief.md:144,151`)
- **Garage now:** rejected for phase one because its documented distributed design recommends three replicas, while a single node loses the independent-copy benefit and the exact single-node restore procedure is unverified. (`research.md`)
- **MinIO now:** rejected for phase one because the exact community binary/version and applicable license boundary remain unpinned, and local objects/version history would compete with the 23 GB margin. (`research.md`)
- **S3 lifecycle as retention authority:** rejected because lifecycle selects object groups by rule, age, prefix, tags, or version state and cannot inspect the application's original/derivative graph or delete it atomically. (`research.md`)

## Per-artifact matrix

| Artifact type | Phase-one authority/store | Retention and reason | Source or named gap |
|---|---|---|---|
| Documents and original downloads | PostgreSQL metadata plus bounded local filesystem originals | Keep only selected, quota-checked originals; refuse an unbounded download tree. Local is hot and simple, but consumes the scarce host margin. | `research.md`; `docs/implementation-brief.md:125`. Exact quota is a gap for tickets 02 and 04. |
| Page images and OCR output | Local derivative area for an active document, with searchable OCR/text in PostgreSQL | Retain only what provenance/retrieval needs; rebuild or delete derivatives according to the recorded relation. Page images can multiply. SeaweedFS is the phase-two expanded candidate for this class. | `research.md`; `docs/implementation-brief.md:144,151`. Rebuildability and deletion proof are gaps for ticket 04. |
| Audio | Bounded local staging for an active transcription only; transcript and manifest in PostgreSQL/local text | Delete raw bytes after verified transcript unless exported; audio is large and immutable, so cold retention is an explicit phase-two choice. | `research.md`. Export-before-delete evidence is a gap for tickets 03 and 04. |
| Video | No persistent phase-one raw video or encoded-video store; bounded staging only | Refuse video hoarding because it is the likely first capacity consumer and encoded derivatives may exceed the host margin. Keep URI/hash and transcript provenance. | `research.md`. Refusal/cleanup proof is a gap for ticket 04. |
| Photos | No unbounded phase-one photo library; URI/hash plus bounded active thumbnail derivative | Human browsing may need hot thumbnails, but the original can remain external; the original hash stays independent of presentation derivatives. | `research.md`. Phase-two NAS/library path is a gap for tickets 01 and 03. |
| Transcripts | PostgreSQL/system of record for metadata, ownership, provenance, source URI/hash, parser/model identity, and relations; rendered Markdown/JSON as exported files | Text is cheap and searchable. The toolkit contract is reused rather than duplicated. | `research.md`; `docs/media-transcript-repos.md`. Combined export/restore proof is a gap for ticket 04. |
| Embeddings and vectors | PostgreSQL/pgvector | Derived and model-specific; retain source/model identity and make vectors rebuildable. | `research.md`; `docs/implementation-brief.md:160-171`. Restore of rows plus model/source references is a gap for ticket 04. |
| Database dumps and backups | Short-lived local staging until verified external export; durable copy on the operator-selected TrueNAS/export destination | A dump is not a backup until it is exported and restored. Keep dump, schema/version, manifest, and key handling together. | `research.md`; `docs/implementation-brief.md:160-171`. Destination facts and proof are gaps for tickets 03 and 04. |

The matrix explicitly covers the implementation brief's originals, derivatives, chunks, vectors, and caches: chunks belong with PostgreSQL retrieval state; caches are disposable and must not be treated as the source of truth; graph projections, if present, follow the same derived-state boundary. (`docs/implementation-brief.md:160-171`; `research.md`)

## Toolkit `artifacts/` boundary

The `media-distillation-toolkit` repository owns manifest validation and deterministic transcript rendering. Its ignored `artifacts/` directory is a local build/output workspace created on demand; the toolkit does not download media, call AI providers, or own durable storage. (`docs/media-transcript-repos.md`) A rendered file becomes durable only when the second-brain storage boundary records it with provenance and includes it in the export manifest. The toolkit directory is therefore not a second source of truth, not a backup, and not a substitute for the PostgreSQL transcript record. (`docs/media-transcript-repos.md`; `research.md`)

## Operator export procedure

The primary procedure to prove is TrueNAS over SMB because the research records TrueNAS SMB as cross-platform and the operator explicitly named TrueNAS plus SMB/NFS; the exact operator protocol remains a ticket 03 gap. (`research.md`)

1. The operator creates or selects a TrueNAS dataset and SMB share, sets the single-owner ACL/credential, and confirms available capacity. The research says those NAS facts are currently unknown. (`research.md`)
2. The host creates a bounded export manifest containing the selected originals, derivatives, transcript files, database dump, vector metadata, and caches included by policy. It refuses to continue unless the destination is a verified mounted SMB filesystem, not merely an existing local directory. This guard is required because the research warns that a missing mount can expose the underlying directory and fill the host. (`research.md`)
3. The host requires the Linux client binary that provides `mount.cifs`; the research observed that `mount.cifs` was absent. No install is performed in this slice. If the client, credentials, share, or mount is absent, the export fails visibly and writes no export bytes. (`research.md`)
4. The export copies the bounded tree and database dump to the mounted share, writes the SHA-256 manifest, and verifies the copied files from the destination. `sha256sum` is present on the host and is the portable verification tool recorded by the research. (`research.md`)
5. The operator obtains the file directly from the TrueNAS SMB share on their own machine, or copies the verified export from that share to their chosen destination. The host records the manifest result and unmounts the share after the bounded operation. The literal command and measured transfer must be supplied by ticket 03, not invented here. (`research.md`)
6. NFS, WebDAV/rclone, and presigned URL flows remain alternatives only if ticket 03 supplies evidence for the operator's actual environment. The research records that `mount.nfs` and `rclone` were also absent. (`research.md`)

## Restore test plan

Ticket 04 must perform this plan with synthetic data, not assert that it works. The test must record the commands/actions, timestamps, byte counts, hashes, and observed errors. (`docs/implementation-brief.md:160-171`; `research.md`)

1. Build a bounded synthetic fixture containing one document, page image, OCR output, transcript/manifest, embedding/vector row, derivative/cache records, and a database dump; include the original-to-derivative relations in the manifest. (`research.md`)
2. Perform the ticket 03 export, then restore into a clean directory or replacement service boundary. Verify every SHA-256 entry, database row, owner/provenance relation, transcript, source/model reference, vector row, and retained derivative. (`research.md`)
3. Delete one selected original through the declared policy. Verify that permitted derivatives, chunks, vectors, graph projections, caches, database rows, and backup copies are removed or retained exactly as the policy says; do not use object lifecycle as a substitute for application dependency handling. (`docs/implementation-brief.md:160-171`; `research.md`)
4. Repeat with the NAS path or required client absent. The expected evidence is a visible failure, no false success, and no write into the unmounted local directory. (`research.md`)
5. Measure, rather than estimate, the 20 GB-class restore or record the exact capacity refusal and phase-two trigger. The research's 50/100 MB/s timings are estimates only. (`research.md`)

## Reconciliation with the implementation brief

This decision takes the local-filesystem option explicitly allowed by `docs/implementation-brief.md:125` for phase one; it does not erase or contradict the expanded design. The brief's line 144 still places SeaweedFS behind source files, page images, and artifacts, and line 151 still names SeaweedFS as the default expanded candidate because it is Apache-2.0 and S3-compatible. Those lines become the phase-two expansion path after capacity, export, restore, and deletion evidence, not an untested phase-one dependency. (`docs/implementation-brief.md:125,144,151`)

Lines 160-171 require export, deletion, backup, and restore across originals, derivatives, chunks, vectors, and caches. This record treats those as acceptance boundaries, not completed facts: ticket 03 must establish the literal operator export, and ticket 04 must perform and record export, restore, deletion, and missing-NAS failure. (`docs/implementation-brief.md:160-171`; `.scratch/artifact-storage/issues/03-operator-export.md`; `.scratch/artifact-storage/issues/04-restore-and-deletion-proof.md`)

## Named gaps that block implementation

- **G1, ticket 01:** the operator's actual NAS protocol and the evidence-backed comparison of all six candidates are not resolved. (`issues/01-grilling-questions.md`; `research.md`)
- **G2, ticket 02:** exact byte quotas, derivative retention/rebuild rules, and the authoritative per-artifact rows are not yet accepted. (`issues/02-artifact-matrix.md`; `research.md`)
- **G3, ticket 03:** TrueNAS dataset/share, ACL, capacity, client package, guarded mount/export action, and literal operator download path are unknown; no SMB/NFS/rclone tool is installed. (`issues/03-operator-export.md`; `research.md`)
- **G4, ticket 04:** no export, restore, deletion, 20 GB capacity, or missing-NAS failure has been performed and recorded. (`issues/04-restore-and-deletion-proof.md`; `research.md`)
- **G5:** the feature task file is not present in this worktree even though it exists in the parent checkout; the task's recorded L8-L10 evidence was read-only and this discrepancy must be reconciled before implementation. (`odd/tasks/media-transcript-library-and-agent-console.md` in the parent checkout; `map.md`)

Until G1-G4 have evidence, phase one is a decision boundary and handoff, not an implementation authorization. (`issues/01-grilling-questions.md`; `issues/03-operator-export.md`; `issues/04-restore-and-deletion-proof.md`)

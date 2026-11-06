# 01: Grill the storage candidates against the same eight questions

Type: grilling
Status: open
Blocked by: none

## Question

For each candidate storage form, answer the same eight questions using evidence from `../research.md` or mark the answer as an explicit open gap. Do not substitute preference for evidence. Candidates are local Linux filesystem, SeaweedFS single-node S3, Garage single-node S3, MinIO single-node S3, TrueNAS-backed SMB/NFS, and hybrid hot-local plus cold-NAS.

### Candidate: local Linux filesystem

1. **Single node versus NAS-backed:** Evidence: it is a single local filesystem; NAS absence does not affect local reads or writes, but the host disk remains the failure domain. Export to a NAS requires a protocol boundary. (`research.md`, local filesystem comparison)
2. **Hot versus cold:** Evidence: files are hot while the host runs; there is no automatic cold tier. A copied TrueNAS archive is a second copy, not transparent tiering. (`research.md`)
3. **Deduplication:** Evidence: ordinary filesystem naming does not content-deduplicate separate files. An application SHA-256 index and canonical object are required if deduplication is wanted. (`research.md`; GNU Coreutils source linked there)
4. **Checksums:** Evidence: `sha256sum` is present and can verify a sidecar manifest; filesystem-level scrubbing was not verified for this host. (`research.md`)
5. **Delete and retention:** Evidence: application metadata must distinguish originals, derivatives, and caches; `rm` does not know derivative dependencies. (`research.md`)
6. **Restore test:** Evidence: the proposed test is a copy of 20 GB to a clean directory or replacement disk, manifest verification, database-dump restore, and path/hash checks. Timing estimates are unverified. (`research.md`)
7. **Byte cost at 23 GB free:** Evidence: it has no separate service fee, but the host has about 24 GB available in the research measurement; originals, video derivatives, duplicates, and DB/WAL growth can consume it. Corpus mix is unmeasured. (`research.md`)
8. **NAS path absent:** Evidence: local work can continue, but operator export or NAS backup cannot. If the path is mounted, mount failure must not expose the underlying empty mountpoint as a writable directory. (`research.md`; Linux NFS source linked there)

### Candidate: SeaweedFS single-node S3

1. **Single node versus NAS-backed:** Evidence: a local master, filer, volume server, and S3 gateway are one failure domain. Configured replication is not automatically repaired under normal operation. (`research.md`; SeaweedFS replication source linked there)
2. **Hot versus cold:** Evidence: local volumes are hot through S3. Tiering exists in project documentation, but exact cold-read behavior for this layout is unverified. (`research.md`)
3. **Deduplication:** Evidence: S3 keys identify objects; automatic cross-key content deduplication for this layout was not established. Application SHA-256 identity is the available documented approach. (`research.md`)
4. **Checksums:** Evidence: SeaweedFS documents checksums and replication; an application SHA-256 manifest plus periodic GET/hash verification answers a separate byte-identity question. (`research.md`)
5. **Delete and retention:** Evidence: object-key deletion does not infer original/derivative relations. S3 lifecycle selects object groups by rules, not semantic dependency graphs. (`research.md`; S3 lifecycle source linked there)
6. **Restore test:** Evidence: the proposed test restores service data to a clean location or re-uploads 20 GB, then checks listings and SHA-256 manifests. The exact recovery runbook is unverified. (`research.md`)
7. **Byte cost at 23 GB free:** Evidence: it consumes the local filesystem plus service metadata; configured replication multiplies bytes. A safe usable corpus limit was not measured. (`research.md`)
8. **NAS path absent:** Evidence: local S3 operations continue if data is local; NAS-backed volume or backup operations fail or queue. Exact service behavior for a missing NAS tier is unverified. (`research.md`)

### Candidate: Garage single-node S3

1. **Single node versus NAS-backed:** Evidence: Garage's design describes quorum reads and recommends three replicas; one node has no independent copy. NAS absence is irrelevant only when neither data nor backup uses NAS. (`research.md`; Garage design sources linked there)
2. **Hot versus cold:** Evidence: local cluster data is served through S3; no transparent NAS cold tier was established in the reviewed documentation. (`research.md`)
3. **Deduplication:** Evidence: S3 object identity is key-based; cross-key content deduplication was not verified. (`research.md`)
4. **Checksums:** Evidence: quorum and consistency checks are not an application byte manifest; a SHA-256 manifest and re-read audit are required. A user-facing scrub command for this single-node layout is an open gap. (`research.md`)
5. **Delete and retention:** Evidence: S3 lifecycle/versioning operate on object groups and versions, not original/derivative dependency graphs. (`research.md`)
6. **Restore test:** Evidence: the proposed test recreates configuration/data or re-uploads objects, then checks listings, hashes, and application references. Exact single-node procedure and duration are unverified. (`research.md`)
7. **Byte cost at 23 GB free:** Evidence: the recommended three-replica model can consume roughly three copies before overhead; a single replica removes that multiplier and its durability benefit. (`research.md`)
8. **NAS path absent:** Evidence: local objects remain available when NAS is not used; NAS-dependent backup or cold reads fail. Exact failure behavior is an open gap. (`research.md`)

### Candidate: MinIO single-node S3

1. **Single node versus NAS-backed:** Evidence: a single local process is one storage failure domain; NAS absence matters when its data or backup path is on NAS. Exact community binary/version boundary is not pinned. (`research.md`)
2. **Hot versus cold:** Evidence: local objects are hot over S3; a separate NAS archive is not transparent cold storage without application behavior. (`research.md`)
3. **Deduplication:** Evidence: the proposed S3 object model does not establish cross-key content deduplication; application SHA-256 identity is required if used. (`research.md`)
4. **Checksums:** Evidence: S3 checksum headers and an application SHA-256 manifest answer integrity and identity checks; exact service behavior for the intended release is unverified. (`research.md`)
5. **Delete and retention:** Evidence: lifecycle and versioning act on rule-selected objects; they do not understand derivative references, and versioned deletes can retain noncurrent bytes. (`research.md`)
6. **Restore test:** Evidence: the proposed test recovers data/configuration or re-uploads objects, recreates policy/configuration, verifies hashes, and restores the database dump. No MinIO restore was run. (`research.md`)
7. **Byte cost at 23 GB free:** Evidence: local bytes include objects, metadata, and possible old versions; the host margin is small for originals, video encodes, dumps, and history. (`research.md`)
8. **NAS path absent:** Evidence: local S3 operations can continue without NAS; NAS export/backup fails. No MinIO CLI is installed and exact missing-path behavior is unverified. (`research.md`)

### Candidate: TrueNAS-backed SMB/NFS path

1. **Single node versus NAS-backed:** Evidence: NAS is a separate storage node; if it is primary and absent, reads/writes fail or block at the mount boundary. NFS hard/soft behavior and the warning against silent corruption are documented in the cited man pages. (`research.md`)
2. **Hot versus cold:** Evidence: a reachable mount is network-hot, slower, and availability-dependent; a cold object requires application-managed rehydrate/stream behavior. (`research.md`)
3. **Deduplication:** Evidence: SMB/NFS exposes files, not semantic deduplication; exact TrueNAS/ZFS dedup configuration is unknown. (`research.md`)
4. **Checksums:** Evidence: the NAS may provide storage integrity, but pool configuration is unknown; a portable host-side SHA-256 manifest is available. (`research.md`)
5. **Delete and retention:** Evidence: filesystem deletion is immediate unless NAS snapshots/backups retain a copy; application metadata still owns original/derivative semantics. (`research.md`)
6. **Restore test:** Evidence: the proposed test restores a snapshot/replication target or copies 20 GB to a clean host directory, verifies the manifest, restores the database dump, and tests reads. NAS speed and snapshot setup are unverified. (`research.md`)
7. **Byte cost at 23 GB free:** Evidence: primary NAS storage does not consume host capacity except caches, database files, and staging; NAS capacity, redundancy, and price are unknown. (`research.md`)
8. **NAS path absent:** Evidence: primary reads/writes fail or block. A missing mount must not be mistaken for an empty local directory, or writes can fill the host filesystem underneath it. (`research.md`)

### Candidate: hybrid hot-local plus cold-NAS

1. **Single node versus NAS-backed:** Evidence: hot local reads and new ingest can remain available when NAS is absent; cold-only reads, demotions, and backup completion fail or queue. (`research.md`)
2. **Hot versus cold:** Evidence: the application keeps active objects local and moves older objects to NAS; the user sees a cold flag, network latency, or rehydrate step. (`research.md`)
3. **Deduplication:** Evidence: deduplicate before tiering with a content hash and manifest; neither local filesystem nor SMB/NFS guarantees this. (`research.md`)
4. **Checksums:** Evidence: the proposed portable check hashes on ingest, after local write, after NAS copy, and during cold audits. (`research.md`)
5. **Delete and retention:** Evidence: deletion is a two-phase application operation over logical artifact, derivatives, and physical hot/cold copies; lifecycle rules cannot express the graph. (`research.md`)
6. **Restore test:** Evidence: the proposed test rebuilds the local manifest/database, copies required bytes to a clean hot tree, verifies hashes, and rehydrates needed derivatives. A measured runbook is unverified. (`research.md`)
7. **Byte cost at 23 GB free:** Evidence: failed transfers and staging can temporarily create two copies; a 20 GB restore leaves almost no working space on the host. (`research.md`)
8. **NAS path absent:** Evidence: hot work continues, but cold reads, demotions, and backup completion fail or queue; the application must surface the state and not treat the NAS as empty. (`research.md`)

## Acceptance criteria

1. The eventual answer records evidence or a named gap for all eight questions for all six candidates.
2. No candidate is selected or rejected solely by taste, and no unverified behavior is written as fact.
3. The result names the exact research or repository path supporting each non-open statement.
4. Any remaining gap is assigned to ticket 02, 03, or 04 rather than hidden in a recommendation.

## Evidence to gather

- `.scratch/artifact-storage/research.md` and its cited upstream sources.
- `docs/implementation-brief.md:125`, `:144`, `:151`, and `:160-171`.
- Host observations recorded in `research.md`; do not install missing clients or services in this ticket.

## Constraints

- This is a HITL grilling ticket, not an implementation task.
- Loopback-only, single-owner, and small-service boundaries remain mandatory.
- Do not install Samba, NFS, rclone, MinIO, or any storage service; do not change Compose or other tracker areas.

## Open question

Which evidence-backed candidate can satisfy the phase-one capacity boundary and the operator's literal export requirement without contradicting the implementation brief, and which gaps must remain blocked on proof?

## Comments

# Artifact storage research

## Scope and method

- Online research only, using official project documentation or upstream source pages where available.
- Candidate set: local Linux filesystem; SeaweedFS single-node S3; Garage single-node S3; MinIO single-node S3; TrueNAS SMB/NFS path; hybrid hot-local plus cold-NAS.
- No candidate was installed, benchmarked, or connected to the private corpus.
- Host observation: `df -h /` reported 130G total, 101G used, 24G available, rounded from the operator's 129G total and 23G free. Only `/usr/bin/sha256sum` was present among the checked tools; `smbd`, `nfsd`, `rclone`, `minio`, `mount.cifs`, and `mount.nfs` were not found.
- Timing values below are estimates from the stated throughput, not measurements on this host. Exact NAS and disk throughput is unverified.

## Candidate comparison under the same eight questions

### 1. Local Linux filesystem under the repo host

| Question | Answer |
|---|---|
| Single node versus NAS absent | It is a single local filesystem, so NAS absence does not affect reads or writes. The failure domain is the host disk and its filesystem. Exporting it to the operator machine would require a server protocol such as SMB or NFS, and neither server binary is installed. Linux NFS client and server roles are separate: `mount.nfs` mounts a remote export, while `nfsd` serves one. [Linux mount.nfs](https://man7.org/linux/man-pages/man8/mount.nfs.8.html), [Linux nfsd](https://man7.org/linux/man-pages/man8/nfsd.8.html) |
| Hot/cold and user-visible effect | All files are hot while the host is running. There is no automatic cold tier, so the user sees local filesystem latency. A manually copied archive on TrueNAS is a second copy, not transparent tiering. |
| Repeated-media deduplication | The filesystem does not content-deduplicate two separately named files by itself. The application should hash bytes before writing and map the same SHA-256 to one canonical object; hard links are an implementation option, not an automatic policy. `sha256sum` is the available verifier. [GNU Coreutils checksum](https://www.gnu.org/software/coreutils/manual/html_node/md5sum-invocation.html) |
| Checksums and verification | Store a SHA-256 manifest beside the artifact and periodically run `sha256sum --check`; this verifies bytes end to end, independently of filesystem metadata. Filesystem-level scrubbing or checksumming is filesystem-specific and was not verified for this host. |
| Delete and retention | Application metadata must distinguish original, derivative, and cache, then delete only the selected class. `rm` has no knowledge of derivative dependencies. Keep the manifest and database export until the retention decision is complete. |
| Restore test for 20 GB | Restore means copy 20 GB to a clean directory or replacement disk, verify every manifest entry, restore the database dump, and confirm that paths and hashes resolve. At 100 MB/s it is about 3.4 minutes; at 50 MB/s about 6.8 minutes, before verification and database import. Actual time is unverified. |
| Byte cost and first thing to fill it | There is no separate storage service charge, but the remaining local capacity is only about 24 GB. Originals and especially video derivatives can consume it first; duplicate downloads and database/WAL growth are additional risks. The corpus mix has not been measured. |
| Literal export to TrueNAS | The human enables an SMB or NFS share on TrueNAS, then the Linux host mounts that remote share and copies files. SMB needs a CIFS client such as `mount.cifs`; NFS needs `mount.nfs`; both are absent today. If the desired direction is TrueNAS pulling from this host, this host instead needs an SMB/NFS server, also absent. TrueNAS documents SMB as cross-platform and NFS as Unix-oriented. [TrueNAS sharing](https://www.truenas.com/docs/scale/23.10/scaletutorials/shares/smb/addsmbshares/), [Linux mount.nfs](https://man7.org/linux/man-pages/man8/mount.nfs.8.html) |

### 2. SeaweedFS, single-node S3

| Question | Answer |
|---|---|
| Single node versus NAS absent | A single SeaweedFS master, filer, volume server, and S3 gateway on local storage is still one failure domain. NAS absence is irrelevant unless the volume directory or backup is placed on NAS. SeaweedFS replication is configurable, but the project documents that missing replicas are not automatically repaired under normal operation and require `weed shell` repair. [SeaweedFS replication](https://github.com/seaweedfs/seaweedfs/wiki/Replication) |
| Hot/cold and user-visible effect | A local volume is hot through the S3 API. SeaweedFS also documents tiering and cloud-tier features, but those were not validated for this exact single-node layout. If an object is moved to a remote tier, the application should expect network-dependent retrieval; the exact cold-read behavior is unverified. [SeaweedFS wiki](https://github.com/seaweedfs/seaweedfs/wiki/Tiered-Storage) |
| Repeated-media deduplication | S3 keys identify objects; two keys containing the same video are not assumed to share bytes. No official source was verified here for automatic cross-key content deduplication in the proposed layout. Use an application SHA-256 index and one canonical key if deduplication is required. |
| Checksums and verification | SeaweedFS documents checksums for corruption detection and configurable replication. The application should still keep SHA-256 and perform periodic S3 GET plus hash verification because storage checks and application identity answer different questions. [SeaweedFS replication](https://github.com/seaweedfs/seaweedfs/wiki/Replication) |
| Delete and retention | Delete by object key is separate from deleting related derivative keys. The application must own a manifest or database relation between original and derivatives. S3 lifecycle can expire objects selected by prefix, tags, age, or version state, but it cannot infer that `thumbs/x` is safe to delete while `originals/x` is retained. [S3 Lifecycle](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) |
| Restore test for 20 GB | Restore means stop the service, restore the volume/filer/master data to a clean location or re-upload 20 GB through S3, then verify object listings and SHA-256 manifests. At 100 MB/s raw copy is about 3.4 minutes; at 50 MB/s about 6.8 minutes; service metadata and verification add unmeasured time. SeaweedFS documents that volume files can be moved and picked up after restart, but the exact recovery runbook is unverified here. [SeaweedFS replication](https://github.com/seaweedfs/seaweedfs/wiki/Replication) |
| Byte cost and first thing to fill it | It still consumes the same local filesystem, plus service metadata. Replication multiplies bytes: SeaweedFS describes a replication string whose total copies are `1 +` the configured additions, so replication is not affordable with 24 GB free unless the corpus is tightly bounded. Originals and video copies remain the likely first pressure. [SeaweedFS replication](https://github.com/seaweedfs/seaweedfs/wiki/Replication) |
| Literal export to TrueNAS | The human configures a TrueNAS SMB/NFS share. The host either mounts it with the missing CIFS/NFS client and runs an S3-to-files export, or exposes SeaweedFS's S3 endpoint to an installed client such as rclone. rclone supports S3-compatible providers and `copy`/`sync`, but rclone is not installed. [rclone S3](https://rclone.org/s3/), [TrueNAS SMB](https://www.truenas.com/docs/scale/23.10/scaletutorials/shares/smb/addsmbshares/) |

### 3. Garage, single-node S3

| Question | Answer |
|---|---|
| Single node versus NAS absent | Garage is designed for distributed object storage and its design describes quorum reads across replicas, with the recommended example using three replicas. A one-node deployment cannot provide multi-node failure tolerance; if its local data path is lost, the service has no independent copy. NAS absence is irrelevant only when NAS is not used for Garage data or backup. [Garage internals](https://garagehq.deuxfleurs.fr/documentation/design/internals/), [Garage design](https://garagehq.deuxfleurs.fr/documentation/design/) |
| Hot/cold and user-visible effect | Garage serves local cluster data through S3. It is not a transparent NAS cold-tier manager in the reviewed documentation. A cold tier would be an explicit export or separate backend, so the user would see a cache miss, copy job, or unavailable object rather than a native filesystem placeholder. [Garage cookbook](https://garagehq.deuxfleurs.fr/documentation/cookbook/) |
| Repeated-media deduplication | Garage's S3 object identity is key-based. No official source was verified for cross-key content deduplication. Use application-side SHA-256 addressing and a logical reference table for repeated videos and rendered images. |
| Checksums and verification | Garage uses quorum and consistency checks for distributed metadata and data access, but quorum is not an application-level byte manifest. Keep SHA-256 manifests and re-read objects during audits. The reviewed Garage pages do not establish a dedicated user-facing scrub command for this proposed single-node deployment. [Garage internals](https://garagehq.deuxfleurs.fr/documentation/design/internals/) |
| Delete and retention | Garage exposes S3-style object operations, so application metadata must own original/derivative relationships. Lifecycle and version rules can act on object groups, not semantic dependency graphs. S3 versioning also means a delete can create a marker while old bytes remain until noncurrent versions are expired. [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html), [S3 Lifecycle](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) |
| Restore test for 20 GB | Restore means recreate the Garage node/configuration and data directory from backup, or re-upload the objects, then check bucket listings, object hashes, and application references. At 100 MB/s the byte copy is about 3.4 minutes, but layout metadata and validation add time. The exact single-node restore procedure and measured duration are unverified. |
| Byte cost and first thing to fill it | Garage's recommended three-replica model can consume roughly three copies of object bytes before filesystem overhead, which is incompatible with treating 24 GB free as 24 GB of usable corpus capacity. A single replica avoids that multiplier but also removes the main durability benefit. [Garage internals](https://garagehq.deuxfleurs.fr/documentation/design/internals/) |
| Literal export to TrueNAS | Use an S3 client to copy from Garage to a mounted TrueNAS share, or configure rclone with an S3 remote and copy to a WebDAV/S3/NFS-visible destination. rclone is absent. SMB/NFS mounting also needs the absent Linux client tools. [rclone S3](https://rclone.org/s3/), [rclone WebDAV](https://rclone.org/webdav/), [Linux mount.nfs](https://man7.org/linux/man-pages/man8/mount.nfs.8.html) |

### 4. MinIO, single-node S3

| Question | Answer |
|---|---|
| Single node versus NAS absent | A single local MinIO process is one storage failure domain. NAS absence matters only if its data directory or backup is on NAS. Erasure coding or distributed deployment should not be assumed for a one-node experiment. The current official documentation surface is now focused on AIStor, so the exact community binary/version boundary must be pinned. [MinIO documentation](https://docs.min.io/), [MinIO source license](https://github.com/minio/minio/blob/master/LICENSE) |
| Hot/cold and user-visible effect | Local MinIO objects are hot over S3. A separate NAS archive is not transparent cold storage unless the application implements it. The user would see a rehydrate/copy operation or a failed read when the cold copy is unavailable. |
| Repeated-media deduplication | MinIO's S3 object model does not make two different keys a content-deduplicated blob in the proposed design. Use application SHA-256 keys and references. No official source was verified for automatic cross-key deduplication here. |
| Checksums and verification | Use S3 checksum headers where supported and retain an application SHA-256 manifest; then perform periodic GET and hash verification. The S3 checksum documentation distinguishes request/object integrity checks from an application identity policy. [S3 integrity checking](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html) |
| Delete and retention | Application code must delete originals and derivatives independently. Lifecycle rules can transition or expire objects selected by rule filters, and versioning retains prior versions; lifecycle does not understand derivative references. Versioned deletes can leave noncurrent bytes until a noncurrent-version rule removes them. [S3 Lifecycle](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html), [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html) |
| Restore test for 20 GB | Restore means recover the MinIO data/configuration or copy objects into a clean server, recreate bucket policy/config, verify listings and SHA-256, then restore the database dump. At 100 MB/s the data copy is about 3.4 minutes; at 50 MB/s about 6.8 minutes. A MinIO-specific measured restore was not run. |
| Byte cost and first thing to fill it | It consumes the local filesystem and may retain old versions if versioning is enabled. The current 24 GB free margin is small for originals plus encoded videos, thumbnails, database dumps, and any version history. MinIO's current license position is a decision constraint: the repository license file says AGPLv3, while the current MinIO Software License page limits use absent an enterprise agreement to one non-production internal evaluation instance. Pin the exact release and obtain legal review before adoption. [MinIO source license](https://github.com/minio/minio/blob/master/LICENSE), [MinIO Software License](https://docs.min.io/license/) |
| Literal export to TrueNAS | Configure the S3 endpoint and copy with rclone, or mount a TrueNAS share and use an S3-capable application/export job. rclone is absent, and `minio` is absent, so no MinIO CLI path exists on this host today. [rclone S3](https://rclone.org/s3/), [TrueNAS SMB](https://www.truenas.com/docs/scale/23.10/scaletutorials/shares/smb/addsmbshares/) |

### 5. TrueNAS-backed SMB/NFS path as primary or cold tier

| Question | Answer |
|---|---|
| Single node versus NAS absent | The NAS is a separate storage node. If it is primary and absent, reads and writes fail or block at the mount boundary. Linux NFS defaults to hard retry behavior; the man page warns that soft timeouts can cause silent data corruption. Do not let an unavailable mount be mistaken for an empty directory, or writes can fill the host filesystem underneath the mountpoint. [Linux NFS options](https://man7.org/linux/man-pages/man5/nfs.5.html), [TrueNAS data sharing](https://www.truenas.com/docs/scale/gettingstarted/configure/setupsharing/) |
| Hot/cold and user-visible effect | A mounted NAS path is network-hot while reachable, but slower and dependent on network and NAS availability. As a cold tier, the application must record that the object is remote and rehydrate or stream it; the user notices latency and failure when the NAS is asleep, disconnected, or unavailable. |
| Repeated-media deduplication | SMB/NFS exposes files, not semantic deduplication. ZFS/TrueNAS features may provide pool-level behavior, but no exact deduplication setting was verified for this NAS. Use application SHA-256 identity and avoid writing duplicate bytes. |
| Checksums and verification | TrueNAS/ZFS can provide storage-integrity mechanisms, but the exact pool configuration is unknown. The portable check is an exported SHA-256 manifest verified on the host after copy. `sha256sum` is present; `mount.cifs` and `mount.nfs` are not. |
| Delete and retention | Filesystem deletion is immediate unless a configured NAS snapshot or backup retains an older copy. Application metadata still controls whether an original or derivative is deleted. S3 lifecycle rules do not apply to SMB/NFS files unless an S3 service is placed in front of the NAS. |
| Restore test for 20 GB | Restore means restore a TrueNAS snapshot/replication target or copy 20 GB back to a clean host directory, verify the manifest, restore the database dump, and test application reads. At 1 Gb/s theoretical wire speed, 20 GB is about 2.7 minutes before protocol overhead; at 50 MB/s it is about 6.8 minutes. Actual NAS speed and snapshot setup are unverified. [TrueNAS snapshots](https://www.truenas.com/docs/scale/scaletutorials/dataprotection/replication/), [Linux NFS](https://man7.org/linux/man-pages/man5/nfs.5.html) |
| Byte cost and first thing to fill it | Primary NAS storage does not consume the host's 24 GB except for caches, database files, and temporary exports. NAS capacity, pool redundancy, and price are unknown. If used as cold tier, hot copies and export staging can still fill the host. |
| Literal export to TrueNAS | The human creates a dataset and SMB/NFS share in TrueNAS, credentials/ACLs, then on Linux mounts `//nas/share` with CIFS or `nas:/export` with NFS and copies the tree. `mount.cifs` and `mount.nfs` are missing today. WebDAV is not a native SMB/NFS substitute unless a WebDAV server is separately provided. [TrueNAS SMB](https://www.truenas.com/docs/scale/23.10/scaletutorials/shares/smb/addsmbshares/), [Linux mount.nfs](https://man7.org/linux/man-pages/man8/mount.nfs.8.html) |

### 6. Hybrid hot local plus cold NAS

| Question | Answer |
|---|---|
| Single node versus NAS absent | The hot local copy keeps new ingest and hot reads available when NAS is absent. Cold-only reads, demotions, and backup completion fail or queue. The application must expose this state and must never treat a missing NAS mount as an empty cold store. |
| Hot/cold and user-visible effect | Originals or frequently used derivatives stay local; older originals, source media, and completed exports move to NAS. The user notices a cold flag, network latency, or a rehydrate step on first access. This is application-managed tiering, not a filesystem property. |
| Repeated-media deduplication | Deduplicate before tiering with a content hash and a manifest. Keep one canonical original and references from transcript, thumbnail, OCR, and vector records. Neither a normal local filesystem nor SMB/NFS guarantees this automatically. |
| Checksums and verification | Hash on ingest, hash after local write, hash after NAS copy, and periodically re-read cold files. Keep the manifest in the database export or a small sidecar. This gives a portable cross-tier check even when storage-specific integrity features differ. [GNU Coreutils checksum](https://www.gnu.org/software/coreutils/manual/html_node/md5sum-invocation.html) |
| Delete and retention | Delete is a two-phase application operation: mark the logical artifact, remove derivatives only when no references remain, then delete hot/cold physical copies after the retention window. S3 lifecycle rules, if an object store is added, can expire selected object classes but cannot express this graph. [S3 Lifecycle](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) |
| Restore test for 20 GB | Restore means recreate the local manifest/database, copy the required 20 GB from NAS to a clean hot tree, verify hashes, and rehydrate only needed derivatives. At 50 MB/s the byte copy is about 6.8 minutes; a full 20 GB verification and DB import add time. The operational runbook and measured duration are unverified. |
| Byte cost and first thing to fill it | It caps hot usage while retaining a cold copy, but staging and failed transfers can temporarily create two copies. With only 24 GB free, a 20 GB restore leaves almost no working space. Video originals/encodes and duplicate staging are the first risks. |
| Literal export to TrueNAS | The human starts a bounded export job, mounts the TrueNAS share with CIFS/NFS or configures rclone WebDAV/S3, copies and verifies the manifest, then unmounts. rclone supports `copy` and S3/WebDAV remotes but is absent; CIFS/NFS client tools are also absent. [rclone S3](https://rclone.org/s3/), [rclone WebDAV](https://rclone.org/webdav/), [Linux mount.nfs](https://man7.org/linux/man-pages/man8/mount.nfs.8.html) |

## What S3 lifecycle can and cannot express

- It can transition or expire objects selected by bucket rules, prefixes, tags, age, and version state. [S3 Lifecycle](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- In a versioned bucket, a delete normally creates a delete marker; old noncurrent versions remain until explicitly expired by lifecycle or removed. [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- It cannot inspect the application's transcript, OCR, thumbnail, vector, or database relationships and decide whether an original is still needed.
- It cannot guarantee that an original and all derivatives transition or delete atomically as one application transaction.
- Therefore lifecycle is a byte-age safety net, not the retention authority.

## Comparable self-hosted layouts

| Project | Officially documented layout | Storage lesson |
|---|---|---|
| Immich | Immich documents separate locations/templates for uploaded library media, thumbnails, encoded video, profile assets, and backups. [Immich environment variables](https://docs.immich.app/install/environment-variables/), [Immich storage template](https://docs.immich.app/administration/storage-template/) | Keep originals distinct from generated thumbnails and encoded video. Derivatives can be rebuilt or moved independently, but the database and path contract must travel with them. |
| Paperless-ngx | Its administration docs describe an exporter containing documents, thumbnails, metadata, and database contents, intended for re-import into a fresh instance. [Paperless-ngx administration](https://docs.paperless-ngx.com/administration/) | A restore artifact must include both files and metadata/database state. A file-only copy is not a complete restore. |
| RAGFlow | RAGFlow's official Docker deployment separates the document engine and supporting services such as object storage and databases; its dataset docs describe OCR/layout/table parsing and derived chunks. [RAGFlow Docker README](https://github.com/infiniflow/ragflow/blob/main/docker/README.md), [RAGFlow dataset configuration](https://github.com/infiniflow/ragflow/blob/main/docs/guides/dataset/configuration.md) | Treat originals, parser output, chunks, vectors, and service databases as separate lifecycle classes. Do not assume a product's internal index is the canonical original. |

## Decision matrix rows to carry forward

| Artifact type | Candidate store options | Trade-off to decide |
|---|---|---|
| Documents and original downloads | Local filesystem; local S3; NAS primary; hybrid | Local is simplest and hot but consumes the scarce disk; NAS reduces host pressure but adds availability and client dependencies; S3 adds a service boundary. |
| Page images and OCR output | Local hot derivatives; S3 prefix; NAS cold after verification | Page images can multiply quickly; OCR is rebuildable only if the parser/model is reproducible, so retention policy matters. |
| Audio | Local hot for transcription queue; NAS cold after transcript verification; S3 object key | Audio is usually large and immutable; keeping it cold saves host bytes but makes re-transcription NAS-dependent. |
| Video | Hash-addressed local staging; NAS primary/cold; S3 object store | Video is the likely first capacity consumer; encoded derivatives may be larger than expected and should not be retained by default. |
| Photos | NAS/library primary or local hot cache; S3-compatible store | Human browsing wants hot thumbnails, while originals can be cold; keep the original hash independent of presentation derivatives. |
| Transcripts and manifests | PostgreSQL/system of record plus small exported JSON/text files | Text is cheap and searchable; it must retain source URI, media hash, parser/model identity, and derivative relations for reproducibility. |
| Embeddings and vectors | PostgreSQL/pgvector for retrieval; rebuildable object export on NAS | Vectors are derived and model-specific. A database dump is needed for fast restore, but the source and model metadata must survive so vectors can be regenerated. |
| Database dumps and backups | Local short-lived staging plus TrueNAS snapshots/replication | Backups must be tested by restore, not just copied. Keep dump, schema/version, manifest, and encryption/key handling together. |

## Three constraints that dominate the decision

1. With about 24 GB free, a 20 GB restore or duplicate video staging operation can exhaust the host even when the nominal artifact tree fits.
2. NAS-backed primary storage is operationally simple only after the missing client/server tools, mount-failure guard, credentials, and restore test exist; a missing mount must not look like an empty directory.
3. S3 lifecycle and object versioning cannot replace application ownership of original/derivative relationships. Content-hash identity, manifests, and a database-aware delete/restore workflow are required in every candidate.

## Unverified

- No throughput, latency, failure, or restore benchmark was run on this host or the operator's TrueNAS.
- The NAS filesystem, pool redundancy, snapshots, quotas, protocols, credentials, and available capacity are unknown.
- Automatic content deduplication behavior for the exact SeaweedFS, Garage, and MinIO versions was not established and is therefore not assumed.
- The exact MinIO community binary, release, and license terms applicable to the intended deployment remain to be pinned and reviewed.
- No candidate was installed, and no S3 lifecycle implementation was tested against these services.

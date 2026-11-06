# 03: Define the literal operator export path

Type: task
Status: open
Blocked by: 01

## Question

What does the operator literally do, from a human-controlled machine and from this Linux host, to obtain a file export of originals, derivatives, transcripts, manifests, vectors, database dumps, and caches? Choose and document one supported path among TrueNAS over SMB, TrueNAS over NFS, WebDAV or an rclone mount, or a presigned URL flow. Name every host tool that path requires and the fail-closed behavior when that tool or the NAS path is absent.

The ticket must describe the action at file level, not merely say "export to NAS": create/select destination, authenticate, start the bounded export, verify the manifest, locate/download the resulting file from the operator's machine, and unmount or revoke access when applicable.

## Acceptance criteria

1. One primary operator path is written as literal steps for one of these flows: TrueNAS SMB; TrueNAS NFS; WebDAV or rclone mount; or presigned URL.
2. The acceptance text names what the operator literally does to obtain a file, including the TrueNAS UI/share action where applicable, the Linux mount/client command family or URL flow, and the final path or download action.
3. The ticket names what this host must install for the chosen path. The research observation is that `mount.cifs`, `mount.nfs`, `rclone`, `smbd`, and `nfsd` were absent; no installation is performed by this ticket. (`research.md`)
4. When the required client, mount, credential, destination, or NAS path is absent, export fails closed with a visible error and no write to an unmounted local directory. It does not claim success or substitute an empty directory.
5. The procedure exports the database dump plus manifest and the relevant original/derivative files, and tells the operator how to verify SHA-256. (`research.md`; `docs/implementation-brief.md:160-171`)
6. The procedure remains compatible with loopback-only and single-owner deployment; no public object-storage endpoint is introduced.
7. The ticket records protocol choice, required host packages, measured transfer result, and unresolved NAS facts as evidence rather than opinion.

## Evidence to gather

- `.scratch/artifact-storage/research.md`, including the TrueNAS, Linux mount, rclone, and checksum sources.
- `docs/implementation-brief.md:125,144,151,160-171`.
- The operator's actual TrueNAS protocol, dataset/share, capacity, ACLs, and credentials, which are currently unknown.

## Constraints

- This ticket defines a path but does not install Samba, NFS, rclone, MinIO, or any other tool.
- Do not change `compose.yaml`, expose services publicly, or move private corpus data into this repository.
- A missing NAS mount must be an operational error, never an empty-store success.

## Open question

Which protocol can the operator actually use on TrueNAS, and what exact host-side client and guarded export command can obtain a verifiable file without consuming the remaining local capacity?

## Comments

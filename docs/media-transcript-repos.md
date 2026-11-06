# Media transcript repositories and where each one sits

Verified on this host on 2026-11-06 by reading the working copies, not from memory. Read this before opening a ticket that names a repository: it fixes which path owns which responsibility.

## Paths

| Path | What it is | Verified state |
| --- | --- | --- |
| `/root/git/personale/media-distillation-toolkit` | The transcript project we started from: a dependency-free Python 3.11+ toolkit that validates a source manifest and renders already-available transcript JSON into deterministic Markdown. It does **not** download media and does **not** call AI providers. | remote `darkrei08/media-distillation-toolkit`, branch `master`, HEAD `c367992 feat: bootstrap media distillation toolkit` |
| `/root/git/personale/pi.dev/second-brain-stack` | The stack that owns retrieval, storage and surfaces: `compose.yaml` with `pgvector/pgvector:pg17` on `127.0.0.1:55432`, `src/`, `test/`, and the decision set in `odd/tasks/` | branch `feat/live-answers`, HEAD `c010dbd docs: hand off the stack to a fresh session` |
| `/root/git/fork/elie222/rakazo` | Candidate for the out-of-terminal agent console only. Fork `darkrei08/rakazo`, Apache-2.0, Docker Compose self-host on `127.0.0.1:5173` | local clone, 117 MB, `--filter=blob:none`, no branch or sync applied |
| `/root/git/personale/data-research-stack` | The research stack, the other candidate home for a fetch lane | referenced, not inspected in this pass |

## What the transcript project already owns

- `media_distill/manifest.py` validates a playlist manifest; `examples/playlist-manifest.json` is the worked example.
- `media_distill/transcript.py` renders transcript JSON to Markdown; `examples/transcript.json` is the worked example.
- `media_distill/cli.py` exposes `validate` and `render`; the editable install adds the `micio-distill` console command.
- `docs/asr-backends.md` and `docs/quickstart-asr.md` carry the ASR options that stay outside the runtime dependencies.
- `tests/test_toolkit.py` is a standard-library `unittest` suite, run with `python3 -m unittest discover -s tests -v`.
- `artifacts/` is the ignored output directory, created on demand.

## The boundary that follows from that

The toolkit is the **contract surface** for a transcript: validate the manifest, render the transcript, deterministic output. Fetching media, running ASR and storing artifacts are separate capabilities, which is what the service-boundary spec asks for: small services the second brain activates, each with its own contract. When a ticket needs a transcript shape, it reads this toolkit's manifest and transcript modules rather than inventing a second schema; when a ticket needs retrieval, storage or a surface, it belongs to `second-brain-stack`.

## Open questions this file does not answer

- Which stack hosts the fetch lane (media stack, data-research stack, or a new service beside the toolkit), tracked as T5 in `odd/tasks/media-transcript-library-and-agent-console.md`.
- Whether the toolkit gains a service wrapper or stays a library the services import, which depends on the service-boundary ticket.
- Whether rakazo runs at all, tracked as T3, against the host's memory budget.

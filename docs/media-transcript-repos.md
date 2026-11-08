# Media transcript repository boundaries

This document records the public ownership boundary for media-transcript work. It intentionally omits host-local paths, credentials, private runtime state, and unverified checkout details.

## Repositories

| Repository | Owns | Boundary status |
| --- | --- | --- |
| `darkrei08/media-distillation-toolkit` | Transcript contract tooling: source-manifest validation and deterministic rendering of available transcript JSON into Markdown. | Does not download media or call AI providers. |
| `darkrei08/pi-second-brain-stack` | Retrieval, storage, collection scope, citations, and user-facing reference-stack integration. | This repository owns the public integration boundary, not the transcript toolkit implementation. |
| `darkrei08/rakazo` | Candidate out-of-terminal agent console. | Candidate only; no transcript-library ownership is implied. |
| `data-research-stack` | Candidate home for a fetch lane and research orchestration. | Placement remains an explicit decision; do not assume ownership from the name alone. |

## Contract rules

- A ticket that needs a transcript shape reads the toolkit's manifest and transcript modules instead of inventing a second schema.
- Media fetching, speech-to-text, rendering, artifact storage, retrieval, and agent-console concerns remain separately owned capabilities.
- Retrieval and storage work belongs to the second-brain boundary; it must not be copied into the toolkit or the agent console.
- The fetch lane remains undecided between the media stack, the research stack, and a dedicated service until its contract and operational proof are recorded.
- Private corpora, OCR output, embeddings, graph exports, database dumps, credentials, and model caches never belong in this public repository.

## Open decisions

- Select and document the fetch-lane owner before implementing an integration.
- Keep the transcript library's owner, tag, playlist, and macro-topic taxonomy aligned with the repository's collection and retrieval decisions.
- Decide storage and export per artifact type using evidence; do not infer a durable storage choice from a candidate repository's name.

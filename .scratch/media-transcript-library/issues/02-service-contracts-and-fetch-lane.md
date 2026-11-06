# 02: Define S9 service contracts and the fetch-lane owner

Type: decision
Status: open
Blocked by: 01

## Question

What are the contracts, lifecycle, provenance, and ownership boundaries for the independent fetch, transcribe, render, and search services, and where does the yt-dlp fetch lane live?

## Acceptance criteria

1. Each of fetch, transcribe, render, and search has a documented input, output, error, lifecycle, and correlation/provenance contract.
2. The contracts identify which identifiers are authoritative, how retries or repeated requests behave, and how the second brain activates and searches each arm.
3. The fetch-lane comparison keeps the media stack and data-research stack open, marks `/root/git/personale/data-research-stack` not inspected, and records the bare `media-distillation-toolkit` repository boundary only as rejected for downloading because it does not download media or call AI providers; it covers the yt-dlp-specific boundary named by T5.
4. The resolved ownership choice names its repository or stack and records why the alternatives do not own that lane.
5. The default design keeps all four capabilities independently deployable and callable; any proposed merge explicitly states the reason and trade-off.
6. No contract requires a remote or multi-user deployment under the current single-owner loopback assumptions.

## Evidence to gather

- S3, S4, S9, S10 and T5 in `odd/tasks/media-transcript-library-and-agent-console.md`.
- `docs/media-transcript-repos.md`, plus `media_distill/manifest.py`, `media_distill/transcript.py`, and the toolkit `examples/` files as the transcript contract evidence; do not invent a second transcript schema.
- The repository-boundary answer from ticket 01.
- Existing second-brain gateway, owner, provenance, retrieval, and job conventions.
- Authorized documentation for the candidate media and data-research stacks and yt-dlp integration points; do not install or run them in this pass. Storage, retrieval, and surface work belongs to `second-brain-stack`.

## Constraints

- Fetch, transcribe, render, and search are separate small services with separate contracts, activated and searched by the second brain. No capability may be folded into a single monolith; any ticket that would merge two must say so and justify it.
- Nothing is installed, vendored, cloned further, or run for rakazo until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions hold. Any remote or multi-user need becomes its own ticket with its own threat note.
- V1 Open WebUI, V2 one source of truth per record type, V3 folder equals retrieval scope backed by collections, and V4 attachment ingestion into our store stay in force unless explicitly reopened with evidence.

## Open question

Which exact contracts and repository ownership assignments, including the yt-dlp fetch lane, should govern the four independent S9 arms?

## Comments


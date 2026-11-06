# 05: Define the Open WebUI library surface and record ownership

Type: decision
Status: open
Blocked by: 03, 04

## Question

What should the Media Stack Transcriptions surface expose in the Open WebUI shape, and which store owns each record so the transcript library does not become a second chat or document store against V2?

## Acceptance criteria

1. The surface contract identifies the left navigation, transcript detail, chat/attachment flow, search flow, and folder or taxonomy controls required by S1 and S2 without prescribing implementation code; the surface and its storage/retrieval seams belong to `second-brain-stack`, while transcript payload shape follows the toolkit contract rather than a new schema.
2. A record-ownership matrix assigns conversation, message, pin, folder, transcript, source, artifact, tag, playlist or macro-topic, collection, citation, and search-index records to exactly one source of truth.
3. The matrix defines the ingest, retrieval, citation, update, and deletion hand-offs between Open WebUI, the second-brain gateway, the media arms, and the authoritative stores.
4. The contract rejects duplicated chat history and duplicated authoritative transcript content, and identifies how references cross the store boundary.
5. The surface remains compatible with V1-V4 and states any evidence needed before a shell integration ticket can be opened.
6. Any remote access, multi-user identity, or shared-library behavior is separated into a follow-up threat-noted ticket rather than implied by the local surface.

## Evidence to gather

- S1 and S2 in `odd/tasks/media-transcript-library-and-agent-console.md`.
- `docs/media-transcript-repos.md`, `media_distill/manifest.py`, `media_distill/transcript.py`, and the toolkit `examples/` as the transcript contract authority.
- Inherited V1-V4 and the integration findings in `.scratch/interface-stack/map.md`.
- The resolved collections ticket and ticket 04's taxonomy model.
- Verified Open WebUI hook and record-ownership evidence already recorded in the interface-stack area; no new client installation in this pass. Retrieval, storage, and surface implementation remains in `second-brain-stack`.

## Constraints

- The S9 arms stay separate small services with separate contracts, activated and searched by the second brain. The surface may orchestrate them but may not fold them into one monolith; any merge proposal must say so and justify it.
- Nothing is installed, vendored, cloned further, or run for rakazo until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions hold. Any remote or multi-user need becomes its own ticket with its own threat note.
- V1 Open WebUI, V2 one source of truth per record type, V3 folder equals retrieval scope backed by collections, and V4 attachment ingestion into our store remain in force unless explicitly reopened with evidence.

## Open question

What exact Open WebUI-shaped surface and store-ownership matrix delivers the transcript library without creating a second source of truth for chats or documents?

## Comments


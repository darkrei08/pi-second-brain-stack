# Agent console map

## Destination

Produce an evidence-ready decision path for an out-of-terminal agent console that could replace day-to-day Herdr-in-terminal and the iOS client, while keeping the transcript library, second-brain API, and existing Herdr/PiWorkflow orchestrator boundaries explicit. This pass creates the map and open tickets only; it does not adopt, install, configure, clone, or run a console.

## Dependency position

This area inherits the interaction-surface decisions in `.scratch/interface-stack/map.md` and the V1-V4 decisions below. The candidate fork is `/root/git/fork/elie222/rakazo`, with upstream `elie222/rakazo` and fork `darkrei08/rakazo`; it remains a candidate only. Any later execution must be authorized by a specific ticket and must not be inferred from this map.

## Decisions

- **Inherited V1:** Open WebUI remains the primary shell for the library interaction surface.
- **Inherited V2:** There is one source of truth per record type; the shell and our store do not mirror the same records.
- **Inherited V3:** A folder is a retrieval scope backed by collections, not merely a shell label.
- **Inherited V4:** Attachments are ingested into our store with provenance and follow its deletion boundary.
- No new decision is made here. Rakazo is not adopted, and the console path remains open until the tickets below are answered.

## Candidate/evidence table

| Candidate or boundary | What the recorded evidence says | What it answers | What it does not answer | Source |
|---|---|---|---|---|
| `elie222/rakazo` candidate, evaluated through the operator fork | Apache-2.0 beta TypeScript monorepo with web, mobile, desktop, API, worker, Compose self-hosting, persistent bots/conversations, computers, and remote access | **S5 strongly**: an out-of-terminal agent console; **S1 partly**: chat plus attachments; part of S6: a Compose-based candidate | **S2** transcript owner/tag/playlist or macro-topic taxonomy; **S3** fetch lane; **S4** automatic transcript source targeting/reorganization and deep research | Feature document **L2**, read through **L6** |
| Open WebUI | Already selected as the primary interaction shell for the library and retrieval workflow | Inherited **V1-V4** for library interaction, ownership, folder scope, and attachment ingest | It is not adopted here as the replacement for Herdr/PiWorkflow agent management | `.scratch/interface-stack/map.md`; feature document **L4** |
| Thin console on our API | A still-open alternative: a small surface over the existing API and orchestrator-owned control contract | Nothing is decided in this pass | Its required UI, agent-control contract, cost, remote boundary, and operational footprint | Ticket `01-console-path` |
| Other console candidates | No new market evidence is gathered in this documentation-only pass | Nothing is decided in this pass | Whether any alternative is better than Rakazo or a thin console | Ticket `01-console-path` |

The Rakazo row is a map of the already recorded evidence, not a fresh verification. Per **L2/L6**, Rakazo answers S5 strongly and S1 partly; it does not answer S2, S3, or S4. The transcript library therefore remains our work and is not delegated to the candidate by implication.

## Repository reference

The authority for these assignments is `docs/media-transcript-repos.md`.

- `/root/git/personale/media-distillation-toolkit` (remote `darkrei08/media-distillation-toolkit`, branch `master`, HEAD `c367992`) is the transcript **CONTRACT** surface: validate + render via `media_distill/manifest.py` and `media_distill/transcript.py`, using dependency-free Python 3.11 and writing into ignored `artifacts/`. It does **not** download media and does **not** call AI providers, so it is not the fetch lane.
- `/root/git/personale/pi.dev/second-brain-stack` is this repository (branch `feat/live-answers`, HEAD `c010dbd`) and owns retrieval, storage and surfaces, with `pgvector/pgvector:pg17` on `127.0.0.1:55432`.
- `/root/git/fork/elie222/rakazo` is the console **CANDIDATE** only.
- `/root/git/personale/data-research-stack` is the other candidate home for the fetch lane and is **NOT yet inspected**.

## The frontier

1. [01: Choose the agent-console path without adopting a candidate](issues/01-console-path.md) — **unblocked**; decides what must be compared and what evidence is required before any adoption.
2. [02: Keep agent authority with Herdr/PiWorkflow](issues/02-authority-boundary.md) — blocked by `01-console-path`; defines the console as a client, not a second scheduler.
3. [03: Measure the Compose footprint against the 16 GB host budget](issues/03-compose-footprint.md) — blocked by `01-console-path`; measures rather than assumes the candidate's resource cost.
4. [04: Set the console/library record-type boundary](issues/04-record-boundary.md) — blocked by `01-console-path`; applies inherited V2 to chats, attachments, documents, transcripts, and citations.
5. [05: Define remote reach without breaking loopback-only](issues/05-remote-reach.md) — blocked by `01-console-path`, `02-authority-boundary`, and `03-compose-footprint`; compares a tunnel or authenticated reverse proxy and carries its threat note.

## Safety boundary

- Documentation only in this pass. No code, install, vendoring, further clone, Docker Compose run, network research, or candidate adoption is authorized.
- Nothing is installed, vendored, cloned further, or run for Rakazo until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions remain the default. Remote or multi-user access is isolated in ticket 05 and must carry its own threat note.
- The console must not become a second scheduler, queue owner, retry owner, worktree owner, or source of Herdr/PiWorkflow authority.
- S9 remains binding: fetch, transcribe, render, and search are separate small services with separate contracts, activated and searched through the second brain. No capability may be folded into one monolith.
- V1-V4 remain in force unless a ticket explicitly reopens one with evidence. No corpus, credentials, or private model material enters this repository.

## Reading order

Read this map, then tickets `01` through `05` in frontier order; use `.scratch/interface-stack/map.md`, its resolved ticket 02, and the feature document's recorded L2/L4/L6 evidence as the inherited context.

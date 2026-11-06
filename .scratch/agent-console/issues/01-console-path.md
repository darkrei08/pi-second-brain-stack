# 01: Choose the agent-console path without adopting a candidate

Type: decision
Status: open
Blocked by: none

## Question

Should the out-of-terminal agent console be based on the operator's Rakazo fork, evaluated against other candidates, or built as a thin console on our API, and what evidence must be verified before any path can be adopted?

## Acceptance criteria

1. Compare exactly these paths: Rakazo as a candidate base, other console alternatives, and a thin console over our API; record that none is adopted by this ticket.
2. Cite the recorded feature-document evidence in L2 and L6 without re-verifying or replacing it with new claims.
3. State plainly that Rakazo answers S5 strongly and S1 partly, while it does not answer S2, S3, or S4.
4. List the pre-adoption evidence required for each surviving path: control/API fit, authentication and identity, authority boundary, record ownership, resource footprint, remote threat model, operational maintenance, and licence terms.
5. Identify the exact later ticket or authorization required before installing, cloning further, configuring, or running any candidate.

## Evidence to gather

- Feature document L2 and L6, plus the inherited V1-V4 decisions in `.scratch/interface-stack/map.md`.
- `docs/media-transcript-repos.md` for the repository boundary: Rakazo is a console candidate only; the toolkit is the transcript contract surface and not the fetch lane, while storage, retrieval, and surfaces belong to `second-brain-stack`.
- Existing second-brain HTTP/API and orchestrator contracts, if a later ticket authorizes examining them.
- Candidate source and deployment documentation only under a later, explicit research or execution authorization; no network research is part of this pass.

## Constraints

- S9 binds the comparison: fetch, transcribe, render, and search remain separate services with separate contracts; no candidate may justify a monolith.
- Rakazo at `/root/git/fork/elie222/rakazo` remains a candidate only; nothing about it is installed, vendored, cloned further, configured, or run until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions remain the default; remote or multi-user access is not silently included.
- V1-V4 remain in force unless a ticket explicitly reopens one with evidence. The console cannot claim ownership of library records by implication.
- This ticket must not transfer scheduling or agent-work ownership from Herdr/PiWorkflow.

## Open question

Which path, if any, has enough verified evidence to become the console candidate without contradicting V1-V4, S9, or the existing orchestrator authority?

## Comments

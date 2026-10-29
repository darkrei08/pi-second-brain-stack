# Issue tracker

This repository uses a local Markdown issue tracker under `.scratch/`.

- One feature or effort per directory: `.scratch/<feature-slug>/`.
- Specs live at `.scratch/<feature-slug>/spec.md`.
- Implementation tickets live at `.scratch/<feature-slug>/issues/NN-<slug>.md`.
- Wayfinder maps live at `.scratch/<effort>/map.md`.
- Wayfinder child tickets use `Type:`, `Status:`, and `Blocked by:` lines.
- Comments append under `## Comments`.
- Pull requests are not used as a request surface for this local-only repository.

## GitHub mirror

This repository is published at `github.com/darkrei08/pi-second-brain-stack`. The Markdown tracker under `.scratch/` stays authoritative for specifications; GitHub issues mirror one ticket each so the development trail is visible outside the repository.

- Issue title = the ticket heading; body = question, acceptance criteria, answer, spec path, and commit.
- One `type:*` label per issue, plus the canonical triage label for its state.
- Resolved tickets are created and closed immediately; deferred areas stay open with `ready-for-human`.
- Pull requests are stacked one per Wayfinder: each PR's base is the previous Wayfinder branch, and the first targets `main`. Merge in order, never out of order.
- Update the local ticket file first and mirror the state in the issue; when the two disagree, the repository wins.

## Wayfinding operations

Claim a ticket by changing `Status: open` to `Status: claimed` before work. Resolve it by appending `## Answer`, changing the status to `resolved`, and adding a context pointer to the map's Decisions-so-far section. A ticket is on the frontier when it is open, unclaimed, and every listed blocker is resolved.

# Issue tracker

This repository uses a local Markdown issue tracker under `.scratch/`.

- One feature or effort per directory: `.scratch/<feature-slug>/`.
- Specs live at `.scratch/<feature-slug>/spec.md`.
- Implementation tickets live at `.scratch/<feature-slug>/issues/NN-<slug>.md`.
- Wayfinder maps live at `.scratch/<effort>/map.md`.
- Wayfinder child tickets use `Type:`, `Status:`, and `Blocked by:` lines.
- Comments append under `## Comments`.
- Pull requests are not used as a request surface for this local-only repository.

## Wayfinding operations

Claim a ticket by changing `Status: open` to `Status: claimed` before work. Resolve it by appending `## Answer`, changing the status to `resolved`, and adding a context pointer to the map's Decisions-so-far section. A ticket is on the frontier when it is open, unclaimed, and every listed blocker is resolved.

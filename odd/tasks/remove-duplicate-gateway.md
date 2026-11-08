# Feature: remove duplicate gateway ownership

This feature ports the requested repository-split commits from `feat/session-2` onto `feat/remove-duplicate-gateway` in reviewable work units.

## Specs

- S1. "Switch to /root/.herdr/worktrees/second-brain-stack/worktree-gateway on feat/remove-duplicate-gateway, clean docs/media-transcript-repos.md, and port commits 8cd7ec0 and d7b4425 within the ~400 lines/commit budget."
- S2. The port must remove the duplicate gateway implementation from this reference stack while keeping the reference documentation and Compose boundary coherent with the published backend and shell repositories.
- S3. Each work-unit commit must stay at approximately 400 or fewer changed lines.
- S4. Public documentation must not retain host-private absolute paths or private runtime details.

## Tasks

| ID | Specs | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1, S3 | Clean the repository authority document and record the slice plan | pending |
| T2 | S1, S4 | Add a public-safe `docs/media-transcript-repos.md` | pending |
| T3 | S2, S3 | Port the 8cd7ec0 repository split in bounded deletion and documentation slices | pending |
| T4 | S2, S3 | Port the d7b4425 tracker ownership move in bounded slices | pending |
| T5 | S1-S4 | Verify tree shape, tracker checks, tests, privacy, and per-commit budgets | pending |

## Log

- L1 (operator request, 2026-11-08, verbatim): "Switch to /root/.herdr/worktrees/second-brain-stack/worktree-gateway on feat/remove-duplicate-gateway, clean docs/media-transcript-repos.md, and port commits 8cd7ec0 and d7b4425 within the ~400 lines/commit budget."
- L2 (evidence): The target worktree is clean on `feat/remove-duplicate-gateway` at `36b9362`; the requested commits are on `feat/session-2` and share merge-base `c010dbd` with the target.
- L3 (evidence): `docs/media-transcript-repos.md` is present on `feat/session-2` but absent from the target tree. Its source copy includes host-local absolute paths and must be rewritten for public documentation before porting.
- L4 (delivery strategy): Use chained work-unit slices. Keep documentation additions near the 400-line review budget; keep the duplicate-runtime removal as the smallest honest subsystem units because whole-file deletions cannot be split without creating artificial intermediate code. The first oversized local deletion commit was rewritten before delivery.

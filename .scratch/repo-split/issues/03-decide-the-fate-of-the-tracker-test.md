# 03: Decide where the tracker test lives

Type: grilling
Status: open
Blocked by: none

## Question

`test/traceability.test.js` reads `odd/` and `.scratch/` to prove every tracker row points at something real. It is the only thing keeping the traceability matrix honest, and it is a Node test inside the suite that moves to the backend. Decide: move it here as a repository check on the tracker, keep a backend copy that validates only what the backend owns, or replace it with a check that runs where the tracker lives.

## Acceptance criteria

- One owner, one runner, and a documented command a person runs before pushing tracker changes.
- The check still fails when a row points at a missing ticket or a missing commit, demonstrated by breaking one row and observing the failure.
- No repository's suite depends on files it does not contain.

## Decision taken

The check stays here, because the tracker lives here. It caught a real omission during this very program: ticket 02 was marked resolved without a matrix row and the suite failed with "resolved tickets missing from odd/traceability.md". A check that runs where the tracker lives cannot drift from it, and the backend must not depend on files it does not contain.

Shape: a dependency-free Node script here that validates the matrix, run from a minimal `package.json` in this repository so a person runs one command before pushing tracker changes. The backend keeps only tests about the backend.

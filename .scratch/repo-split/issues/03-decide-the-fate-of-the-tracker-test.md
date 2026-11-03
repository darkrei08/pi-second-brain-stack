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

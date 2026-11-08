# 02: Guard the traceability matrix against status drift

Type: task
Status: resolved
Blocked by: None

## Question

R9 records that `odd/traceability.md` is maintained by hand and silently disagreed with committed work. What is the smallest mitigation that both refreshes the drifted rows and keeps future drift visible?

## Context

The observed drift on 2026-10-29 was concrete: the streaming row claimed `commit pending` and `native review pending` after `e9adac3` had shipped, three completed work units had no row at all (bounded research on `1c010f1`, the Open WebUI Filter/Pipe on `043d064`, the risk register on `26bb276`), and a stale duplicate row still declared the HTTP gateway and live answer generation "Not implemented".

## Acceptance criteria

- [x] Refresh every stale row from committed evidence, citing the commit and the native review lineage where one exists.
- [x] Add the missing rows for bounded research, the Open WebUI Filter/Pipe, the risk register, and the market comparison, and drop the superseded duplicate gateway row.
- [x] Add one test that fails when a stale commit or review marker reappears, or when a ticket marked `Status: resolved` has no row in the matrix.
- [x] Keep the check inside `npm test` with no new dependency, no CI service, and no git-history read from the test.

## Verification

- `node --test test/traceability.test.js`
- `npm test`

## Answer

The matrix is refreshed and a two-assertion guard runs with the normal unit suite. `test/traceability.test.js` reads `odd/traceability.md` and the tracker directory only: it fails on the markers `commit pending` and `native review pending`, and it fails when any `.scratch/<effort>/issues/NN-*.md` carrying `Status: resolved` is not referenced by the matrix.

Both assertions were observed red before green. The completeness assertion failed on `02-provenance-citation-contract.md` and `03-first-slice-boundary.md` until the first row named them by full path, and the marker assertion failed on a temporary probe row that was removed immediately after. `npm test` went from 121 tests (99 pass, 22 expected skips) to 123 tests (101 pass, 22 expected skips, 0 fail), exit 0.

The guard is deliberately narrow. It catches the drift that actually happened and the class it belongs to (a silent status claim or an unlisted resolved ticket); it does not verify that a cited commit exists, because a committed test must not read git history.

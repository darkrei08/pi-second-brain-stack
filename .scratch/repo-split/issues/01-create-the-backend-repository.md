# 01: Move the gateway into its own repository

Type: task
Status: resolved
Blocked by: none

## Question

Create `darkrei08/pi-second-brain-backend` and move the gateway there with a history that stays readable. Decide the mechanics (subtree split or a filtered clone), break the `src/index.js` to `src/answer-question.js` import cycle before the move rather than after, decide what happens to `test/traceability.test.js` (ticket 03), and leave the reference `compose.yaml` in this repository pointing at the new checkout by a documented path.

## Acceptance criteria

- The new repository clones clean; `npm ci`, `npm test` and the migration script pass on its own, needing no file from `.scratch/` or `odd/`.
- The gateway starts from the new checkout and answers `/healthz` and a grounded `/v1/answers` against a disposable database.
- This repository's `compose.yaml` still brings the stack up, referencing the backend checkout.
- No credential, corpus, dump, OCR output or model cache entered the new repository's history.

## Answer

Created `https://github.com/darkrei08/pi-second-brain-backend`, public with default branch `main`, at tip `90829792807c1e371122f7364eaa0c56111fc335`.

History kept with `git filter-branch --index-filter` from `b22dd08`, retaining `src/`, `test/` except `test/traceability.test.js`, `scripts/`, `docker/postgres/init/`, package metadata, CI, and `odd/`. The import-cycle fix was committed before filtering. The `src/` history count was 47 before and 47 after filtering (46 at the canonical b22dd08 baseline); `git log --follow -- src/answer-question.js` reaches the moved history and the cycle-fix commit.

The extracted checkout has an npm lockfile, standalone README, migration command, and CI with `pgvector/pgvector:pg17`. A fresh clone passed the npm CLI `ci` install and `npm test`: 174 tests, 141 passed, 33 skipped, 0 failed. On disposable pgvector/pg17 at loopback port 32776, migration applied 5/5 files and `npm run test:integration` passed 38/38; those tests cover `/healthz` and grounded `/v1/answers`.

The GitHub `main` history was audited with `git rev-list --objects`: 0 forbidden artifact path matches and 0 `traceability.test.js` matches; a blob scan found only synthetic test key fixtures, not credentials. The reference Compose update remains a separate follow-up because this unit only publishes the backend.

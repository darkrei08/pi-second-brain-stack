# 01: Move the gateway into its own repository

Type: task
Status: open
Blocked by: none

## Question

Create `darkrei08/pi-second-brain-backend` and move the gateway there with a history that stays readable. Decide the mechanics (subtree split or a filtered clone), break the `src/index.js` to `src/answer-question.js` import cycle before the move rather than after, decide what happens to `test/traceability.test.js` (ticket 03), and leave the reference `compose.yaml` in this repository pointing at the new checkout by a documented path.

## Acceptance criteria

- The new repository clones clean; `npm ci`, `npm test` and the migration script pass on its own, needing no file from `.scratch/` or `odd/`.
- The gateway starts from the new checkout and answers `/healthz` and a grounded `/v1/answers` against a disposable database.
- This repository's `compose.yaml` still brings the stack up, referencing the backend checkout.
- No credential, corpus, dump, OCR output or model cache entered the new repository's history.

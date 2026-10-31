# Delivered-stack risk register

This source-level snapshot identifies unresolved confidentiality, correctness, retention, availability, and deployment risks before the stack is used with real corpus data. Details and evidence are in [issue 01](issues/01-risk-register.md).

## Destination and scope

- Canonical register: `.scratch/risk-register/issues/01-risk-register.md`.
- Candidate source and task history: `odd/tasks/risk-register.md`.
- Source revision: `feat/session-2` at `1c9a2ff`.
- Scope: repository source, configuration, docs, and tracked tests for the HTTP gateway and PostgreSQL stack. This does not establish deployed network controls, provider retention, external CI, or production behavior.

## Scoring

Impact and likelihood each use High=3, Medium=2, Low=1. Exposure is their product (1–9). Impact estimates the consequence if the condition is realized; likelihood estimates the condition in the described code/deployment scenario, not a measured incident rate. These are triage estimates, not probabilities. A mixed candidate is split: score only the source-supported residual risk. Rejected subclaims receive no score. Ties are ordered by direct data exposure or loss, then correctness, recovery, availability, and process impact.

## Current ranking

| Rank | Risk | Impact | Likelihood | Exposure | Disposition |
|---|---|---:|---:|---:|---|
| 1 | R1 Shared bearer token can select a mapped identity | High | Medium | 6 | **Mitigated on `f5602b5`**; native review `review-c88c8279c7a63750` acknowledged. Residual: revocation needs a restart |
| 2 | R2 Sensitive question/evidence sent to configured provider | High | Medium | 6 | **Mitigated on `a98fcd5`** by a declared-host allowlist; residual: no provider-call audit record |
| 3 | R5 Tombstone retention and missing export path | High | Medium | 6 | Confirmed; hard-delete cascade works. **Blocked on an operator decision** |
| 4 | R8 No versioned migration or operational restore path | High | Medium | 6 | **Mitigated on `76fdadb`**; rehearsal recorded. Residual: scheduled backups are deployment policy |
| 5 | R9 Traceability can drift | Medium | High | 6 | Confirmed; drift refreshed and guarded by `test/traceability.test.js` ([issue 02](issues/02-traceability-drift-check.md)) |
| 6 | R4 Citation integrity is not semantic support | Medium | Medium | 4 | Confirmed |
| 7 | R6 No explicit rate or concurrency cap | Medium | Medium | 4 | Confirmed; 120-second model-timeout claim rejected |
| 8 | R7 No repository-local CI gate | Medium | Medium | 4 | Confirmed; Pi dependency vulnerability count rejected |
| 9 | R10 No live-provider or load coverage | Medium | Medium | 4 | Confirmed; hostile-text fixture exists |
| 10 | R3 Residual prompt-injection/model-behavior uncertainty | Medium | Low | 2 | Confirmed as an unverified residual, not a reproduced exploit |

## Three pre-deployment mitigations

1. Replace the shared bearer token plus caller-selected shell identity with a trusted per-principal identity boundary and an operator revocation path (R1). **Mitigated in code on `f5602b5`**: per-principal tokens select their own owner, the legacy shell-user header no longer decides identity, and startup refuses an ambiguous credential configuration. Runtime-proven on 2026-10-30. Operator token revocation is still a restart.
2. Decide and enforce approved model-provider destinations and data handling before sending corpus text remotely; record provider/model metadata without logging raw evidence (R2). **Mitigated in code on `a98fcd5`**: a remote endpoint must be declared in `ANSWER_ALLOWED_HOSTS` or `EMBEDDING_ALLOWED_HOSTS` and any other host is refused before a request. The audit record of provider and model metadata is still missing.
3. Gate real-corpus use on a defined export/purge lifecycle and a versioned migration plus backup/restore rehearsal (R5, R8). **R8 mitigated on `76fdadb`**: forward-only migrations plus a rehearsed dump and restore. **R5 remains open**: tombstone versus purge semantics is an irreversible product decision that has not been taken. Until semantic support is assessed, present uncertainty as citation integrity and require human checking for consequential answers (R4).

## R9 mitigation status

R9's drift is closed for the present state: the matrix was refreshed from committed evidence and `test/traceability.test.js` fails on a stale `commit pending` or `native review pending` marker and on any resolved ticket missing from the matrix. The guard cannot prove that a cited commit exists, because a committed test must not read git history, so a wrong-but-unmarked hash remains possible.

## Exit condition

This register exits its claimed audit state when each supplied candidate and disputed subclaim has a CONFIRMED/REJECTED disposition with current evidence or a specific reason, every confirmed risk has the requested threat/control/residual/verification/score/follow-up fields, the ranking and pre-deployment actions are recorded, and the docs-only work unit is committed and natively reviewed. This is not deployment authorization. No push is part of the exit condition.

## Verification limits

Source and tests were inspected; test commands listed in the issue were not run for this documentation-only audit. No live provider, deployment, external CI service, dependency advisory query, load test, or destructive retention test was performed. Those boundaries are explicit in the issue.
# ADR 0001: Repository shape, tracker ownership, and branch policy

Status: proposed
Date: 2026-11-08
Deciders: operator

## Context

The product is split across `second-brain-stack` (coordination), `second-brain-backend`
(Node package) and `second-brain-shell` (Open WebUI Python plugins). What follows is
inspected state, not intention.

- `second-brain-stack/package.json` declares package `second-brain-stack-segmentation` and
  publishes bins `second-brain-gateway` and `segment-document`, with a `pg` dependency.
  `second-brain-backend/package.json` publishes the same two bins plus `ingest-directory`.
  The gateway exists twice.
- The stack copy is pre-extraction residue: backend commit `8576d7c`
  "build(backend): make the extracted gateway standalone" establishes the direction, and
  every gateway file is smaller in the stack (`gateway-server.js` 312 vs 818 lines,
  `gateway-auth.js` 55 vs 99, `gateway-config.js` 68 vs 149).
- The removal is already written, and trapped: `feat/session-2` carries
  `8cd7ec0 refactor(stack): consume the published backend and shell packages` and
  `d7b4425 feat(tracker): move traceability check into stack repository`, 135 commits
  ahead of `main`.
- Four ledgers exist: stack `.scratch/` (53 files, declared authoritative by
  `docs/agents/issue-tracker.md:3`), stack `odd/tasks/` (19 files), the GitHub mirror, and
  backend `odd/` (20 tasks). 18 of the 19 stack task filenames exist verbatim in the
  backend tree, so one of those trees is a guaranteed-drift mirror. The only consistency
  check lives in the stack repository.
- `docs/agents/issue-tracker.md:21` defines a manual reconciliation rule ("when the two
  disagree, the repository wins"). That rule is the divergence mechanism: it admits
  disagreement and answers it with human discipline, which is what already failed.
- `main` is the oldest ref (2026-10-28). Eight worktrees exist, including three
  `pi-extensible-workflows` leftovers from 2026-10-28 and one detached gentle-ai candidate
  view. The primary checkout is on `feat/live-answers`, not on `main`.
- Two divergent implementation lines exist. `worktree/master` (`05b63d1`) and
  `feat/session-2` (`808c266`) share merge-base `c010dbd` and are 44 and 72 commits apart;
  `git cherry` finds no patch equivalence in either direction, and the diff between them is
  187 files, +10209/-5361. `worktree/master` carries graph projection, the parser engine
  client, the modular gateway refactor and the pinned-port compose; `feat/session-2` carries
  the risk register, the repo split, identity and work groups, artifact storage, the
  transcript library and the collections bridge.

## Decision

1. Three repositories with disjoint responsibilities. `second-brain-stack` owns
   coordination, ADRs, the tracker and system-wide compose, and keeps no `src/`, no `bin`
   and no `pg` dependency. `second-brain-backend` owns the single Node package.
   `second-brain-shell` owns the Python plugin package.
2. One tracker, in `second-brain-stack`, next to the code it describes. Tickets for backend
   and shell work live there. Those two repositories carry an `AGENTS.md` pointer and no
   tracker of their own.
3. The repository tracker is authoritative. GitHub issues are generated output, regenerated
   by script and never hand-edited, with a drift check wired into `npm test`.
4. One trunk: `main`. One worktree per unit of work, created from `origin/main` and removed
   on merge. No two worktrees may share a HEAD. An agent must not start work on a checkout
   that has unmerged commits and no open PR.
5. Commits are work units, with tests and docs, budgeted at 400 authored changed lines and
   chained when over. A unit that changes a published contract gets its own commit.

## Open question that governs the migration

Which of the two divergent lines is the trunk: `worktree/master`, `feat/session-2`, or
neither as-is. Nothing in either repository states it, and the migration steps below differ
depending on the answer. Until it is answered, step 6 cannot start.

- `worktree/master` is the newest by depth and by date (`main` + 107, 2026-11-07), and is
  the only holder of 43 commits and of 39 `.scratch` topics. It has no remote.
- `feat/session-2` is the only holder of the whole second line, 72 commits and 73
  `.scratch` topics, and it is the line from which the extracted backend was derived.
- Nothing has been merged to `main` since 2026-10-28.

## Rejected alternatives

- Keep the stack package and drop the backend one. Rejected: the backend copy is the
  complete one (818 vs 312 lines) and `8576d7c` extracted toward it; keeping the smaller
  fork discards the extraction.
- Collapse to a single repository. Rejected: the shell is Python with its own
  `requirements.txt` and the Open WebUI plugin protocol, and a repository should own its own
  runtime and dependencies.
- Keep the tracker in each implementing repository. Rejected: cross-repository features
  (the gateway contract, the citation resolver) would need two tickets with no shared
  authority, which is the observed 18-filename duplication.
- Keep `.scratch/` and the GitHub mirror in parallel under the manual reconciliation rule.
  Rejected: it already diverged, and the rule admits divergence by construction.
- Keep `feat/session-2` as a parallel trunk. Rejected: two trunks on one host is the
  stale-checkout generator, and it is 135 commits ahead with no merged base.
- Land four independent PRs to `main`. Rejected: none is under the 400-line budget, and
  chained PRs are required above it.

## Migration steps, in order

Each step is one work unit with its own commit.

1. Freeze: no new branches from `main`. Declare one integration branch, and require the
   stale-checkout test (`git rev-list --count main..HEAD` > 0 with no open PR means stale)
   before any agent writes.
2. Answer the open question above, and record it as an amendment to this ADR.
3. Remove the duplicate gateway from the stack: delete `src/gateway-*.js` and
   `test/gateway-*.test.js`, point the bins at the backend package, and verify against
   `backend/src/gateway-server.js` before the commit, because it changes a published
   contract.
4. Collapse the ledgers: fold backend `odd/tasks` and `odd/handoff` into the stack tracker,
   resolve `gateway-clients.md` and `risk-register.md` explicitly, then delete backend
   `odd/`.
5. Add the mirror generator and the drift check, wired into `npm test`.
6. Land the integration branch on `main` in slices through a chained PR tracker, then
   delete the absorbed branches after proving containment.
7. Remove the three `pi-extensible-workflows` worktrees and the detached gentle-ai candidate
   view, then `git worktree prune`.
8. Write this policy and its pre-flight check into the `AGENTS.md` of all three
   repositories, and return the primary checkout to `main`.

Step 3 before 4 because the contract precedes the documents that describe it. Step 4 before
6 because slices must cite tracker tickets. Step 7 last because it needs merged branches.

## Consequences

- Two packages can no longer publish the same bin name, so the duplication cannot return
  silently without failing a check.
- The tracker becomes one tree with a generated mirror, so divergence stops being a manual
  discipline and becomes a test failure.
- Every agent session starts from a known-clean `main`, which makes a 60-135 commit gap
  visible as unmerged work instead of invisible inside a checkout.
- Adopting this costs one migration pass and one CI check. Not adopting it keeps three
  ledgers and eight worktrees, which is the state that produced the 13 recorded
  contradictions and the two-line split.

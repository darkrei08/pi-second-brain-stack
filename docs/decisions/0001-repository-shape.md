# ADR 0001: Repository shape, tracker ownership, and branch policy

Status: accepted
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
4. One trunk: `main`. One worktree per unit of work, created from **local `main`** and
   removed on merge. No two worktrees may share a HEAD. An agent must not start work on a
   checkout that has unmerged commits and no open PR. It is local `main` and not
   `origin/main` because a remote-tracking ref is only as current as the last fetch, and on
   2026-11-08 it was 109 commits behind until the trunk was pushed; cutting from it produced
   a stale checkout.
5. Commits are work units, with tests and docs, budgeted at 400 authored changed lines and
   chained when over. A unit that changes a published contract gets its own commit.

## Decision recorded on 2026-11-08: worktree/master is the trunk

`worktree/master` is the trunk. It is the only line proven to run end to end: the Docker
Compose stack comes up, Docling parses, and a chat is answered with citations. It is also
the newest line by depth and by date (`main` + 107 commits at the time of the decision).

The mechanism is `git branch -f main worktree/master`, run after tagging every branch tip.
It is a true fast-forward, because `600a476` is an ancestor of the new tip and `main` was 0
commits ahead, so no content is rewritten. It is named honestly for what it is: a ref
force-move, not a merge, which is why history carries no merge evidence for it.

The other line is not discarded. `feat/session-2` (`808c266`) is preserved with its tag and
must be ported in work units rather than merged whole. `feat/proj-05-06` (`a3056d1`) and
`feat/res-03-04` (`0a8420f`) are both ancestors of `feat/session-2`, so the single divergent
line is currently protected by three refs.

## Executed on 2026-11-08

1. 19 archive tags were created, one for every non-`main` branch tip, each verified to point
   at the same commit as the branch it preserves.
2. `main` was fast-forwarded to the trunk tip.
3. Five obsolete worktrees were removed: `worktree-open`, three `pi-extensible-workflows` run
   worktrees, and a detached gentle-ai candidate view.
4. Fifteen stack branches were deleted, plus one backend branch: ten `feat/*` proven
   contained in `main`, three workflow branches proven patch-equivalent and protected by
   tags, `worktree/open`, `feat/live-answers`, and backend `feat/signed-shell-claim` whose
   tip is identical to its remote.
5. The commit count reachable from all refs is unchanged at 193, and every deleted tip is
   held by a tag pointing at the same commit.
6. Defect found by review and corrected: `main` and `worktree/master` briefly sat at the
   same commit, which clause 4 forbids and which blinds the stale-checkout guard, because
   `main..HEAD` reads 0 in both checkouts. Corrected by committing this amendment on `main`,
   so the trunk advances and the herdr worktree is deliberately one commit behind;
   `worktree/master` is now an absorbed branch to be retired when its session closes.
7. Defect found by review and corrected: the recovered evidence files were copied into a new
   `recovered/` directory inside the worktree scheduled for deletion, untracked, with the
   `issues/` path flattened. Corrected by committing them at their original paths on `main`.
8. Defect found by review and corrected: the archive tag scheme is not injective, because it
   maps `/` to `-`, so `feat/a/b` and `feat/a-b` would collide, and `archive/worktree-master`
   pinned `main` to itself and protected nothing; that tag was deleted. The three workflow
   tags embed their run UUIDs in their names, which is their only provenance.
9. Defect found by review and corrected: `git branch -d feat/live-answers` refused even
   though the branch was an ancestor of `main`, because `-d` compares against the branch's
   upstream `origin/feat/live-answers` and not against `HEAD`. It was deleted with `-D`, and
   only after proving ancestry and verifying that the archive tag held the same commit.
10. Residual risk stated: three commits, `8d40d97`, `b207b9a` and `43b08ad`, are contained in
   no branch and are held only by opaque archive tags, so a tag-tidying pass followed by
   `git gc` would make them unreachable.

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
2. Answer the open question above, and record it as an amendment to this ADR. (done; see
   `## Decision recorded on 2026-11-08` and `## Executed on 2026-11-08`.)
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

## Published on 2026-11-08

`main` was pushed `600a476..ea4aefb` as a fast-forward, after proving `origin/main` was an
ancestor and that `main` was 0 commits behind it. All 18 `archive/*` tags were pushed in the
same pass, so every pruned branch tip has a second copy off this host and the three commits
held only by opaque tags are no longer one `git gc` away from being unreachable. Nothing was
force-pushed, and the push was rejected-safe by construction: the remote would have refused
any non-fast-forward.

## Still outstanding

- Port `feat/session-2` in work units.
- Remove the duplicate gateway from the stack.
- Collapse the four ledgers.
- Fold backend `odd/` into the stack tracker.
- Add a `.gitignore` to `second-brain-shell` for its `__pycache__`.
- Retire the `worktree/master` worktree when its session closes.

## Not verified

- The deleted branches were proven contained in `main` by ancestry, not by reviewing the
  content of their commits, and untracked files inside the five removed worktrees are
  unrecoverable and unknowable.

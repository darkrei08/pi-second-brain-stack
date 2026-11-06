# 02: Keep agent authority with Herdr/PiWorkflow

Type: decision
Status: open
Blocked by: 01

## Question

What read and control boundary lets an out-of-terminal console manage agents while Herdr and PiWorkflow remain the only owners of scheduling, dispatch, retries, concurrency, worktrees, and agent lifecycle authority?

## Acceptance criteria

1. Produce an ownership matrix for agent listing, status, logs, input, stop, retry, dispatch, scheduling, concurrency, worktree creation, and cleanup.
2. Name the existing Herdr/PiWorkflow authority for every operation that remains outside the console.
3. Define the console-facing contract as client operations only, with no second queue, scheduler, lease, retry loop, assignment store, or worktree manager.
4. Define fail-closed behavior when the orchestrator exposes no safe operation for a requested console action.
5. Include an observable check that a console action cannot create duplicate agent work or bypass the existing orchestrator's ownership rules.

## Evidence to gather

- Existing Herdr and PiWorkflow ownership and lifecycle documentation in the host setup.
- The second-brain API contract and any already documented orchestration adapters; the console is a surface over `second-brain-stack`, not a storage or retrieval owner.
- The selected candidate's control surface only after ticket 01 and a specific source inspection are authorized.

## Constraints

- S9 binds the authority boundary: the second brain activates and searches separate fetch, transcribe, render, and search services through contracts; the console must not absorb them into a monolith.
- Rakazo at `/root/git/fork/elie222/rakazo` remains a candidate only; nothing about it is installed, vendored, cloned further, configured, or run until a specific ticket authorizes that exact step.
- Loopback-only and single-owner assumptions remain the default; no multi-user scheduler or shared authority is introduced.
- V1-V4 remain in force; the console is not a second source of truth for library records, folders, collections, or attachments.
- The console must not become a second scheduler or duplicate Herdr/PiWorkflow ownership.

## Open question

What exact client-only contract can the console use to observe and control existing agent work without owning any scheduling or lifecycle decision?

## Comments

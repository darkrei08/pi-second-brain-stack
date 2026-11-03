# 05: Point the reference stack at both published packages

Type: task
Status: open
Blocked by: none

## Question

`compose.yaml` mounts `.:/app` for the gateway and `integrations/open-webui/` for the plugins, so after both extractions the source exists twice: here, and in `pi-second-brain-backend` and `pi-second-brain-shell`. Make the reference stack consume the published packages by the mechanism an operator can actually use, then delete the local copies of `src/`, `test/`, `scripts/`, `docker/` and `integrations/` once nothing here reads them.

## Acceptance criteria

- Bringing the stack up from this repository loads the filter and the pipe from the package, verified by reading both records out of the shell's Function store.
- `src/`, `test/`, `scripts/`, `docker/` and `integrations/open-webui/` no longer exist here, and the tickets that recorded them point at the packages instead.
- `docs/shell-stack.md` and the README state the two checkout paths the stack expects and what to update when a package is versioned.
- The gateway still answers `/healthz` and a grounded `/v1/answers` from the stack, proven by recorded commands.
- The stack is torn down after the proof.

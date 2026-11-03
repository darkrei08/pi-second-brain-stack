# 05: Point the reference stack at the shell package

Type: task
Status: open
Blocked by: none

## Question

`compose.yaml:69-75` mounts `integrations/open-webui/` from this repository, so after the extraction the plugin source exists twice: here and in `pi-second-brain-shell`. Make the reference stack consume the published package by the mechanism an operator can actually use, and delete the local copy once the stack no longer reads it.

## Acceptance criteria

- Bringing the stack up from this repository loads the filter and the pipe from the package, verified by reading both records out of the shell's Function store.
- `integrations/open-webui/` no longer exists here, and the ticket that recorded it points at the package instead.
- `docs/shell-stack.md` states the checkout path the stack expects and what to update when the package is versioned.
- The stack is torn down after the proof.

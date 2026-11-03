# 02: Registration the administrator controls

Type: task
Status: open
Blocked by: 01-first-run-administrator-and-the-handoff.md

## Question

A new person signs up and reaches nothing until the administrator approves them. Configure and verify that on the shell, and make our plugin surface fail closed for an unapproved role instead of relying on the shell's own gating alone.

## Evidence already gathered

Open WebUI supports `DEFAULT_USER_ROLE=pending`, and the shell's admin panel promotes an approved account to `user`. `__user__` carries `role` into the filter.

## Acceptance criteria

- `DEFAULT_USER_ROLE=pending` is set in the reference stack and stated in `docs/shell-stack.md`.
- The filter and the pipe refuse any caller whose role is neither `user` nor `admin`, with a message that names the cause and the next action; a test covers the refusal.
- An approved person can chat without touching the backend configuration.
- A disabled person's next request is refused, demonstrated.

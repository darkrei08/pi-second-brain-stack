# 04: How the gateway resolves the owner and verifies the shell's claim

Type: grilling
Status: open
Blocked by: 03-work-groups-and-memberships.md

## Question

The filter receives `id`, `email`, `name` and `role`, but not group membership, and it runs inside a shell that authenticates the person properly while holding one shared bearer token. A bare `x-shell-user-id` header is forgeable by anyone who holds that token. Decide the handoff: a short-lived signed claim per request, a per-user token issued once, or a query back to the shell that validates membership before the gateway is called. Write down what each costs, then implement the chosen one.

## Acceptance criteria

- The chosen mechanism is recorded with the rejected alternatives and their failure modes.
- A forged or unsigned claim is refused, with a test that attempts it.
- A claim for a group the caller does not belong to is refused, with a test that attempts it.
- The refusal message names the cause and the next action.
- The owner the backend derives is `urn:group:<group_id>` for group-scoped work.

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

## Decision

A short-lived signed claim per request, verified by the backend with a secret only the shell container receives.

The filter computes `HMAC-SHA256(secret, "<user_id>\n<group_id>\n<expiry>")` and sends the claim with the user id, the group id and the expiry. The backend recomputes it in constant time, refuses a mismatch, refuses an expiry in the past, and refuses an expiry more than two minutes ahead. The owner becomes `urn:group:<group_id>` for group work and stays `urn:user:<user_id>` otherwise.

Why this and not the alternatives:

- **A per-user token issued once** would need per-user storage inside the shell's function valves, which are per function and not per person. It also turns every revocation into a provisioning task.
- **A query back to the shell per request** adds a hop and a failure mode on the critical answer path, and makes the backend depend on the shell being up to authorize a request.
- **A bare `x-shell-user-id` header** is forgeable by anyone holding the shared bearer token, which is exactly what the filter holds.

Known limits, written down rather than hidden: the secret lives in the shell container's environment, a stolen claim is usable until it expires, and a clock skew above two minutes refuses honest requests. The two-minute window is the deliberate trade between replay exposure and clock tolerance.

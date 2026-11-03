# 09: The filter signs and sends the claim

Type: task
Status: open
Blocked by: none

## Question

The backend now verifies a signed claim; nothing sends one. Give the shell side of the handoff: the filter computes the claim for the signed-in user and the group the chat belongs to, sends it with the request, and fails closed with a message when the group cannot be resolved or the claim cannot be signed.

## Evidence already in place

Claim shape and verification: [ticket 04](04-how-the-gateway-learns-the-owner.md), implemented in `pi-second-brain-backend` commit `e6487ff`, verified 177/177 with a real database. `__user__` carries `id`, `email`, `name` and `role`, but memberships come from the shell's groups API (`Groups.get_groups_by_member_id`), so the filter has one lookup to make before it can name a group.

## Acceptance criteria

- The filter sends a valid claim for a signed-in user, and the backend derives `urn:group:<group_id>`; a recorded request proves the derived owner.
- With no group resolved, the claim derives `urn:user:<user_id>` rather than failing silently.
- A filter that cannot sign sends no claim and the request is refused by whatever rule applies, never upgraded to another owner.
- The claim secret never appears in logs, in error messages or in the plugin source.
- The gateway refuses to start when the claim secret equals one of its bearer tokens, with a test, so a token holder cannot forge a claim.
- Plugin tests cover the signing, the missing-group path and the missing-secret path without a browser or a stack.

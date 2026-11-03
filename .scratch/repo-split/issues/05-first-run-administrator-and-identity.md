# 05: Decide who owns identity, then wire the first administrator

Type: grilling
Status: open
Blocked by: 01

## Question

The operator wants a first-run administrator who creates or authorises further registrations and places people in work groups. Decide who owns identity: the shell (Open WebUI already has admin, user approval and groups) with the gateway mapping the authenticated identity to an owner, the backend owning users, hashes, sessions and groups, or the backend issuing one token per user with no password handling of our own. Then implement the chosen path for the first administrator only, including how the backend learns which owner a request belongs to.

## Acceptance criteria

- The decision is recorded with its rejected alternatives and their costs, including the security cost of owning passwords.
- The first administrator exists after a documented, repeatable bootstrap, and the backend resolves that administrator's requests to a single owner id.
- A request that presents no identity, or another user's identity, is refused with a message that names the cause and the next action.

# 01: First-run administrator and the handoff to the gateway

Type: task
Status: open
Blocked by: ../repo-split/issues/01-create-the-backend-repository.md

## Question

The first administrator has to exist after a documented bootstrap, and the backend has to resolve that administrator's requests to one owner id. Decide whether the backend needs an administrative token of its own or whether `GATEWAY_PRINCIPALS` already covers it, and do not build both.

## Evidence already gathered

Open WebUI promotes the first account created through `POST /api/v1/auths/signup` to `admin` (read in the shell's `routers/auths.py`). The backend today has no user table: the principal is a token mapped to an `owner_id` in configuration (`src/gateway-auth.js`).

## Acceptance criteria

- The first administrator exists after a repeatable documented bootstrap, and the command is in `docs/shell-stack.md`.
- The backend resolves that administrator's requests to a single owner id, proven by one recorded request.
- A request with no identity, or with an identity that is not granted, is refused with a message naming the cause and the next action.
- If an administrative token is introduced, it cannot read another owner's corpus.

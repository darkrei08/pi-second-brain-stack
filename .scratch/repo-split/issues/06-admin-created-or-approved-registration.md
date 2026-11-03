# 06: Registration that an administrator controls

Type: task
Status: open
Blocked by: 05

## Question

Implement the chosen path so a new person can be created by the administrator, or can request registration that the administrator approves. Whatever the shell already does must not be rebuilt; whatever is ours must be explicit.

## Acceptance criteria

- A new user created or approved by the administrator can sign in and answers as their own owner.
- An unapproved registration reaches nothing: no corpus, no chat, no document.
- Removing or disabling a user ends their access on the next request, demonstrated.

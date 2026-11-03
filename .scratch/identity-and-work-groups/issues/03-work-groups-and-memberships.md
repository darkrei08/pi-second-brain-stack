# 03: Work groups and memberships

Type: task
Status: open
Blocked by: 02-registration-the-administrator-controls.md

## Question

Groups and memberships live in the shell, at `/api/v1/groups/`, and nowhere else. Prove the operators' three needs against that: create a group, put people in it, take someone out and watch their access end on the next request. Decide what the backend needs to know, if anything, about membership beyond the group id.

## Acceptance criteria

- A group is created and populated through the shell's own interface, with the command or the screen recorded.
- No `groups` or `memberships` table is added to the backend schema, and the reason is written down.
- Removing a member ends their access to that group's corpus on the next request, demonstrated by two recorded requests.
- The group identifier the shell produces is the one the backend will accept as an owner.

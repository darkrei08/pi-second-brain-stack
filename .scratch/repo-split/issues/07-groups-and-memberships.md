# 07: Work groups and their members

Type: task
Status: open
Blocked by: 05, 06

## Question

Add work groups with members, and the rule that decides which owner scope a request gets when a person belongs to several groups. Decide whether a group maps to one collection, to a set of collections, or to a scope computed from its members, and keep that answer in one place.

## Acceptance criteria

- A member of a group sees the group's documents and not another group's, proven by a request from each account.
- Membership changes take effect on the next request, with no restart.
- The mapping from group to collection scope is readable in one place and asserted by a test.

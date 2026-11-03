# 09: Chats started inside a group

Type: task
Status: open
Blocked by: 07, 08

## Question

A chat started inside a group must answer from the group's scope, cite documents the asker may see, and not leak a sibling group's evidence. This is where the shell's folder scope and our group scope have to agree on one identifier.

## Acceptance criteria

- A chat started in a group answers with citations from that group only, proven by two groups with disjoint documents.
- Citing a document the asker cannot see is impossible, not merely unlikely: a test attempts it.
- The shell carries the group identifier into the gateway, and the mechanism is documented where an operator can read it.

# 06: Chats started inside a group

Type: task
Status: open
Blocked by: 05-documents-scoped-to-a-group-and-a-project.md

## Question

A chat started inside a group, or inside a project of a group, must answer from that scope. The filter has to learn the folder, resolve the group, confirm membership, and forward one identity the backend accepts. Chats at group level search the whole group; chats inside a project search that collection.

## Acceptance criteria

- A chat in a group answers with citations from that group only, proven with two groups holding disjoint documents.
- A chat inside a project cites that project, not its sibling.
- Citing a document the asker may not see is impossible, not merely unlikely: a test attempts it.
- The mechanism that carries the group from shell to backend is documented where an operator can read it.

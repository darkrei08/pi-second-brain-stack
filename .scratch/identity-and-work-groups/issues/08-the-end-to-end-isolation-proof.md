# 08: The end-to-end isolation proof

Type: task
Status: open
Blocked by: 06-chats-started-inside-a-group.md, 07-a-document-attached-inside-a-chat.md

## Question

Prove, one recorded command at a time, that everything the operator named works and that the boundary holds: sign in, create a folder, start a chat in it, ask and get an answer with a citation, load a document from the chat or receive the refusal, load a document into a group, load a document into a project inside a group, start a chat in a group and in a project, and show that a member of another group sees none of it. Direct HTTP probes with the wrong identity must return nothing rather than something.

## Acceptance criteria

- Two accounts in two groups, disjoint documents, and one recorded proof per path, with the command and its output.
- A member of the other group gets zero matches and no citation, including when they guess a collection id.
- A path that fails becomes its own ticket with the failing step, never a silent note.
- The stack is torn down, no secret printed, and the operator's long-running development database untouched.

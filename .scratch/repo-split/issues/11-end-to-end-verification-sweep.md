# 11: End-to-end sweep of every path the operator named

Type: task
Status: open
Blocked by: 09, 10

## Question

Verify, one recorded command at a time, that these work: signing in, creating a folder, starting a chat in it, asking a question and getting an answer with a citation, loading a document from the chat, loading a document into a group, loading a document into a project inside a group, and starting a chat in a group and in a project. Each either passes with its output or is ticketed with its failing step.

## Acceptance criteria

- One recorded proof per path, with the command and its output, on the live stack.
- A path that fails becomes a ticket with the failing step and its evidence, never a silent note.
- The stack is torn down, no secret is printed, and the operator's long-running development database is untouched.

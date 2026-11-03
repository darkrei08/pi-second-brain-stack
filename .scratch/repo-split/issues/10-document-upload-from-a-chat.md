# 10: Loading a document from inside a chat

Type: task
Status: open
Blocked by: 09

## Question

Ticket 09 of the projects-and-chats map recorded the shell's attachment hook limit. Decide what happens when a person attaches a file to a chat: it enters the corpus with provenance and the current chat's scope, or the chat refuses attachments and says where to load them instead. Implement the smaller honest option and prove it end to end.

## Acceptance criteria

- An attached file either becomes retrievable in that chat with its provenance, or the person receives a refusal that names the alternative. Both are acceptable; silence is not.
- Whatever the shell does by default with attachments is verified rather than assumed, and the duplicate-store risk is named.
- The recorded proof runs against the live stack and is torn down afterwards.

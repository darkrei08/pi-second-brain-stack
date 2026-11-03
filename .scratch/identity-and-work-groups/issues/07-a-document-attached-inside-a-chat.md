# 07: A document attached inside a chat

Type: task
Status: open
Blocked by: 06-chats-started-inside-a-group.md

## Question

Ticket 09 of the projects-and-chats map recorded the limit: a filter sees metadata references only, and the shell's extraction is asynchronous with no ordering guarantee. So decide what happens when a person attaches a file to a chat: the chat refuses the attachment and says where to load it, or the attachment is ingested out of band and the person is told when it becomes searchable. Implement the smaller honest option.

## Acceptance criteria

- Attaching a file either produces a refusal naming the alternative, or produces an ingestion whose availability is reported; silence is not acceptable.
- Whatever the shell does by default with that attachment is verified, and the duplicate-store risk is named.
- The recorded proof runs against the live stack and is torn down afterwards.

# 05: Documents scoped to a group and to a project inside it

Type: task
Status: open
Blocked by: 04-how-the-gateway-learns-the-owner.md

## Question

A document loaded into a group belongs to `urn:group:<group_id>`; a project inside the group is a collection with that same owner. Decide the ingest contract, add it to the CLI and the API, and keep the composite owner keys intact so a cross-group assignment fails closed.

## Acceptance criteria

- Ingest accepts a group and an optional project, and stores both owners as `urn:group:<group_id>`.
- A document loaded into a project is retrievable inside that project's scope and not from a sibling project, demonstrated with two seeded documents.
- An assignment that crosses groups is refused with `400 invalid_request`, with a test.
- Moving a document between projects writes one membership and removes the old one, with a test for the moved state.

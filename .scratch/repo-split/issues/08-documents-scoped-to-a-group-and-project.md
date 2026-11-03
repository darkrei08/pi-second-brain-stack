# 08: Documents scoped to a group and to a project inside it

Type: task
Status: open
Blocked by: 07

## Question

Documents are scoped today by `collections` and `document_collections`. Extend that so a document belongs to a group and, inside the group, to a project, with the retrieval scope following the same rule as ticket 07. Decide whether a project is a collection with a parent or a separate row.

## Acceptance criteria

- A document loaded into a group is retrievable by every member and by nobody outside it.
- A document loaded into one project of a group is retrievable inside that project's scope and not from a sibling project, demonstrated with two seeded documents.
- Moving a document between projects writes one membership and removes the old one, with a test for the moved state.

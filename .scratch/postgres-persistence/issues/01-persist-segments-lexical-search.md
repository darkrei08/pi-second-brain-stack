# 01: Persist segmented documents and support lexical search

Type: implementation
Status: claimed
Blocked by: None

## Question

How can the existing deterministic segment/provenance result become durable PostgreSQL data with atomic writes, owner isolation, lexical retrieval, and cascade deletion while keeping vector, graph, parser, and gateway work deferred?

## Acceptance criteria

- [ ] The adapter writes a document and all segments in one transaction.
- [ ] A failed segment write leaves no document or partial segments.
- [ ] Lexical search returns matching synthetic segments and citation provenance for the requested owner.
- [ ] Reads and deletion enforce owner scope.
- [ ] Deleting a document removes its segments through a verified cascade.
- [ ] Existing segmentation tests remain independent of PostgreSQL and pass.
- [ ] No private corpus, credentials, or non-loopback service exposure is added.

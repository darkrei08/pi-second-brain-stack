# 02: Collections as a retrieval scope

Type: implementation
Status: open
Blocked by: 01

## Question

Can a document belong to a collection, and can retrieval be scoped to one or more collections, so that a folder in the interaction shell stands for a real context instead of a label, without duplicating the corpus into a second vector store?

## Why this is the next implementation step

Verified evidence in `../research-integration.md`:

- Open WebUI exposes `folder_id` to an `inlet` filter before the pipeline pops it, so a folder can be forwarded as a scope.
- LibreChat does not forward a project id: `entity_id` carries the agent id only, so its projects cannot scope retrieval without patching the shell.
- Both integration paths therefore need the scope to exist on our side first. Neither shell's own folder concept can replace it.

## Scope

- A `collections` table owned by `owner_id`, plus a membership relation between documents and collections.
- `collection_id` accepted on ingest and validated against the owner.
- An optional collection filter on the retrieval seams (`searchSegmentsLexical`, `searchSegmentsSemantic`, `searchSegmentsHybrid`, `listEmbeddingBackfill`), defaulting to no filter so existing behaviour is unchanged.
- Deletion semantics: deleting a collection unlinks documents and never deletes them; deleting a document removes its memberships.
- No shell integration, no HTTP surface, and no plugin in this ticket.

## Acceptance criteria

- [ ] a document can be ingested into zero, one, or many collections of its owner;
- [ ] a collection cannot reference a document of another owner, and an unknown or foreign collection fails closed before any write;
- [ ] retrieval with a collection filter returns only segments of that collection, and without one returns exactly what it returns today;
- [ ] deleting a collection leaves its documents and their embeddings intact and removes only the memberships;
- [ ] deleting a document removes its memberships and its embeddings as today;
- [ ] existing segmentation, parser, persistence, semantic, hybrid, citation, freshness, registry, coverage, planning, execution, and mode tests remain green;
- [ ] no shell, plugin, HTTP route, dependency, or second vector store is added.

## Non-goals

Choosing the shell (ticket 01), identity mapping between shell users and `owner_id`, attachment routing through a shell's RAG contract, and any UI work.

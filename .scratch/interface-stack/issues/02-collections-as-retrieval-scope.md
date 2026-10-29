# 02: Collections as a retrieval scope

Type: implementation
Status: resolved
Blocked by: None

## Question

Can a document belong to a collection, and can retrieval be scoped to one or more collections, so that a folder in the interaction shell stands for a real context instead of a label, without duplicating the corpus into a second vector store?

## Why this is the next implementation step

Verified evidence in `../research-integration.md`:

- Open WebUI exposes `folder_id` to an `inlet` filter before the pipeline pops it, so a folder can be forwarded as a scope.
- LibreChat does not forward a project id: `entity_id` carries the agent id only, so its projects cannot scope retrieval without patching the shell.
- Both integration paths therefore need the scope to exist on our side first. Neither shell's own folder concept can replace it.
- Decision V3: a folder is a retrieval scope, implemented as a collection reference persisted on documents and applied by retrieval filters. The shell's file ids are not the scope.

## Scope

- A `collections` table owned by `owner_id`, plus a membership relation between documents and collections.
- `collection_id` accepted on ingest and validated against the owner.
- An optional collection filter on the retrieval seams (`searchSegmentsLexical`, `searchSegmentsSemantic`, `searchSegmentsHybrid`, `listEmbeddingBackfill`), defaulting to no filter so existing behaviour is unchanged.
- Deletion semantics: deleting a collection unlinks documents and never deletes them; deleting a document removes its memberships.
- No shell integration, no HTTP surface, and no plugin in this ticket.

## Acceptance criteria

- [x] a document has a persisted collection reference and can be ingested into zero, one, or many collections of its owner;
- [x] a collection cannot reference a document of another owner, and an unknown or foreign collection fails closed before any write;
- [x] lexical, semantic, and hybrid retrieval accept an optional collection scope and return only segments of that collection; without one, each returns exactly what it returns today;
- [x] an owner-isolation test proves that a scoped query cannot return another owner's segment or a segment from another collection;
- [x] deleting a collection cascades deletion of its collection references/memberships while leaving its documents and embeddings intact;
- [x] deleting a document removes its collection references/memberships and its embeddings as today;
- [x] the implementation documents rejection of the shell file-id shortcut as the retrieval scope;
- [x] existing segmentation, parser, persistence, semantic, hybrid, citation, freshness, registry, coverage, planning, execution, and mode tests remain green;
- [x] no shell, plugin, HTTP route, dependency, or second vector store is added.

## Non-goals

Choosing the shell (ticket 01), identity mapping between shell users and `owner_id`, attachment routing through a shell's RAG contract, and any UI work.

## Answer

Yes. Collections exist as a first-class scope in the storage seam, and retrieval can be narrowed to them without touching the vector store.

- `docker/postgres/init/005-collections.sql` creates `collections (collection_id, owner_id, created_at)` and `document_collections (collection_id, document_id, owner_id)`. Membership carries `owner_id` and reaches both parents through composite foreign keys (`documents(document_id, owner_id)`, `collections(collection_id, owner_id)`, both `ON DELETE CASCADE`), so a cross-owner membership is impossible at the database level and not only by convention. Commit `6e296cc`.
- `saveDocumentAndSegments` accepts `document.collections` (optional array of opaque collection IDs), validates it before connecting, and inside the transaction resolves every declared collection for the document owner with `FOR UPDATE` before the first write. An unknown or foreign collection aborts the transaction with no document written. Ingest replaces the document's membership set, so placement has one writer. Commit `ebec794`.
- `createCollection`, `deleteCollection`, and `listDocumentCollections` register, remove, and read the scope. A collection carries no label, because the shell owns folder names and identity (V2).
- `searchSegmentsLexical`, `searchSegmentsSemantic`, `searchSegmentsHybrid`, and `listEmbeddingBackfill` accept an optional `collection_ids` array; without it the SQL predicate is `$n::text[] IS NULL` and each seam returns exactly what it returned before. With it, only documents placed in one of those collections qualify, still owner-scoped and active-retention-scoped.
- `deleteCollection` removes memberships by cascade and leaves documents, segments, and embeddings intact; deleting a document removes its memberships through the same cascade as its segments.
- A shell file ID is not the scope. The shell's `file_id` values belong to its store while our document, segment, and citation identities are ours, so a shell file ID would either fail closed on every request or resolve to an unrelated document. The scope is resolved inside our store and the shell only forwards the folder identity it owns. Recorded in `docs/retrieval-and-graph.md`.

The slice also fixed a pre-existing defect the new tests exposed: `searchSegmentsHybrid` dropped the segment `id` because the hybrid mapper treated an already-mapped match as a raw row. Hybrid matches now carry the same explicit field set as the other seams, and the key set is pinned by test.

Verification: host unit suite 42 pass / 17 expected skips / 0 fail; live pgvector/pg17 integration 21/21 twice; Debian and Alpine Node 22 matrix 42 pass / 17 skips each; differential probe of the four seams against the previous commit shows the hybrid `id` as the only change to unscoped output; `npm pack --dry-run` and `docker compose config` clean; no corpus path, credential, or new dependency.

## Comments

Claimed and resolved on 2026-10-29 on `feat/collections-retrieval-scope`. No shell, plugin, HTTP route, or second vector store was added.

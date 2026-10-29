# Spec: database freshness and citation revalidation

## Problem statement

Pure citation resolution validates a retrieved snapshot, but a document can be re-ingested, tombstoned, purged, or deleted before an answer consumes that snapshot. The storage boundary needs a deterministic freshness check.

## Public seam

Add `storage.revalidateCitations(citations, { owner_id })` to the object returned by `createStorage`.

Input citations are evidence blocks returned by `resolveCitations`. Return:

```js
{ valid: boolean, stale_ids: string[] }
```

Also update `searchSegmentsLexical({ query, owner_id, limit })` to require an opaque `owner_id` and `limit` from 1 through 100.

## Invariants

- `citations` is a non-empty array of at most 100 evidence blocks.
- `owner_id` is opaque and required.
- Each citation has an opaque document URN, a non-empty segment ID, `sha256:` source/segment hashes, and no duplicate segment IDs.
- A current citation matches document ID, segment ID, source hash, raw segment hash, requested owner, and `retention_state = 'active'` in one parameterized query.
- Missing, cross-owner, tombstone, purged, deleted, re-ingested, or hash-mutated records are stale IDs.
- Stale IDs are returned in the same order as the input citations.
- Malformed inputs fail before database contact.
- Existing valid lexical, semantic, hybrid, persistence, segmentation, parser, and citation behavior remains unchanged.
- No schema, dependency, provider, network, private data, credential, model cache, or LLM is added.

## Acceptance criteria

- [x] valid stored citations return `{ valid: true, stale_ids: [] }`;
- [x] malformed owner, collection, hash, identity, duplicate, and oversized-batch inputs fail before database contact;
- [x] tombstone and purged documents are returned as stale;
- [x] missing/deleted segments are returned as stale;
- [x] another owner's citation is returned as stale;
- [x] source-hash and segment-hash mutation/re-ingestion is returned as stale;
- [x] stale IDs preserve input order and valid batches never return stale IDs;
- [x] the check uses one bounded parameterized PostgreSQL query;
- [x] lexical search rejects non-opaque owners and limits above 100;
- [x] existing public and integration tests remain green;
- [x] no private corpus or external runtime is introduced.

## Deferred

Model registry/re-embedding, graph retrieval, parser benchmarking, ANN/sidecars, gateway/authentication, external citation URLs, and live answer generation.

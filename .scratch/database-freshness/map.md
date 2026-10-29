# Wayfinder: database freshness and citation revalidation

## Destination

Revalidate prompt-ready citation evidence against current PostgreSQL state immediately before answer consumption. Close the time-of-check/time-of-use gap after retrieval and pure citation mapping without changing the schema or adding a provider.

## Dependency position

Completed prerequisites:

1. deterministic segmentation and hashes;
2. parser-neutral page/layout provenance;
3. owner-scoped transactional PostgreSQL persistence;
4. exact semantic and lexical retrieval;
5. deterministic hybrid RRF retrieval;
6. pure fail-closed citation mapping.

This Wayfinder is the next smallest storage-backed boundary. Model lifecycle, graph retrieval, parser benchmarking, and ANN/sidecar evaluation remain deferred.

## Public seams

Add to the storage object returned by `createStorage`:

```js
storage.revalidateCitations(citations, { owner_id })
```

Return:

```js
{ valid: boolean, stale_ids: string[] }
```

Also harden `searchSegmentsLexical` to match the semantic limit/owner contract: require an opaque owner ID and a limit from 1 through 100.

## Freshness rule

A citation is fresh only when one current row joins all of these predicates:

- segment ID and document ID match the citation;
- document owner matches the requested owner;
- document retention state is `active`;
- stored document source hash matches the citation source hash;
- stored segment raw text hash matches the citation segment hash after removing the `sha256:` prefix.

Missing rows, owner mismatch, tombstone/purged state, re-ingestion hash changes, and deleted segments are stale results, not thrown operational errors.

## Safety decisions

- Validate the citation batch before database contact.
- Bound batches to 100 citations and reject duplicate segment IDs.
- Use one parameterized PostgreSQL query for the batch.
- Return stale IDs in input order for deterministic callers.
- Keep all data synthetic in tests; do not read or mount the private corpus.

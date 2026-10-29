# Wayfinder: retrieval mode and lexical fallback

## Destination

Make the selected model policy — global models, partial coverage, lexical fallback — visible to a caller without inventing a coverage threshold and without paying for a coverage query on every retrieval: one pure function that names how the returned matches were produced.

## Dependency position

Completed prerequisites:

1. deterministic segmentation and hashes;
2. parser-neutral page/layout provenance;
3. owner-scoped transactional PostgreSQL persistence;
4. exact model-aware semantic retrieval;
5. deterministic hybrid retrieval with `lexical_rank` and `semantic_rank` per match;
6. pure citation resolution;
7. storage-backed citation freshness revalidation;
8. global embedding-model registry and owner-scoped coverage inspection;
9. owner-scoped backfill planning with a repair path for stale dimension rows;
10. provider-neutral backfill execution over an injected embedder;
11. OpenAI-compatible embedding adapter.

This slice is the consuming end of the chain: the policy was chosen at step 8, the work to fill coverage exists at steps 9-11, and nothing yet tells a caller whether an answer used semantic evidence or fell back to lexical.

## Candidates considered

- **A. Per-query coverage gate with a numeric threshold.** Rejected: coverage inspection costs a full aggregate over the owner's segments (measured at 332 ms for 60k segments), and any percentage threshold would be an invented product rule.
- **B. Pure annotation of the matches a caller already has.** Chosen: `searchSegmentsHybrid` already returns `lexical_rank` and `semantic_rank` per match, including `null` for the side that missed, so the mode is derivable from data the caller paid for once.
- **C. Retrieval that embeds the query internally.** Rejected: it would put a provider call and credentials inside the retrieval seam, opposite to decisions D1-D4 of `.scratch/embedding-provider-boundary/map.md`.

## Public seam

```js
describeRetrievalMode(matches, { model_id })
```

The exact contract is in `spec.md`. It is pure, synchronous, and free of database or network access.

## Decisions so far

- D1: Fallback is described, not decided by a threshold. The mode is `hybrid` when at least one returned match came from the semantic side, `lexical` otherwise, and `empty` when there is nothing to show.
- D2: The function reports evidence, not coverage. A review of the first draft showed that a `semantic_fallback` flag overclaims: hybrid fusion caps the output at `limit`, so a semantic candidate can lose the cut to lexical ones and the flag would call a fully covered model degraded. The flag was removed; `semantic_matches` plus the mode say only what the matches prove.
- D3: Coverage counts stay out of the per-query path; a caller that wants to label an answer with coverage numbers calls `inspectEmbeddingCoverage` out of band.

## Review outcome

A design review rejected the first draft's `semantic_fallback` flag for the reason in D2, and asked for the contract to be pinned against real store output. Both were applied: the flag is gone and the integration test feeds `searchSegmentsHybrid` results through the function for a hybrid result and for a model with no matching embeddings.

## Safety boundary

- No database, network, clock, or provider access; no new dependency or schema change.
- Ranking and filtering stay in `searchSegmentsHybrid`; this slice never re-orders or drops matches.
- Malformed rank fields fail closed instead of producing a misleading label.

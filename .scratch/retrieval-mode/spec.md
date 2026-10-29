# Spec: retrieval mode and lexical fallback

## Problem statement

The project policy is global embedding models with partial coverage and lexical fallback, and `searchSegmentsHybrid` already returns per-match provenance of which side produced each hit. Nothing turns that into a named mode, so every caller would invent its own rule — most likely a coverage percentage fetched with an extra aggregate query on every search.

## Public seam

```js
describeRetrievalMode(matches, { model_id })
```

`matches` is an array of results as returned by `searchSegmentsHybrid` (or a plain lexical search). `model_id` is optional and opaque.

Returns:

```js
{
  mode: 'empty' | 'hybrid' | 'lexical',
  model_id: string | null,
  matches,
  semantic_matches
}
```

## Invariants

- `matches` must be an array; every element must be an object. Otherwise it fails closed with `TypeError`.
- `model_id`, when provided, must be an opaque ID in the same shape the storage seams accept; it is echoed unchanged, or reported as `null` when absent.
- `semantic_matches` counts matches whose `semantic_rank` is a positive integer. A `semantic_rank` that is present but not a positive integer fails closed: a misleading label is worse than an error.
- `matches` is the input length, reported unchanged.
- `mode` is `empty` when there are no matches; `hybrid` when `semantic_matches > 0`; `lexical` otherwise.
- The result describes the evidence present in the supplied matches and never claims anything about coverage. `searchSegmentsHybrid` fuses both sides and caps the output at `limit`, so a semantic candidate can lose the cut to lexical ones; a `lexical` mode therefore means "no semantic evidence survived in these matches", not "the model has no coverage". A caller that needs coverage calls `inspectEmbeddingCoverage` out of band.
- The function never re-orders, filters, or mutates the matches; it reads `semantic_rank` only.
- No database, network, clock, randomness, logging, dependency, or schema change.

## Acceptance criteria

- [ ] malformed `matches`, a non-object element, and an invalid `model_id` fail closed;
- [ ] a hybrid result with at least one `semantic_rank` reports `mode: hybrid` with the matching `semantic_matches` count;
- [ ] a lexical-only result reports `mode: lexical` with `semantic_matches: 0`, whether or not a model was requested;
- [ ] an absent `model_id` is echoed as `null`;
- [ ] an empty result reports `mode: empty` and never throws;
- [ ] real `searchSegmentsHybrid` output is fed through the function in an integration test, for both a hybrid result and a model with no matching embeddings;
- [ ] a present but non-positive-integer `semantic_rank` fails closed;
- [ ] the returned object does not mutate or reorder the input;
- [ ] existing suites remain green.

## Deferred

Choosing a coverage threshold, quality-weighted mode selection, embedding the query inside retrieval, answer-level confidence, UI labelling, coverage caching, and metrics.

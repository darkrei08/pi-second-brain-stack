# Research: retrieval mode and lexical fallback

## Decision

Add one pure function, `describeRetrievalMode(matches, { model_id })`, that names how the matches a caller already holds were produced: `hybrid`, `lexical`, or `empty`, plus whether a requested model actually contributed.

## Repository evidence

- `src/postgres-store.js` `searchSegmentsHybrid` returns, for every fused match, `lexical_rank` and `semantic_rank`, using `null` for the side that produced no candidate; `test/integration/postgres-store.test.js:757` pins exactly that shape: `[[1, 1], [2, null], [null, 2]]`.
- `searchSegmentsLexical` returns matches with no rank fields at all, so a plain lexical search is distinguishable from a hybrid miss without extra state.
- `.scratch/embedding-backfill/spec.md` and `.scratch/model-registry-lifecycle/spec.md` both defer "active-model routing" and "lexical fallback orchestration"; the selected policy is global models with partial coverage and lexical fallback.
- `docs/retrieval-and-graph.md` states that the hybrid seam is provider-neutral, deterministic, and preserves provenance, and that citation validation happens before an answer consumes text. The mode is the missing piece of that pipeline description.
- A reviewer measurement recorded at 60k synthetic segments: the coverage aggregate takes about 332 ms against 67 ms for one plan page. Doing that aggregate per retrieval would dominate query latency, which rules out a per-query coverage gate.
- `src/citation-resolver.js` is the precedent for a pure, fail-closed function over already-returned matches; this slice follows the same shape and style.

## Rejected alternatives

- Coverage-per-query with a percentage threshold: expensive and invents a product rule the operator has not chosen.
- Extending `searchSegmentsHybrid` to return the mode: it would couple the SQL path to presentation and force every existing caller to re-read a changed contract.
- Internal query embedding: provider call and credentials inside retrieval, contradicting the adapter boundary.
- Silently defaulting a missing `semantic_rank` to zero: a wrong label is worse than a thrown error at a trust boundary.

## Compatibility notes

- Additive module and export; no existing signature changes.
- Deterministic and synchronous, so it can be unit tested exhaustively without a database.
- The integration shape it depends on is already pinned by an existing integration test.

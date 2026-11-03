# 01: Name the retrieval mode and the lexical fallback

Type: implementation
Status: resolved
Blocked by: None

## Question

Can a caller learn, from the matches it already holds, whether an answer used semantic evidence, fell back to lexical because the requested model contributed nothing, or simply ran a lexical search — without a coverage query per retrieval and without inventing a coverage threshold?

## Acceptance criteria

- [x] `describeRetrievalMode(matches, { model_id })` is exported from the package entry point.
- [x] Malformed matches, a non-object element, and an invalid `model_id` fail closed before any work.
- [x] `mode` is `empty`, `hybrid`, or `lexical`, decided only by the presence of positive-integer `semantic_rank` values.
- [x] `semantic_fallback` is true only when a model was requested, matches exist, and no semantic match came back.
- [x] A present but invalid `semantic_rank` fails closed instead of producing a misleading label.
- [x] The matches are neither reordered nor mutated, and no database, network, dependency, or schema change is involved.
- [x] Existing suites remain green.

## Answer

Implemented `describeRetrievalMode` in `src/retrieval-mode.js` and exported it from `src/index.js`. It validates the supplied matches and the optional `model_id`, counts the matches whose `semantic_rank` is a positive integer, and returns `{ mode, model_id, matches, semantic_matches }`, failing closed on a rank that is present but invalid.

A design review rejected the first draft's `semantic_fallback` flag: `searchSegmentsHybrid` fuses both sides and caps the output at `limit`, so a semantic candidate can lose the cut to lexical ones and a fully covered model would have been labelled degraded. The flag is gone; the mode now reports only the evidence present in the matches, and the contract points coverage questions at `inspectEmbeddingCoverage`. The same review asked for the contract to be pinned against real store output, so the hybrid integration test now feeds both a hybrid result and a model with no matching embeddings through the function.

Verification: `test/retrieval-mode.test.js` 7/7; full host suite 41 pass / 11 expected skips; live pgvector/pg17 integration 14/14 including the two new assertions; independent contract review verified 14/14 claims before the redesign. Implementation commit: see `odd/tasks/retrieval-mode.md`.

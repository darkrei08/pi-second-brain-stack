# 01: Name the retrieval mode and the lexical fallback

Type: implementation
Status: claimed
Blocked by: None

## Question

Can a caller learn, from the matches it already holds, whether an answer used semantic evidence, fell back to lexical because the requested model contributed nothing, or simply ran a lexical search — without a coverage query per retrieval and without inventing a coverage threshold?

## Acceptance criteria

- [ ] `describeRetrievalMode(matches, { model_id })` is exported from the package entry point.
- [ ] Malformed matches, a non-object element, and an invalid `model_id` fail closed before any work.
- [ ] `mode` is `empty`, `hybrid`, or `lexical`, decided only by the presence of positive-integer `semantic_rank` values.
- [ ] `semantic_fallback` is true only when a model was requested, matches exist, and no semantic match came back.
- [ ] A present but invalid `semantic_rank` fails closed instead of producing a misleading label.
- [ ] The matches are neither reordered nor mutated, and no database, network, dependency, or schema change is involved.
- [ ] Existing suites remain green.

## Answer

_Pending implementation._

# 01: Re-verify prior graph-retrieval findings

Type: decision
Status: resolved
Blocked by: None

## Question

Do the prior P1/P2 findings and the two graph prerequisites hold in the current source?

## Evidence

- `src/answer-question.js:168-186` calls `chat` with raw `matches` before `resolveCitations` and `storage.revalidateCitations`.
- A runtime probe passed a foreign-owner result with an invalid hash to the fake chat provider; the provider received its text, while no citation revalidation was invoked because the answer had no citation marker.
- `src/answer-question.js:1` imports `describeRetrievalMode` and `resolveCitations` from `./index.js`; `src/index.js:8` re-exports `answerQuestion`. Importing `src/index.js` succeeds, confirming a live circular dependency rather than a dead textual reference.
- `src/postgres-store.js:805-842` compares only document/segment identity, owner, retention, source hash, and segment hash. It has no entity label, predicate, endpoint, assertion hash, or extraction revision input.
- `saveDocumentAndSegments` deletes and recreates segments at `src/postgres-store.js:397-432`; `segments.document_id` cascades from `documents`, and embeddings cascade from segments. No graph tables exist to receive equivalent invalidation.

## Answer

All four prior findings are confirmed. P1 and P2 belong to the live-answers effort and are explicitly out of scope here. The graph slice must add its own assertion envelope and freshness comparison, plus transactional invalidation/replacement rules; a valid backing segment is not sufficient to validate an arbitrary derived graph claim.

## Traceability row (pending parent consolidation)

| Issue | Decision | Status |
|---|---|---|
| #17 | P1/P2 confirmed; graph-specific provenance and replacement invalidation are prerequisites, but live-answer fixes remain out of scope | resolved |

# 01: Execute a backfill plan with an injected embedder

Type: implementation
Status: resolved
Blocked by: None

## Question

Can one bounded, deterministic function execute a backfill plan page against the existing storage seams, using a caller-supplied embedder, so that coverage moves from partial to complete without selecting a provider, adding a scheduler, or risking a partial document write?

## Acceptance criteria

- [x] `runEmbeddingBackfill({ storage, embed, model_id, owner_id, limit })` is exported from the package entry point.
- [x] Exactly one plan page is processed per call and an empty plan returns zero counters without calling `embed`.
- [x] Each processed document is embedded once with its ordered segment texts and written with the complete segment set and the stored `created_at`.
- [x] A document that changed since the plan, or that left active retention, is skipped with a reason, in plan order, and never partially written.
- [x] A wrong-length embedder result and any embedder failure fail closed; earlier completed documents stay committed.
- [x] Storage validation for dimensions, membership, and ownership is unchanged and still authoritative.
- [x] After a full run, coverage is complete for that owner and model, stored vectors are aligned with the segments they were computed for, and a second run processes nothing.
- [x] No provider, credential, scheduler, daemon, schema change, dependency, or ANN index is added.
- [x] Existing suites remain green.

## Answer

Implemented `runEmbeddingBackfill` in `src/embedding-backfill.js` and exported it from `src/index.js`. One call processes one plan page: it reads each planned document through `getDocumentWithSegments`, skips unreadable, no-longer-active, and changed documents with a reported reason, embeds the ordered segment texts through the caller-supplied embedder, and writes the complete set through `saveSegmentEmbeddings` with the stored `created_at`. A wrong-length embedder result fails closed before that document is written; embedder and storage failures propagate while already completed documents stay committed. The returned counters are exact and no text, clock, log, network access, or dependency is added.

Verification: host `npm test` 26 pass / 11 expected skips; live pgvector/pg17 integration 14/14 twice on a fresh schema; Debian and Alpine Node 22 matrix 25 pass / 11 skips with identical subtest results and byte-identical CLI output; an empirical run on a real database moved coverage from 0/3 to 3/3 and the second run processed zero documents; independent review found one coverage gap (vector-to-segment alignment) and three minor accuracy defects, all fixed and re-verified. Implementation commit: see `odd/tasks/embedding-backfill-execution.md`.

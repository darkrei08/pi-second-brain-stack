# Feature: startable stack

Implements `.scratch/startable-stack/spec.md`. One repository owns the whole reference stack, one command starts it, one compose-level smoke test proves it, and only the unblocked tracker tickets are implemented.

## Specs

- S1. "implementa e correggi le issue"
- S2. "inoltre vorrei inesirire in unica cartella seocon brain stack, gli repo ceh appartengono a fornedn a shell abackend in quanto noto ceh non ci sono tute le implemteazioni dei software richeisti in dokcer compose"
- S3. "vorrei ceh tutto funxioni correttamente e che sia avviabile quanto prima o che tu faccia delel prove inautonomia"
- S4. Operator decision: this worktree wins on every module that exists on both sides; from the sibling backend only the four modules the stack lacks are ported, and a capability audit of the discarded backend code is the first work unit so the loss is visible and deliberate.
- S5. Operator decision: exactly one new test seam, a compose-level end-to-end smoke test; every other behavior rides on the existing unit, live-PostgreSQL integration, and plugin suites.
- S6. Operator decision: both sibling repositories are left untouched in place; the stack absorbs their content and stops depending on them.
- S7. Operator decision: only the unblocked tickets are implemented; the three evidence-gated tickets stay open with the exact list of required inputs and no invented thresholds.
- S8. `docker compose up` in the repository root starts the whole product with no `-f` flag and no hand-created file: the database, the gateway, Open WebUI with both plugins imported, a parser worker, and a persistent originals volume.
- S9. A committed `.env.example` carries every variable the compose files expand with a generation hint for each secret; no secret has a default and no secret is committed or baked into an image.
- S10. The Open WebUI plugin package exists exactly once, in the authoritative layout with its bootstrap and its pinned image tag, and the duplicated plugin source is deleted from the stack.
- S11. The backend-only modules the stack lacks are ported with their tests and adapted to the stack's store and configuration surface: shutdown handling, directory ingestion with its CLI, and schema migrations.
- S12. The compose smoke test brings the stack up with `--wait` and asserts, in order, gateway readiness, document ingestion, retrieval with citation and provenance, a grounded answer whose citations resolve, a streaming completion that ends with the grounding record, the finish chunk and the termination sentinel, and Open WebUI health with both plugin records present; it tears down with volumes removed.
- S13. Graph expansion is available behind the existing retrieval adapter using recursive SQL, scoped by owner and active retention, returning graph claims with their original segment citations, and failing closed when an assertion's source segment no longer validates; traversal depth, result cap, and resource limits are configuration with documented provisional defaults and no published measurement.
- S14. The ANN comparison harness measures candidate recall against exact search, planner use, latency, and index size over a versioned synthetic corpus, without changing the default retrieval path; exact search remains the shipped behavior and the rollback.
- S15. `docs/development.md` and `docs/implementation-brief.md` describe the commands and services that actually exist after this change, in the same work unit that changes them.

## Tasks

| ID | Spec | Route | Commit |
| --- | --- | --- | --- |
| T1 | S4 | Capability audit of the discarded backend versions | pending |
| T2 | S2, S6, S10 | Absorb the sibling repositories; adopt the plugin package; delete the duplicate | pending |
| T3a | S4 | Port security and provider discipline, plus the two audit findings | pending |
| T3b | S4 | Port real SSE streaming and the mid-stream error frame | pending |
| T3c | S4 | Port schema_migrations, retention, purge, export, and collection auto-creation | pending |
| T3d | S4 | Port /v1/research, collection routes, shutdown, and directory ingestion | pending |
| T4 | S8, S9, S10 | Default compose topology, environment example, Open WebUI service and bootstrap | pending |
| T5 | S8 | Parser worker over the ratified parser contract | pending |
| T6 | S8, S10 | Open WebUI service and plugin bootstrap | merged into T4 |
| T7 | S5, S12 | Compose end-to-end smoke test, observed RED first | pending |
| T8 | S13 | Graph storage, projection lifecycle, and bounded expansion | pending |
| T9 | S14 | ANN comparison harness | pending |
| T10 | S15 | Documentation reconciliation | pending |
| T12 | S4 | Modular monolith decomposition of the gateway with a mechanical boundary check | pending |
| T11 | all | Full verification: unit, integration, compose smoke, plugin suite | pending |

## Log

- L1 (2026-11-06): Operator request, verbatim: "implementa e correggi le issue / inoltre vorrei inesirire in unica cartella seocon brain stack, gli repo ceh appartengono a fornedn a shell abackend in quanto noto ceh non ci sono tute le implemteazioni dei software richeisti in dokcer compose / vorrei ceh tutto funxioni correttamente e che sia avviabile quanto prima o che tu faccia delel prove inautonomia".
- L2 (2026-11-06): Operator confirmation, verbatim: "procedi".
- L3 (2026-11-06): Measured divergence before any write. `second-brain-backend` is ahead by 509 lines in `src/gateway-server.js` and 370 in `src/postgres-store.js`; it holds `gateway-shutdown`, `ingest-directory`, `ingest-directory-cli`, and `migrations`, which the stack lacks; the stack holds `chat-completions` and the Open WebUI glue, which the backend lacks. `openwebui/filter.py` and `openwebui/pipe.py` duplicate `second-brain-shell`, whose README states the reference stack must mount that package rather than duplicate its source.
- L4 (2026-11-06): Measured startability failure. No `.env.example` exists and both compose files use required expansion for `POSTGRES_*`, `GATEWAY_TOKEN`, and `GATEWAY_OWNER_ID`, so `docker compose up` stops before creating a container; only `postgres` is in the default file and `gateway` requires an explicit `-f`.
- L5 (2026-11-06): Ticket triage. Four tickets are open; only `graph-retrieval/06` has a ratified shape. `ann-indexes/02`, `graph-retrieval/05`, and `parser-benchmark/05` are decision and evidence tickets whose own text forbids inventing thresholds, so S7 keeps them open.
- L6 (2026-11-06): Operator directive, verbatim: "devi implementare con la logica anti monolita di micio dev usa exellence engienring per guidarti". Applied as: one process stays one process, `src/gateway-server.js` becomes a thin composition root, each concern and each route group gets its own module, and `scripts/check-boundaries.js` fails when a module reaches into another module's internals. Source: `references/architecture-and-repo-topology.md`, which defaults to a modular monolith and rejects extraction before a contract has survived cycles. Verified: composition root 178 lines, 15 modules, 32 modules and 58 edges green, suite 111 tests 89 pass 22 skip 0 fail.
- L7 (2026-11-06): The capability audit found four load-bearing losses, not the four missing modules the spec assumed: no live provider streaming, no collection auto-creation, revoked evidence reachable in an answer, and cross-owner impersonation under the shared token. The last two were found by a read-only review pass and verified in `src/gateway-auth.js:36-53` and `src/answer-question.js`. Operator chose to port everything including the new routes, so the port is split into T3a to T3d.
- L8 (2026-11-06): Process defect, recorded so it is not repeated: two units were dispatched to read-only roles (`scout`, `security`) and landed nothing. `.scratch/startable-stack/capability-audit.md` and this document were then written by the parent. Write-capable units take a write-capable role.
- L9 (2026-11-06): Operator answers, verbatim on the boundary question: "deve invece opoter scaricare video e dati e file necesari anceh epr le trascrizini e per i sottotitoli ececetra". This retires the toolkit's stated no-download boundary, so the ytptube work becomes a fetch lane owned by the toolkit rather than a service merely running beside it. On provenance the operator chose dual write with reconciliation, which the spec must constrain with a single-writer rule per field.
- L10 (2026-11-06): T3a verified rather than trusted. Nine new test cases confirmed per file: chat-client 6 to 8, embedding-client 8 to 9, gateway-auth 4 to 6, gateway-config 4 to 5, gateway-server 19 to 22, answer-question renamed and strengthened in place. The count reconciles exactly: 111 baseline, plus 9 from T3a, plus 1 skipped from T9, equals 121 with 98 pass and 23 skip. A suspicion that the reported count was stale was wrong and is recorded here as wrong.
- L11 (2026-11-06): Two security findings are closed by construction, not by a patch. Impersonation: `shell_users` must bind every entry to `GATEWAY_OWNER_ID` unless `GATEWAY_SHELL_MAPPING_TRUSTED=true`, so a caller holding the gateway token can no longer name an arbitrary owner; the principal directory path binds token to owner and refuses to combine with the legacy credentials. Revoked evidence: `answer-question.js` now returns `INSUFFICIENT_EVIDENCE_ANSWER` with empty citations whenever any cited evidence is stale or unusable.
- L12 (2026-11-06): Concurrency defect found in integration. T3a added six environment variables that the T4 compose file did not know about, so the new capabilities were unreachable from the stack. Fixed in `compose.yaml` with safe defaults for three and pass-through for three, verified with `docker compose config` rendering `GATEWAY_MODEL_CONCURRENCY=3` and `GATEWAY_SHELL_MAPPING_TRUSTED=false`.
- L13 (2026-11-06): Blocked action, needs operator approval. Editing `.env.example` is refused by the safety policy as a sensitive path, so the six new variables are not yet documented in the example file. The compose stack works without them because every one has a safe default or is omitted when unset.
- L14 (2026-11-06): T3b verified and then corrected. The real streaming path is genuine: an async generator reading provider SSE frames, an AbortController wired to the response close event, and a provider-shaped error frame instead of socket destruction. But the agent left the old fake-streaming function `writeChatCompletionStream` in place, whose only caller was its own test, still slicing a buffered answer into 128-character chunks under a name one word away from the real one. Deleted along with its test and its unused fixture, because a misleading duplicate is worse than no code. Suite moved 126 to 125 by that deletion: 125 tests, 102 pass, 23 skip, 0 fail, boundaries green.
- L15 (2026-11-06): T3c verified independently rather than trusted, and on the production major version. The agent reported its live integration run on `pgvector:pg16`; the stack ships `pg17`, so the parent re-ran everything on `pg17` with a disposable container. Result: integration 30/30 with zero skips, full suite 135 tests 108 pass 27 skip 0 fail, boundaries 33 modules and 59 edges. Owner scoping confirmed by reading the code: `setDocumentRetention`, `purgeDocument` and `exportOwner` all take `owner_id` and every query filters on it.
- L16 (2026-11-06): The migration bootstrap had an untested path and it now has evidence. A database initialised by `docker-entrypoint-initdb.d` has an empty `schema_migrations`, so the ledger and the init scripts can disagree. Tested directly: truncate the ledger on an already-initialised database, run `npm run migrate`, and it applies 5 of 5 and records them; a second run applies 0 of 5. The init scripts are idempotent and the ledger converges.

## Verification

Pending.

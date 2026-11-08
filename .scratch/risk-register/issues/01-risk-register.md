# Assess delivered-stack risks from repository evidence

Type: audit
Status: resolved
Branch: `feat/session-2`
Source revision: `1c9a2ff`

## Summary

This register records the source-supported part of each supplied candidate. Several were overstated or combined unrelated claims; those subclaims are explicitly rejected below. The scope is repository code, configuration, documentation, and tests, not a live security assessment.

## R1 — CONFIRMED: one bearer token selects among configured shell identities

- **Threat:** Anyone holding the process-wide bearer token can choose any shell identity present in the static `GATEWAY_SHELL_USERS` map and thereby act as its mapped owner. The header is caller-controlled but mapping-gated; it cannot select an arbitrary unmapped owner.
- **Affected path:** `src/gateway-config.js:48-67` reads one `GATEWAY_TOKEN` and one shell-user map; `src/gateway-auth.js:23-52` checks the bearer token and resolves `x-shell-user-id`; `src/gateway-cli.js:12,36-40` constructs the authenticator at startup.
- **Controls:** Minimum configured token length, constant-time equality check, default gateway bind to `127.0.0.1`, mapped-identity allowlist, and rejection of caller-supplied `owner_id` (`src/gateway-auth.js:13-20`, `src/gateway-config.js:3,49-51,59-67`, `src/gateway-server.js:92-95`).
- **Residual risk:** No per-principal gateway credential or in-process token revocation is implemented. An operator can rotate the environment value by restarting the process; that is not runtime revocation.
- **Impact:** High — a valid shared token can cross configured owner boundaries.
- **Likelihood:** Medium — the identity selector is exposed to each token holder, while the default listener is loopback and token distribution is deployment-dependent.
- **Verify:** `node --test test/gateway-auth.test.js test/gateway-config.test.js test/gateway-server.test.js` (not run in this audit).
- **Follow-up ticket:** Replace shared-token plus caller-selected identity with a trusted per-principal assertion/credential and an operator revocation path.

## R2 — CONFIRMED, CORRECTED: question and evidence are sent to the configured model endpoint

- **Threat:** When a remote endpoint is configured, question text and retrieved corpus evidence cross the host boundary in the model request. The model response returns to the gateway; the answer is not sent outbound to the provider by this client.
- **Affected path:** `src/answer-question.js:63-69` builds the question/evidence messages; `src/chat-client.js:34-47,178-186` resolves the endpoint and posts the serialized request; `src/gateway-cli.js:24-30` reads provider endpoint configuration.
- **Controls:** Non-loopback cleartext HTTP is refused, provider URLs cannot contain embedded credentials, and redirects are rejected (`src/chat-client.js:40-47,183-186`). The endpoint is opt-in configuration.
- **Residual risk:** Any HTTPS endpoint is accepted; no application-level provider allowlist or model-call audit event was found in `src`. Provider retention and host egress controls are deployment facts not visible here.
- **Impact:** High — the payload can contain private corpus text.
- **Likelihood:** Medium — egress occurs when an external HTTPS model endpoint is configured; the active deployment endpoint is unknown.
- **Verify:** `node --test test/chat-client.test.js`; inspect `ANSWER_BASE_URL` and `EMBEDDING_BASE_URL` in the deployment without exposing credentials (not run here).
- **Follow-up ticket:** Enforce an approved provider-host allowlist and document data handling; emit provider/model metadata without logging raw evidence.

## R3 — CONFIRMED RESIDUAL: prompt controls exist, but provider behavior and entailment are not verified

- **Threat:** A model could still respond to hostile retrieved text or produce an unsupported answer; repository evidence does not demonstrate that a real provider can be steered.
- **Affected path:** `src/answer-question.js:16-22,42-70` instructs the model to treat evidence as untrusted and serializes bounded evidence as one JSON object per line. `test/answer-question.test.js:263-279` contains an inline hostile-text fixture and verifies prompt construction.
- **Controls:** Bounded text, JSON delimiters, an explicit untrusted-data instruction, and a structural test are present.
- **Residual risk:** No provider-level adversarial evaluation or entailment check is implemented. The model-steering clause is a plausible residual, not a reproduced exploit.
- **Impact:** Medium — an unsupported response can mislead, but the gateway only returns text and does not execute a consequential action.
- **Likelihood:** Low — prompt defenses and a structural test exist; actual provider behavior was not tested.
- **Verify:** `node --test --test-name-pattern="keeps retrieved text" test/answer-question.test.js` (not run).
- **Follow-up ticket:** Add a repeatable adversarial evaluation against a controlled provider and require human checking for consequential answers until support is validated.

## R4 — CONFIRMED: citation integrity is not semantic support

- **Threat:** A generated sentence can cite a real, owner-matched, fresh segment without that segment logically supporting the sentence.
- **Affected path:** `src/answer-question.js:73-100,246-267` extracts citation indices, resolves citations, revalidates freshness, and computes uncertainty from retrieval mode plus cited/unresolved/stale counts. `src/citation-resolver.js:55-105` validates owner, active retention, hashes, and provenance.
- **Controls:** Out-of-range citations, mismatched owner/provenance, inactive retention, and stale citations are rejected or surfaced.
- **Residual risk:** There is no claim-to-evidence entailment or semantic support check. `uncertainty.level === "none"` for valid hybrid citations is not proof of semantic support.
- **Impact:** Medium — users may over-trust a grounded-looking answer; no automatic action is taken by this endpoint.
- **Likelihood:** Medium — citation existence is checked, but semantic relation is not measured.
- **Verify:** `node --test test/answer-question.test.js test/citation-resolver.test.js` (not run).
- **Follow-up ticket:** Describe uncertainty as citation-integrity only and add a support check or human-review gate for consequential answers.

## R5 — CONFIRMED, CORRECTED: hard delete cascades, but tombstone is not purge and export is absent

- **Threat:** An operator may mistake a non-searchable tombstone/purged state for physical erasure; the repository has no owner-scoped export path.
- **Affected path:** `src/postgres-store.js:947-955` deletes a document by document and owner IDs. `docker/postgres/init/002-schema.sql:1-15` allows retention states and cascades document deletion to segments; `003-segment-embeddings.sql:1-6` cascades segment deletion to embeddings; `005-collections.sql:1-32` cascades memberships but keeps collection metadata. Tests update retention state directly and confirm tombstones are excluded from retrieval (`test/integration/postgres-store.test.js:669-675`).
- **Controls:** `deleteDocument` is owner-scoped and the foreign keys cascade rows on hard deletion. Retrieval filters to active documents (`src/postgres-store.js:782-787,845-853`).
- **Residual risk:** Changing a document to `tombstone` or `purged` does not itself delete its document, segments, or embeddings. Empty collection records can remain by design. No export method or route was found in `src`.
- **Impact:** High — sensitive data can remain stored when an operator expects purge or needs portability.
- **Likelihood:** Medium — tombstone/purged states are part of the schema, but the deployment retention policy is not specified.
- **Verify:** `npm run test:integration` for owner-scoped delete/cascade and retention behavior (requires PostgreSQL/pgvector; not run); `rg -n "export|dump|backup" src` for the absent app path.
- **Follow-up ticket:** Define tombstone versus purge semantics and add owner-scoped export plus a tested physical-purge operation for segments and embeddings.

## R6 — CONFIRMED, CORRECTED: no explicit request-rate or concurrency cap

- **Threat:** A token holder can issue concurrent model-backed requests and consume HTTP sockets, provider quota, and service capacity.
- **Affected path:** `src/gateway-server.js:8,55-81,460-487` bounds request bodies and sets server timeouts but does not configure an application concurrency semaphore or rate limit. `src/chat-client.js:1-2,168-170,214-215` bounds individual provider-call timeouts. A source search found no `rateLimit`, `rate_limit`, `concurrency`, `maxConnections`, or semaphore implementation in `src`.
- **Controls:** 1 MiB default body limit, request/header timeouts, authentication, and bounded provider timeout.
- **Residual risk:** No explicit cap limits simultaneous authenticated work. The configured `server.requestTimeout = 120000` is present, but source does not establish it as the model-call timeout; the chat client has a separate 60-second default.
- **Impact:** Medium — primarily availability and provider-cost exposure.
- **Likelihood:** Medium — requires sustained or concurrent authenticated requests; listener defaults to loopback.
- **Verify:** `node --test test/gateway-server.test.js test/chat-client.test.js`; `rg -n "rateLimit|rate_limit|concurrency|maxConnections" src` (not run).
- **Follow-up ticket:** Add an authenticated concurrency bound and rate limit around model-backed routes, with a bounded overload response.

## R7 — CONFIRMED LOCALLY: no repository CI gate; REJECTED: claimed Pi vulnerability count

- **Threat:** Changes can merge or be delivered without an automated repository test gate.
- **Affected path:** `package.json:20-27` defines test, integration, and start scripts but no CI script; tracked-file inventory contains no `.github/workflows`, GitLab CI, or Jenkins configuration.
- **Controls:** `npm test` and `npm run test:integration` are available for an operator to run.
- **Residual risk:** No repository-local CI configuration was found. An external CI service is outside this source review. The statement that “Pi extension dependencies report 3 high vulnerabilities” is rejected: this repository manifest identifies the stack package and `pg` dependency, not that Pi extension dependency set, and no advisory report was supplied or queried.
- **Impact:** Medium — regressions can go undetected by automation.
- **Likelihood:** Medium — the tests exist but execution is manual unless an external gate is configured.
- **Verify:** `git ls-files | rg '(^|/)\.github/workflows/|(^|/)\.gitlab-ci|(^|/)Jenkinsfile'` and `npm test` (not run).
- **Follow-up ticket:** Add repository CI that runs unit tests and a disposable PostgreSQL/pgvector integration job; audit the actual lockfile with an approved advisory source before release.

## R8 — CONFIRMED, CORRECTED: no in-repo migration or operational restore path

- **Threat:** A schema change can leave an existing persistent database on an old schema without a documented, tested upgrade and recovery procedure.
- **Affected path:** `compose.yaml:12-13` declares a persistent named volume and mounts `docker/postgres/init` as initialization scripts. `package.json:20-27` has no migration/backup command. `docs/private-runtime.md:32-34` and `docs/implementation-brief.md:183-201` state backup/restore and export as requirements/validation goals, not an operator runbook.
- **Controls:** Schema setup is versioned as numbered SQL files under `docker/postgres/init`; the database volume is explicitly persistent.
- **Residual risk:** No migration runner, tested backup/restore workflow, or operational runbook is present in the repository. The claim that schema changes require recreating the volume is rejected: repository evidence does not establish that and recreating a data volume would be destructive. Container-entrypoint behavior is not independently validated from repository source.
- **Impact:** High — an unsafe upgrade or data loss can affect the system of record.
- **Likelihood:** Medium — the risk materializes on schema change or recovery; deployment timing is unknown.
- **Verify:** `git ls-files | rg -i 'migration|migrat|backup|restore'`; inspect `compose.yaml` and the numbered init SQL (not run as a deployment test).
- **Follow-up ticket:** Add forward-only versioned migrations and rehearse backup/restore against a disposable PostgreSQL/pgvector volume before using real data.

## R9 — CONFIRMED: the manual traceability matrix is already stale

- **Threat:** A reader can make readiness decisions from traceability entries that disagree with current Git state.
- **Affected path:** `odd/traceability.md:27` still says the streaming commit is pending; `odd/traceability.md:35` says streaming awaits commit/review. The current branch history contains `e9adac3` plus later gateway-client commits.
- **Controls:** The matrix says Git, tests, and runtime are authoritative over memory, but no automatic consistency check was found.
- **Residual risk:** Manual rows and status text can remain stale after work is completed. This specific mismatch was visible during the audit.
- **Impact:** Medium — reviewers or operators may misread delivery status.
- **Likelihood:** High — stale status is observed in the current matrix.
- **Verify:** `git log --oneline -8; rg -n 'commit pending|streaming implemented pending' odd/traceability.md` (not run as a separate check; current history and lines were inspected).
- **Follow-up ticket:** Refresh the gateway-client rows from the committed task evidence and add a small check for stale commit/status markers.

## R10 — CONFIRMED, PARTIAL: no live-provider round trip or load test; REJECTED: no adversarial fixture

- **Threat:** Mock-only provider coverage can miss real endpoint compatibility or operational limits; no load test measures saturation behavior.
- **Affected path:** `test/chat-client.test.js:21-27` injects a fake `fetch`; `test/integration/gateway.test.js:152-174` explicitly uses a fake chat adapter. The test inventory contains no load/stress tool.
- **Controls:** Unit tests cover request format and malformed responses; HTTP/database integration uses synthetic evidence and fake model behavior. `test/answer-question.test.js:263-279` does contain an inline hostile retrieved-text fixture.
- **Residual risk:** No real provider round trip or load test was found. The absolute claim that there is no adversarial fixture is rejected; the inline fixture only checks prompt construction, not provider response behavior.
- **Impact:** Medium — integration and capacity failures may appear only in deployment.
- **Likelihood:** Medium — the production provider and expected concurrency have not been exercised here.
- **Verify:** `node --test test/chat-client.test.js test/integration/gateway.test.js`; inspect `git ls-files test` for load tooling (not run).
- **Follow-up ticket:** Add an opt-in, non-production provider smoke test and a bounded load test with an explicit concurrency target.

## Exposure ranking

1. R1 — mapped cross-owner access behind a shared token (6).
2. R2 — sensitive question/evidence egress to configured HTTPS provider (6).
3. R5 — retention/purge and export gap (6).
4. R8 — migration and recovery gap for persistent data (6).
5. R9 — observed traceability drift (6).
6. R4, R6, R7, R10 — medium exposure (4 each), ordered by correctness, availability, delivery gate, then test coverage.
7. R3 — residual model-behavior uncertainty (2); no exploit reproduced.

## Three mitigations before deployment

1. Replace R1's shared bearer plus caller-selected identity with per-principal trusted identity and revocation.
2. Establish R2's approved provider destinations, corpus data-handling terms, and minimal auditable provider/model metadata before remote inference.
3. Gate real-corpus use on R5/R8's explicit export/purge semantics and a versioned migration plus successful backup/restore rehearsal. Until R4 is improved, label uncertainty as citation-integrity only and require human checking for consequential answers.

## Rejected or narrowed claims

- **R1 — “No rotation”:** no in-process rotation/revocation API exists, but an operator can replace the environment token by restarting; the absolute claim is too broad.
- **R2 — “The answer leaves the host for the provider”:** outbound request contains question/evidence; the model answer is the response returned to the gateway.
- **R3 — “The model can be steered” as a demonstrated exploit:** no real provider behavior was tested. Retained only as an unverified residual alongside the missing entailment check.
- **R5 — “deleteDocument does not cascade”:** rejected; hard deletion cascades to segments, embeddings, and collection memberships. Collection metadata may survive independently.
- **R6 — “120 s is the model-call timeout”:** rejected as unsupported; the server property and the chat client's own timeout are separate source settings.
- **R7 — “Pi extension dependencies report 3 high vulnerabilities”:** rejected as unsupported by this repository's manifest or an attached audit result.
- **R8 — “must recreate the volume”:** rejected; no such procedure is supported or recommended by repository evidence. The actual image-entrypoint behavior was not independently researched.
- **R10 — “no adversarial fixture”:** rejected; the answer-question tests include an inline hostile-text fixture, though not a real-provider adversarial evaluation.

## Verification and exclusions

The source and test definitions were inspected, but no test command was run for this documentation-only register. No provider calls, dependency advisory query, deployed-system probe, load test, container migration, backup/restore, or production data access was performed. External CI, provider retention, network egress controls, and deployment topology remain unverified.
## Answer

Resolved as an audit ticket. The register, its scoring method, and the ranked exposure list are committed as `26bb2760f962c9ede28893ed5d1263e2207b01d6` on `feat/session-2`. Every candidate carries a CONFIRMED or REJECTED disposition with file:line evidence or a stated reason, each retained risk has threat, path, existing control, residual risk, a verification command, and a follow-up line, and the three pre-deployment mitigations are named. Native review `review-68c6a2cb9f916ec4` assessed the committed range as low and approved it without reviewer captures; the approval was acknowledged. No test, provider call, dependency-advisory query, deployment probe, or destructive retention test was run, by design for a documentation-only slice. The follow-up lines stay open as separate tickets; nothing was pushed.

## Comments

Runtime evidence added 2026-10-30 on `feat/session-2` at `f5602b5`, after R1's fix. This closes part of R10 and confirms R1 at runtime rather than only in unit tests.

- Disposable `pgvector/pgvector:pg17` on `127.0.0.1:55433`, all five `docker/postgres/init` scripts applied in order. The developer volume was not touched.
- `node src/gateway-cli.js` in `GATEWAY_PRINCIPALS` mode with two principals, against a local fake OpenAI-compatible provider on `127.0.0.1:18081`.
- Ten assertions passed with real HTTP and a real PostgreSQL database: `GET /healthz` 200 unauthenticated; ingest accepted one synthetic document; owner-one retrieval returned it (`mode: lexical`, one match); owner-two retrieval returned zero matches; owner-one plus a forged `x-shell-user-id` still resolved to owner-one (R1 at runtime); an unknown token answered 401 `unauthorized`; a body naming `owner_id` answered 400; `/v1/answers` returned an answer citing `[1]` with resolved provenance, hashes, `char_span`, and `uncertainty.level: low`; `/v1/research` returned the same field set; `/v1/chat/completions` with `stream: true` emitted a content chunk, a terminal chunk carrying `answer_metadata` with a resolved citation, and `[DONE]` last.
- Two fixture defects were found and fixed in the throwaway harness, not in the product: an unqualified `document_id` and a bare hex `source_hash` without the `sha256:` prefix are both refused by the store's validation, which is the contract working as specified. A question whose tokens are absent from the corpus legitimately yields `uncertainty.level: unsupported` and makes no model call.
- Still open, unchanged: no real provider round trip (the fake provider stands in for it), no load test, no adversarial corpus.
- Open WebUI `ghcr.io/open-webui/open-webui:main` was pulled, started with `WEBUI_AUTH=false`, answered `HTTP 200` on `/`, and was stopped. The two plugins in `integrations/open-webui/` were **not** installed: the repository documents UI installation only, so non-interactive installation remains unproven.
- The verification harness lived in `/tmp` and is not committed; the commands above are reproducible but the script itself is not part of the repository.

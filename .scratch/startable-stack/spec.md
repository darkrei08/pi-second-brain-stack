# Startable stack

Type: feature
Triage: ready-for-agent
Status: open

One repository owns the whole reference stack, one command starts it, one smoke test proves it, and the ticket ledger tells the truth about what is still blocked.

## Problem Statement

An operator who clones this repository cannot run the product. `docker compose up` stops on a missing `.env` before any container starts, and even with a hand-written `.env` it brings up PostgreSQL alone. The gateway that implements the actual product lives in a second compose file that must be named explicitly. There is no UI, no parser or OCR worker, no model or embedding endpoint, and no object storage. The documented architecture in the implementation brief describes a stack that this repository does not start.

The product's code is also split across three repositories that have drifted apart. The gateway and the PostgreSQL store exist both here and in `second-brain-backend`, and the two copies disagree: the sibling repository is ahead by 509 lines in the gateway server and 370 lines in the store, while this repository carries modules the sibling lacks. The Open WebUI plugin package exists both here, as `openwebui/filter.py` and `openwebui/pipe.py`, and in `second-brain-shell` as a full package with a documented startup contract, and the sibling's README explicitly says the reference stack must mount that package rather than duplicate its source. Whichever copy an operator edits, the other silently keeps the old behavior.

Finally, four tracker tickets are open and the request to "fix the issues" cannot be satisfied literally. Three of them are decision tickets whose own text forbids inventing the answer: the ANN recall floor, the extractor and entity-identity contract, and the parser benchmark runtime matrix all require evidence that only the operator can supply. Closing them by guessing would corrupt the ledger that the rest of the work depends on.

## Solution

The stack repository becomes the single source of truth for the running product. `second-brain-backend` and `second-brain-shell` are absorbed into it and left untouched in place, so the operator can compare, but nothing in the stack depends on them anymore. The Open WebUI plugin package is adopted in its authoritative layout and the duplicate is deleted.

One root compose file starts a working stack with no `-f` flags and no manual file creation: PostgreSQL, the gateway, Open WebUI with both plugins imported, a Docling-based parser worker, and a storage volume. Model and embedding endpoints stay provider-neutral and externally configured; the `test` profile substitutes a deterministic fake OpenAI-compatible provider so the stack can be proven startable without a GPU or an API key.

One new test seam proves the whole thing: a compose-level smoke test that brings the stack up, ingests a synthetic document, retrieves it with citations and provenance, gets a grounded answer, streams a chat completion, and confirms Open WebUI imported both plugins.

The two unblocked tickets are implemented to their ratified shape with conservative, provisional configuration and no published numbers. The three evidence-gated tickets stay open with the exact list of what the operator must supply, and the spec says so instead of pretending otherwise.

## User Stories

1. As an operator evaluating this repository, I want to run a single documented command and get a working stack, so that I can see the product work before reading any architecture document.
2. As an operator, I want the repository to ship a `.env.example` with every required variable and a hint for generating each secret, so that the first `docker compose up` does not fail on a missing parameter.
3. As an operator, I want the default compose file to include every service the stack needs, so that I do not have to discover and name additional compose files.
4. As an operator, I want the gateway to wait for a healthy database, so that a cold start never serves a request against a half-initialized schema.
5. As an operator, I want a health probe on every long-running service, so that `docker compose up --wait` is a reliable readiness signal.
6. As an operator, I want Open WebUI to come up already wired to the gateway, so that I do not have to import plugins by hand in the admin UI.
7. As an operator, I want both plugins imported automatically at startup, so that a fresh volume behaves like an existing one.
8. As an operator, I want the plugin package to live in exactly one place in the repository, so that I cannot edit a copy that nothing runs.
9. As an operator, I want the parser worker to accept a real PDF or image and produce the ingest contract, so that I can load documents without writing extraction code myself.
10. As an operator, I want the parser engine to be selectable, so that I can switch to MinerU or PaddleOCR once their runtime evidence exists without changing the stack.
11. As an operator, I want a parser engine that is not installed to answer with a clear "not available" error instead of silently returning empty text, so that a misconfigured ingestion fails visibly.
12. As an operator, I want uploads to land in a persistent volume, so that originals survive a container restart.
13. As an operator, I want model and embedding endpoints configured by URL, so that I can point the stack at a local runtime or a remote provider without rebuilding anything.
14. As an operator without a model endpoint, I want the stack to start and report the missing capability through the readiness probe, so that partial configuration is diagnosable rather than fatal.
15. As a maintainer, I want a deterministic fake OpenAI-compatible provider available as a test profile, so that the stack can be proven startable on a machine with no model runtime.
16. As a maintainer, I want the fake provider to be unavailable outside the test profile, so that it can never be mistaken for a production endpoint.
17. As a maintainer, I want a compose-level smoke test that exercises ingest, retrieval, answer, and chat, so that a broken service wiring fails the suite instead of the operator.
18. As a maintainer, I want the smoke test to tear down its volumes, so that repeated runs start from a clean schema.
19. As a maintainer, I want the smoke test to assert the exact SSE termination sequence, so that a streaming regression cannot pass as success.
20. As a maintainer, I want the smoke test to assert that citations and provenance survive the round trip, so that a retrieval change cannot quietly drop evidence.
21. As a maintainer, I want the sibling repositories absorbed rather than referenced, so that the stack has one build context and one history.
22. As a maintainer, I want the backend-only modules the stack lacks ported with their tests, so that shutdown handling, directory ingestion, and schema migrations stop living only in an external repository.
23. As a maintainer, I want an explicit capability audit of what the discarded backend versions contained, so that no feature disappears silently.
24. As a maintainer, I want the Open WebUI plugin tests to run against the authoritative package, so that the plugin contract is verified where it is maintained.
25. As a maintainer, I want graph expansion available behind the retrieval adapter with owner scoping and retention scoping, so that graph evidence is never leaked across owners.
26. As a maintainer, I want graph claims to carry their original segment citations, so that no graph-only assertion can be presented as evidence.
27. As a maintainer, I want graph expansion to fail closed on a stale assertion, so that a re-ingested document cannot be answered from a deleted relationship.
28. As a maintainer, I want traversal depth, result cap, and resource limits to be configuration with documented provisional defaults, so that the seam is bounded without claiming measured bounds.
29. As a maintainer, I want an ANN comparison harness that measures recall against exact search, so that the operator can supply a floor from data instead of a guess.
30. As a maintainer, I want the default retrieval path to remain exact search, so that adding the harness cannot change production ranking.
31. As a maintainer, I want the three evidence-gated tickets to stay open with a written list of the required inputs, so that nobody closes them by inventing a number.
32. As a maintainer, I want the documentation to describe the commands that actually work, so that a reader never follows instructions that fail.
33. As a maintainer, I want the expanded sidecars left out of the default profile, so that a first start stays fast and small.
34. As a security-conscious operator, I want every published port bound to loopback, so that starting the stack does not expose the product to the network.
35. As a security-conscious operator, I want no secret committed and no secret baked into an image, so that the repository stays publishable.
36. As a reviewer, I want the whole change split into work units under roughly 400 authored lines each, so that I can review it without losing focus.

## Implementation Decisions

### Repository boundary

The stack repository becomes the only place the running product is built. `second-brain-backend` and `second-brain-shell` are absorbed: their content is reconciled into the stack and the stack stops referencing them. Both sibling repositories are left untouched in place, by operator decision, so they remain available for comparison. No submodule, no npm workspace, no cross-repository build context.

### Merge direction and the cost of it

The operator chose that this worktree wins on every module that exists on both sides. That decision has a named, deliberate cost: the sibling backend carries a larger `gateway-server` and a larger `postgres-store`, and those versions are discarded rather than merged.

Because that cost is real, the work must begin with a capability audit rather than a copy. For each capability present in the discarded backend versions, the audit records one of three outcomes: the stack already provides it, the stack provides it differently and the difference is accepted, or it is dropped on purpose with a one-line reason. The audit is a reviewable artifact, not a conversation. Porting without it would make a silent feature loss indistinguishable from a clean reconciliation.

From the sibling backend, only the modules the stack lacks are ported: the shutdown handler, the directory ingestion module and its CLI, and the schema migration module. Each arrives with its tests, adapted to the stack's existing store and configuration surface, not to the sibling's.

The Open WebUI package is adopted in the sibling's authoritative layout, with its startup bootstrap and its pinned image reference, because that package's own documentation states the reference stack must mount it rather than duplicate it. The duplicate `openwebui/filter.py` and `openwebui/pipe.py` are deleted. A stack-local JavaScript test that duplicates the package's Python coverage is deleted with them; a test that covers behavior the package suite does not is kept and pointed at the adopted package.

### Compose topology

The default `compose.yaml` becomes the whole stack, so that `docker compose up` needs no `-f` flag. Existing override files stay as overrides for TLS only.

Services in the default profile:

- The database, unchanged, still loopback-bound.
- The gateway, folded into the default file, still loopback-bound, still waiting for a healthy database.
- Open WebUI, pinned to the image tag the plugin package declares, mounting the adopted plugin package and its bootstrap, waiting for a healthy gateway.
- A one-shot bootstrap service that imports both plugin records into the Open WebUI database and exits.
- A parser worker that converts an uploaded binary into the gateway's ingest contract, backed by Docling, which is the one parser in the required stack that ships as an installable, CPU-capable service.
- A named volume for uploaded originals.

The `test` profile adds one deterministic fake OpenAI-compatible provider. It is never reachable from the default profile.

Model and embedding endpoints stay provider-neutral environment variables. The readiness probe reports a missing model endpoint as a degraded capability rather than refusing to start, so that a partially configured stack is diagnosable.

### Configuration

A committed `.env.example` carries every variable the compose files expand, each with a generation hint, and the compose files stop failing on absent values that have a safe default. Secrets have no default and no committed value. The `.gitignore` already permits `.env.example`; that exception becomes load-bearing.

### Graph retrieval

Only the ratified shape is implemented. Storage gains entity and relationship tables with owner scoping and retention scoping. A projection lifecycle derives them from stored segments. Retrieval gains a bounded expansion behind the existing adapter, using recursive SQL, returning graph claims together with their original segment citations, and failing closed when an assertion's source segment no longer validates.

Traversal depth, result cap, and resource limits become configuration with conservative defaults. Those defaults are documented as provisional and unmeasured. No latency, recall, or size claim is published, and no graph engine dependency is added. The two graph tickets stay open until measured workload evidence exists.

### ANN indexes

Only the harness is built. It builds candidate indexes over a versioned synthetic corpus, captures exact search results as ground truth, compares candidate recall at the scoped top-k, records planner usage, latency, and index size, and compares the resulting hybrid ranking. The default retrieval path is unchanged: exact search remains the shipped behavior and the rollback. The index and recall ticket stays open until the operator supplies a floor.

### Contracts that do not change

The gateway stays the only public HTTP boundary. Open WebUI reaches the product exclusively through the adopted plugin package. No new public route, flag, or configuration format is introduced beyond the ones named here. Owner identity stays server-derived and a request that names an owner stays rejected.

## Testing Decisions

A good test in this repository exercises the public boundary and asserts observable effects: an HTTP status, an exact body shape, an exit code, a stream termination sequence. It never asserts internal storage layout, module structure, or call counts. Where a test needs a dependency, the existing suites inject a fake rather than reaching the network.

The one new seam is a compose-level smoke test, and it is deliberately the highest seam available. It brings the default stack plus the test profile up with `--wait`, then asserts, in order: the gateway readiness probe returns success; ingesting a synthetic document returns an accepted identifier; querying for that document's text returns the segment with a citation and its provenance; the answer route returns a grounded answer whose citations resolve; the chat route with streaming enabled emits content chunks, one trailing grounding record, the finish chunk, and the termination sentinel; and Open WebUI's health endpoint returns success with both plugin records present. It tears down with volumes removed so every run starts from an empty schema. This single seam covers service wiring, schema initialization, plugin import, provider configuration, and the four product routes at once.

Every other behavior rides on seams that already exist:

- The live-PostgreSQL integration suite extends to cover the entity and relationship tables, the projection lifecycle, the owner and retention scoping of graph expansion, the closed-failure on a stale assertion, and the citation chain on graph claims. Its prior art is the existing store integration test, which self-skips without a database URL.
- The gateway integration suite extends only if the smoke test cannot reach a behavior it should; the preference is to keep HTTP assertions in the compose seam.
- The ported backend modules get their own unit tests in the existing style: shutdown ordering, directory ingestion over a temporary directory, and migration application against a live database.
- The ANN harness gets one test proving that a candidate identical to exact search reports full recall, so the harness cannot silently measure nothing.
- The adopted plugin package runs its own Python suite, unchanged, plus whatever stack-local assertion survives the deduplication.

The compose smoke test must be observed failing before the topology is fixed. It will fail immediately on the absent environment file and the absent UI service, which is the correct RED for this work.

No test in this effort may assert a number that the blocked tickets own. The ANN harness measures; it does not ratify. The graph configuration is asserted to be bounded and scoped; it is not asserted to be fast.

## Out of Scope

- Choosing the ANN index type or a recall floor, and any published recall or latency figure. Blocked on operator-supplied workload, hardware, and floor.
- Ratifying the extractor output contract or the entity identity and merge policy. Blocked on an installed or provided extractor plus corpus evidence.
- Pinning and verifying MinerU and PaddleOCR releases, weights, and hardware profile, and publishing any parser accuracy or performance result. Blocked on the runtime matrix.
- The expanded sidecars: Apache AGE, Qdrant, Valkey, SeaweedFS. The required stack does not need them to start, and adding them would change the resource envelope of a first run.
- Archiving or deleting the two sibling repositories. The operator chose to leave them intact.
- Mounting or referencing the P.IVA corpus, any OCR output, embeddings, graph exports, or database dumps.
- Distributed quota enforcement across gateway replicas.
- Committing, pushing, or opening the GitHub mirror issue for this spec.
- Replacing Open WebUI with a different shell, or building a bespoke frontend.

## Further Notes

The discarded backend versions are the largest risk in this plan, and the capability audit is the only mitigation. It must be written before any module is ported and reviewed as its own unit.

Implementation tickets are materialized as `.scratch/startable-stack/issues/NN-<slug>.md` when work begins, one per work unit, each carrying the acceptance criteria above and the seam it is verified against. The work units, in dependency order, are: the capability audit; the repository consolidation and plugin deduplication; the ported backend modules; the default compose topology with the environment example; the parser worker; the Open WebUI service and bootstrap; the compose smoke test; the graph storage and projection; the bounded graph expansion; the ANN harness; and the documentation reconciliation.

The documentation is part of the change, not a follow-up. `docs/development.md` currently teaches a two-file compose invocation that this work removes, and the implementation brief describes services that will now exist. Both are corrected in the same unit that changes the behavior they describe.

Nothing here may be published as a performance or accuracy claim while the three evidence-gated tickets remain open. The tracker states that boundary; the documentation must not contradict it.

# Wayfinder traceability matrix

This matrix covers the repository-owned tracker after the gateway and shell implementations moved to their published packages. The reference stack keeps the decision records and public boundaries; implementation behavior belongs to the published backend and shell repositories.

The dependency-free checker is `scripts/check-traceability.mjs` and runs through `npm test`. It requires every resolved tracker ticket to appear below, validates every local reference, and rejects stale commit or review markers.

| Requirement | Specification / ticket | Current repository reference | Status |
|---|---|---|---|
| Resolved ticket: embedding backfill planning | `.scratch/embedding-backfill/issues/01-embedding-backfill-planning.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: streaming chat completions | `.scratch/streaming-chat-completions/issues/01-streaming-chat-completions.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: gateway hardening | `.scratch/gateway-hardening/issues/04-gateway-hardening.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: optional TLS and packaging | `.scratch/gateway-hardening/issues/01-optional-tls-and-packaging.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: owner quota policy | `.scratch/gateway-hardening/issues/03-owner-quota-policy.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: metrics and audit redaction | `.scratch/gateway-hardening/issues/02-metrics-and-audit-redaction.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: hybrid search | `.scratch/hybrid-retrieval/issues/01-hybrid-search.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: parser benchmark runtime matrix | `.scratch/parser-benchmark/issues/01-runtime-matrix.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: parser benchmark corpus contract | `.scratch/parser-benchmark/issues/02-corpus-contract.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: parser benchmark metrics contract | `.scratch/parser-benchmark/issues/03-metrics-contract.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: parser benchmark harness contract | `.scratch/parser-benchmark/issues/04-harness-contract.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: parser benchmark implementation | `.scratch/parser-benchmark/issues/06-implement-harness.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: evidence reverification | `.scratch/graph-retrieval/issues/01-evidence-reverification.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: graph provenance envelope | `.scratch/graph-retrieval/issues/03-graph-provenance-envelope.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: derived extraction pipeline | `.scratch/graph-retrieval/issues/04-derived-extraction-pipeline.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: graph schema and isolation | `.scratch/graph-retrieval/issues/02-graph-schema-and-isolation.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: shell repository | `.scratch/repo-split/issues/02-create-the-shell-repository.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: backend repository | `.scratch/repo-split/issues/01-create-the-backend-repository.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: reference stack consumes package | `.scratch/repo-split/issues/05-reference-stack-consumes-the-package.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: tracker ownership | `.scratch/repo-split/issues/03-decide-the-fate-of-the-tracker-test.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: exact semantic search | `.scratch/vector-semantic-search/issues/01-exact-semantic-search.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: Open WebUI glue contract | `.scratch/openwebui-glue/issues/01-glue-contract.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: Open WebUI glue implementation | `.scratch/openwebui-glue/issues/02-implement-openwebui-glue.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: document segment contract | `.scratch/document-segmentation-wayfinder/issues/01-document-segment-contract.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: first segmentation slice | `.scratch/document-segmentation-wayfinder/issues/03-first-slice-boundary.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: provenance citation contract | `.scratch/document-segmentation-wayfinder/issues/02-provenance-citation-contract.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: HTTP gateway | `.scratch/http-gateway/issues/01-http-gateway.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: collections retrieval scope | `.scratch/interface-stack/issues/02-collections-as-retrieval-scope.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: interaction shell and collections | `.scratch/interface-stack/issues/01-select-interaction-shell-and-collections.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: real provider smoke | `.scratch/perf-baseline/issues/01-real-provider-smoke.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: citation resolver contract | `.scratch/citation-resolver/issues/01-citation-resolver-contract.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: PostgreSQL lexical persistence | `.scratch/postgres-persistence/issues/01-persist-segments-lexical-search.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: model registry coverage | `.scratch/model-registry-lifecycle/issues/01-model-registry-coverage.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: embedding provider boundary | `.scratch/embedding-provider-boundary/issues/01-openai-compatible-embedder.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: citation revalidation | `.scratch/database-freshness/issues/01-citation-revalidation.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: parser normalization | `.scratch/parser-normalization/issues/01-normalize-parser-output.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: embedding backfill execution | `.scratch/embedding-backfill-execution/issues/01-provider-neutral-backfill-run.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: reorganize project documents | `.scratch/projects-and-chats/issues/04-reorganise-project-documents.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: shell attachment ingest | `.scratch/projects-and-chats/issues/09-shell-attachment-ingest.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: project names and tags | `.scratch/projects-and-chats/issues/03-project-name-and-tags.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: lexical retrieval questions | `.scratch/projects-and-chats/issues/11-lexical-retrieval-must-survive-a-question.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: shell beside gateway | `.scratch/projects-and-chats/issues/10-run-the-shell-beside-the-gateway.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: project standing instructions | `.scratch/projects-and-chats/issues/02-project-standing-instructions.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: folder collection scope | `.scratch/projects-and-chats/issues/01-folder-to-collection-scope.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: retrieval mode | `.scratch/retrieval-mode/issues/01-describe-retrieval-mode.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: ANN exact trigger | `.scratch/ann-indexes/issues/01-exact-trigger.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: ANN sidecar gate | `.scratch/ann-indexes/issues/03-sidecar-gate.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: RAG market comparison | `.scratch/rag-market-comparison/issues/01-compare-prebuilt-rag-platforms.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: grounded answers | `.scratch/live-answers/issues/01-grounded-answers.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: buffered chat completions | `.scratch/gateway-clients/issues/01-chat-completions.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: streaming chat completions | `.scratch/gateway-clients/issues/02-streaming-chat-completions.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: bounded research and Open WebUI glue | `.scratch/gateway-clients/issues/03-open-webui-research.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: delivered-stack risk register | `.scratch/risk-register/issues/01-risk-register.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: traceability drift check | `.scratch/risk-register/issues/02-traceability-drift-check.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: provider egress allowlist | `.scratch/risk-register/issues/03-provider-egress-allowlist.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: migrations and restore | `.scratch/risk-register/issues/04-migrations-and-restore.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: export and purge | `.scratch/risk-register/issues/05-export-and-purge.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: model route limits | `.scratch/risk-register/issues/06-model-route-limits.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: CI gate | `.scratch/risk-register/issues/07-ci-gate.md` | `docs/media-transcript-repos.md` | Resolved |
| Resolved ticket: provider-call audit | `.scratch/risk-register/issues/08-provider-call-audit.md` | `docs/media-transcript-repos.md` | Resolved |

## Current boundary

The backend and shell implementations are published packages. This repository owns the reference Compose topology, public decision records, repository boundaries, and tracker integrity. Private corpora, OCR output, embeddings, graph exports, database dumps, credentials, and model caches remain excluded.

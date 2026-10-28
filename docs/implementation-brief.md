# Private local-only P.IVA RAG runtime

## Status and evidence boundary

This brief is the implementation decision record for the public documentation repository. It describes the runtime; it does not contain private documents, credentials, or a claim of legal compliance.

The supplied synthesis template names three inputs: platform, graph, and stack. In this repository, the available evidence is the stack report in [`README.md`](../README.md) and the task specification in [`odd/tasks/platform-and-graph-rag.md`](../odd/tasks/platform-and-graph-rag.md). A separate platform report and graph report are not present. Decisions that depend on those missing reports are therefore provisional and must be revalidated against the actual corpus and workload.

No benchmark results are asserted here. The stack report explicitly records that no local benchmark was run and that published project measurements are not directly comparable.

## Scope and non-goals

The runtime is a private, local-first research system for one human operator using a P.IVA-owned corpus. The public repository documents and builds the stack; it must never contain the corpus itself.

In scope:

- document and image ingestion with provenance;
- text, metadata, vector, and relationship search;
- citations back to source documents and page/region metadata;
- local or customer-controlled model endpoints;
- terminal, web, desktop, and mobile access through one product API;
- deletion, export, audit, and operational validation.

Not in the initial scope:

- a public multi-tenant hosted service;
- native Android or iOS applications;
- a second independent chat/RAG backend;
- a graph database before graph workload evidence exists;
- a compliance certification.

## Decisions

### 1. Primary client strategy

Use a single product API gateway as the only application boundary. Every client calls the gateway; clients do not access PostgreSQL, pgvector, object storage, queues, or graph tables directly.

| Surface | Initial position | Role |
|---|---|---|
| Web | Primary human UI: LibreChat configured against the gateway | Full chat, citations, ingestion and administration |
| Terminal | First-class operator/developer client through the Pi extension and HTTP/CLI calls | Automation, scripts, diagnostics and power-user workflows |
| Desktop | Optional OpenChat client against the same gateway | Native desktop convenience, not a second backend |
| Mobile/iPad | Responsive web UI or installable PWA first | Reuse the web contract without maintaining native apps |
| Native mobile | Deferred | Add only if offline use, push, camera capture, or platform integration is demonstrated as a requirement |

This is a portability decision, not a claim that every client has equal feature parity. LibreChat is the recommended primary interface because its project documents a ChatGPT-like UI, multiple provider support, custom OpenAI-compatible endpoints, agents, MCP, skills, and RAG features ([LibreChat](https://github.com/LibreChat-AI/LibreChat)). OpenChat is an optional desktop client ([OpenChat](https://github.com/alztrk/openchat)). AnythingLLM remains an alternative document-first UI, not a co-primary application ([AnythingLLM](https://github.com/Mintplex-Labs/anything-llm)).

The gateway should expose both compatibility and product-native contracts:

```text
POST /v1/chat/completions
POST /v1/responses
POST /v1/documents/ingest
GET  /v1/documents/{id}
POST /v1/search
POST /v1/memory/search
POST /v1/memory/write
POST /v1/agents/run
GET  /v1/sources/{id}
POST /v1/data/export
DELETE /v1/data/{id}
GET  /healthz
GET  /readyz
```

### 2. Initial database and retrieval choice

**Yes: PostgreSQL plus pgvector and relational graph tables are sufficient for the first private implementation**, provided the first release is limited to text/document retrieval, metadata filtering, provenance, memory, and bounded relationship traversal.

Use PostgreSQL for:

- users, ownership, and access policy;
- documents, versions, chunks, pages, regions, and citations;
- parser jobs, model/provider metadata, audit events, retention and deletion state;
- full-text search;
- embeddings through pgvector;
- graph nodes and edges in ordinary relational tables.

Start with relational graph tables such as `graph_nodes` and `graph_edges`, with explicit tenant/document ownership and indexes on source, target, relation type, and timestamps. Use PostgreSQL recursive queries for bounded traversals. This keeps transactions, provenance, deletion, backup, and authorization in one system.

This is a provisional simplification. The stack report recommends Qdrant where visual multivectors, named vectors, late interaction, or more advanced filtered retrieval are required ([Qdrant vectors](https://qdrant.tech/documentation/manage-data/vectors/), [Qdrant hybrid queries](https://qdrant.tech/documentation/search/hybrid-queries/), [Qdrant repository](https://github.com/qdrant/qdrant)). Therefore:

- keep a retrieval adapter rather than coupling application code to pgvector;
- add Qdrant when image/page multivectors, hybrid retrieval, or independently scaling vector search becomes a demonstrated requirement;
- do not claim that pgvector and Qdrant have equivalent performance without a corpus-specific benchmark.

PostgreSQL licensing and capabilities are documented by the project ([PostgreSQL licence](https://www.postgresql.org/about/licence/)).

### 3. When Apache AGE or another graph store is justified

Do not add Apache AGE or a separate graph database in the minimum stack. Introduce one only after an instrumented workload shows that relational graph tables are a material limitation.

A graph extension or graph store becomes justified when one or more of these conditions is true:

1. graph queries are a primary user workflow rather than an enrichment/search feature;
2. traversals are deep, variable-length, or pattern-heavy and bounded recursive SQL becomes difficult to maintain;
3. graph algorithms, centrality/community analysis, path ranking, or graph-native indexing are required;
4. graph data has an operational lifecycle or scale that should be separated from document transactions;
5. query traces show PostgreSQL graph queries are the dominant latency or resource cost after ordinary indexing and query tuning.

Before adopting AGE or another store, record representative query shapes, node/edge counts, depth limits, p50/p95 latency, memory/CPU, backup/restore behavior, authorization behavior, and deletion completeness. The current evidence contains no such measurements. AGE is therefore an evaluation option, not an implementation commitment. If a graph store is added, it remains behind the retrieval/graph adapter and receives only derived, provenance-linked data.

### 4. Minimum and expanded stack

#### Minimum private stack

```text
Pi extension / terminal client
        |
        v
Product API gateway, bound to localhost by default
        |
        +-- PostgreSQL + pgvector + full-text search + relational graph tables
        +-- Local filesystem or S3-compatible object storage
        +-- One parser/indexing worker
        +-- Customer-owned LLM and embedding endpoints
        +-- LibreChat web UI, optional during bootstrap
```

The minimum parser should use an adapter. MinerU is a candidate for PDFs and structured extraction; PaddleOCR-VL or Docling can cover OCR, layout, tables, images, or fallback paths. Do not run every parser for every document by default. MinerU has additional licensing terms that must be reviewed for the exact release and model weights ([MinerU](https://github.com/opendatalab/MinerU), [MinerU licence](https://github.com/opendatalab/MinerU/blob/master/LICENSE.md)). Docling is a candidate adapter.

#### Expanded stack

Add components only when the workload or operating model requires them:

```text
Reverse proxy + TLS + OIDC/SAML or equivalent identity provider
        |
        v
Product API replicas
        |
        +-- Dedicated parser/indexing workers
        +-- SeaweedFS for source files, page images and artifacts
        +-- Qdrant for image vectors, multivectors and advanced hybrid retrieval
        +-- Valkey for multi-worker queues/cache
        +-- PostgreSQL backups/PITR and operational monitoring
        +-- Optional AGE or another graph backend after workload evidence
```

SeaweedFS is the default expanded object-storage candidate because the report identifies its Apache-2.0 license and S3-compatible deployment options ([SeaweedFS](https://github.com/seaweedfs/seaweedfs), [SeaweedFS Compose example](https://github.com/seaweedfs/seaweedfs/blob/master/docker/seaweedfs-compose.yml)). Valkey is optional for larger deployments and multi-worker coordination ([Valkey](https://github.com/valkey-io/valkey)).

The expanded stack must not turn every optional component into a mandatory dependency. A single-node private deployment should remain operable with PostgreSQL-backed jobs and without a separate cache or graph server.

### 5. Security boundaries

The privacy boundary is the gateway and its network policy:

- bind all services to loopback or a private interface by default; expose no database, vector, object-storage, worker, or model-admin port publicly;
- require authentication at the gateway, even for a single-user deployment; use a local token initially and OIDC/SAML when shared access is introduced;
- enforce ownership and tenant checks in the gateway and again in data-access code;
- keep source files, OCR output, page images, chunks, vectors, graph data, caches, logs, and backups inside the declared private storage boundary;
- treat uploaded documents, extracted text, tool output, and retrieved content as untrusted input, including prompt-injection content;
- use parser sandboxing, MIME and size limits, archive/path traversal checks, timeouts, resource quotas, and malware scanning where available;
- allow outbound network access only through an explicit provider/tool allowlist; default agent tools to deny;
- store provider credentials in a customer-controlled secret mechanism where possible and never commit them to this repository;
- log ingestion, access, retrieval, model calls, tool calls, agent actions, export, and deletion without logging document secrets unnecessarily;
- support deletion of originals, derivatives, chunks, vectors, graph projections, caches, and backups according to the retention policy;
- require human confirmation for consequential external or destructive actions;
- include source identifiers, page/region provenance, model/provider identity, and uncertainty in responses;
- use TLS whenever traffic leaves the host, and encrypt persistent data and backups with customer-controlled keys where feasible.

The deployment should be described as privacy-oriented and customer-controlled, not automatically GDPR- or EU AI Act-compliant. Obligations depend on purpose, data, users, contracts, and deployment. Relevant primary references include [GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679), [EU AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689), [EDPB controller/processor guidance](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en), and [EDPB DPIA guidance](https://www.edpb.europa.eu/topics/accountability-and-compliance-tools/data-protection-impact-assessment_en).

## Implementation sequence

1. Define the gateway contract, storage ownership model, provenance schema, and deletion semantics.
2. Implement the PostgreSQL schema for documents, chunks, embeddings, graph nodes/edges, jobs, audit, and retention.
3. Add one parser adapter and one customer-controlled embedding/LLM path.
4. Implement hybrid lexical/vector retrieval and bounded graph expansion behind adapters.
5. Add the terminal client and web UI against the gateway; validate the responsive web surface on desktop, iPad, and mobile browsers.
6. Add object storage, Qdrant, Valkey, replicas, or a graph backend only when acceptance evidence requires them.
7. Publish deployment, security, backup/restore, deletion, and troubleshooting documentation without publishing private corpus material.

## Validation plan

### Structural and repository validation

- verify that the public repository contains no private documents, extracted text, credentials, tokens, or local database files;
- check Markdown formatting, internal links, source URLs, and that every product claim is labelled as a recommendation, project claim, or locally verified behavior;
- generate a dependency/license inventory before distribution, including parser and model-weight notices;
- run the documented minimal deployment from a clean environment.

### Runtime smoke tests

- ingest a synthetic PDF, image, and text fixture;
- verify source, page, region, parser, model, and hash provenance;
- verify lexical, vector, metadata-filtered, and bounded graph retrieval;
- verify that citations resolve to the correct source and that missing evidence produces an explicit uncertainty response;
- verify export and deletion across originals, derivatives, chunks, vectors, graph rows, caches, and audit records;
- verify backup and restore before using real data.

### Security and boundary tests

- confirm that direct database, vector, object-storage, worker, and model-admin ports are unreachable from an untrusted network;
- test authentication, authorization, ownership isolation, and expired credentials;
- upload malformed files, oversized files, archives with traversal paths, and prompt-injection fixtures;
- verify egress allowlists, tool-deny defaults, request timeouts, quotas, and audit events;
- inspect logs for accidental document content or secret leakage;
- test the gateway with the terminal client, web UI, optional desktop client, and mobile browser without granting clients direct storage access.

### Retrieval and graph evaluation

Create a small, versioned, synthetic evaluation corpus with expected citations and relationships. Measure retrieval recall/precision and p50/p95 latency under the target hardware and corpus only after the contract and correctness tests pass. Do not copy vendor benchmark numbers into acceptance criteria. Promote Qdrant, AGE, or another graph store only if the measured workload demonstrates a concrete benefit that justifies the extra operational boundary.

## Open questions

- The missing platform and graph report bodies must be supplied before treating the client and graph decisions as final.
- The target corpus size, document mix, languages, image volume, retention period, and concurrent-user count are not yet specified.
- The exact parser and model releases, licenses, hardware requirements, and supported provider APIs require release-specific review.
- Native mobile, offline access, and remote access remain product decisions, not assumptions of this brief.

# Research: prebuilt open-source RAG platforms

## Method and freshness

- Retrieval time: 2026-10-29T00:24:38+01:00.
- Provider: local Firecrawl reusable-data-search stack, with web-search discovery as a URL finder.
- Source policy: official repository or official documentation only. Every material claim below has a canonical URL.
- Bounded scope: six products, one or two primary pages each. No candidate was installed, benchmarked, or given access to the private P.IVA corpus.
- Freshness: current pages at retrieval time; GitHub default branches and documentation pages can change independently of releases.

## Executive result

There are mature products that could accelerate this project, but none is a clean replacement for the current repository contracts.

- **Best document/parser reference:** RAGFlow. Its documented DeepDOC path covers OCR, layout analysis, tables, and multiple parsing modes. It is a large application boundary, not a small Node/PostgreSQL adapter.
- **Best retrieval/API reference:** R2R. Its official RAG guide documents hybrid search, citations, GraphRAG, and a REST-oriented deployment. It is Python-first and would be a sidecar or reference, not a drop-in replacement for the current JS store.
- **Best pgvector/UI reference:** AnythingLLM. Its official setup directly documents PostgreSQL + pgvector, but expects a product-specific vector-table schema and a fixed dimension matching the embedder.
- **Best ACL/connectors reference:** Onyx. Its API is permission-aware and its standard mode combines vector and keyword retrieval, but its index is OpenSearch-oriented and the standard deployment is heavy for a single local operator.
- **Best workflow shell:** Dify. It provides self-hosted Docker deployment and RAG/agent workflows, but its default stack is a multi-service application and its license has additional conditions beyond plain Apache-2.0.
- **Best personal local-first shell:** Khoj. It is self-hostable and supports offline/local operation, but its product focus is personal assistant/search UX rather than the repository's parser/provenance/storage boundary.

## Candidate matrix

| Product | License evidence | Local/air-gapped | Parsing and documents | Retrieval/storage | Graph/citations/API | Fit with this repository |
| --- | --- | --- | --- | --- | --- | --- |
| AnythingLLM | MIT shown in repository resources | Local-first and self-hosted claims in README | Document ingestion and workspace chat; exact parser details were not fully inspected here | Explicit PostgreSQL + pgvector setup; schema and dimension are product-owned | Citations/workspace UX; API exists but the reviewed pages do not establish the repository's provenance contract | Strong UI/pgvector benchmark, weak as the system-of-record replacement |
| Dify | Dify Open Source License, based on Apache-2.0 with additional conditions | Docker self-hosting; default deployment is multi-service | Knowledge bases, RAG pipelines, model/provider integrations | Default quickstart starts Weaviate plus PostgreSQL/Redis; repository includes vectorstore configuration including pgvector | Strong workflow/API/application layer; graph/provenance contract not equivalent to ours | Optional application shell, not the storage core |
| RAGFlow | Apache-2.0 shown in repository resources | Self-hosted Docker-oriented product | DeepDOC OCR, layout, tables; General, Table, Paper, Book, Laws, Presentation, etc. | Product-owned multi-service retrieval stack; PostgreSQL/pgvector was not established by the bounded sources | Citation display and chunk metadata; product APIs exist | Best parser/layout sidecar reference; too broad to adopt before a benchmark |
| R2R | MIT shown in repository resources | `pip install r2r` and `r2r serve --docker` documented | Semantic chunking, document ingestion, embeddings and metadata | Retrieval settings support semantic and keyword hybrid search; exact PostgreSQL/pgvector compatibility was not established by the bounded sources | GraphRAG, citations, REST-oriented API, SDK examples | Best retrieval/gateway reference; Python sidecar candidate |
| Onyx | Community Edition MIT; EE features separate | Docker/Kubernetes/Helm/Terraform; Lite omits indexing | Connector-driven enterprise document sync | Standard mode uses vector + keyword index; docs identify OpenSearch as the vector/keyword search backend | Permission-aware `/search`, hybrid alpha, citation IDs, connectors, MCP | ACL/connectors benchmark; too heavy and backend-coupled for the current single-user core |
| Khoj | AGPL-3.0 shown in repository resources | Official docs explicitly describe private-network and offline operation | Local files, folders, Notion, Obsidian, Emacs, uploads; parser depth for P.IVA PDFs was not benchmarked | Embedded DB option and PostgreSQL appears in uninstall docs; pgvector compatibility was not established | Personal web app, clients, agents and scheduled automations; provenance shape not equivalent | Useful UX and local-operation reference; license and data model require separate review |

## Detailed findings

### AnythingLLM

What the official evidence supports:

- The repository describes AnythingLLM as a local-first agent experience and shows an MIT license in the repository resources. [AnythingLLM repository](https://github.com/Mintplex-Labs/anything-llm)
- The official pgvector guide requires PostgreSQL 12+, the pgvector extension, and table creation/read permissions. It permits a configured table name and says the table is created on first vector upsert. [AnythingLLM PGVector setup](https://github.com/Mintplex-Labs/anything-llm/blob/master/server/utils/vectorDbProviders/pgvector/SETUP.md)
- The same guide says an existing table must conform to AnythingLLM's expected schema and that the vector column dimension must match the embedder; it gives 384 as the default embedding dimension. [AnythingLLM PGVector setup](https://github.com/Mintplex-Labs/anything-llm/blob/master/server/utils/vectorDbProviders/pgvector/SETUP.md)

Implication:

AnythingLLM is a credible product to run as a UI or integration benchmark. Its pgvector support validates that PostgreSQL is a practical deployment choice, but its product-owned schema and fixed-dimension expectation are exactly why the repository's `model_id` + explicit `dimensions` satellite table should remain independent. Do not point it at the private store until an adapter and isolation policy exist.

Unknown in this bounded pass:

- Whether the current release can preserve the repository's opaque source/segment IDs and normalized page/bbox provenance without a custom integration.
- Exact parser behavior for Italian fiscal scans and complex tables.
- Complete access-control semantics for a single-user loopback deployment.

### Dify

What the official evidence supports:

- The repository describes Dify as a platform for agentic workflows and RAG pipelines, deployable on cloud, VPC, or self-hosted. It identifies the Dify Open Source License as based on Apache-2.0 with additional conditions. [Dify repository](https://github.com/langgenius/dify)
- The official Docker Compose deployment requires Docker Compose 2.24+ and starts core services plus Weaviate, PostgreSQL, Redis, Nginx, sandbox, and related services. [Dify self-hosted Docker deployment](https://docs.dify.ai/en/self-host/deploy/quick-start/docker-compose)
- The repository contains vector-store configuration examples including a pgvector environment template. [Dify pgvector environment template](https://github.com/langgenius/dify/blob/main/docker/envs/vectorstores/pgvector.env.example)

Implication:

Dify is valuable when the desired output is a complete application builder with workflows, agents, and a web UI. It is not a reason to abandon the current narrow storage and provenance work: the deployment boundary is much larger, default storage is not the repository's schema, and license obligations require a separate compatibility review before embedding code or redistributing components.

Unknown in this bounded pass:

- Exact current pgvector behavior and schema contract for the pinned release.
- Whether its citation metadata can map losslessly to normalized page and region provenance.
- Resource usage after reducing the default service set for a single local operator.

### RAGFlow

What the official evidence supports:

- The repository describes RAGFlow as an open-source RAG engine and shows Apache-2.0 in repository resources. [RAGFlow repository](https://github.com/infiniflow/ragflow)
- The dataset configuration documents built-in parsing modes including General, Q&A, Manual, Table, Paper, Book, Laws, Presentation, Audio, and Email. [RAGFlow dataset configuration](https://github.com/infiniflow/ragflow/blob/main/docs/guides/dataset/configuration.md)
- The same document describes DeepDOC as performing OCR, table-structure recognition, and document-layout analysis; it also lists Docling, OpenDataLoader, TCADP, MonkeyOCRv2, and external vision models as parser options. [RAGFlow dataset configuration](https://github.com/infiniflow/ragflow/blob/main/docs/guides/dataset/configuration.md)
- The configuration supports page/layout options such as multi-column recognition, header/footer removal, table handling, and metadata roles. [RAGFlow dataset configuration](https://github.com/infiniflow/ragflow/blob/main/docs/guides/dataset/configuration.md)
- The official documentation describes citation display and chunk metadata in chat configuration. [RAGFlow chat configuration](https://ragflow.io/docs/v1.0.0-rc2/chat_configuration)

Implication:

RAGFlow is the strongest candidate for a parser benchmark and an optional private sidecar. It can inform the parser-normalization Wayfinder's fixture corpus: compare text order, page numbers, table roles, and normalized geometry. It should not become the system of record by default because the current project intentionally separates parser workers from the public Node adapter and has not chosen a production parser runtime or deployment footprint.

Unknown in this bounded pass:

- A complete supported-storage inventory and whether PostgreSQL/pgvector can replace its default retrieval stack.
- Accuracy on the project's Italian P.IVA document set.
- Whether all parser/model components and their transitive licenses fit the intended private runtime.

### R2R

What the official evidence supports:

- The repository presents R2R as a production-oriented AI retrieval system with a RESTful API and shows an MIT license. [R2R repository](https://github.com/SciPhi-AI/R2R)
- The official RAG guide documents local installation, Docker serving, document ingestion, and retrieval commands. [R2R RAG guide](https://github.com/SciPhi-AI/R2R/blob/main/docs/introduction/guides/rag.md)
- The guide documents hybrid search using semantic and keyword retrieval, configurable result limits, semantic chunking, metadata/relationships, citations, GraphRAG, multi-step RAG, and agent-based RAG. [R2R RAG guide](https://github.com/SciPhi-AI/R2R/blob/main/docs/introduction/guides/rag.md)

Implication:

R2R is the best reference for a future retrieval/gateway Wayfinder: hybrid scoring, citation-bearing result objects, GraphRAG, and API boundaries. A Python-first sidecar could be evaluated against synthetic fixtures, but the current Node/PostgreSQL store should not be replaced without proving owner isolation, source identity mapping, deletion semantics, and parser provenance.

Unknown in this bounded pass:

- Exact PostgreSQL/pgvector support in the current release.
- Exact graph persistence and citation schema needed for lossless import into this repository.
- Runtime and licensing behavior of all optional model/provider integrations.

### Onyx

What the official evidence supports:

- The Community Edition is documented as MIT; enterprise features are separate. [Onyx repository](https://github.com/onyx-dot-app/onyx)
- Standard Onyx includes vector and keyword indexing, background connector workers, inference services, Redis, and MinIO; Lite is under 1 GB but cannot index documents. [Onyx repository](https://github.com/onyx-dot-app/onyx)
- Official search documentation exposes `POST /search` for retrieval pipelines and a search UI endpoint with hybrid keyword/vector settings. Results are permission-filtered per calling user and include citation IDs, content, links, and update timestamps. [Onyx Search API guide](https://docs.onyx.app/developers/guides/search_api_guide)
- The official documentation identifies OpenSearch as the vector/keyword search backend for standard deployments and documents connector synchronization and permission filters. [Onyx search configuration](https://docs.onyx.app/admins/advanced_configs/search_configs), [Onyx connectors](https://docs.onyx.app/overview/core_features/connectors)

Implication:

Onyx is useful for designing future permission-aware retrieval and connector synchronization, even in a single-user system where the first ACL is owner isolation. It is not a fit for replacing PostgreSQL/pgvector in the current slice: the search backend and deployment model introduce an additional operational platform, and the repository's P.IVA target is not an enterprise connector estate.

Unknown in this bounded pass:

- Whether a supported local deployment can eliminate OpenSearch without losing hybrid retrieval.
- Exact retention/cascade semantics for deleting a document and all derived vectors.
- Whether the community edition's citation model preserves page/region coordinates.

### Khoj

What the official evidence supports:

- The repository shows AGPL-3.0 and describes a self-hostable personal AI for documents and web research. [Khoj repository](https://github.com/khoj-ai/khoj)
- Official setup documentation states that self-hosting keeps data in a private network and can work without internet access. It provides Docker and pip installation paths. [Khoj self-hosting](https://docs.khoj.dev/get-started/setup/)
- The docs describe syncing local files/folders and integrations with Notion, Obsidian, Emacs, and the web app, plus local/OpenAI-compatible model endpoints. [Khoj self-hosting](https://docs.khoj.dev/get-started/setup/)
- The docs show an embedded database mode and refer to a PostgreSQL database during uninstall, but the bounded sources do not establish pgvector compatibility. [Khoj self-hosting](https://docs.khoj.dev/get-started/setup/)

Implication:

Khoj is a good reference for a private personal-assistant UX and for local/offline operation. It is less relevant as a parser/retrieval core for this repository, and AGPL-3.0 requires a dedicated legal/distribution review before reusing code or bundling it into a public stack.

Unknown in this bounded pass:

- Exact parser and citation behavior for scanned Italian fiscal documents.
- Vector backend schema and whether model-aware multi-dimensional coexistence is supported.
- GraphRAG or relational-graph support.

## Architecture comparison against the current stack

| Repository contract | Market evidence | Decision |
| --- | --- | --- |
| Parser-neutral normalized pages/regions | RAGFlow is strongest, but product-owned | Keep the contract; benchmark RAGFlow/Docling as parser workers later |
| Deterministic segment IDs and exact hashes | Product pages expose chunks/metadata but not this exact contract | Keep repository IDs and hashes as the canonical identity |
| Owner/retention filtering before retrieval | Onyx demonstrates permission-aware retrieval; others vary | Keep explicit owner/retention predicates in PostgreSQL |
| Model-aware vector dimensions | AnythingLLM documents a fixed dimension matching its embedder; RAGFlow validates model compatibility | Keep `model_id` and explicit dimensions; defer fixed production dimension |
| PostgreSQL system of record | AnythingLLM and Dify document PostgreSQL-related deployment paths; Onyx is OpenSearch-oriented | Keep PostgreSQL baseline; add sidecars only through adapters |
| Hybrid lexical/vector retrieval | R2R and Onyx document hybrid retrieval | Add a dedicated hybrid Wayfinder after exact vector search |
| Graph expansion | R2R documents GraphRAG; prior repository research evaluated Graphify as a projection worker | Keep relational graph projection; evaluate R2R/Graphify as optional workers |
| Explainable citations | R2R, RAGFlow, and Onyx expose citation concepts | Preserve opaque source/segment IDs and normalized location fields; map product citations into them |
| Single-user loopback deployment | Khoj and AnythingLLM support local use; Onyx/Dify/RAGFlow default to larger stacks | Keep the minimal local Compose and avoid adopting a full platform prematurely |

## Recommended reuse plan

Reuse ideas, not schemas:

1. RAGFlow/DeepDOC concepts for parser fixtures and layout-provenance benchmarks.
2. R2R hybrid retrieval and citation-bearing result shapes as design references.
3. Onyx permission-aware retrieval and connector sync as future ACL/ingestion references.
4. AnythingLLM pgvector setup as a compatibility smoke-test target.
5. Khoj local/offline UX patterns if a personal web client is added.

Do not replace:

1. the repository's PostgreSQL document/segment system of record;
2. the parser-neutral normalization boundary;
3. the `model_id` + dimensions vector contract;
4. owner/retention filtering and cascade deletion;
5. the public/private corpus boundary.

## Provider limitations and omissions

- Firecrawl agent returned an execution error; the structured agent path was not used in the final evidence.
- Firecrawl developer-search returned 404 and Firecrawl web-search returned empty result groups in this environment. Discovery therefore used Pi web search, while page retrieval used Firecrawl scrape.
- No live installs, performance benchmarks, parser accuracy tests, legal review, security audit, or corpus evaluation were performed.
- GitHub pages expose current default-branch state; pin a release/commit before any implementation depends on a candidate.

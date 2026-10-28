# Second Brain Stack

Architecture report for a self-hosted, commercializable document, OCR, image, memory, RAG, and agent platform callable from a Pi extension.

Implementation brief: [`docs/implementation-brief.md`](docs/implementation-brief.md)

This document records the current recommendation. It does not implement the stack and it does not constitute legal advice or a compliance certification.

## Executive decision

Use a thin, proprietary API gateway as the stable product boundary. Put the user interfaces and processing engines behind that boundary.

Recommended baseline:

```text
Pi extension
    |
    v
Product API gateway
    |
    +-- LibreChat web UI
    +-- OpenChat desktop client (optional)
    +-- OCR/document worker: MinerU or PaddleOCR-VL + Docling adapter
    +-- SeaweedFS: source files, page images, extracted figures
    +-- PostgreSQL: metadata, memory, jobs, audit, full-text search
    +-- Qdrant: text vectors, image vectors, multivectors, filtered retrieval
    +-- Valkey (optional): queue/cache for larger deployments
    +-- Client-owned LLM/embedding endpoints
```

The gateway is the product API. LibreChat, OpenChat, and the Pi extension must not access storage databases directly.

## Product goals

- Ingest PDFs, office documents, web captures, scans, images, and OCR output.
- Preserve original files, rendered pages, extracted figures, coordinates, and provenance.
- Search by text, metadata, page layout, tables, charts, and images.
- Provide chat, memory, agents, MCP tools, workflows, and citations.
- Run locally, on-premises, or in a customer-controlled cloud.
- Keep paid provider licenses and API accounts directly owned by the customer.
- Support commercial redistribution without making copyleft or enterprise licenses part of the base product.
- Provide GDPR- and EU AI Act-ready controls without claiming automatic legal compliance.

## Interface decision

### Primary web UI: LibreChat

LibreChat is the recommended main interface because its official project provides a ChatGPT-like UI, multi-provider support, custom OpenAI-compatible endpoints, agents, MCP, skills, subagents, file search, RAG features, and agent management APIs. The main repository is MIT licensed.

Use LibreChat as a client of the product gateway. Disable or limit its duplicate RAG path when the gateway is responsible for canonical ingestion, provenance, retention, tenant isolation, and audit.

Source: https://github.com/LibreChat-AI/LibreChat

### Optional desktop UI: OpenChat

The `alztrk/openchat` project is a local-first desktop application with provider support, local inference, workspace tools, MCP, memory, and a ChatGPT/Claude-like experience. Its repository is MIT licensed.

Use it as an optional desktop client connected to the same gateway. Do not make it the storage or orchestration backend.

Source: https://github.com/alztrk/openchat

### Document-first alternative: AnythingLLM

AnythingLLM is MIT licensed and provides document chat, RAG, agents, MCP, memory, multi-user support, branding, and an API. It is a strong alternative when shipping a document-centric product quickly.

Do not run AnythingLLM and LibreChat as equal primary applications in the first version. That would duplicate chat persistence, RAG, memory, permissions, ingestion, and model configuration.

Source: https://github.com/Mintplex-Labs/anything-llm

### Not in the base product

| Project | Reason |
|---|---|
| OpenHuman | GPL-3.0 and explicitly early beta. Useful as inspiration or a separately licensed client, not as a proprietary base component. |
| Open WebUI | Feature-rich, but the current Open WebUI License has branding restrictions for larger deployments. Avoid as the white-label base unless the customer obtains the appropriate permission or enterprise license directly. |
| LobeHub | Very polished agent experience, but its Community License requires a commercial license for commercial distribution of derivative work. Keep as a separately licensed customer option. |
| `openchatui/openchat` | The repository license was not confirmed during research. Do not distribute it commercially until the license is verified. |
| Chatbot UI | MIT and visually useful, but currently less complete for the required agent/RAG platform. It can be considered as a frontend starting point, not the initial platform choice. |
| Onyx Community Edition | MIT and strong for enterprise search, connectors, permissions, and agents, but the standard deployment is heavier and the Enterprise Edition contains proprietary features. Consider it for an enterprise edition rather than the base stack. |

## OCR and document extraction

### MinerU should be included as a pluggable parser

MinerU was not omitted because it is weak. It was omitted from the short UI/platform diagram because MinerU is an extraction engine, not a complete RAG, memory, storage, or interface stack.

MinerU remains a strong candidate for the worker layer because it supports multilingual document parsing, scanned PDFs, tables, formulas, images, reading order, Markdown, and structured outputs.

Recommended design:

```text
Parser adapter
    +-- MinerU: PDF/office/scanned-document path
    +-- PaddleOCR-VL: multilingual OCR, tables, formulas, charts, image path
    +-- Docling: canonical document model and export adapter
```

Do not run every parser on every document by default. Select one primary parser per document class and use the others for fallback or benchmark comparison.

### Licensing note for MinerU

The current MinerU repository uses the MinerU Open Source License with additional terms, not a simple Apache-2.0 license. Older versions had different licensing history. Pin the exact release and review the license of every downloaded model before redistribution.

If a customer requires a paid commercial license or a service-specific agreement, the customer should contract directly with the vendor. The product gateway should expose a provider/parser configuration rather than embedding the vendor license in the product owner’s name.

Source: https://github.com/opendatalab/MinerU
Source: https://github.com/opendatalab/MinerU/blob/master/LICENSE.md

### Other parser choices

| Component | Role | License posture |
|---|---|---|
| PaddleOCR-VL / PP-StructureV3 | Primary multilingual OCR and document parsing candidate; text, tables, formulas, charts, layout, Markdown/JSON | Apache-2.0 project and model references must still be audited per release. |
| Docling | Format conversion, structured document model, page images, OCR integrations, visual grounding | MIT code; individual models have separate notices. |
| Marker + Surya | Markdown/JSON conversion, layout, tables, images, multilingual OCR | Code is permissive, but model-weight licenses require separate review. |
| Chandra | Handwriting, forms, tables, complex layouts, multilingual OCR | Code is permissive; model and commercial self-hosting terms require review. |
| dots.mocr | Broad script coverage, charts/diagrams and structured parsing | Separate model license agreement; verify exact release and redistribution conditions. |
| olmOCR | Strong complex-PDF extraction and benchmark tooling | GPU-heavy and its public benchmark is primarily English; not the default multilingual choice. |

## Object storage alternatives

### Default: SeaweedFS

SeaweedFS is the recommended S3-compatible storage backend for the commercial base stack:

- Apache-2.0 license.
- Official Docker and Docker Compose examples.
- S3 gateway, single-node `weed mini`, and distributed topologies.
- Suitable for source documents, page renders, extracted images, artifacts, and backups.
- Can scale from a simple single-node deployment to replicated production layouts.

Source: https://github.com/seaweedfs/seaweedfs
Source: https://github.com/seaweedfs/seaweedfs/blob/master/docker/seaweedfs-compose.yml

### Alternatives

| Project | License | Recommendation |
|---|---|---|
| RustFS | Apache-2.0 | Promising MinIO-style alternative; newer operational history and only partial S3 compatibility. Validate recovery, upgrades, and client compatibility before critical production. |
| Garage | AGPLv3 | Good for lightweight geo-distributed storage, but not suitable as the proprietary base without handling copyleft obligations. |
| MinIO Community | AGPLv3/source-only direction | Do not bundle as the default commercial dependency. A customer may purchase AIStor directly, but that should be a customer-owned option. |
| Ceph RGW | Mixed LGPL/GPL/BSD licensing | Very mature and powerful, but operationally excessive for the initial product and requires a detailed license audit. |

## Search, memory, and metadata

### PostgreSQL

Use PostgreSQL for:

- users and tenants;
- document metadata;
- parser jobs and status;
- memories and memory provenance;
- source/citation records;
- audit events;
- retention and deletion state;
- full-text indexes;
- product configuration.

PostgreSQL uses a permissive PostgreSQL license and is suitable for commercial redistribution.

Source: https://www.postgresql.org/about/licence/

### Qdrant

Use Qdrant for:

- text embeddings;
- image/page embeddings;
- ColQwen2-style multivectors;
- named vectors for text and images;
- metadata filters;
- hybrid retrieval and late interaction.

Qdrant is Apache-2.0 licensed. It is preferable to forcing visual multivector retrieval into a relational database during the first implementation.

Source: https://qdrant.tech/documentation/manage-data/vectors/
Source: https://qdrant.tech/documentation/search/hybrid-queries/
Source: https://github.com/qdrant/qdrant

### Valkey

Use Valkey only when a separate queue/cache is needed for multiple workers or multiple API replicas. It is BSD-3-Clause licensed.

For the first single-node version, PostgreSQL-backed jobs may be simpler and avoid another service. Avoid making Redis the default because current Redis licensing is less permissive for redistribution and hosted-service scenarios.

Source: https://github.com/valkey-io/valkey
Source: https://redis.io/legal/licenses/

## Gateway contract

The gateway should expose both OpenAI-compatible endpoints and product-native endpoints:

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

The Pi extension, LibreChat, and OpenChat should use the gateway rather than embedding vendor-specific storage logic.

## Client-owned licenses and providers

The base product should support customer-owned configuration:

- `LLM_BASE_URL` and `LLM_API_KEY` belong to the customer.
- `EMBEDDING_BASE_URL` and `EMBEDDING_API_KEY` belong to the customer.
- Optional paid parser, storage, UI, or model licenses are purchased by the customer directly.
- The product stores credentials using a customer-controlled secret store where possible.
- The product does not promise that a provider will train or retain no data; that must be established in the customer’s provider contract and DPA.

The commercial package should contain a generated SBOM, license notices, attribution files, model cards, and a dependency review. Open-source code licenses do not automatically grant rights to third-party trademarks, datasets, fonts, hosted APIs, or model outputs.

## GDPR and EU AI Act readiness

No software stack is automatically GDPR-compliant or AI Act-compliant. Compliance depends on the product’s intended purpose, deployment, contracts, data, users, and operational controls.

The stack should provide:

- on-premises or customer-controlled deployment;
- tenant isolation and least-privilege access;
- TLS in transit and encryption at rest;
- customer-controlled encryption keys where possible;
- configurable retention and deletion;
- deletion of originals, OCR results, images, chunks, vectors, caches, and backups;
- export of user and tenant data;
- audit logging for ingestion, access, model calls, tool calls, and agent actions;
- source citations and page/region provenance;
- model/provider identification in responses and logs;
- human approval for consequential agent actions;
- tool allowlists, network egress controls, timeouts, and quotas;
- a clear AI-interaction notice in the UI;
- DPA/subprocessor configuration and data-residency documentation;
- DPIA support, incident reporting, and post-deployment monitoring.

The GDPR requires risk-based technical and organisational measures, controller/processor contracts, data minimisation, security, and DPIAs where processing is likely to create high risk. The AI Act applies according to the system’s intended purpose and risk category; an OCR/RAG system is not automatically high-risk, but the application can become high-risk in domains such as employment, credit, healthcare, education, or law enforcement.

Sources:

- https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679
- https://eur-lex.europa.eu/eli/reg/2024/1689
- https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en
- https://www.edpb.europa.eu/topics/accountability-and-compliance-tools/data-protection-impact-assessment_en
- https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act

## Deployment profiles

### Personal/local profile

- LibreChat or OpenChat.
- PostgreSQL.
- Qdrant.
- SeaweedFS single-node.
- One worker.
- Customer-owned local or remote model endpoint.

### Small production profile

- API gateway replicas.
- Separate OCR/indexing workers.
- PostgreSQL backups and point-in-time recovery.
- Qdrant persistent storage and snapshots.
- SeaweedFS replicated storage.
- Valkey for jobs/cache.
- Reverse proxy and TLS.
- Metrics, logs, audit export, and alerting.

### Enterprise profile

- Customer identity provider through OIDC/SAML.
- Tenant-aware storage and vector collections.
- Customer-managed keys.
- Dedicated workers and quotas.
- Optional Onyx CE or a separately licensed enterprise UI.
- Customer-owned commercial licenses for any proprietary service.

## Current recommendation

Start with:

```text
LibreChat
  + product API gateway
  + MinerU adapter
  + PaddleOCR-VL/Docling adapter
  + SeaweedFS
  + PostgreSQL
  + Qdrant
  + optional Valkey
```

Use MinerU as the primary PDF/document parser when its output is best for the corpus. Use PaddleOCR-VL or another adapter for image-heavy, multilingual, table, chart, or fallback cases. Keep the parser behind an adapter so the commercial product does not become coupled to one vendor or license.

## Research limitations

- No local benchmark was run.
- Performance numbers reported by projects are not directly comparable without the same corpus, hardware, durability settings, and workload.
- License summaries are engineering guidance, not legal advice.
- Every release, model weight, dependency, plugin, font, dataset, and hosted API must be reviewed before a commercial release.
- Exa was unavailable during the research session because its API key was not configured; official pages were fetched through web search and rich URL retrieval.

## Sources and retrieval metadata

Primary sources were consulted on 2026-10-28 using Pi `web_search` and `rich_fetch`. Repository and official documentation pages were treated as current at retrieval time; project claims about performance were marked as project claims and should be independently benchmarked before production adoption.

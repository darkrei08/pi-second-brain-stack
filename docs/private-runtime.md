# Private runtime boundary

This repository is public documentation and reference configuration. It is not the P.IVA archive.

## Data boundary

The private corpus lives outside this repository and is mounted read-only for ingestion. Runtime derivatives live in private volumes:

```text
P.IVA corpus (outside Git, read-only)
        |
        v
parser/indexer worker
        |
        +-- PostgreSQL metadata, full text, vectors and graph projections
        +-- private object storage for originals and derivatives
        +-- private logs and audit records
```

Never commit originals, OCR text, embeddings, graph exports, database dumps, secrets, provider keys, or model caches.

## Local-only defaults

- Bind the gateway and database to loopback unless remote access is deliberately designed.
- Do not expose PostgreSQL, pgvector, object storage, parser workers, or model-admin endpoints.
- Require gateway authentication even for one human operator.
- Keep outbound model and tool access disabled unless explicitly configured.
- Use TLS whenever a request leaves the host.

## Required lifecycle behavior

Ingestion must preserve hash, parser, model, page, region, and source provenance. Deletion must cover originals, OCR, page images, chunks, embeddings, graph rows, caches, logs according to policy, and backups according to the backup-retention procedure.

The runtime must support export, restore testing, audit events, timeouts, resource limits, archive traversal checks, and prompt-injection handling for retrieved content.

## Compliance posture

The stack is privacy-oriented and customer-controlled. It is not automatically GDPR-compliant or EU AI Act-compliant. The applicable role, purpose, retention, contracts, DPIA, subprocessors, and human oversight must be decided for the actual deployment.

## Public-repository check

Before every commit:

```bash
git status --short
git ls-files | grep -E '(^|/)(data|private|secrets|models|artifacts)(/|$)|\.(pdf|p7m|eml|docx?|xlsx?)$' && exit 1 || true
```

The check is a guardrail, not a substitute for reviewing the diff.

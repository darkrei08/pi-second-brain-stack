# Repository guidance

This repository is public documentation and reference configuration for a private local-first P.IVA RAG. Never commit the P.IVA corpus, OCR output, embeddings, graph exports, database dumps, credentials, or model caches.

Use the local Markdown tracker under `.scratch/` and follow `docs/agents/issue-tracker.md`. Read `docs/agents/domain.md` before domain work. Keep runtime services loopback-only by default.

## Agent skills

### Issue tracker

Issues and specs are local Markdown files under `.scratch/`, mirrored as GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical labels `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

# Feature: Open WebUI gateway glue

Implements `.scratch/openwebui-glue/issues/02-implement-openwebui-glue.md` under ratified interface decision V6.

## Specs

- S1. "The filter is an Open WebUI `inlet` Function that reads `body.folder_id` before the shell removes it."
- S2. "A scoped filter request forwards exactly `collection_ids: [folder_id]` to `POST /v1/retrieval/query` and uses the authenticated shell identity headers."
- S3. "The filter injects only bounded, explicitly untrusted retrieved evidence and fails closed on a scoped gateway error."
- S4. "The Pipe exposes one selectable Research model and calls existing `POST /v1/answers` with the optional collection scope."
- S5. "The modules do not accept or send `owner_id`, do not log corpus/question/provider data, and add no dependency."
- S6. "Tests prove the module contracts without an Open WebUI installation and state the missing end-to-end evidence."

## Tasks

| ID | Spec | Route | Commit |
|---|---|---|---|
| T1 | S1-S3, S5 | `openwebui/filter.py` and contract tests | `0c6ef08` |
| T2 | S4-S5, S6 | `openwebui/pipe.py` and contract tests | `0c6ef08` |
| T3 | all | docs, tracker closure, traceability | `0c6ef08` |

## Log

- L1 (2026-11-06): Inherited V6 and resolved the glue contract from the existing gateway routes. No Open WebUI installation is allowed or available.
- L2 (2026-11-06): Spec published at `.scratch/openwebui-glue/spec.md`; implementation ticket marked `ready-for-agent`.
- L3 (2026-11-06): Contract tests observed RED before the modules existed, then GREEN with 7 Python cases, Python syntax checks, and the Node wrapper. No Open WebUI instance was installed.
- L4 (2026-11-06): Implemented both Functions and documentation in `0c6ef08`. The sequential full Node suite passed; the default parallel suite remains unsuitable in this worktree because unrelated gateway tests race on a shared server.

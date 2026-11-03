# 10: Run the shell beside the gateway

Type: task
Status: resolved
Blocked by: none

## Question

`compose.yaml` starts PostgreSQL and nothing else. The shell the whole interface effort chose (Open WebUI, decision V1) is not in the stack, so nothing in this repository has ever run the two together: no filter loaded, no folder scope exercised end to end, no chat answered through the gateway from a browser. Ticket 07 cannot be answered and the operator cannot use the system until the shell starts beside the gateway with our filter and pipe mounted.

Decide and implement the smallest reproducible stack: the pinned shell image and why that version, how the filter and pipe files reach the container, how the shell authenticates to the gateway and to a model provider without a secret entering the repository, and what the operator types to start it. The licence position of the pinned version is recorded, not assumed.

## Acceptance criteria

- A shell service in `compose.yaml`, image pinned by tag, with the filter and pipe mounted read-only from `integrations/open-webui/`.
- Every secret comes from an untracked environment file; a check proves no key is in the repository and `.gitignore` covers the file.
- The shell serves its UI and the gateway answers a retrieval request that carries a folder scope, proven by a recorded command and its output.
- One page describing the start procedure, the two stores and their separate backup and deletion boundaries.
- The pinned version and its licence position, with the URL that was read.

## Resolution

Implemented in `compose.yaml` with `ghcr.io/open-webui/open-webui:v0.6.5`, PostgreSQL `pgvector/pg17`, and a Node 22 gateway. The shell mounts the filter and pipe source directories read-only and bootstraps them into Open WebUI's Function store without a browser step. Secrets are supplied by the untracked `shell-stack.env`; `.env.shell-stack.example` is committed and `.gitignore` covers the real file.

Recorded runtime evidence on 2026-11-03:

```text
$ curl --fail http://127.0.0.1:3300/health
{"status":true}
$ curl --fail http://127.0.0.1:18080/healthz
{"status":"ok"}
$ POST /v1/retrieval/query with collection_ids=[folder-alpha]
{"retrieval":{"mode":"lexical","model_id":null,"matches":1,"semantic_matches":0},"matches":[{"document_id":"urn:document:shell-stack-smoke","source_label":"shell-stack-smoke.txt","owner_id":"operator-owner","retention_state":"active"}]}
```

The full retrieval response contains the scoped segment and citation provenance; the smoke used `collection_ids: ["folder-alpha"]`. The gateway applied all five migrations (`{"applied":5,"total":5}` on the first start, then `{"applied":0,"total":5}`). Open WebUI's Function database contains active global `gateway-retrieval` and `gateway-research` records. The pinned version source and licence URL are recorded in `docs/shell-stack.md`.

Verification: `pnpm test` passed 169 tests with 32 expected skips; the Open WebUI suite passed 8/8 with `python3 -m unittest discover`; Python compilation, Compose config validation, and `git diff --check` passed. `pytest` was not available in the host Python environment. Browser login and a chat completion through the shell UI were not exercised; the health endpoint and direct scoped gateway retrieval were exercised instead.

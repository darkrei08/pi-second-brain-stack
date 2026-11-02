# Wayfinder: projects, chats and automatic organisation

## Destination

The corpus is usable by a person, not only by curl: inside the Open WebUI shell, create a project (a notebook) that holds documents, start chats inside it, rename and tag it, reorganise its documents, and get NotebookLM-like help with targeting and organisation, so that a question is answered against the right sources without the operator assembling the scope by hand.

## Notes

Interface decisions V1 to V8 in `.scratch/interface-stack/map.md` are settled and are not re-opened here. In one line: the shell owns conversations, pins and folders; our gateway owns documents, segments, collections and citations; a collection is the persisted retrieval scope; nothing is mirrored between the two stores.

Every ticket in this map starts from what the shell actually does, verified from its documentation or source, not from what a comparable product does. The comparison products (ChatGPT projects, Claude projects, Gemini, Perplexity spaces, NotebookLM notebooks) are reference for the *experience*, never evidence about the shell.

Known from the interface work, verified in source: `integrations/open-webui/filters/gateway_retrieval.py` and `integrations/open-webui/pipes/gateway_research.py` forward the shell folder id as a collection reference, and `src/postgres-store.js` has collection plumbing behind the storage seam while `src/gateway-server.js` exposes no route that creates a collection. A folder created in the shell therefore could not become a scope that retrieval accepted until ticket 01 bridged it. What is still missing end to end is the other half: nothing in the shell calls our ingest route, so an attachment uploaded in a project never reaches the corpus with that folder as its scope. That is ticket 09.

Budget is real: at the shipped default of `GATEWAY_MODEL_CONCURRENCY=4`, the measured `/v1/answers` error rate at concurrency 4 is 50 percent with `429 model_busy` (`.scratch/perf-baseline/report.md`). Any shell experience with parallel chats inherits that cliff, so sizing it is part of this map, not a later chore.

## Decisions so far

- Folder scope bridge: `POST /v1/documents/ingest` accepts `document.collections`, creates or reuses opaque owner-scoped collections and memberships on write, while unknown or empty retrieval scopes return zero matches without read creation; `.scratch/projects-and-chats/issues/01-folder-to-collection-scope.md`.
- Attachment bridge: use the explicit `ingest-directory` command outside the chat request because Open WebUI documents asynchronous extraction but not extraction completion before a Filter runs; `.scratch/projects-and-chats/issues/09-shell-attachment-ingest.md`.

## Not yet specified

- Whether a project is only a retrieval scope or also carries standing instructions to the answer model. This waits for the ticket on per-project chats, because the answer template is a gateway concern.
- Whether document order inside a project is meaningful to retrieval or is presentation only. This waits for the ticket on reorganising documents.
- Whether automatic organisation runs at ingest time, on demand, or both. This waits for the suggestion tickets, because the answer depends on what the shell can show and confirm.

## Out of scope

- Building a first-party web UI. V1 chose the shell, and this map does not reopen it.
- Mirroring shell conversation state into PostgreSQL. V7 forbids it.
- Multi-user permissions inside a project. The deployment is single-owner; anything else would be a new Wayfinder.

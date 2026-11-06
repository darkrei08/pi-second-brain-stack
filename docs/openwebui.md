# Open WebUI glue

The ratified V6 integration provides two administrator-installed Open WebUI Functions under `openwebui/`:

- `filter.py` is an `inlet` filter. When `body.folder_id` is present, it calls `POST /v1/retrieval/query` with `collection_ids: [folder_id]` and injects bounded, marked untrusted evidence into the turn. A scoped gateway failure stops the turn rather than widening retrieval.
- `pipe.py` exposes one selectable `Research` model. It calls `POST /v1/answers`, forwards an available folder as `collection_ids`, and renders the answer's citations and uncertainty.

Configure each Function's valves with the loopback gateway URL and bearer token. When shell-user mapping is enabled, the Functions forward `__user__.id` as `x-shell-user-id`; the gateway derives `owner_id` server-side. No `owner_id` is accepted from the shell.

The modules use only Python's standard library for transport and are contract-tested without Open WebUI installed. This repository has not proven import, folder propagation, streaming, or rendering inside a live Open WebUI instance.

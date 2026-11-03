# Shell stack

This local stack runs PostgreSQL, the Node 22 gateway, and Open WebUI together. It is loopback-only on the host: PostgreSQL is `127.0.0.1:55433`, the gateway is `127.0.0.1:18080`, and the shell is `127.0.0.1:3300`.

## Start

Create the untracked environment file from the committed example, then replace every placeholder. `ANSWER_API_KEY` is the key for the local OpenAI-compatible proxy; read it from the operator's local proxy configuration without printing it.

```bash
cp .env.shell-stack.example shell-stack.env
chmod 600 shell-stack.env
$EDITOR shell-stack.env

docker compose --env-file shell-stack.env up -d
docker compose --env-file shell-stack.env ps
```

The gateway container applies pending repository migrations before starting. Both the gateway and shell use Docker host networking so the gateway can enforce its loopback-only cleartext provider rule: it uses `deepseek-v4.1-flash` through the host proxy at `http://127.0.0.1:8317/v1`. Hybrid retrieval is deliberately not configured because this proxy does not provide `/v1/embeddings`.

The shell service sets `ENABLE_FOLDERS=true`, routes its OpenAI-compatible model connection to the gateway, and keeps direct provider connections disabled. The filter and pipe source directories are mounted read-only at `/app/backend/data/functions/filters` and `/app/backend/data/functions/pipes`. Open WebUI 0.6.5 stores Functions in its database rather than auto-loading Python files from a documented directory, so `integrations/open-webui/bootstrap.py` imports those mounted files into the shell's Function store at startup. The filter is global and active; the pipe is active and appears as a model after the shell starts.

## Runtime proof

After seeding the disposable `folder-alpha` collection and smoke document, this was the recorded loopback proof. The bearer value is read from `shell-stack.env` and is not printed.

```text
$ curl --fail http://127.0.0.1:3300/health
{"status":true}
$ curl --fail http://127.0.0.1:18080/healthz
{"status":"ok"}
$ POST /v1/retrieval/query with collection_ids=[folder-alpha]
{"retrieval":{"mode":"lexical","model_id":null,"matches":1,"semantic_matches":0},"matches":[{"document_id":"urn:document:shell-stack-smoke","source_label":"shell-stack-smoke.txt","owner_id":"operator-owner","retention_state":"active"}]}
```

The shell Function store read back active global `gateway-retrieval` and `gateway-research` records. The shell UI was health-checked; browser login and a browser chat were not needed for this bootstrap and retrieval proof.

The setup follows the shell documentation for Docker persistence, Functions and Filter `inlet` behavior, and folders:

- Docker quick start: <https://docs.openwebui.com/getting-started/quick-start/>
- Functions: <https://docs.openwebui.com/features/extensibility/plugin/functions/>
- Filter Functions: <https://docs.openwebui.com/features/extensibility/plugin/functions/filter/>
- Folders: <https://docs.openwebui.com/features/chat-conversations/chat-features/conversation-organization/>
- v0.6.5 Function loader source: <https://github.com/open-webui/open-webui/blob/v0.6.5/backend/open_webui/utils/plugin.py>
- v0.6.5 licence: the repository `LICENSE` is the BSD 3-Clause text, read at <https://github.com/open-webui/open-webui/blob/v0.6.5/LICENSE>

## Stores and deletion boundaries

There are two independent stores, with no mirrored record types:

- `postgres-data` is the gateway store for documents, segments, embeddings, collections, memberships, and citations. Back it up with `pg_dump` before migrations or destructive changes. Purge gateway documents through the gateway's owner-scoped lifecycle; deleting this volume deletes the corpus metadata and retrieval state.
- `open-webui-data` is the shell store for users, conversations, pins, folders, Function records, and shell settings. Back up this volume separately before shell upgrades. Deleting this volume deletes shell conversations and folder state but does not delete PostgreSQL documents.

`docker compose down` stops and removes containers and the network but preserves both volumes. To delete one store, remove only its named volume after checking `docker volume ls`; do not use `down -v` unless deleting both stores is intentional. The read-only plugin mounts are repository files and are not runtime corpus storage.

## Stop

```bash
docker compose --env-file shell-stack.env down
docker compose --env-file shell-stack.env ps
```

The second command should show no running services. Keep `shell-stack.env` local and never commit it.

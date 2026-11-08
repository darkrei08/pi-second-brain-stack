# 05: Point the reference stack at both published packages

Type: task
Status: resolved
Blocked by: none

## Question

`compose.yaml` mounts `.:/app` for the gateway and `integrations/open-webui/` for the plugins, so after both extractions the source exists twice: here, and in `pi-second-brain-backend` and `pi-second-brain-shell`. Make the reference stack consume the published packages by the mechanism an operator can actually use, then delete the local copies of `src/`, `test/`, `scripts/`, `docker/` and `integrations/` once nothing here reads them.

## Acceptance criteria

- Bringing the stack up from this repository loads the filter and the pipe from the package, verified by reading both records out of the shell's Function store.
- `src/`, `test/`, `scripts/`, `docker/` and `integrations/open-webui/` no longer exist here, and the tickets that recorded them point at the packages instead.
- `docs/shell-stack.md` and the README state the two checkout paths the stack expects and what to update when a package is versioned.
- The gateway still answers `/healthz` and a grounded `/v1/answers` from the stack, proven by recorded commands.
- The stack is torn down after the proof.

## Resolution

Compose now consumes the published repositories from operator-configured `BACKEND_REPO` and `SHELL_REPO` checkouts. The gateway mounts the backend checkout read-only, copies it into its disposable container working directory, installs the published package, applies its migrations, and starts it. The shell mounts `filters/`, `pipes/`, and `bootstrap.py` read-only from the published shell checkout and runs that checkout's bootstrap against the pinned Open WebUI Function store.

The local `src/`, `test/`, `scripts/`, `docker/`, and `integrations/open-webui/` trees were removed. The tracker and documentation now refer to `backend/` and `shell/` package paths where implementation files live, while local checks remain owned by this repository.

Live proof, using fresh clones at the recorded backend commit `90829792807c1e371122f7364eaa0c56111fc335` and shell commit `0b76a702e3d8289e2cea331f38a272438ce5d1a1`, used an untracked env file with the proxy key read from `/root/.pi/agent/cliproxyapi.json` without printing it:

```text
$ docker compose -p second-brain-stack-proof --env-file /tmp/second-brain-stack-proof.env config --quiet
$ docker compose -p second-brain-stack-proof --env-file /tmp/second-brain-stack-proof.env up -d
postgres ... healthy; gateway ... healthy; shell ... healthy
$ GET http://127.0.0.1:18080/healthz
{"status":"ok"}
$ GET http://127.0.0.1:3300/health
{"status":true}
$ Function store readback
[("gateway-retrieval", "Gateway retrieval", "filter", 1, 1), ("gateway-research", "Gateway research", "pipe", 1, 1)]
$ POST /v1/documents/ingest
{"document_id":"urn:document:reference-stack-proof","collections":["proof-collection"],"segments":1}
$ POST /v1/answers
{"answer":"The reference stack proof contract expires on 31 December 2026 [1].","citation_ref":"[doc:urn:document:reference-stack-proof#seg0]","uncertainty":"low"}
$ docker compose -p second-brain-stack-proof --env-file /tmp/second-brain-stack-proof.env down -v --remove-orphans
```

The full answer contained one grounded citation, no unresolved or stale citations, one lexical match, and no provider credential was printed.

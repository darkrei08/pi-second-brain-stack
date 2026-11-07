# Configuration reference

Every variable the stack reads, with its default and whether it must be supplied. Each compose project has its own committed environment file (`.env.example`, `.env.gateway.example`, `.env.tls.example`), and it holds no secret: the three secrets the stack requires are generated into `.secrets/compose.env` on first start. This file is the complete reference for the rest, including the security switches nobody should discover by accident.

The first `scripts/compose-up.sh` command creates `.secrets/compose.env` with fresh secrets. It never overwrites an existing environment file, publishes only a complete owner-readable file, and fails closed on insecure or partial state. Do not run `docker compose` directly: without the generated file the stack refuses to start on the missing secret.

## Database

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `POSTGRES_DB` | none | yes | Database name created by the PostgreSQL image. |
| `POSTGRES_USER` | none | yes | Database role the gateway connects as. |
| `POSTGRES_PASSWORD` | none | yes | Secret, generated on first start. Never set it in a committed file. |
| `POSTGRES_HOST_PORT` | `55432` | no | Loopback host port for PostgreSQL. |
| `DATABASE_URL` | composed | no | Built by the compose file from the four values above. Set it directly only when running the gateway outside compose. |

On first start `scripts/compose-up.sh` copies `POSTGRES_HOST_PORT`,
`GATEWAY_HOST_PORT` and `WEBUI_HOST_PORT` into `.secrets/compose.env`, taking each
from the environment and falling back to the default above. That file is loaded
last, so a pinned value wins over this one: to change a host port after the first
start, edit `.secrets/compose.env` directly. The seed then reports
`compose environment already exists; unchanged` and will not rewrite it.

## Gateway identity

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `GATEWAY_TOKEN` | none | yes, unless `GATEWAY_PRINCIPALS` | Secret, generated on first start. The single bearer token the shell presents. |
| `GATEWAY_OWNER_ID` | none | yes, unless `GATEWAY_PRINCIPALS` | The opaque owner every request is attributed to. |
| `GATEWAY_SHELL_USERS` | `{}` | no | JSON object mapping a shell user id to an owner. |
| `GATEWAY_SHELL_MAPPING_TRUSTED` | `false` | no | Security switch. Left false, every entry in `GATEWAY_SHELL_USERS` must resolve to `GATEWAY_OWNER_ID`, so a caller holding the gateway token cannot name a different owner. Set true only when the shell itself is the trusted credential holder and is allowed to assert any mapped owner. |
| `GATEWAY_PRINCIPALS` | unset | no | JSON array of `{ "token": "...", "owner_id": "..." }`, each token at least 32 characters. Binds identity to the credential instead of trusting a caller header. Cannot be combined with `GATEWAY_TOKEN`, `GATEWAY_OWNER_ID`, or `GATEWAY_SHELL_USERS`. |

## Gateway limits

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `GATEWAY_HOST_PORT` | `8080` | no | Loopback host port for the gateway. |
| `GATEWAY_REQUESTS_PER_MINUTE` | `60` | no | Per-owner request quota on authenticated data routes. |
| `GATEWAY_MAX_CONCURRENT_REQUESTS` | `8` | no | Per-owner concurrent request cap. |
| `GATEWAY_MODEL_CONCURRENCY` | `3` | no | Process-wide concurrent model calls, across all owners. Distinct from the per-owner quota: this one protects the provider. |
| `GATEWAY_MODEL_REQUESTS_PER_MINUTE` | `60` | no | Process-wide model call rate. |

The quota and concurrency limits are process-local. They are not distributed enforcement across gateway replicas.

## Model and embedding providers

Both providers are provider-neutral and configured by URL. A missing endpoint is a degraded capability reported by the readiness probe, not a startup failure.

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `ANSWER_BASE_URL` | unset | no | OpenAI-compatible base URL for grounded answers. Unset disables answers with `503`. |
| `ANSWER_MODEL` | unset | no | Model name sent to that endpoint. |
| `ANSWER_API_KEY` | unset | no | Secret. Blank is correct for a local provider that authenticates nothing; CLIProxyAPI requires a bearer key. |
| `ANSWER_ALLOWED_HOSTS` | loopback only | no | Comma-separated hostnames the answer endpoint may reach. Any other host is refused before a connection is opened. |
| `EMBEDDING_BASE_URL` | unset | no | OpenAI-compatible base URL for embeddings. Unset forces lexical retrieval. |
| `EMBEDDING_API_KEY` | unset | no | Secret. Blank is correct for a local provider. |
| `EMBEDDING_ALLOWED_HOSTS` | loopback only | no | Comma-separated hostnames the embedding endpoint may reach, refused before connecting otherwise. |

The allowlists are the SSRF boundary. Loopback is always permitted so a local runtime needs no configuration. Anything off-host must be named explicitly.

Cleartext `http://` is refused unless the host is loopback or one of the Docker host-gateway aliases, `host.docker.internal` and `gateway.docker.internal`. Those two are aliases, not allowlist entries: the host still has to appear in `ANSWER_ALLOWED_HOSTS`, and every other host name still requires `https`, allowlisted or not. The gateway service declares `extra_hosts: host.docker.internal:host-gateway`, because `127.0.0.1` inside the container is the container itself. That alias is how the gateway reaches a proxy on the host, for example CLIProxyAPI on `127.0.0.1:8317`:

```bash
ANSWER_BASE_URL=http://host.docker.internal:8317/v1
ANSWER_ALLOWED_HOSTS=host.docker.internal
```

Without `extra_hosts` the name does not resolve and the model call fails with `Network is unreachable`, which is a different failure from a refused host: the allowlist check happens before any connection is opened.

## Parser engine

Document parsing is a separate capability with its own endpoint. Unset means the parse route answers `503 parser_unavailable`; the rest of the stack is unaffected.

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `PARSER_ENGINE_BASE_URL` | unset | no | Base URL of a Docling-compatible engine. Unset disables parsing with `503`. |
| `PARSER_ENGINE_ALLOWED_HOSTS` | loopback only | no | Comma-separated hostnames the engine may reach, refused before connecting otherwise. |
| `PARSER_ENGINE_TIMEOUT_MS` | `60000` | no | Per-request engine timeout, `1` to `600000`. |

In the default topology the engine is the `parser-engine` service: a pinned `docling-serve-cpu` image that shares the gateway's network namespace, so it publishes no host port and holds no credentials for any other service. It is reachable only at `http://127.0.0.1:5001` from inside the gateway, which is why the allowlist needs no configuration here; the variable exists for deployments that place the engine elsewhere.

Three operational facts follow from that topology. The engine cannot be a `depends_on` of the gateway without creating a cycle, so a parse request that arrives before the engine is ready returns `502 parser_failed` rather than waiting. The pinned image bakes its model weights into `/opt/app-root/src/.cache/docling/models` (`DOCLING_SERVE_ARTIFACTS_PATH`, 871 MB in `docling-serve-cpu:v1.38.2`); its own startup log reports `artifacts_path is set to a valid directory. No model weights will be downloaded at runtime.`, so neither the first parse nor a recreated container downloads anything. A cold start to healthy took about 30 s with the image already local. And the gateway's own `server.requestTimeout` caps a slow parse below what `PARSER_ENGINE_TIMEOUT_MS` allows.

The route accepts `application/pdf`, `image/png`, `image/jpeg`, `image/tiff`, and `image/webp`, and is bounded by the same JSON body limit as every other route, so the encoded document is smaller than the raw limit. A successful response carries `segments` as a COUNT, not an array of segments: `{"document_id":"urn:document:<sha256>","collections":[],"segments":1}`. The segments themselves are read back through `/v1/retrieval/query`. A failed parse stores nothing: the engine answer is normalized and segmented before a single write.

## Open WebUI

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `WEBUI_HOST_PORT` | `3300` | no | Loopback host port for the shell. |
| `WEBUI_SECRET_KEY` | none | yes | Secret, generated on first start. Keeps Open WebUI sessions stable across restarts. |
| `GATEWAY_URL` | `http://gateway:8080` | no | Gateway base URL written into the plugin valves at bootstrap. Inside compose this is the service name, not loopback; the plugins accept cleartext only for loopback, `localhost`, or a single-label service name, and require HTTPS for any dotted name or non-loopback IP. |

## TLS

| Variable | Default | Required | Purpose |
| --- | --- | --- | --- |
| `GATEWAY_TLS_DIR` | unset | no | Host directory containing `fullchain.pem` and `privkey.pem`, used only with the TLS override file. |

TLS is off by default. Both certificate files must be present when the override is used; one without the other fails closed at startup. The gateway then listens over HTTPS only, so its compose healthcheck probes `https://localhost:8080/healthz` with `NODE_EXTRA_CA_CERTS` set to the mounted `fullchain.pem`; certificate verification stays enabled and the served certificate must be valid for `localhost` (a self-signed certificate needs that name in its SAN). Without TLS the same healthcheck probes `http://127.0.0.1:8080/healthz`. The gateway runs as uid 1000 (`node`), so the mounted private key must be readable by that user or the process exits at startup.

## Environment files

One committed environment file per compose project, plus one generated file that only holds secrets:

| File | Committed | Contents |
| --- | --- | --- |
| `.env.example` | yes | every shared variable with its default; the default compose project |
| `.env.gateway.example` | yes | `COMPOSE_FILE` for the gateway compatibility overlay, nothing else |
| `.env.tls.example` | yes | `COMPOSE_FILE` for the TLS overlay and `GATEWAY_TLS_DIR`, nothing else |
| `.secrets/compose.env` | no | only `POSTGRES_PASSWORD`, `GATEWAY_TOKEN`, `WEBUI_SECRET_KEY` |

`scripts/compose-up.sh` reads them in that order and adds the generated file last, so a committed file can never blank a generated secret. The profile files carry only what the profile adds, so no variable is defined twice with two values. It never reads `.env`; it prints a note if one exists, because an earlier revision told operators to create one there. Move anything you still need into `.env.example` or export it.

The generated file holds only the three secrets because anything else in it would shadow `.env.example`. To change a shared value, edit the template or export the variable in the shell; the shell wins over every env file:

```bash
GATEWAY_OWNER_ID=personal ./scripts/compose-up.sh default up -d
```

## Reading order for a first start

1. Run `./scripts/compose-up.sh default up -d` from the repository root. It seeds `.secrets/compose.env` automatically and then runs `docker compose up -d`.
2. Run `./scripts/compose-up.sh default ps` until the four long-running services report `healthy`. The one-shot `open-webui-bootstrap` service exits 0 after it imports the plugins, so `docker compose up --wait` reports its exit as a failure even when everything else is healthy; `ps` is the reliable signal.
3. Leave the provider URLs unset for a first start; the stack comes up and reports the missing capability through the readiness probe.
4. Set `ANSWER_BASE_URL` and `EMBEDDING_BASE_URL` in the shell once the stack is healthy, then rerun the command.
5. Parsing needs no variable: the default topology already points the gateway at the pinned engine.

## Secret handling

The generated directory is mode `0700` and `.secrets/compose.env` mode `0600`, created under `umask 077` and published atomically: the seed writes a temporary file, syncs it, links it into place and syncs the directory, so a crash leaves either the old state or the complete new file, never a half-written one. `.secrets/` is git-ignored. The committed templates contain no secret at all, so their own `0644` mode discloses nothing.

Check before exposing the stack:

```bash
stat -c '%a %n' .secrets .secrets/compose.env   # expect 700 and 600
```

The seed refuses to overwrite an existing file, refuses a symlink, a non-regular file, a group- or other-accessible file, an incomplete existing file, and a second concurrent starter. It never prints a secret value and removes its temporary file on any error. A second invocation prints `compose environment already exists; unchanged` and leaves the bytes identical, which is what keeps the existing database volume openable across restarts. `npm run test:seed` proves those properties.

Do not paste the output of `docker compose config` anywhere: it renders the secrets in clear text.

One residual exposure is not fixed here. The gateway build context is the repository root and the repository has no `.dockerignore`, so `docker compose build` sends `.secrets/compose.env` to the builder. It never reaches an image layer, because the Dockerfile copies only `package.json`, `package-lock.json` and `src`, and with a local daemon the transfer stays on this machine. Adding a `.dockerignore` that excludes `.secrets/`, `.env*` and `data/` is the follow-up for anyone building on a remote builder.

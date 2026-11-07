# Stack stabilization

Reconcile the uncommitted working tree of `worktree/master` into reviewable work
units, then fix the Open WebUI pipe defect and prove the compose stack starts.
Nothing here is pushed: commit, push and PR remain operator decisions.

## Specs

S1. Reconcile the uncommitted state into atomic, reviewable, verifiable work
units before any further modification.
S2. Fix `openwebui/pipes/gateway_research.py:36-48`: the guard resolves the
gateway host with `ip_address(host)`, which raises `ValueError` for the compose
service name `gateway`, so every turn fails with `gateway URL must be an HTTPS
URL or loopback HTTP URL`. Internal HTTP calls must work.
S3. Validate the full compose stack: PostgreSQL with pgvector, the gateway and
Open WebUI start together through `compose.yaml` and `scripts/compose-up.sh`.

## Slices

Base: `099974c`. 27 commits, working tree clean at the tip.

| # | Commit | Unit |
| --- | --- | --- |
| 1 | `9489ccb` | chore(compose): seed the secret store on first start |
| 2 | `5becdef` | docs(config): environment and first-start flow |
| 3 | `d8de18c` | chore(scripts): package boundaries and compose smoke |
| 4 | `2a11293` | feat(storage): forward-only schema migrations |
| 5 | `2785ea5` | feat(graph): project entities and relationships |
| 6 | `88e86c6` | feat(storage): persist and retrieve over the graph-aware contract |
| 7 | `af1732f` | refactor(gateway): extract request, response, audit modules |
| 8 | `c991c60` | feat(gateway): authenticate through one boundary |
| 9 | `685abb0` | feat(gateway): serve each route from its own module |
| 10 | `c78caa9` | feat(gateway): load the deployment configuration strictly |
| 11 | `df49979` | feat(chat): stream provider deltas and report usage |
| 12 | `7fe426f` | feat(answers): answer only from numbered evidence |
| 13 | `af207d4` | feat(chat): map chat completions onto grounded answers |
| 14 | `9db1d17` | feat(embeddings): bound the provider boundary |
| 15 | `6c4d971` | feat(parser): drive a remote engine over HTTP |
| 16 | `7e53dd1` | feat(parser): normalize engine geometry into segments |
| 17 | `b4e8c54` | feat(ingest): post a directory through the gateway |
| 18 | `459f71f` | feat(gateway): drain the pool on shutdown |
| 19 | `3ecadf8` | feat(index): export the assembled surface |
| 20 | `35fe77d` | refactor(gateway): compose the server from modules and routes |
| 21 | `186f902` | test(parser): engine and upload route through the gateway |
| 22 | `8955695` | test(answers): research over planned follow-up evidence |
| 23 | `9a93196` | test(storage): assembled store and graph projection |
| 24 | `ff0991b` | feat(openwebui): filter and pipe packages |
| 25 | `8ca77a5` | feat(bench): ANN recall against exact cosine search |
| 26 | `cc7a24f` | docs(odd): startable-stack tickets and capability audit |
| 27 | `c06add0` | fix(openwebui): reach the gateway by its compose service name |

## Verification

Baseline before slicing: `npm test` = 183 subtests, 0 failures.

Each of the 26 stabilization commits was then checked alone in a detached
scratch worktree containing only committed files. 14 pass standalone. The other
12 (`c991c60` through `3ecadf8`) fail 1 to 3 subtests for one reason: the gateway
re-wiring changes the contract that `test/gateway-server.test.js`,
`test/chat-completions-gateway.test.js` and `test/integration/gateway.test.js`
pin, and their final versions land with the slice that completes the re-wiring
(`35fe77d`). Those states are green only cumulatively. This is recorded instead
of flattened into one oversized commit.

At the tip: `npm test` = 183 ok, 0 failures. `openwebui/tests` = 11 ok
(9 before S2, 2 added by S2).

S2 evidence, red then green: with the source change reverted, both new tests
fail with `gateway URL must be an HTTPS URL or loopback HTTP URL`; with it,
11/11 pass. A dotted name (`gateway.example`) and a non-loopback IP
(`10.0.0.5`) are still refused over cleartext.

S3 evidence, isolated host ports because `cliproxy-stack-cpa-usage-keeper-1`
holds 8080 and `second-brain-stack-postgres-1` holds 55432:

| Criterion | Result | Proving output |
| --- | --- | --- |
| first start seeds and brings up | PASS | project `worktree-master`; gateway, open-webui, parser-engine, postgres all `Up (healthy)` |
| secret store permissions | PASS | `700 .secrets`, `600 .secrets/compose.env`, `find .secrets -perm /077` empty |
| templates carry no secrets | PASS | `POSTGRES_PASSWORD=`, `GATEWAY_TOKEN=`, `WEBUI_SECRET_KEY=` |
| seed is idempotent | PASS | `compose environment already exists; unchanged`, bytes identical |
| password survives full recreate | PASS | `second_brain\|second_brain` before and after `down` + `up -d` |
| gateway liveness and readiness | PASS | `/healthz` `{"status":"ok"}` 200, `/readyz` `{"status":"ready"}` 200 |
| Open WebUI answers | PASS | `/health` `{"status":true}` 200 |

Cleanup: containers, network and three volumes of the verification project
removed; the two pre-existing services untouched. `open-webui-bootstrap` exits 0
by design, so `compose-up.sh ... ps` is the health signal, not `up --wait`.

## Log

L1. Operator handoff, verbatim: "completiamo e procediamo", on a report whose
open items were a blocked media-repo commit and Podman/SELinux validation.

L2. Operator decision, verbatim: "La scelta migliore e ottimale è procedere
adottando worktree-master e stabilizzandolo a fette prima di qualunque nuova
modifica, invece di lavorare qui in worktree-open."

L3. Discovery that forced L2: `worktree/open` and the main checkout sit at
`17df64d`, before the module split, and hold none of `openwebui/`, `scripts/`,
`src/gateway/`. The described state exists only in `worktree/master` at
`099974c`, with 94 uncommitted paths and a clean index.

L4. Safety snapshot before touching the index: tracked patch plus a tar of the
61 untracked files. Every one of the 94 paths was then assigned to exactly one
slice; `git status` is empty at the tip.

L5. S2 scope decision: cleartext stays bound to the deployment. Loopback,
`localhost` and single-label service names are accepted; a dotted name or a
non-loopback IP still requires HTTPS. The guard keeps refusing a remote
cleartext endpoint, which is the reason it exists.

L6. Still open, unchanged by this work: no answer provider is configured, so
`/v1/answers` returns 503, and `.dockerignore` is still absent. Superseded by
L7 and L8 below.

## Second increment

L7. `.dockerignore` added (`996d416`). Deny-by-default: `*`, then `!package.json`,
`!package-lock.json`, `!src/`, which is exactly what the Dockerfile copies. Proven
by a real build: a `COPY . /ctx` probe transferred 26.9 kB containing only those
paths, with `.secrets/`, `.git/`, `.env*`, `canary.txt` and `node_modules/` absent,
and the real Dockerfile still built and started.

L8. Host ports pinned in the generated environment (`0fb9d0b`). The seed now also
records `POSTGRES_HOST_PORT`, `GATEWAY_HOST_PORT` and `WEBUI_HOST_PORT` from the
environment, falling back to the template default. `npm run test:seed` = 5 pass.
Resolved on this machine to 65432 / 18080 / 13300, because 8080 is held by
`cliproxy-stack-cpa-usage-keeper-1` and 55432 by `second-brain-stack-postgres-1`.

L9. Answer provider mapped to the host proxy (`a18c58b`). `extra_hosts
host.docker.internal:host-gateway` on the gateway, and the cleartext guard widened
to exactly loopback plus the two host-gateway aliases in `chat-client.js`,
`embedding-client.js` and `parser-engine-client.js`. An allowlisted host still does
not become acceptable over cleartext, and an alias still has to be allowlisted.

L10. Embeddings are impossible against this proxy and were deliberately not
configured. `POST /v1/embeddings` answers 404 with a valid bearer key across three
model ids, while `/v1/models` answers 200, so the route is absent. `EMBEDDING_*` is
set nowhere and retrieval keeps degrading to lexical, which is already tested.

Independent verification: 8 of 9 checks HOLDS; 2 recorded as WEAK. The WEAK on the
seed is real and now documented: a pinned port wins over `.env.example` after the
first start, so changing a host port later means editing `.secrets/compose.env`.
The other WEAK is pre-existing duplication of the guard in three clients, not
introduced here.

Runtime proof, after rebuilding the image (the first `up -d` reused a stale image
and failed startup with the old `must use https unless the host is loopback`
message): the stack is healthy on the pinned ports, `/healthz` and `/readyz` answer
200, and from inside the gateway container the configured provider answers
`GET /v1/models` 200 with the model present and `POST /v1/chat/completions` 200.

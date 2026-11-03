# Repo split and work groups

Type: map
Status: open

## Destination

Three repositories with one source of truth each: a backend that owns the gateway, identity and the corpus, a shell repository that owns our plugin package for a pinned third-party shell, and this one that keeps the documentation, the reference stack and the tracker. Alongside the split, the operator's program: a first-run administrator, an admin who creates or approves registrations, work groups with members, documents scoped to a group and to a project inside it, and chats started inside a group.

## Notes

Four analyses produced this map: the backend extraction inventory, the shell extraction inventory, the contract and boundaries document (`.scratch/repo-split/03-contract-and-boundaries.md`), and the skills matrix below. Two architecture sessions answered without writing their files, so their evidence is distilled here rather than linked. Every claim below carries the citation the analysis gave; none of it was re-verified by running code.

Settled before this map and not reopened: the primary surface is Open WebUI ([interface stack](../interface-stack/map.md), V1), the two new names are `darkrei08/pi-second-brain-backend` and `darkrei08/pi-second-brain-shell`, and `gh` is authenticated as `darkrei08` with `repo` and `workflow` scopes.

## Decisions so far

Empty. The first two tickets are the frontier.

## Blockers the split must resolve first

- The Node test suite reads the tracker. `test/traceability.test.js:5-6,10-25,37-45` resolves `odd/` and `.scratch/` from the repository root, so a backend repository that moves `test/` without a decision fails its own suite on checkout.
- `compose.yaml:13,20-44,71-73` mounts gateway, database and shell paths in one file, so moving either side's directories breaks the reference stack until Compose is split or pinned to a path contract.
- `src/index.js:9` and `src/answer-question.js:1` form an import cycle. The cheapest moment to break it is before the move, not after.
- `shell-stack.env:3-11` holds local credentials and is untracked via `.gitignore:6`. No repository may receive it, and the shipped example keeps placeholders only (`.env.shell-stack.example:1-11`).
- The Python plugin suite is not in CI: `.github/workflows/ci.yml:7-49` runs Node and PostgreSQL jobs only, while `python3 -m unittest discover -s integrations/open-webui/tests` passes 17 tests by hand. The shell repository has to carry that job itself.
- `integrations/open-webui/tests/test_plugins.py:9,20-29` locates the repository root through `.parents[3]` and hard-codes plugin paths, so extraction breaks it unless those lookups change with the move.
- `README.md:29,39,54-60,222,273` recommends LibreChat as the primary web UI while the settled decision and the running stack are Open WebUI. The public front door contradicts the decision.

## What each repository owns

- **Backend** (`pi-second-brain-backend`): `src/`, `test/` except the tracker test, `scripts/`, `docker/postgres/init/`, `package.json`, the lockfile, the backend ODD documents and its own CI. It owns the HTTP contract, the corpus, migrations, citations and identity resolution.
- **Shell** (`pi-second-brain-shell`): `integrations/open-webui/` in full, the bootstrap, the plugin tests, a browser-free Python CI job, and the release record of the pinned image with its licence position (BSD-3 for v0.6.5, read at `https://github.com/open-webui/open-webui/blob/v0.6.5/LICENSE`; later tags carry a different position and must be re-read before any upgrade). It is a plugin package for a pinned third-party shell, not a fork and not a first-party UI.
- **This repository**: the documentation, `compose.yaml` as the reference stack, the secret-free example environment file, the tracker, and the contract document both other repositories consume.

## Skills matrix: what runs for what

The repository is 39 JavaScript files, 5 Python files and zero TypeScript files, so the TypeScript-first skills are dead weight here and must not be loaded: `typescript-advanced` (its own SKILL.md excludes JavaScript), `migrate-to-shoehorn` (TypeScript test assertions), `scaffold-exercises` (course scaffolding). `prototype` and `grilling` stay available as thinking tools, never as defaults.

| Request kind | Workflow | Roles | Skills | Proof |
|---|---|---|---|---|
| Repository split and migration | one unit per repository, isolated worktree | `architect`, `developer` | engineering-excellence | both new repositories clone, install and pass their own suites |
| Backend feature | single unit, test-first | `developer` | engineering-excellence, tdd | suite green with a real database, behaviour observed |
| Schema change | single unit, migration numbered after the last file | `developer` | engineering-excellence | migration forward-only, restore path exercised |
| Shell plugin work | single unit | `developer` | engineering-excellence | plugin unittest suite plus a stack smoke |
| Accessibility verification | one bounded unit with a browser driver | evidence executed by `developer` | engineering-excellence | keyboard-only sweep recorded per step with WCAG criteria |
| End-to-end proof | one unit against the live stack | `developer` | container-test-matrix | recorded commands and outputs, stack torn down |
| Ticket creation and triage | single unit | issue-ops practice | issue-ops | ticket has acceptance criteria and a verification command |
| Research | one bounded unit | `researcher` | research, reusable-data-search | sources read and cited, separated from assumption |
| Risky review | only for a named high-risk item | `reviewer` | code-review | verdict per finding with file evidence |

`workflow_catalog` must be queried before any workflow or model alias is assigned; the role settings alone do not prove what the catalog exposes.

## Fog of war

Whether identity belongs to the shell, to the backend, or to a token issued per user. The gap analysis that answers it was still running when this map was written, and both the registration tickets and the group tickets change shape depending on the answer.

## Out of scope

A first-party UI of our own, vendoring Open WebUI source, and migrating the P.IVA corpus or any embedding, OCR output or database dump into a repository.

# Three repositories, one product

The product is split across three repositories with one source of truth each. This page states what each owns, where each lives on a development host, and how work flows from an idea to a merged change.

## The repositories

| Repository | Role | Owns |
|---|---|---|
| [second-brain-stack](https://github.com/darkrei08/pi-second-brain-stack) | Analysis and documentation | This repository: the public documentation, the reference `compose.yaml`, the tracker under `.scratch/`, the ODD feature documents, and the contract both other repositories consume. It ships no gateway or plugin source once [repo-split ticket 05](.scratch/repo-split/issues/05-reference-stack-consumes-the-package.md) lands. |
| [pi-second-brain-backend](https://github.com/darkrei08/pi-second-brain-backend) | Backend | The Node 22 gateway, its tests, the migrations, the HTTP contract, the corpus, citations and identity resolution. |
| [pi-second-brain-shell](https://github.com/darkrei08/pi-second-brain-shell) | Front end | Our Open WebUI integration: the retrieval filter, the research pipe, the bootstrap that imports them into the shell's Function store, and the plugin tests. The shell itself is a pinned third-party image, not our code. |

Local development copies live side by side, so `compose.yaml` can reference them:

```
/root/git/personale/pi.dev/
├── second-brain-stack/      analysis, documentation, reference stack, tracker
├── second-brain-backend/    gateway
└── second-brain-shell/      plugin package
```

## What the split changed

The gateway and the plugins used to live inside this repository, so a change to retrieval touched a documentation diff. Now a change lands where it belongs, and this repository states the contract instead of holding the code. The cost is honest and worth naming: three checkouts to keep current, three CI runs, and a contract that has to be maintained deliberately rather than assumed.

## How work flows

The flow is the one this project already ran, written down so it stops depending on one session's memory.

1. **Wayfinder** (`/wayfinder`) charts work too large for one session as a map plus decision tickets on the tracker. A map states its destination, its decisions so far, and the fog it cannot yet ticket. Decisions, not deliverables.
2. **To spec** (`/to-spec`) synthesizes the conversation and the codebase into one spec on the tracker, then marks it `ready-for-agent`. It proposes the seams at which the work will be tested, preferring existing seams and the highest one available, and it names those seams before any code exists.
3. **Implement** (`/implement`) takes the spec or the ticket, names its title, drives test-first at the agreed seams, runs the suite, and reviews the result with `/code-review` before committing.
4. **Review and delivery** are separate human decisions: a commit is not a merge, and a review outcome never authorizes delivery.

Verification per repository, because a green suite in one proves nothing about another:

| Repository | Command | What it proves |
|---|---|---|
| stack | the tracker check | every resolved ticket has a matrix row and every row points at something real |
| backend | `npm test`, plus the integration suite with `TEST_DATABASE_URL` | the gateway's behaviour, including retrieval against real PostgreSQL |
| shell | `python3 -m unittest discover -s tests` | the plugins decide correctly without a browser or a stack |

## Where each kind of work goes

| Work | Repository | Proof it is done |
|---|---|---|
| Retrieval, citations, scoping, identity resolution | backend | suite plus integration against a disposable database |
| Filter and pipe behaviour, what the person sees in the shell | shell | plugin suite plus a stack smoke |
| Contract, ownership, tracker, operator procedure | stack | tracker check plus a recorded end-to-end run |
| Accessibility of the surface | shell, with the ticket recorded here | keyboard-only sweep against the pinned image |

## Rules the split does not relax

- No secret, corpus, OCR output, embedding, database dump or model cache enters any of the three.
- The gateway never trusts an owner named by a caller; it derives it.
- The shell owns users, roles and groups; the backend owns the corpus. Neither keeps a shadow copy of the other's state.
- A ticket, a branch and a commit say which repository they belong to, because "the tests pass" is otherwise ambiguous.

# 04: A desktop application, and what it stands on

Type: decision
Status: open
Blocked by: Ticket 03. The shell question is meaningless until a first-party surface is chosen.

## Question

If the surface is first-party, is it a desktop application, and what does it stand on? Does it fork an existing application, vendor parts of one, or wrap this project's own HTTP gateway in a thin shell?

## Why this is asked now

On 2026-11-08 the operator asked what software `llm_wiki` uses, whether its desktop variant can be reproduced, and whether reverse engineering would be needed. Three upstreams were read at source. The answer changes the shape of the question.

| Upstream | What it actually is | Licence |
|---|---|---|
| `nashsu/llm_wiki` | a real Tauri 2 desktop application: React 19 + Tailwind 4 + zustand frontend, 35,422 lines of Rust behind it, LanceDB embedded, conversations and projects first-class, plus a local HTTP API on port 19828 and a bundled MCP server | GPLv3 |
| `lucasastorian/llmwiki` | FastAPI + Next.js server-rendered web app, SQLite local or Postgres hosted, no desktop target, PWA only, lexical retrieval with no vector store | Apache-2.0 |
| `huytieu/COG-second-brain` | not software: a Markdown vault plus 43 agent prompt skills, no UI, no server, no build system | MIT |

Full evidence in `../research-desktop-shells.md`.

Three facts from that reading decide this ticket:

1. `nashsu/llm_wiki` proves the pattern works and is cheap to copy conceptually. The shell is 146 lines of JSON across `tauri.conf.json` and three platform overrides, plus a CI matrix, a tray, autostart, a panic guard and a resource-directory convention. That is a packaging convention, not a codebase to inherit.
2. Its product is not separable. The Rust holds the agent, ingest, parsing, the vector store, the filesystem and the API server, and the frontend has no data layer of its own: every read goes through `invoke` or the loopback API. Forking it means owning that Rust.
3. This project is better placed than that fork would suggest, because the gateway is already the application boundary. `POST /v1/answers` returns `{answer, citations[], unresolved_citations[], stale_citations[], retrieval, uncertainty}` with text, label, confidence, page, bounding box and character span per citation, and `collection_ids` is already accepted per request. A shell that speaks HTTP needs no Rust at all.

No reverse engineering is required for any of the three: all publish source, so reading the code is the legitimate path, and that is what the evidence above is. The access question is separate from the licence question, and the licence question is real for the GPLv3 one: a modified `nashsu/llm_wiki` conveyed as a binary must ship its corresponding source, while a private local modification carries no such obligation because GPLv3 has no network copyleft clause.

## Scope

- Evaluate three shapes against the surface chosen in ticket 03: fork `nashsu/llm_wiki`; wrap this project's gateway in a Tauri shell with a first-party frontend; stay in the browser as a PWA over the gateway.
- For the Tauri shape, state what the shell must supervise, because a desktop shell becomes responsible for a multi-process start: the gateway, the database dependency, and first-run configuration.
- State the licence consequence of each shape, for private use and for any future distribution, separately.
- State the update path: unsigned local build, signed installer, or none.

## Acceptance criteria

- [ ] one shape is chosen, with the two rejected shapes and the reason each was rejected
- [ ] the licence consequence is stated for private use and for distribution separately
- [ ] the process model of the chosen shape is written down: what starts what, in which order, and what happens when a dependency is missing
- [ ] the cost of the rejected fork path is quantified from the evidence rather than asserted

## Non-goals

Installing a toolchain, building an installer, vendoring or forking any upstream code, signing certificates, and any statement about platform performance that was not measured.

## Answer

Open.

## Comments

Opened on 2026-11-08. None of the three upstreams needs reverse engineering: `nashsu/llm_wiki` is GPLv3, `lucasastorian/llmwiki` is Apache-2.0, `huytieu/COG-second-brain` is MIT, and all three publish their source.

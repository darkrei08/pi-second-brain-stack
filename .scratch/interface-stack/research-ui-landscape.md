# Research: open-source interaction surfaces

Retrieved 2026-10-29 for Wayfinder `interface-stack`. Three read-only researcher passes covered three candidate clusters; every claim that decides the outcome was re-checked against the upstream repository through the GitHub API, the project licence text, or a live instance. Claims that failed verification are listed in "Corrections" and were not carried into the decision.

Requirement under evaluation, in the owner's words: a surface close to the ChatGPT and Perplexity web apps with groups, sub-chats and documents belonging to a group or a chat; the most complete management surface a single owner can use; NotebookLM-style automatic source targeting and document reorganization with a dedicated deep-research section, not a prompt trick.

## The finding that decides the shape

No open-source product combines the three UX axes without duplicating the provenance store:

| Axis | What the owner asked for | Products that ship it | Cost for us |
| --- | --- | --- | --- |
| Chat workspace | groups, sub-chats, pins, documents per group | LibreChat, Open WebUI | low: OpenAI-compatible chat plus a retrieval hook |
| Notebook | sources panel, per-source targeting, studio artifacts, span citations | SurfSense, Open Notebook | high: the shell owns its own index, so our segments, freshness and citation seams are bypassed |
| Deep research | a dedicated multi-step research section | Onyx, local-deep-research, Scira, Morphic, Khoj | medium: a research loop belongs in our gateway, not in the shell |

A shell that owns the notebook axis cannot also keep one provenance store: SurfSense indexes files on local disk (`backend/`, air-gapped desktop app), Open Notebook is coupled to SurrealDB, and neither exposes an external retrieval hook. Choosing one of them would retire the storage, retrieval, freshness and citation work already sealed in this repository.

## Verified candidate metadata

From `gh api repos/<repo>` and `gh api repos/<repo>/releases/latest` on 2026-10-29.

| Candidate | Stars | Licence | Latest release | Last push |
| --- | --- | --- | --- | --- |
| open-webui/open-webui | 157114 | Open WebUI License (BSD-3 history) | v0.12.4 | 2026-10-29 |
| LibreChat-AI/LibreChat | 46443 | MIT | no GitHub release object (app footer v0.8.8) | 2026-10-29 |
| infiniflow/ragflow | 93054 | Apache-2.0 | v1.0.0-rc2 | 2026-10-29 |
| onyx-dot-app/onyx | 33065 | MIT (CE) + EE | v5.0.1 | 2026-10-29 |
| MODSetter/SurfSense | 16670 | Apache-2.0 | v2.2.5 | 2026-10-29 |
| LearningCircuit/local-deep-research | 9439 | MIT | v1.10.7 | 2026-10-29 |
| ItsCrazyKns/Perplexica | 37828 | MIT | n/a | 2026-09-01 |
| khoj-ai/khoj | 37880 | AGPL-3.0 | 2.0.0-beta.28 | 2026-08-02 |
| lobehub/lobehub | 83573 | LobeHub Community License | n/a | 2026-10-29 |
| Mintplex-Labs/anything-llm | 67691 | MIT | n/a | 2026-10-28 |

## Integration fit, which is what actually decides V1

| Candidate | Does a folder constrain our retrieval? | Attachment path | Identity available to us | One provenance store |
| --- | --- | --- | --- | --- |
| Open WebUI | yes: an `inlet` filter reads `body.folder_id` and `body.files` before the pipeline pops them | `file_handler` in a Filter delegates ingest and retrieval to us | `__user__` in the filter context | yes |
| LibreChat | no: `entity_id` is the agent id; a project id never reaches the RAG service | forced through its own `rag-api` (12 routes) over `RAG_API_URL` | `user.id` from a shared HS256 JWT | only by implementing its RAG contract |
| Onyx | partially: document sets and projects, retrieval through connectors and custom tools | connectors ingest into its own index | OAuth/session identity | no |
| SurfSense | no external hook; sources are local files indexed on disk | its own index | none forwarded | no |
| local-deep-research | collections scope search, and search engines plus document stores are configurable (`SEARXNG_BASE_URL`, Elasticsearch, Paperless) | its own encrypted library | none forwarded | no |
| Scira / Morphic | no grouping at all; providers hardcoded (Scira) or SearXNG-shaped (Morphic) | own embeddings | none | no |

Open WebUI is the only surface where a folder can become a real scope over our corpus without patching the shell, and the only one that receives a verified caller identity inside the hook that also bypasses its own RAG.

Licence position, read from the upstream text on 2026-10-29: clause 4 of the Open WebUI License forbids removing or replacing its branding except where the deployment has at most fifty end users in any rolling thirty-day period, has written permission, or holds an enterprise licence. A single-owner private deployment is inside that exception; nothing in the clause restricts use, modification, or self-hosting. Materials under prior licences keep their terms (LICENSE_HISTORY).

## Evidence

Authentic UI captures, stored next to this document:

| File | What it shows | Source |
| --- | --- | --- |
| `media/librechat-demo.png` | Projects, Pinned, Chats sidebar of LibreChat v0.8.8: exactly the ChatGPT-shaped grouping the owner asked for | LibreChat official demo imagery |
| `media/onyx-chat.png` | Onyx v4.4.6: Agents, Projects, recent chats, a multi-step "Thought for 27s / 2 steps" answer with source chips | Onyx repository asset |
| `media/surfsense-desktop.png` | SurfSense: Sources panel with per-source checkboxes, Studio grid (Markdown, Word, Slides, Spreadsheet, Web page, PDF, Mind map, Flashcards, Quiz, Podcast, Image, Infographic), artifacts list, inline span citations | SurfSense repository `www/public/homepage/desktop.png` |
| `media/scira-live.jpg` | Scira live: Perplexity-style mode bar (X Search, Reddit Search, Research, Videos, Fact Check) | captured from `https://scira.ai/` |
| `media/morphic-live.jpg` | Morphic live: generative search surface | captured from `https://chat.morphic.sh/` |

Marketing banners and architecture diagrams were discarded: they are not evidence of the interface.

## Rejected candidates and why

- AnythingLLM: MIT and a clean workspace/thread model, but the retrieval engine is closed to external hooks, so the corpus would fork.
- LobeChat: polished and grouped, but the LobeHub Community License restricts commercial derivatives and the identity hook is unverified.
- Big-AGI: strong multi-model and deep-research surface, no document store worth attaching to.
- Chatbot UI: no commits since 2024-08-03.
- Quivr: V2 is a headless retrieval engine, no workspace UI.
- Verba: archived upstream.
- Open Notebook: closest visual NotebookLM clone, but automatic source targeting and deep research are still RFCs (#1315), and it is coupled to SurrealDB.
- RAGFlow: strong automatic parsing and a deep-research mode, but it is an administrative agent console with its own storage, so it would replace rather than feed our seams.
- Khoj: capable `/research` router, AGPL, and no pushes since 2026-08-02.
- GPT-Researcher: a research engine with a report workspace, no grouping and no chat workspace.
- langchain-ai/open_deep_research: headless reference graph, archived 2026-08; useful as an algorithm, not as a surface.
- Perplexica: flat chat list, no groups.

## Corrections to the researcher passes

Recorded so the next reader does not inherit them: RAGFlow's latest release is v1.0.0-rc2, not v0.27.3; Onyx's latest release is v5.0.1 while the published interface asset shows v4.4.6; Perplexica has no verified rename; every researcher-supplied "screenshot URL" resolved to a marketing banner or a diagram; SurfSense stars are 16.7k, not 40.7k. No researcher claim was used unless it survived this document's own verification.

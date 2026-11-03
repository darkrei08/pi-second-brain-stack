# Tooling evaluation

Fourteen external projects the operator proposed on 2026-11-02, evaluated against this repository's needs and against the operator's Pi/dotenv environment. Licences were read from the projects themselves. **Nothing has been installed and nothing outside this repository was touched.**

The repository already has a transport (an authenticated HTTP gateway), tests, CI, review, memory and a shell (Open WebUI, decision V1 of the interface Wayfinder). That baseline is why most of this list is a skip: a capability that is already covered is a liability, not an upgrade.

## Summary

| Project | Licence | What it is | Fit here | Verdict |
|---|---|---|---|---|
| Panniantong/Agent-Reach | MIT | CLI and agent skill for scraping GitHub, Reddit, X, YouTube and news | Research here is documents, not social feeds, and Firecrawl plus BrowserOS already cover extraction | skip |
| bigskysoftware/htmx | 0BSD | Server-driven hypermedia UI | No web UI in this repository, and the gateway is a REST and SSE API | skip |
| jakubkrehel/skills | MIT | UI, typography and accessibility skills | Overlaps the operator's `impeccable`, and there is no repository frontend | skip |
| mikevillarroel/buildbox-ios | all rights reserved | On-device iOS build and signing through GitHub Actions | Proprietary licence, and mobile packaging is deferred | skip |
| neuron-core/neuron-ai | MIT | PHP agent and RAG framework | PHP runtime against a Node 22 service that already owns retrieval | skip |
| Tencent/teamai-cli | MIT | Git-based distribution of team AI assets | Conflicts with the operator's canonical skills root and the linker | skip |
| AltanS/collie | MIT | PWA to monitor terminal agents remotely | Useful for watching Herdr panes away from the desk | defer |
| typingmind.com | proprietary | Commercial LLM chat client | Closed source, and it cannot forward a folder scope into our retrieval hook | skip |
| INSANE0777/Awwwards-mcp | MIT | MCP server that scrapes Awwwards | No frontend to design, and browser MCPs are already installed | skip |
| herdrdev/herdr-app | Apache-2.0 | Native desktop workspace for terminals and agents | A GUI for the Herdr the operator already runs | defer |
| Nutlope/hallmark | MIT | Design skill with curated visual themes | Only once a first-party web surface exists | defer |
| elie222/rakazo | Apache-2.0 | Self-hosted assistant platform with SaaS connectors | Connectors reach third parties, which the local-first boundary forbids | skip |
| android/skills | Apache-2.0 | Official Android agent skills | Only with a native Android client | defer |
| leonardo-mais/Spark | Apache-2.0 | Android and WearOS starter template | Belongs in a separate repository, never here | defer |

Nine skips, five defers, zero installs.

## Deferrals and their triggers

- **collie** and **herdr-app** are surfaces over Herdr, which already runs here as a socket daemon. Trigger for collie is a Tailscale mesh between the phone and this host; trigger for herdr-app is a decision to work in a graphical workspace instead of panes. Both are host applications, never repository dependencies.
- **hallmark** is a design skill for a first-party web surface. This repository has none; the shell is Open WebUI. Trigger is the decision, inside the projects-and-chats Wayfinder, to build our own surface instead of extending the shell.
- **android/skills** and **Spark** need a native Android client. Trigger is a charter for a separate repository; they would be installed through the operator's canonical skills root, never vendored here.

## Integration order, if the operator approves any of them

1. `herdr-app`: a host application, installed on this machine only, no repository change.
2. `collie`: a host service behind Tailscale, no repository change.
3. `hallmark`: into the operator's canonical skills root and registered with the linker, so every harness sees it.
4. `android/skills`: into the same canonical root, one entry per skill, through the linker.
5. `Spark`: a new repository, not an install.

Nothing here changes `package.json`. A tool that would have to become a runtime dependency clears the same bar as the rest of this repository: a documented need, a licence that permits it, and a test that fails without it.

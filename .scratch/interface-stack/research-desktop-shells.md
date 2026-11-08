# Research: three upstream second-brain applications, read at source

Three repositories were cloned read-only on 2026-11-08 and read statically. Nothing was installed, built, or started, so every claim below is a reading, not a run. When a README and the code disagree, the code is reported and the disagreement is named.

The purpose is narrow: what each one is built on, whether its desktop variant is separable, what its licence permits, and which design decisions are worth adopting here.

## `nashsu/llm_wiki` — the desktop reference

TypeScript frontend, Rust backend, packaged as a Tauri 2 desktop application.

- Shell and packaging: `@tauri-apps/cli` 2.11.1, `tauri-build = "2"`, `bundle.active: true`, `bundle.targets: "all"` in `src-tauri/tauri.conf.json`. Platform overrides `tauri.linux.conf.json`, `tauri.macos.conf.json`, `tauri.windows.conf.json` carry per-platform resources (pdfium, the bundled `mcp-server` package). Capabilities in `src-tauri/capabilities/default.json`.
- Frontend: React 19, `@base-ui/react`, shadcn, Tailwind 4.2.2, Milkdown editor, sigma + graphology + louvain + forceatlas2 for the graph, zustand for state. Vite 8 static bundle, `frontendDist: "../dist"`. No SSR.
- Backend: 35,422 lines of Rust in 40 files. Persistence is files, not a database: JSON plus Markdown under a project folder, with `.llm-wiki/` holding derived state. Vector store is embedded LanceDB 0.27.2. Document parsing through pdfium-render, anydoc, calamine, docx-rs, epub, mobi.
- Process model: one OS process containing three concurrent components started in the Tauri setup hook: a clip server on `127.0.0.1:19827`, an API server on `127.0.0.1:19828`, and a tray. Chat streams over SSE inside the API server.
- Size: 55,365 lines of TS/TSX across 194 files, plus 35,855 lines of tests across 149 files, plus the Rust. 243 first-party runtime source files.
- Records that are first-class in the data model: `WikiProject {id,name,path}`; `Conversation {id,title,createdAt,updatedAt,selectedSkills,contextFiles}`; `DisplayMessage` with `references` and `agentSteps`; `MessageReference {title,path,kind,url,snippet,graphRelations}`; `WikiPage {path,content,frontmatter}`; `ReviewItem`; `LintItem`. The graph is derived and cached, not a record.
- Capabilities, from routes and components rather than the README: chat with conversations, project-as-folder, document ingest with a queue, hybrid retrieval with RRF, citations, graph view, whole-project zip export and import, an agent runtime with skills, a Chrome MV3 clipper, and an MCP server. No accounts, no identity, no multi-user: the only credential is a single local bearer token for the API.
- Distribution: built on tag or dispatch by `tauri-apps/tauri-action`, producing `.dmg`, `.msi`, `.exe` (NSIS), `.deb`, `.AppImage`, a portable Windows zip and the extension zip. macOS is Apple Silicon only. Nothing is committed: `.gitignore` excludes `dist/`, `src-tauri/target/`, `src-tauri/gen/`, and `git ls-files` returns no artifact. The pipeline is real; the tree is empty of binaries.
- License: GPLv3, `LICENSE:1-4`. Redistribution of a modified source form is governed by `LICENSE:212`; binary conveyance must carry Corresponding Source, `LICENSE:249`. No network clause: `LICENSE:102-103` states that mere interaction over a network is not conveying, so hosting a modified fork publishes nothing. Mixed tree: root GPLv3, `mcp-server/package.json` declares MIT, the extension declares no license.
- Is the desktop layer separable? The configuration is, the product is not. Reusable: the four JSON files (146 lines), the capabilities file, the icons, the CI matrix, and the shell conventions (tray, autostart, close behaviour, `run_guarded` at every command boundary, `resource_dir` for the native library). Not reusable: the frontend is not presentational, because the stores call `invoke` and are hydrated against a project path, so lifting a component drags the Rust command surface with it.
- README versus code: the README lists macOS Apple Silicon, Windows `.msi`, Linux `.deb`/`.AppImage`; `build.yml` also builds NSIS, a portable zip and Linux arm64. The in-app API documentation omits `POST /pages/write` and `DELETE /reviews/{id}` that the router serves, so `api_server.rs:360-395` is the truth, not the UI.

Honest reuse verdict: consume `/api/v1` if what is wanted is the engine; fork it if what is wanted is the product; vendor only genuinely isolated pure modules (mermaid rendering, latex-to-unicode, frontmatter, natural-sort). The repository demonstrates the first path itself: `mcp-server/src/api-client.ts` is an independent, non-Tauri client of the same contract.

## `lucasastorian/llmwiki` — the web reference

Python backend, Next.js frontend, four services, no desktop target of any kind.

- Manifests: `api/requirements.txt` (FastAPI 0.136, uvicorn), `web/package.json` (Next 16.3, React 19.2, Tailwind 4.2.2, zustand, TipTap), `mcp/requirements.txt`, `converter/requirements.txt`. No root manifest.
- Architecture: monorepo of four first-party services plus a browser extension, with two deployment modes selected by `settings.MODE`: `local` (SQLite via aiosqlite plus filesystem, one container running uvicorn on 8000, MCP on 8100 and a Next standalone server on 3000, supervised by `docker/local/entrypoint.sh`) and `hosted` (Postgres, Supabase JWKS, S3, LISTEN/NOTIFY).
- Frontend is server-rendered: `output: "standalone"`, server components above client components.
- Retrieval is lexical only. FTS5 locally, pgroonga hosted. There is no vector store and no embedding code, despite `VOYAGE_API_KEY` and `TURBOPUFFER_API_KEY` sitting in `.env.example` with zero references.
- Size: 65,046 lines across 427 first-party source files, of which 20,262 lines are tests.
- Desktop: none. No Electron, Tauri, Capacitor, Cordova or React Native anywhere. What exists is a PWA (`web/src/app/manifest.ts`, service worker at `web/public/sw.js` that deliberately bypasses `/api`, `/auth` and `/v1`) and a Chrome extension. A real desktop app would additionally need a shell that supervises a Node server (the frontend is server-rendered, not a file bundle), a bundled Python runtime with two pinned lockfiles, and a JRE for the default PDF parser.
- License: Apache-2.0, verbatim, with the copyright placeholder still unfilled at `LICENSE:190`. Forking is granted at `LICENSE:67-72`; redistribution conditions at `LICENSE:90-93`; trademarks are not granted at `LICENSE:139-140`. No network copyleft.
- Records first-class in the schema: workspace/knowledge base with three-level visibility, document with `source_kind` and `content_hash`, page, chunk with both `source_content` and materialized `content`, citation/reference, highlight (embedded as a JSON array on the document, not a table), comment and reply inside the highlight payload, append-only activity events. There is no conversation entity: this repository has no chat.
- Worth adopting: cross-language parity enforced by committed fixtures for an algorithm implemented twice (canonical plaintext and offset locator in both Python and TypeScript, pinned by `tests/fixtures/parity/*.json`); the durable store declared authoritative and the index declared deletable, with the exceptions documented in the README rather than hidden; the activity feed written by database triggers instead of application code.

## `huytieu/COG-second-brain` — not an application

No dependency manifest exists. It is a Markdown vault plus a prompt pack, distributed in seven agent formats (Claude Code, Antigravity, Cursor, Kiro, Gemini, Codex, and a universal `AGENTS.md` fallback).

- Content: 46,556 lines over 358 files, of which 36,735 lines are Markdown and 5,502 are Python helpers inside individual skills. Of the executable files, only about 1,300 lines belong to the repository itself; the rest is tooling internal to skills. No build system, no server, no UI, no database, no vector store.
- Distribution: `git clone` plus open in a CLI, or `npx skills add`.
- Records: one record type, a Markdown file with YAML front matter (`type`, `domain`, `updated`, `tags`), related by Obsidian wiki-links. No schema validator; the schema is a template and prose.
- License: MIT, everything permitted with the notice retained; a vendorised skill carries its own MIT. No paid tier, only a funding link.
- Worth adopting: claims carry their own evidence and date and confidence while a separate append-only timeline stays immutable, so a record states its provenance instead of flattening everything into prose; one source and N surfaces with a generated mirror and a validator that fails on drift; skills that ship deterministic tooling rather than instructions alone.
- README versus code: the README claims 33 skills and 6 worker agents; the tree has 43 skills and 10 agents. The title claims the brain self-evolves; nothing in the code evolves, the evolution is a prompt flow plus a filtered `git pull`.
- Maintenance seam worth knowing before forking: the skill tree is physically duplicated four times and the validator checks only one of the mirrors.

## What this changes for us

- A desktop application does not require touching Rust. This project's gateway is already the boundary, and `/v1/answers` already returns the payload a citation interaction needs. A Tauri shell would supervise a Node process and a database, not reimplement retrieval.
- The two design decisions worth copying, and they are cheap to copy: a project as a folder on disk with a sidecar state directory so the user's data outlives the app, and a loopback HTTP API as a second port into a desktop application so that agents and scripts are first-class users.
- The one licence fact that constrains any fork: GPLv3 on the only working desktop reference. Private modification is unconstrained; distributing a binary is not.

## Not verified

No application was run, so latency, memory footprint, packaging success and platform behaviour are all unmeasured. The `nashsu/llm_wiki` agent runtime (4,100+ lines) was read through routes, types and tool names rather than line by line. The claim that no PWA or Electron path exists in that repository is by grep, not exhaustive inspection. Intel macOS support is asserted absent from the build matrix; no artifact was tested.

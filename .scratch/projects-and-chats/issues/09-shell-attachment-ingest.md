# 09: Ingest an attachment uploaded in a project into that project

Type: task
Status: resolved
Blocked by: none

## Question

Decision V4 of the interface Wayfinder says an attachment reaches our store through the shell's `file_handler` hook into `POST /v1/documents/ingest`, preserving page and box provenance. Nothing implements that half: the retrieval filter and the research pipe forward `folder_id` as `collection_ids`, and ticket 01 made ingest accept `document.collections`, but no plugin calls ingest, so a document uploaded inside a project never enters the corpus with that project as its scope. Decide and build the bridge.

The questions that must be answered by the implementation, not guessed: which hook the shell invokes for an uploaded file and what it hands over (bytes, text, or a file record), how the parent document identity is derived so a re-upload does not duplicate the document, how the folder id travels from the same `body` the filter reads, and what the person sees when the gateway refuses the ingest. Deletion must follow the existing storage cascade rather than a second path.

## Acceptance criteria

- The selected design B command `pnpm exec ingest-directory <directory> <collection-id>` sends regular UTF-8 files to `POST /v1/documents/ingest` with `document.collections` set to the named collection.
- Provenance is explicit: the directory path preserves filename, content hash, stable id, collection scope, and normal segment citation provenance; it does not preserve shell-upload page or box data.
- A re-upload of the same filename and bytes reuses the same document id and membership on the existing upsert seam.
- A gateway refusal is surfaced as a readable command error, not a stack trace or silent drop.
- Node tests cover the public command function, folder propagation, stable re-upload identity, unreadable/invalid files, no partial write for an invalid batch, and gateway refusal.
- One page in `docs/` describes the end-to-end path and the manual step required because the shell upload is not automatic.

## Comments

A first implementation attempt stopped before writing code, and it was right to stop. Verified from https://docs.openwebui.com/features/extensibility/plugin/functions/filter/ (section "Owning Retrieval With file_handler"): `body["files"]` and `body["metadata"]["files"]` carry references only, an id, a name and a type, never bytes or extracted text, and `file_handler=True` does nothing beyond skipping the built-in RAG. `folder_id` is readable in `inlet`, but the file content is not available in that same hook. So V4 as written cannot be implemented in a filter by itself.

Two candidate designs remain, and the choice is a decision, not a preference:

- **A. The filter fetches the content from the shell's own API.** A filter runs inside the shell, so it may be able to read the uploaded file through the shell's file endpoints using the caller's own authorization, and then call our ingest with `document.collections`. This needs verification from the shell's documentation or source, because it is not established anywhere in this repository, and it adds a second HTTP hop inside the plugin along with a question about which credential is used.
- **B. Ingest happens outside the chat request.** A documented path, a script or a route, ingests a directory into a named collection, and the shell stays a read and chat surface. Nothing is invented, the corpus path is explicit, and the person loses only the automatic half.

Preference is B if A cannot be verified from a primary source, because a plugin that depends on an undocumented endpoint breaks silently on the next shell upgrade. Both keep V7 intact: the shell remains the owner of conversations.

## Answer

- **Verified facts:** The official Filter documentation says `body["metadata"]["files"]` and `body["files"]` contain only file/collection references (IDs, names, types) at `inlet()` time and that the chunk text does not exist yet; `file_handler` skips built-in RAG rather than adding content: <https://docs.openwebui.com/features/extensibility/plugin/functions/filter/>.
- **Verified request surface:** The same primary page documents injectable `__request__` as the raw FastAPI `Request` object: <https://docs.openwebui.com/features/extensibility/plugin/functions/filter/>. The API page documents Bearer authentication, upload at `POST /api/v1/files/`, extracted content, and `GET /api/v1/files/{id}/process/status`: <https://docs.openwebui.com/reference/api-endpoints>.
- **Missing guarantee:** The API documentation says uploads are processed asynchronously and extraction continues in the background; it does not promise extraction completion before a chat Filter runs. The official router source also shows the authenticated content endpoints and the separate asynchronous `process_uploaded_file` path, but no Filter-ordering guarantee: <https://github.com/open-webui/open-webui/blob/main/backend/open_webui/routers/files.py>.
- **Decision:** Design **B** won. A can reach documented shell file endpoints in principle, but the required extracted-text-before-Filter contract is not verified from a primary source. B uses an explicit, version-independent directory command and leaves the shell as the read and chat surface. Design A lost because it would depend on an unverified timing contract and a second in-chat HTTP hop.
- **Implementation:** `src/ingest-directory.js` prepares and validates the complete directory before the first request, derives stable ids from filename plus bytes, and calls the existing authenticated ingest route; `src/ingest-directory-cli.js` and `package.json` expose `pnpm exec ingest-directory`. Invalid or unreadable input is refused without writes, and gateway refusals are rendered as `Gateway refused <file>: <message>`.
- **Docs/tests:** `docs/shell-attachment-ingest.md` and `docs/development.md` document the manual export/copy step and scoped answer path. `test/ingest-directory.test.js` verifies ingest body scope, stable re-upload identity, invalid-batch refusal, unreadable entry refusal, and readable gateway refusal.
- **Verification:** `node --test test/ingest-directory.test.js` -> 4 passed, 0 failed. `python3 -m unittest discover -s integrations/open-webui/tests -v` -> 8 passed, 0 failed. `pnpm run verify` -> unit 152 tests (123 passed, 29 expected skips, 0 failed) and integration 34 tests (5 passed, 29 expected skips, 0 failed), exit 0.

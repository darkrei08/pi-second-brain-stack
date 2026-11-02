# 09: Ingest an attachment uploaded in a project into that project

Type: task
Status: open
Blocked by: none

## Question

Decision V4 of the interface Wayfinder says an attachment reaches our store through the shell's `file_handler` hook into `POST /v1/documents/ingest`, preserving page and box provenance. Nothing implements that half: the retrieval filter and the research pipe forward `folder_id` as `collection_ids`, and ticket 01 made ingest accept `document.collections`, but no plugin calls ingest, so a document uploaded inside a project never enters the corpus with that project as its scope. Decide and build the bridge.

The questions that must be answered by the implementation, not guessed: which hook the shell invokes for an uploaded file and what it hands over (bytes, text, or a file record), how the parent document identity is derived so a re-upload does not duplicate the document, how the folder id travels from the same `body` the filter reads, and what the person sees when the gateway refuses the ingest. Deletion must follow the existing storage cascade rather than a second path.

## Acceptance criteria

- A plugin under `integrations/open-webui/` that sends an uploaded document to `POST /v1/documents/ingest` with `document.collections` derived from the shell folder, using the documented hook rather than a patched shell.
- Provenance preserved: the ingest body carries the page and box information the shell exposes, or the ticket records exactly which part the shell does not expose.
- A re-upload of the same document does not create a second document or a duplicate membership.
- A gateway refusal is surfaced to the person as a readable message, not a stack trace or a silent drop.
- Python tests in `integrations/open-webui/tests/` that assert the request body built for ingest, the folder propagation, and each refusal path, run by the repository's own test command.
- One page in `docs/` describing the end-to-end path from an upload in the shell to a scoped answer.

## Comments

A first implementation attempt stopped before writing code, and it was right to stop. Verified from https://docs.openwebui.com/features/extensibility/plugin/functions/filter/ (section "Owning Retrieval With file_handler"): `body["files"]` and `body["metadata"]["files"]` carry references only, an id, a name and a type, never bytes or extracted text, and `file_handler=True` does nothing beyond skipping the built-in RAG. `folder_id` is readable in `inlet`, but the file content is not available in that same hook. So V4 as written cannot be implemented in a filter by itself.

Two candidate designs remain, and the choice is a decision, not a preference:

- **A. The filter fetches the content from the shell's own API.** A filter runs inside the shell, so it may be able to read the uploaded file through the shell's file endpoints using the caller's own authorization, and then call our ingest with `document.collections`. This needs verification from the shell's documentation or source, because it is not established anywhere in this repository, and it adds a second HTTP hop inside the plugin along with a question about which credential is used.
- **B. Ingest happens outside the chat request.** A documented path, a script or a route, ingests a directory into a named collection, and the shell stays a read and chat surface. Nothing is invented, the corpus path is explicit, and the person loses only the automatic half.

Preference is B if A cannot be verified from a primary source, because a plugin that depends on an undocumented endpoint breaks silently on the next shell upgrade. Both keep V7 intact: the shell remains the owner of conversations.

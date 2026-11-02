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

# Ingesting shell project files

The automatic Open WebUI attachment bridge is deliberately not part of the chat request. The supported path is:

1. Create or choose an Open WebUI project folder and use its folder id as the collection id.
2. Export or copy the source files, or their extracted text, into a local directory. The directory command accepts regular UTF-8 text files only; it does not read the shell's private storage.
3. Run the command with the gateway credential:

   ```bash
   GATEWAY_URL=http://127.0.0.1:8080 \
   GATEWAY_TOKEN="$GATEWAY_TOKEN" \
   pnpm exec ingest-directory ./project-files <open-webui-folder-id>
   ```

   The command validates every file before the first request, then sends each document to `POST /v1/documents/ingest` with `document.collections` set to the folder id. Document ids are stable for the same filename and bytes, so re-running the command updates the existing document instead of creating a second one.

4. Ask the question inside the same Open WebUI folder. The retrieval Filter sends that folder id as `collection_ids`, so the gateway searches only the documents in that collection and returns the answer with the existing citation and uncertainty metadata.

The person must repeat step 3 after adding or changing a file. A malformed UTF-8 file, an unreadable or non-regular directory entry, or an empty directory is refused before any document is sent. If the gateway refuses a later document after earlier requests succeeded, the command reports the readable gateway message; re-running is safe for already accepted files because their ids are stable.

## Why this is outside the Filter

The official Filter documentation says that `body["metadata"]["files"]` and `body["files"]` contain only file or collection references at `inlet()` time, while the chunk text does not exist yet, and that `file_handler` skips built-in RAG rather than supplying file content: <https://docs.openwebui.com/features/extensibility/plugin/functions/filter/>.

Open WebUI documents file upload extraction as asynchronous: `POST /api/v1/files/` returns a file id while extraction and embedding continue in the background. It also documents the process-status endpoint, but does not promise that extraction has completed before a chat Filter runs: <https://docs.openwebui.com/reference/api-endpoints>. The same Filter page documents an injectable raw FastAPI `Request` object, but that does not establish a stable extraction-before-Filter contract. Design B therefore keeps the shell as the folder, conversation, and answer surface while the explicit command owns the ingest handoff.

This directory path preserves text, source filename, hash, stable document identity, collection scope, and the gateway's normal segment citation provenance. It does not preserve page or bounding-box provenance from a shell upload; use a parser-normalized document through the gateway ingest contract when that provenance is required.

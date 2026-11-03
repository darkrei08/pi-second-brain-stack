# Projects and chats gateway contracts

The shell owns projects, chats, pins, and folder names. The gateway owns documents, segments, collections, and citations. A collection is only a retrieval scope; suggestions never change a request scope or document membership by themselves.

## Project standing instructions

Open WebUI folders/projects already carry the chat context: the shell documentation describes per-folder system prompts and knowledge bases that apply to chats in that folder. See [Folders & Projects](https://docs.openwebui.com/features/chat-conversations/chat-features/conversation-organization/) and [Knowledge](https://docs.openwebui.com/features/workspace/knowledge/).

The gateway therefore does not add or persist project instructions. `src/answer-question.js` keeps the answer safety prompt server-owned, while the gateway receives the question and retrieval scope. There is no caller-controlled project-instructions field to validate or override.

## Project names and tags

Open WebUI owns folder/project names and renaming, while tags are conversation metadata searchable through the shell's history search. See [Folders & Projects](https://docs.openwebui.com/features/chat-conversations/chat-features/conversation-organization/) and [History & Search](https://docs.openwebui.com/features/chat-conversations/chat-features/history-search/).

Gateway collections remain opaque retrieval scopes. They intentionally have no name or tag column, and no tag search route is needed: adding one would mirror shell-owned organization state and violate the one-source-of-truth boundary.

## Suggest collections for a question

`POST /v1/collections/suggest` requires the authenticated caller and accepts:

```json
{
  "question": "invoice renewal",
  "mode": "lexical",
  "limit": 20,
  "max_collections": 10
}
```

The default mode is lexical. Hybrid mode uses already-computed caller-supplied retrieval evidence:

```json
{
  "question": "invoice renewal",
  "mode": "hybrid",
  "model_id": "configured-embedding-model",
  "query_embedding": [0.1, 0.2, 0.3]
}
```

The gateway ranks at most one deciding segment per collection and returns the best segment score for each collection:

```json
{
  "candidates": [
    {
      "collection_id": "collection-a",
      "score": 0.42,
      "segment_id": "urn:segment:..."
    }
  ]
}
```

The route performs no provider call. The caller may ignore the proposal or use a returned collection id in a later scoped query. An empty candidate list is valid and leaves the caller's scope unchanged.

## Propose filing an ingested document

Automatic filing is proposal-only. `POST /v1/documents/collections/suggest` compares the target document's first three segments with active segments already assigned to owner collections and returns the same candidate evidence shape:

```json
{
  "document_id": "urn:document:target",
  "candidates": [
    {
      "collection_id": "collection-a",
      "score": 0.42,
      "segment_id": "urn:segment:evidence"
    }
  ]
}
```

This route does not write membership. To accept candidates, call `POST /v1/documents/collections/confirm` explicitly:

```json
{
  "document_id": "urn:document:target",
  "collection_ids": ["collection-a"]
}
```

The confirmation is owner-scoped, validates every collection, and inserts memberships with conflict-safe idempotency. Repeating the confirmation does not create a duplicate membership. Ingest response shape is unchanged; filing proposals are requested separately.

## Measured bound

On a local PostgreSQL fixture containing 101 active documents and one collection, 30 sequential HTTP requests to `POST /v1/collections/suggest` measured p50 7.39 ms, p95 11.20 ms, and max 11.81 ms on loopback. Retrieval is bounded (`limit <= 20`, first three source segments for filing proposals, at most ten returned collections). The measurement used no model provider and the provider callback was never configured or called.

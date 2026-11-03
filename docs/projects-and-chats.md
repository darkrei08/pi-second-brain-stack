# Projects and chats gateway contracts

The shell owns projects, chats, pins, and folder names. The gateway owns documents, segments, collections, and citations. A collection is only a retrieval scope; suggestions never change a request scope or document membership by themselves.

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

## Measured bound

On a local PostgreSQL fixture containing 101 active documents and one collection, 30 sequential HTTP requests to `POST /v1/collections/suggest` measured p50 7.39 ms, p95 11.20 ms, and max 11.81 ms on loopback. Retrieval is bounded (`limit <= 20`, at most ten returned collections). The measurement used no model provider and the provider callback was never configured or called.

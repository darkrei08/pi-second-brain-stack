# Wayfinder: streaming OpenAI-compatible chat completions

## Destination

Expose `POST /v1/chat/completions` as a grounded gateway route that accepts an OpenAI-shaped request, maps its latest user message onto `answerQuestion`, and emits SSE without weakening citation revalidation or uncertainty reporting.

## Dependency position

Sealed: owner-scoped gateway authentication, lexical/hybrid retrieval, citation resolution and revalidation, grounded `answerQuestion`, and the configured non-streaming chat adapter.

Out of scope: TLS bootstrap, metrics, deployment packaging, tool calls, audit logging, quotas, and shell glue.

## Decision tickets

### A6-stream: How a token stream coexists with the citation and uncertainty report

Type: decision
Status: resolved
Blocked by: None

Question: How can `/v1/chat/completions` stream answer text while keeping the citation envelope and uncertainty report honest if a client disconnects before completion?

## Decisions-so-far

- A6-stream: The gateway runs the existing grounded `answerQuestion` use case first, then emits the returned answer as SSE content chunks. It sends no citation or uncertainty metadata with content chunks. After the final content chunk, it sends one trailing `event: grounding` SSE record containing the complete existing `citations`, `unresolved_citations`, `stale_citations`, `retrieval`, and `uncertainty` fields, then the normal OpenAI finish chunk and `[DONE]`. A disconnect before the trailing grounding event therefore receives no claim that a grounded answer was completed. `stream: false` remains supported as a normal JSON OpenAI-shaped response with the same report at top level; `stream: true` is the SSE contract. The configured gateway answer model remains authoritative; the request `model` is validated as an OpenAI-compatible required field but does not select a provider model.

## Exit condition

The route is covered at the gateway seam for request mapping, SSE framing, trailing grounding metadata, disconnect-safe ordering, non-streaming compatibility, authentication, and no-evidence behavior; unit tests and the assigned pgvector integration test pass where applicable.

## Answer

A6-stream is resolved as stated above. The report is deliberately trailing and is never emitted before all answer content. The server does not claim completion to a client that disconnects before that event.

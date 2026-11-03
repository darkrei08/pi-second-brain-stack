# 05: Suggest the project a question belongs to

Type: task
Status: resolved
Blocked by: 01

## Question

NotebookLM-style targeting: before answering, suggest which projects the question belongs to, and let the caller accept or ignore the suggestion. Decide the signal, using only what exists: lexical and hybrid retrieval already score segments, and collections are already a filter. A suggestion must be cheap, must not require a model call, and must be explainable in one line to the person. Define the route, the payload, the ordering, the behaviour when nothing scores, and the rule that a suggestion never silently becomes the scope.

## Acceptance criteria

- `POST /v1/collections/suggest` returns ranked candidate collections with the score and deciding segment id.
- No model call: lexical suggestions use storage retrieval only; hybrid suggestions accept a caller-supplied embedding. Unit tests prove the provider callback is never reached.
- Unit test proves an unanswered suggestion does not alter the next unscoped retrieval request.
- Bounded latency on the existing corpus, recorded: 30 sequential HTTP requests over a 101-document local fixture measured p95 11.20 ms (p50 7.39 ms, max 11.81 ms).

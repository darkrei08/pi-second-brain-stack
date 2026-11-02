# 05: Suggest the project a question belongs to

Type: task
Status: open
Blocked by: 01

## Question

NotebookLM-style targeting: before answering, suggest which projects the question belongs to, and let the caller accept or ignore the suggestion. Decide the signal, using only what exists: lexical and hybrid retrieval already score segments, and collections are already a filter. A suggestion must be cheap, must not require a model call, and must be explainable in one line to the person. Define the route, the payload, the ordering, the behaviour when nothing scores, and the rule that a suggestion never silently becomes the scope.

## Acceptance criteria

- A route that returns ranked candidate collections with the score and the deciding segment id.
- No model call: measured, not assumed, and a test that proves the provider is never reached.
- A test proving an unanswered suggestion leaves the caller's scope unchanged.
- Bounded latency on the existing corpus, recorded.

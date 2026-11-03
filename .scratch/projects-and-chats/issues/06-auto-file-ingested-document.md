# 06: File an ingested document into a project automatically

Type: task
Status: resolved
Blocked by: 01

## Question

The operator wants an ingested document to be filed into the right project without choosing it by hand. Decide whether the suggestion happens at ingest (returned with the ingest response, applied only after confirmation) or on demand later, and what evidence justifies a suggestion: title and first segments compared against existing collection centroids or a lexical match against collection members. A wrong automatic filing is worse than no filing, so the default must be a proposal, never a move.

## Acceptance criteria

- `POST /v1/documents/collections/suggest` returns candidate collections with score and deciding segment evidence; `POST /v1/documents/collections/confirm` is the explicit confirmation step.
- Integration test proves an unconfirmed proposal leaves membership unchanged.
- Integration test confirms twice and proves exactly one membership remains.
- The ingest response shape is unchanged; the separate proposal and confirmation contract is documented in `docs/projects-and-chats.md`.

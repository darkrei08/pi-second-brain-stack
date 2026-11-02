# 06: File an ingested document into a project automatically

Type: task
Status: open
Blocked by: 01

## Question

The operator wants an ingested document to be filed into the right project without choosing it by hand. Decide whether the suggestion happens at ingest (returned with the ingest response, applied only after confirmation) or on demand later, and what evidence justifies a suggestion: title and first segments compared against existing collection centroids or a lexical match against collection members. A wrong automatic filing is worse than no filing, so the default must be a proposal, never a move.

## Acceptance criteria

- A proposal contract: the route or response field, the candidate collections, the evidence, and the explicit confirmation step.
- A test that an unconfirmed proposal leaves membership unchanged.
- A test that a confirmed proposal writes one membership and no duplicate.
- The ingest response stays within its documented shape, or the doc in `docs/development.md` is extended with it.

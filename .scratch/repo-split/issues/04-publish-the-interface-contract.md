# 04: Publish the contract both repositories consume

Type: task
Status: open
Blocked by: 01, 02

## Question

`.scratch/repo-split/03-contract-and-boundaries.md` enumerates the interfaces between the three repositories. Promote the stable part into a versioned document that lives in the owning repository per interface, and add the smallest automated check that catches a breaking change before release: route shape, error codes and messages, the scope contract, the citation shape and the environment variables.

## Acceptance criteria

- Every interface names its owner and its consumer, and the implicit ones from the analysis are documented or removed.
- A deliberately broken route shape or error code fails the check, observed red then green.
- Both other repositories reference the document instead of paraphrasing it.

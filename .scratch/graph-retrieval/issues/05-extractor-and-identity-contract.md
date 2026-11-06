# 05: Extractor and entity-identity contract

Type: decision
Status: open
Blocked by: Missing extractor/provider and corpus evidence

## Question

What exact extractor output and entity identity/merge policy can be implemented and tested without inventing labels, predicates, endpoints, or quality thresholds?

## Missing evidence

- An installed external extraction model or a caller-provided extractor implementation and its input/output contract.
- A synthetic fixture or representative corpus containing entities and relationships, including duplicate mentions and cross-segment/cross-document references.
- A ratified entity identity/merge policy for `canonical_key`, kind conflicts, aliases, and conflicting relationships.
- Measured extraction behavior sufficient to choose retry, confidence, and rejection rules.

## Current boundary

The repository can ratify the storage/provenance envelope and the separate projection lifecycle, but it cannot honestly implement entity extraction or claim that an extracted assertion is correct without one of the above evidence sets. Leave this ticket open and keep issue #17 `ready-for-human`.

## Traceability row (pending parent consolidation)

| Issue | Decision | Status |
|---|---|---|
| #17 | Extractor and entity identity policy not ratified; requires installed/provider contract plus synthetic or representative corpus | open |

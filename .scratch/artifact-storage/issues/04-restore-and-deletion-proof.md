# 04: Prove restore and deletion instead of asserting them

Type: task
Status: open
Blocked by: 02, 03

## Question

Perform and record an end-to-end export, restore, and deletion exercise over a synthetic bounded fixture. The evidence must show commands, timestamps, source and destination paths, byte counts, SHA-256 results, database rows or dump/import results, and the observed failure behavior for a missing NAS path. A prose assertion that backup, restore, or deletion should work is not evidence.

## Acceptance criteria

1. Create a synthetic fixture representing the matrix: one document, page image, OCR output, audio or media placeholder, transcript and manifest, embedding/vector row, database dump, and cache/derivative records. Do not use private corpus data.
2. Perform the selected operator export path from ticket 03 and record the literal operator action needed to obtain the exported file.
3. Restore the export into a clean destination or replacement service boundary, import the database state, and verify every manifest hash, ownership/provenance relation, transcript, vector/model reference, and derivative relation. Record the command output and measured duration.
4. Perform deletion by artifact class: delete the selected original, remove only permitted derivatives, retain or remove chunks/vectors/caches according to the declared policy, and verify that deleted bytes and database references are gone from the intended boundary. Record what remains in backup history and why.
5. Repeat the export or restore check with the NAS path or required client absent. Record a visible failure, no false success, and no writes into the unmounted local directory.
6. Prove that a 20 GB-class restore is capacity-safe or record the exact refusal/phase-two trigger; do not infer safety from a transfer-time estimate. (`research.md`)
7. The record explicitly covers originals, derivatives, chunks, vectors, graph projections if present, caches, manifests, database dumps, and backup copies, reconciling `docs/implementation-brief.md:160-171`.
8. Any failed proof becomes a named gap with owner and next action; the decision record is not marked proven until all required rows have evidence.

## Evidence to gather

- Ticket 02's resolved matrix and ticket 03's resolved operator path.
- `research.md`, especially the three dominating constraints and unverified section.
- `docs/implementation-brief.md:160-171` and the repository's existing provenance/deletion conventions.

## Constraints

- This is an execution-and-recording task only after its blockers resolve; it does not authorize changing the runtime in this slice.
- Use synthetic data and loopback-only, single-owner services. Do not place private corpus material, database dumps, embeddings, or credentials in this repository.
- No installation or Compose change is authorized by this ticket itself; use only the tools explicitly approved by the resolved export path.

## Open question

Can the selected storage and export path actually restore and delete every declared artifact class without exhausting the 23 GB host margin or misreporting a missing NAS path as success?

## Comments

# 01: Turn a shell folder into a collection scope

Type: grilling
Status: open
Blocked by: none

## Question

The filter and the pipe forward the shell folder id as a collection reference, but no route creates a collection and `src/postgres-store.js` keeps collection writes behind the storage seam. Decide the bridge: does the gateway create the collection on first sight of a folder id, does the shell call an explicit route, or does ingest accept the folder id itself? For each option, say what happens when the folder does not exist yet, when a collection exists with no members, and when a stale collection outlives its folder in the shell. The decision must keep V8 true: one source of truth per record type, no mirrored folder names.

## Acceptance criteria

- A decision recorded in this ticket and a line added to the map's Decisions so far.
- The chosen path names the exact route, request shape and error code for an unknown folder.
- The alternative rejected with the reason it loses, not a ranking.

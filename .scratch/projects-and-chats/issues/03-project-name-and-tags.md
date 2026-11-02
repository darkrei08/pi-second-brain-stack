# 03: Name a project and label it with tags

Type: grilling
Status: open
Blocked by: 01

## Question

The operator wants to rename a project and label it with tags or hashtags. Verify what the shell already offers: whether folders carry a name the shell owns, whether tags attach to conversations only, and whether a folder can be renamed without touching our collection rows. Decide what remains for us: a tag dimension on collections, a search route over tags, or nothing at all because the shell already covers it.

## Acceptance criteria

- Verified inventory of the shell's own naming and tagging capability, with URLs.
- Either a decision to implement tags on collections with the exact schema and route, or a recorded "the shell owns it" with the reason.
- If a schema change is needed, it is a forward-only migration numbered after the last one in `docker/postgres/init`.

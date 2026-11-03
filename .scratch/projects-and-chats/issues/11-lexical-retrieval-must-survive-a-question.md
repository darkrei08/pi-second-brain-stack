# 11: Lexical retrieval must survive a real question

Type: bug
Status: open
Blocked by: none

## What happens

A retrieval query that is a question, which is what a person types, returns nothing at all. Measured on a live stack, one ingested document inside `folder-alpha`:

| Query | Result |
|---|---|
| `contratto locazione` | 1 match, mode `lexical` |
| `contratto` | 1 match, mode `lexical` |
| `scade` | 1 match, mode `lexical` |
| `quando scade il contratto di locazione` | 0 matches, mode `empty` |

The document is `Il contratto di locazione scade il trentuno dicembre.` The question shares three content words with it and still returns nothing, because `src/postgres-store.js` matches with `plainto_tsquery('simple', ...)`, which ANDs every term, under a configuration that does no stemming and removes no stopwords. One absent word (`quando`, `di`) is enough to drop the document.

The consequence is the failure this gateway exists to prevent: the shell sends a question, the filter grounds it on an empty result set, and the model answers without evidence.

## Acceptance criteria

- A natural-language question that shares content words with a document finds that document, and a question that shares no word with it still finds nothing.
- Ranking prefers the segment that shares more of the query's terms; the order is asserted, not assumed.
- The collection scope still filters: the same question returns the document inside its collection and not from another owner's.
- A query of only stopword-like tokens returns no match rather than an unbounded scan.
- The change is a query change, not a schema change: no migration, no reingest.

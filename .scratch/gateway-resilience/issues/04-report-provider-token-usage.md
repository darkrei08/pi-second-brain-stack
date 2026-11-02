# 04: Report the tokens a provider call spent

Type: task
Status: open
Blocked by: none

## Question

`src/chat-client.js` discards the provider's `usage` object, so neither the audit line nor the answer response can say what a question cost, and the R10 measurement could not report tokens at all. Decide where usage belongs: the audit line only, or also the answer metadata the shell can display. Keep it optional because not every OpenAI-compatible provider returns it.

## Acceptance criteria

- The audit line carries the prompt and completion tokens when the provider reports them, and omits the fields when it does not.
- If usage also reaches the response, the field is documented and defaults to absent.
- A test with a fake provider that returns usage and one that returns none.
- No payload text in the usage fields.

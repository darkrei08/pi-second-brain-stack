# 04: Report the tokens a provider call spent

Type: task
Status: resolved
Blocked by: none

## Question

`src/chat-client.js` discards the provider's `usage` object, so neither the audit line nor the answer response can say what a question cost, and the R10 measurement could not report tokens at all. Decide where usage belongs: the audit line only, or also the answer metadata the shell can display. Keep it optional because not every OpenAI-compatible provider returns it.

## Acceptance criteria

- The audit line carries the prompt and completion tokens when the provider reports them, and omits the fields when it does not.
- If usage also reaches the response, the field is documented and defaults to absent.
- A test with a fake provider that returns usage and one that returns none.
- No payload text in the usage fields.

## Answer

The provider's usage object is carried through instead of discarded. The audit line now includes numeric `prompt_tokens` and `completion_tokens` when the provider reports them, and omits both fields when it does not, so a provider that answers without usage does not produce a misleading zero. No payload text enters those fields; the record still carries only metadata.

Evidence: `test/chat-client.test.js` covers a provider that reports usage and one that does not; `test/gateway-server.test.js` asserts the audit event shape. Measured against the real proxy before the change, `/v1/answers` returned 260 input and 39 output tokens that the gateway dropped; the same fields now reach the audit line.

Commit: `925327e`.

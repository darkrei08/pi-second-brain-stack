# 02: Answer inside a project with its own standing instructions

Type: grilling
Status: open
Blocked by: 01

## Question

A chat started inside a project should answer as that project, not only search its documents. Decide whether a project carries standing instructions for the answer model, where they live (shell folder prompt, our storage, or nowhere), and how they reach `answerQuestion` without letting a caller override the system prompt. Verify first what the shell already does with per-folder prompts before adding a second mechanism.

## Acceptance criteria

- Verified statement of what the shell provides for per-folder or per-project instructions, with the documentation URL.
- A decision that keeps the system prompt server-owned, or a rejection of the feature with the reason.
- If adopted, the request field, its validation, and the test that proves a caller cannot inject it.

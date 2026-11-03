# 02: Answer inside a project with its own standing instructions

Type: grilling
Status: resolved
Blocked by: none

## Question

A chat started inside a project should answer as that project, not only search its documents. Decide whether a project carries standing instructions for the answer model, where they live (shell folder prompt, our storage, or nowhere), and how they reach `answerQuestion` without letting a caller override the system prompt. Verify first what the shell already does with per-folder prompts before adding a second mechanism.

## Acceptance criteria

- Verified statement of what the shell provides for per-folder or per-project instructions, with the documentation URL.
- A decision that keeps the system prompt server-owned, or a rejection of the feature with the reason.
- If adopted, the request field, its validation, and the test that proves a caller cannot inject it.

## Answer

Open WebUI already owns per-folder/project standing context. Its official documentation says folders/projects can define a system prompt and knowledge base that apply to chats inside them: <https://docs.openwebui.com/features/chat-conversations/chat-features/conversation-organization/> and <https://docs.openwebui.com/features/workspace/knowledge/>. The shell therefore supplies the project behavior; the gateway must not add a second project-instructions field or persist it in PostgreSQL.

The gateway continues to own its safety prompt in `src/answer-question.js` (`SYSTEM_MESSAGE`), and the answer use case receives only the validated question, owner, retrieval scope, and server-selected model settings. No request field, migration, or new test is needed for this ticket because the verified shell-owned capability is the selected design. A caller cannot override the gateway-owned safety prompt through project storage because no such caller-controlled storage seam exists.

## Verification

The two official pages above were fetched successfully on 2026-11-03 (HTTP 200). This is a documentation/decision resolution, so no red/green behavior test was added.

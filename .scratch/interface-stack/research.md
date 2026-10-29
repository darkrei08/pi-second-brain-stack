# Research: interaction surface and context grouping

Retrieved 2026-10-29 from official project documentation and repositories. Confidence is stated per claim; anything not verified is marked as such instead of assumed.

## Requirement being evaluated

A person must be able to:

1. chat with the corpus through the product API;
2. attach further documents inside a conversation;
3. pin conversations;
4. group conversations into folders that represent a context or a theme.

## Candidates

### LibreChat

- Licence: MIT.
- Organization: Projects act as folder-like personal workspaces; chats can be dragged into a project, moved between projects, searched, sorted, and archived. Conversations can be pinned, reordered, and appear in a unified pinned section. Projects carry shared instructions and reference files; the composer attaches files directly.
- Integration surface: custom OpenAI-compatible endpoints are declared in `librechat.yaml`; a separate RAG API handles document ingestion, embeddings, retrieval, and PostgreSQL/pgvector storage.
- Confidence: high for the UI primitives and the custom-endpoint configuration; medium for whether the bundled RAG API can be replaced by an external service without forking, which was not verified.
- Sources: <https://www.librechat.ai/docs/features/projects>, <https://www.librechat.ai/docs/features/navigation>, <https://www.librechat.ai/docs/features/composer>, <https://github.com/LibreChat-AI/docs/blob/main/content/docs/quick_start/custom_endpoints.mdx>, <https://github.com/LibreChat-AI/docs/blob/main/content/docs/configuration/librechat_yaml/object_structure/file_config.mdx>, <https://github.com/danny-avila/LibreChat>

### Open WebUI

- Licence: BSD-3 through v0.6.5; v0.6.6 and later use the Open WebUI licence with a branding restriction, and deployments above 50 users generally cannot remove or alter the branding without permission or an enterprise licence.
- Organization: folders and projects with nesting, drag-and-drop, tags, search filters, and sharing; pinned chats are first-class (`pinned:true` search filter), and folders can inherit system prompts, default models, attached files, and knowledge bases. Knowledge bases are reusable document collections with built-in RAG.
- Confidence: high for the organization features; high for the licence change as documented upstream; medium for how well an external corpus can replace the built-in knowledge stores.
- Sources: <https://docs.openwebui.com/features/chat-conversations/chat-features/conversation-organization/>, <https://docs.openwebui.com/features/chat-conversations/chat-features/history-search/>, <https://docs.openwebui.com/features/workspace/knowledge/>, <https://github.com/open-webui/docs/blob/main/docs/license.mdx>, <https://github.com/open-webui/open-webui/blob/main/LICENSE>

### AnythingLLM

- Licence: MIT for self-hosted use under its published terms.
- Organization: workspaces with multiple chat threads inside each workspace; a request for folders inside workspaces was closed as not planned. Attachments can be scoped to a thread while workspace documents are shared across threads.
- Pinning: pinned documents exist; pinned conversations or threads were not verified in the documentation reviewed.
- Confidence: high for workspaces and threads; low for pinning of chats.
- Sources: <https://docs.anythingllm.com/chatting-with-documents/introduction>, <https://github.com/Mintplex-Labs/anything-llm/issues/2741>, <https://github.com/Mintplex-Labs/anything-llm>, <https://github.com/Mintplex-Labs/anything-llm/blob/master/TERMS_SELF_HOSTED.md>

### LobeChat

- Licence: Apache-2.0 with additional conditions for commercial use from version 1.0, which require review before adoption.
- Organization: session groups and folders with pinning through drag-to-top or the context menu; the reviewed documentation establishes organization and pinning but not a project-style knowledge scope.
- Confidence: medium, because part of the evidence comes from a generated PDF of the user guide rather than the project site.
- Sources: <https://github.com/lobehubbot/lobe-chat/blob/main/LICENSE>, <https://github.com/zlapp/lobe-chat/blob/main/README.md>

## Comparison against the requirement

| Requirement | LibreChat | Open WebUI | AnythingLLM | LobeChat |
|---|---|---|---|---|
| Chat over an OpenAI-compatible endpoint | yes | yes | yes | yes |
| Attach files in a conversation | yes | yes | yes (thread-scoped) | not verified |
| Pin conversations | yes | yes | not verified | yes |
| Group chats into folders | Projects | nested folders | workspaces, no folders inside | session groups |
| Folder scopes retrieval | no evidence | folders can carry knowledge bases, which is the closest analogue | workspace scopes documents, not folders | no evidence |
| Licence usable without negotiation | MIT | branding restriction above 50 users | MIT | commercial conditions from 1.0 |

## Findings

1. Topology matters more than the feature checklist: three of the four candidates organize conversations with their own storage, so folder membership would not constrain our retrieval unless the gateway owns the grouping or receives it as a filter.
2. Open WebUI is the only candidate where a folder can carry knowledge and defaults, which is the closest native analogue to "folder as a context"; it pays for that with a licence that constrains branding at scale.
3. LibreChat remains the best fit for the documented architecture because it is MIT and already recommended as the primary surface; its Projects map to the grouping requirement, and the open question is where files and groupings live.
4. Nothing reviewed closes the actual gap: no shell treats its folders as a scope over an external corpus. A collection dimension in our storage plus a retrieval filter is required for folder-scoped answers, and it does not exist today.
5. Non-goals confirmed by research: no candidate should be vendored, configured, or shipped in this slice, and no licence-key material belongs in the repository.

## Open questions for the operator

- Whether folder-scoped retrieval (V3) is required for the first release, or whether folders may stay a pure UI convenience.
- Whether attachments (V4) must be ingested into our corpus with provenance, or may live in the shell's own RAG.
- Whether the first release may accept a shell that owns conversation storage (V2), given that pins and folders then live outside our backup and deletion boundary.

# 10: Run the shell beside the gateway

Type: task
Status: open
Blocked by: none

## Question

`compose.yaml` starts PostgreSQL and nothing else. The shell the whole interface effort chose (Open WebUI, decision V1) is not in the stack, so nothing in this repository has ever run the two together: no filter loaded, no folder scope exercised end to end, no chat answered through the gateway from a browser. Ticket 07 cannot be answered and the operator cannot use the system until the shell starts beside the gateway with our filter and pipe mounted.

Decide and implement the smallest reproducible stack: the pinned shell image and why that version, how the filter and pipe files reach the container, how the shell authenticates to the gateway and to a model provider without a secret entering the repository, and what the operator types to start it. The licence position of the pinned version is recorded, not assumed.

## Acceptance criteria

- A shell service in `compose.yaml`, image pinned by tag, with the filter and pipe mounted read-only from `integrations/open-webui/`.
- Every secret comes from an untracked environment file; a check proves no key is in the repository and `.gitignore` covers the file.
- The shell serves its UI and the gateway answers a retrieval request that carries a folder scope, proven by a recorded command and its output.
- One page describing the start procedure, the two stores and their separate backup and deletion boundaries.
- The pinned version and its licence position, with the URL that was read.

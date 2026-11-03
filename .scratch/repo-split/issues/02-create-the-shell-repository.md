# 02: Move the plugin package into its own repository

Type: task
Status: open
Blocked by: none

## Question

Create `darkrei08/pi-second-brain-shell` and move `integrations/open-webui/` there in full: the filter, the pipe, the bootstrap and the plugin tests. Fix the `.parents[3]` root lookup and the hard-coded plugin paths in `test_plugins.py:9,20-29`, add a browser-free Python CI job (the current CI runs Node and PostgreSQL only), and record the pinned image version with the licence position of that exact tag.

## Acceptance criteria

- The Python suite passes in the new repository's CI on every push.
- A release note names the pinned tag, the licence URL read for that tag, and the startup procedure the package expects.
- The bootstrap still imports both functions into the shell's Function store on a disposable stack, verified by reading the records back.
- This repository's reference stack consumes the package without duplicating its source.

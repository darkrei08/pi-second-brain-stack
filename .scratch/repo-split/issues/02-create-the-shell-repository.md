# 02: Move the plugin package into its own repository

Type: task
Status: resolved
Blocked by: none

## Question

Create `darkrei08/pi-second-brain-shell` and move `integrations/open-webui/` there in full: the filter, the pipe, the bootstrap and the plugin tests. Fix the `.parents[3]` root lookup and the hard-coded plugin paths in `test_plugins.py:9,20-29`, add a browser-free Python CI job (the current CI runs Node and PostgreSQL only), and record the pinned image version with the licence position of that exact tag.

## Acceptance criteria

- The Python suite passes in the new repository's CI on every push.
- A release note names the pinned tag, the licence URL read for that tag, and the startup procedure the package expects.
- The bootstrap still imports both functions into the shell's Function store on a disposable stack, verified by reading the records back.
- This repository's reference stack consumes the package without duplicating its source.

## Answer

`https://github.com/darkrei08/pi-second-brain-shell`, public, default branch `main`, tip `0b76a702e3d8289e2cea331f38a272438ce5d1a1`.

History kept: `git filter-branch --index-filter` on the `integrations/open-webui/` prefix, three commits before and three after, and `git log --follow` still reaches the original `f337576` from a moved file. The package sits at the repository root (`filters/`, `pipes/`, `bootstrap.py`, `tests/`, `requirements.txt`) and `tests/test_plugins.py` now resolves `PACKAGE_ROOT` from its own location instead of `.parents[3]`.

Verified independently by cloning the published repository: 4 commits, 17 plugin tests pass (`python3 -m unittest discover -s tests`), no key-shaped string anywhere in the tree, `.github/workflows/python.yml` present with a `Python plugin tests` job that runs on push with no browser and no stack. The first CI run on `main` finished `success` in 26 seconds.

Licence: BSD 3-Clause read at `https://github.com/open-webui/open-webui/blob/v0.6.5/LICENSE` for the pinned `ghcr.io/open-webui/open-webui:v0.6.5`. Later tags carry a different position and must be re-read before any upgrade.

Bootstrap read back on a disposable container: both `gateway-retrieval` and `gateway-research` present in the shell's Function store.

Still open, and now its own ticket: this repository's reference stack still mounts `integrations/open-webui/` from its own tree. Until ticket 05 lands, the source exists twice in practice, which is what the extraction was meant to end.

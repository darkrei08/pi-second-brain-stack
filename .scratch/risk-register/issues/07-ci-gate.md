# 07: Add a repository CI gate

Type: task
Status: claimed
Blocked by: None
Source: R7 of [issue 01](01-risk-register.md). The rejected part of R7 stays rejected: the dependency-vulnerability count was never supported by this repository's manifest.

## Question

R7 records that no repository-local CI configuration exists, so regressions are caught only when someone runs the suites by hand. What is the smallest gate that runs the unit suite and a real PostgreSQL/pgvector integration job?

## Acceptance criteria

- [ ] One GitHub Actions workflow runs on push and pull request: Node 22, pnpm from the committed lockfile, `pnpm install --frozen-lockfile`, the unit suite, then a `pgvector/pgvector:pg17` service where `pnpm migrate` applies the schema and `pnpm run test:integration` runs against it.
- [ ] The workflow calls repository scripts, not ad-hoc SQL pasted into YAML, so the same commands run locally and in CI.
- [ ] `package.json` gains a `ci` script that runs what an operator can run locally without a container.
- [ ] The workflow YAML parses, and both scripted suites are proven green locally; the workflow execution itself cannot be proven without pushing, which is the operator's decision, and that limit is stated in the ticket.
- [ ] No new dependency. `pnpm test` green.

## Verification

- `pnpm ci`
- `node -e "…yaml parse…"` or `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/ci.yml'))"`

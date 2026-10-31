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

## Answer

`.github/workflows/ci.yml` defines two jobs on push and pull request:

- `unit`: checkout, pnpm from the declared `packageManager`, Node 22, `pnpm install --frozen-lockfile`, `pnpm run verify`.
- `integration`: the same setup plus a `pgvector/pgvector:pg17` service with a `pg_isready` health check, then `pnpm migrate` and `pnpm run test:integration`, both driven by repository scripts rather than SQL pasted into YAML.

`package.json` gains one script, `verify`. It is not named `ci` because `pnpm ci` is a built-in alias for a frozen install and silently ignores a script of that name; the first draft of this work unit made exactly that mistake and was renamed after the command ran an install instead of the suites.

Verified locally: `pnpm run verify` exits 0 (unit 144 tests, 118 pass, 26 expected skips, 0 fail; then the integration file self-skips without a database, 5 pass, 26 skip). The workflow YAML parses under `yaml.safe_load` and its jobs, steps, and service image were read back.

Not verified, and it cannot be here: the workflow execution itself. It requires a push to a GitHub remote, which is the operator's decision. The dependency-vulnerability half of R7 stays rejected as unsupported by this repository's manifest.

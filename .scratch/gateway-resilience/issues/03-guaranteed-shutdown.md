# 03: Guarantee shutdown when a dependency refuses

Type: task
Status: resolved
Blocked by: none

## Question

The signal handler in `src/gateway-cli.js` awaits `gateway.stop()` and `pool.end()` in sequence with no `catch` and no `finally`. If either rejects, the process neither exits nor reports why, and a supervisor sees a hung process. Decide the shutdown contract: a bounded wait, a forced exit code, and the trace when it has to force.

## Acceptance criteria

- A test that a rejecting `stop()` or `end()` still produces a reported failure and a non-zero exit, without hanging.
- A test that the normal path exits zero.
- No unbounded wait anywhere in the handler.

## Answer

Shutdown is bounded and reported. `src/gateway-shutdown.js` performs the steps with a five-second bound per step, continues through a failing step so one rejection cannot strand the others, writes a JSON line naming the step that failed, and exits non-zero when any step fails; the normal path exits zero. `src/gateway-cli.js` uses it for both SIGINT and SIGTERM.

Evidence: `test/gateway-shutdown.test.js` covers a rejecting stop, a rejecting pool close, the normal path, and the bound itself.

Commit: `0a8420f`.

# 03: Guarantee shutdown when a dependency refuses

Type: task
Status: open
Blocked by: none

## Question

The signal handler in `src/gateway-cli.js` awaits `gateway.stop()` and `pool.end()` in sequence with no `catch` and no `finally`. If either rejects, the process neither exits nor reports why, and a supervisor sees a hung process. Decide the shutdown contract: a bounded wait, a forced exit code, and the trace when it has to force.

## Acceptance criteria

- A test that a rejecting `stop()` or `end()` still produces a reported failure and a non-zero exit, without hanging.
- A test that the normal path exits zero.
- No unbounded wait anywhere in the handler.

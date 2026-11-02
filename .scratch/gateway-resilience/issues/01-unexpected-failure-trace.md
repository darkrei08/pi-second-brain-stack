# 01: Leave a trace when an unexpected failure is sanitized

Type: task
Status: resolved
Blocked by: none

## Question

`src/gateway-server.js` turns an unexpected failure into a sanitized `500` with a stable error code, which is correct for the caller and silent for the operator: nothing is written anywhere, so a database or provider incident leaves no evidence and the person only sees "something went wrong". Decide the single trace mechanism, one structured line per unexpected failure or a counter, and implement it so that the trace names the route and the error class without carrying the request body, the question, or the evidence text.

## Acceptance criteria

- A test that provokes an unexpected failure and asserts the trace is emitted once, with the route and the error class, and that no caller payload appears in it.
- A test that a caller-caused error (a `4xx` from validation) emits no incident trace.
- `docs/development.md` says where the trace goes and what it contains.

## Answer

Unexpected failures use one structured JSON line on stderr: `gateway_unexpected_failure` names the HTTP route and error class, and never includes request or answer payload text. Caller-caused `4xx` errors do not emit the trace. Verified by `test/gateway-server.test.js`.

# 06: Bound concurrency and rate on the model-backed routes

Type: task
Status: claimed
Blocked by: None
Source: R6 of [issue 01](01-risk-register.md).

## Question

R6 records that nothing caps how many authenticated model-backed requests run at once, so a token holder can consume sockets, provider quota and capacity. What is the smallest explicit bound with a bounded overload response?

## Acceptance criteria

- [ ] A concurrency bound applies to the model-backed routes (`POST /v1/answers`, `POST /v1/research`, `POST /v1/chat/completions`) only; retrieval and citation routes are unaffected.
- [ ] When the bound is reached, the request fails fast with a bounded error response and does not call the provider. Status 429 with a stable error code, and the body carries no driver or provider text.
- [ ] A per-owner request budget over a fixed window also applies to those routes; exceeding it returns the same bounded response without a provider call.
- [ ] Both limits are configurable through the gateway configuration, are validated (`positive integer`, `1..N`), and have safe finite defaults, so an operator who configures nothing still gets a bound.
- [ ] The slot is released when the handler succeeds, throws, and when the response stream ends or the client aborts.
- [ ] `docs/development.md` documents both variables and their defaults.
- [ ] Tests cover: saturation returns 429 without a provider call; the slot is released after success and after a thrown error; the per-owner budget trips and does not affect another owner; invalid configuration is refused.
- [ ] No new dependency. `pnpm test` green.

## Verification

- `node --test test/gateway-server.test.js test/gateway-config.test.js`
- `pnpm test`

## Answer

`src/gateway-server.js` now holds one process-wide model slot counter and one per-owner fixed-window budget, checked before the handler runs for `POST /v1/answers`, `POST /v1/research` and `POST /v1/chat/completions` only. Saturation or an exhausted budget answers `429` with `{"error":{"code":"model_busy","message":"Model capacity is temporarily unavailable"}}` and makes no provider call. The slot is released on success, on throw, and on `finish`/`close`; a streamed response keeps its slot until the stream ends.

`src/gateway-config.js` parses `GATEWAY_MODEL_CONCURRENCY` (default 4, 1..64) and `GATEWAY_MODEL_REQUESTS_PER_MINUTE` (default 60, 1..60000) in the same refusal style as the other settings, and `src/gateway-cli.js` passes both in. No dependency, no interval, no timer that keeps the process alive.

Evidence: focused `node --test test/gateway-server.test.js test/gateway-config.test.js` 34 pass, 0 fail; `pnpm test` 144 tests, 118 pass, 26 expected skips, 0 fail. Writer-observed RED before implementation: 29 pass, 5 fail.

Incident worth recording: a first attempt at this task hung the whole suite. Its test busy-waited on a condition the unimplemented code could never satisfy, so `pnpm test` exceeded 300 seconds. Both of its test files were reverted and the task was re-dispatched with an explicit instruction to bound every wait; the second attempt fakes the clock instead of waiting a real minute.
